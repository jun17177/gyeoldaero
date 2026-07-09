import axios from 'axios';
import { WEATHER_API_KEY } from '../constants/apiKeys';
import { TripSettings } from '../types';

// 기상청 단기예보 조회서비스 (VilageFcstInfoService_2.0 / getVilageFcst)
const BASE_URL =
  'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';

// 제주시 격자 좌표 (기상청 동네예보 격자 nx/ny)
const JEJU_GRID = { nx: 53, ny: 38 };

type WeatherCondition = TripSettings['weather']; // 'sunny' | 'cloudy' | 'rainy' | 'snowy'

export interface JejuWeather {
  condition: WeatherCondition;
  label: string;        // 한글 라벨 (예: '비')
  emoji: string;        // 🌤️ ☁️ 🌧️ ❄️
  tempC: number | null; // 현재(가장 가까운 시각) 기온 (°C)
  pop: number | null;   // 강수확률 (%)
  factor: number;       // calcTripDays용 날씨 보정계수 (sunny=1.0 기준)
  isMock: boolean;      // 키가 없어 가짜 데이터로 동작했는지
}

const CONDITION_META: Record<
  WeatherCondition,
  { label: string; emoji: string; factor: number }
> = {
  sunny:  { label: '맑음', emoji: '🌤️', factor: 1.0 },
  cloudy: { label: '구름많음', emoji: '☁️', factor: 1.0 },
  rainy:  { label: '비', emoji: '🌧️', factor: 1.2 },
  snowy:  { label: '눈', emoji: '❄️', factor: 1.3 },
};

interface ForecastItem {
  baseDate: string;
  baseTime: string;
  category: string; // 'PTY' | 'SKY' | 'TMP' | 'POP' ...
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
}

// 두 자리 0-패딩
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

// 단기예보 base_time은 02/05/08/11/14/17/20/23시에만 생성된다.
// 발표 후 약 10분 뒤 데이터가 열리므로 현재 시각 기준 직전 발표분을 고른다.
function resolveBaseDateTime(now: Date): { baseDate: string; baseTime: string } {
  const slots = [23, 20, 17, 14, 11, 8, 5, 2];
  const d = new Date(now.getTime());
  // 데이터 공개 지연(약 10분) 보정
  d.setMinutes(d.getMinutes() - 10);

  const hour = d.getHours();
  let chosen = slots.find(h => h <= hour);

  if (chosen === undefined) {
    // 02시 이전 → 전날 23시 발표분 사용
    d.setDate(d.getDate() - 1);
    chosen = 23;
  }

  const baseDate = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
  const baseTime = `${pad2(chosen)}00`;
  return { baseDate, baseTime };
}

// PTY(강수형태)/SKY(하늘상태)를 앱의 4단계 날씨로 변환
function classify(pty: string | undefined, sky: string | undefined): WeatherCondition {
  // PTY: 0 없음, 1 비, 2 비/눈, 3 눈, 4 소나기
  if (pty === '3') return 'snowy';
  if (pty === '2') return 'snowy';
  if (pty === '1' || pty === '4') return 'rainy';
  // SKY: 1 맑음, 3 구름많음, 4 흐림
  if (sky === '3' || sky === '4') return 'cloudy';
  return 'sunny';
}

function mockWeather(): JejuWeather {
  const meta = CONDITION_META.sunny;
  return {
    condition: 'sunny',
    label: meta.label,
    emoji: meta.emoji,
    tempC: null,
    pop: null,
    factor: meta.factor,
    isMock: true,
  };
}

// 제주 오늘 날씨 조회. 실패하거나 키가 없으면 mock(맑음)으로 폴백한다.
export async function fetchJejuWeather(): Promise<JejuWeather> {
  if (!WEATHER_API_KEY) return mockWeather();

  try {
    const { baseDate, baseTime } = resolveBaseDateTime(new Date());
    const res = await axios.get(BASE_URL, {
      params: {
        serviceKey: WEATHER_API_KEY,
        dataType: 'JSON',
        numOfRows: '300',
        pageNo: '1',
        base_date: baseDate,
        base_time: baseTime,
        nx: JEJU_GRID.nx.toString(),
        ny: JEJU_GRID.ny.toString(),
      },
      timeout: 10000,
    });

    const items: ForecastItem[] | undefined =
      res.data?.response?.body?.items?.item;
    if (!items || items.length === 0) return mockWeather();

    // 가장 이른 예보 시각(=현재에 가장 가까운 시점)의 항목만 사용
    const earliest = items.reduce((min, it) => {
      const key = `${it.fcstDate}${it.fcstTime}`;
      return key < min ? key : min;
    }, `${items[0].fcstDate}${items[0].fcstTime}`);

    const slice = items.filter(it => `${it.fcstDate}${it.fcstTime}` === earliest);
    const pick = (cat: string) => slice.find(it => it.category === cat)?.fcstValue;

    const condition = classify(pick('PTY'), pick('SKY'));
    const meta = CONDITION_META[condition];
    const tmp = pick('TMP');
    const pop = pick('POP');

    return {
      condition,
      label: meta.label,
      emoji: meta.emoji,
      tempC: tmp != null ? parseFloat(tmp) : null,
      pop: pop != null ? parseInt(pop, 10) : null,
      factor: meta.factor,
      isMock: false,
    };
  } catch (e) {
    console.warn('[weatherApi] 기상청 조회 실패, mock 사용:', e);
    return mockWeather();
  }
}

// ─────────────────────────────────────────────────────────────
// 10일 예보 (WeatherScreen 날짜 선택용)
// 단기예보(D+0~3) + 중기육상/기온예보(D+4~9)를 조합해 하루 단위 배열로 반환
// ─────────────────────────────────────────────────────────────

export type SkyCondition = WeatherCondition; // 'sunny' | 'cloudy' | 'rainy' | 'snowy'

export interface WeatherDay {
  date: string; // YYYYMMDD
  condition: SkyCondition;
  tMin: number;
  tMax: number;
}

const SHORT_TERM_URL = BASE_URL; // 단기예보 = getVilageFcst
const MID_LAND_URL =
  'https://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst';
const MID_TA_URL =
  'https://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa';

const JEJU_NX = JEJU_GRID.nx; // 제주시 격자 좌표
const JEJU_NY = JEJU_GRID.ny;
const JEJU_REG_ID = '11H20201'; // 제주도 중기예보 지역코드

function formatDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

// 단기예보 발표시각: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300
function getBaseDateTime(): { date: string; time: string } {
  const now = new Date();
  const totalMin = now.getHours() * 60 + now.getMinutes();
  const baseTimes = [2, 5, 8, 11, 14, 17, 20, 23];
  let baseHour = 23;
  for (const t of baseTimes) {
    if (totalMin >= t * 60 + 10) baseHour = t;
  }
  const baseDate = new Date(now);
  if (totalMin < 2 * 60 + 10) {
    baseDate.setDate(baseDate.getDate() - 1);
    baseHour = 23;
  }
  return {
    date: formatDateStr(baseDate),
    time: String(baseHour).padStart(2, '0') + '00',
  };
}

// 중기예보 발표시각: 0600, 1800
function getMidTmFc(): string {
  const now = new Date();
  const h = now.getHours();
  if (h >= 18) return `${formatDateStr(now)}1800`;
  if (h >= 6) return `${formatDateStr(now)}0600`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return `${formatDateStr(yesterday)}1800`;
}

function toCondition(sky: string, pty: string): SkyCondition {
  if (pty === '1' || pty === '4') return 'rainy';
  if (pty === '2' || pty === '3') return 'snowy';
  if (sky === '3' || sky === '4') return 'cloudy';
  return 'sunny';
}

function midWfToCondition(wf: string): SkyCondition {
  if (!wf) return 'sunny';
  if (wf.includes('비') || wf.includes('소나기')) return 'rainy';
  if (wf.includes('눈')) return 'snowy';
  if (wf.includes('흐') || wf.includes('구름')) return 'cloudy';
  return 'sunny';
}

function worseCond(a: SkyCondition, b: SkyCondition): SkyCondition {
  const rank: Record<SkyCondition, number> = { sunny: 0, cloudy: 1, rainy: 2, snowy: 3 };
  return rank[a] >= rank[b] ? a : b;
}

const MOCK_PATTERN: SkyCondition[] = [
  'sunny', 'sunny', 'cloudy', 'sunny', 'rainy',
  'cloudy', 'sunny', 'sunny', 'cloudy', 'sunny',
];

function buildMockForecast(): WeatherDay[] {
  const today = new Date();
  return Array.from({ length: 10 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const base = 14 + (i % 3);
    return {
      date: formatDateStr(d),
      condition: MOCK_PATTERN[i % MOCK_PATTERN.length],
      tMin: base,
      tMax: base + 8,
    };
  });
}

async function fetchShortTerm(): Promise<WeatherDay[]> {
  const { date, time } = getBaseDateTime();
  const res = await axios.get(SHORT_TERM_URL, {
    params: {
      serviceKey: WEATHER_API_KEY,
      numOfRows: 1500,
      pageNo: 1,
      dataType: 'JSON',
      base_date: date,
      base_time: time,
      nx: JEJU_NX,
      ny: JEJU_NY,
    },
    timeout: 8000,
  });

  const items: { category: string; fcstDate: string; fcstTime: string; fcstValue: string }[] =
    res.data?.response?.body?.items?.item ?? [];

  // 대표 시간대 전체(6·9·12·15·18시)에서 하루 중 최악 조건을 추출
  const SAMPLE_TIMES = ['0600', '0900', '1200', '1500', '1800'];
  const PTY_RANK: Record<string, number> = { '0': 0, '4': 1, '1': 2, '2': 3, '3': 3 };
  const SKY_RANK: Record<string, number> = { '1': 0, '3': 1, '4': 2 };

  const byDate: Record<string, {
    worstPty: string; worstSky: string;
    tMin?: number; tMax?: number;
    tmpMin?: number; tmpMax?: number; // TMN/TMX 없을 때 TMP로 추정
  }> = {};

  for (const item of items) {
    const d = item.fcstDate;
    if (!byDate[d]) byDate[d] = { worstPty: '0', worstSky: '1' };

    if (item.category === 'PTY' && SAMPLE_TIMES.includes(item.fcstTime)) {
      const cur = PTY_RANK[item.fcstValue] ?? 0;
      const prev = PTY_RANK[byDate[d].worstPty] ?? 0;
      if (cur > prev) byDate[d].worstPty = item.fcstValue;
    }
    if (item.category === 'SKY' && SAMPLE_TIMES.includes(item.fcstTime)) {
      const cur = SKY_RANK[item.fcstValue] ?? 0;
      const prev = SKY_RANK[byDate[d].worstSky] ?? 0;
      if (cur > prev) byDate[d].worstSky = item.fcstValue;
    }
    if (item.category === 'TMN') byDate[d].tMin = Math.round(Number(item.fcstValue));
    if (item.category === 'TMX') byDate[d].tMax = Math.round(Number(item.fcstValue));
    // TMN/TMX가 없을 경우(오늘 늦은 시간 조회 등) TMP로 min/max 추정
    if (item.category === 'TMP') {
      const t = Math.round(Number(item.fcstValue));
      if (byDate[d].tmpMin === undefined || t < byDate[d].tmpMin!) byDate[d].tmpMin = t;
      if (byDate[d].tmpMax === undefined || t > byDate[d].tmpMax!) byDate[d].tmpMax = t;
    }
  }

  const today = new Date();
  // D+3까지 수집 — 중기예보 taMin3 누락 문제를 단기로 보완
  return [0, 1, 2, 3].map((i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = formatDateStr(d);
    const v = byDate[dateStr];
    if (v && (v.worstPty !== '0' || v.worstSky !== '1' || v.tMin !== undefined || v.tmpMin !== undefined)) {
      return {
        date: dateStr,
        condition: toCondition(v.worstSky, v.worstPty),
        tMin: v.tMin ?? v.tmpMin ?? 14,
        tMax: v.tMax ?? v.tmpMax ?? 22,
      };
    }
    const base = 14 + (i % 3);
    return { date: dateStr, condition: MOCK_PATTERN[i % MOCK_PATTERN.length], tMin: base, tMax: base + 8 };
  });
}

async function fetchMidTerm(): Promise<WeatherDay[]> {
  const tmFc = getMidTmFc();
  const commonParams = {
    serviceKey: WEATHER_API_KEY,
    numOfRows: 10,
    pageNo: 1,
    dataType: 'JSON',
    regId: JEJU_REG_ID,
    tmFc,
  };

  const [landRes, taRes] = await Promise.all([
    axios.get(MID_LAND_URL, { params: commonParams, timeout: 8000 }),
    axios.get(MID_TA_URL, { params: commonParams, timeout: 8000 }),
  ]);

  const land = landRes.data?.response?.body?.items?.item?.[0] ?? {};
  const ta = taRes.data?.response?.body?.items?.item?.[0] ?? {};

  const today = new Date();
  // D+3 ~ D+9 (중기예보 범위)
  return [3, 4, 5, 6, 7, 8, 9].map((i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = formatDateStr(d);

    // D+8, D+9는 오전/오후 구분 없이 단일값
    const wfAm: string = land[`wf${i}Am`] ?? land[`wf${i}`] ?? '';
    const wfPm: string = land[`wf${i}Pm`] ?? land[`wf${i}`] ?? '';
    const condition = worseCond(midWfToCondition(wfAm), midWfToCondition(wfPm));
    const tMin = Number(ta[`taMin${i}`] ?? 14);
    const tMax = Number(ta[`taMax${i}`] ?? 22);

    return { date: dateStr, condition, tMin, tMax };
  });
}

// 제주 10일 예보. 키가 없거나 실패 시 mock 패턴으로 폴백한다.
export async function fetchWeatherForecast(): Promise<WeatherDay[]> {
  if (!WEATHER_API_KEY) return buildMockForecast();

  try {
    // 단기·중기 중 한쪽만 실패해도 성공한 쪽 데이터는 살리고, 실패분만 mock으로 채운다
    const [shortRes, midRes] = await Promise.allSettled([
      fetchShortTerm(),
      fetchMidTerm(),
    ]);
    const mock = buildMockForecast(); // D+0~9 (10일)
    const shortTerm =
      shortRes.status === 'fulfilled' ? shortRes.value : mock.slice(0, 4); // D+0~3
    const midTerm =
      midRes.status === 'fulfilled' ? midRes.value : mock.slice(3);        // D+3~9
    if (shortRes.status === 'rejected') console.warn('[weatherApi] 단기예보 실패, mock 사용:', shortRes.reason);
    if (midRes.status === 'rejected') console.warn('[weatherApi] 중기예보 실패, mock 사용:', midRes.reason);
    // D+0~3은 단기(정확), D+4~9는 중기 — D+3 중복 제거
    return [...shortTerm, ...midTerm.slice(1)];
  } catch (e) {
    console.warn('[weatherApi] 10일 예보 조회 실패, mock 사용:', e);
    return buildMockForecast();
  }
}
