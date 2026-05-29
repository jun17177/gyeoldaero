import axios from 'axios';
import { WEATHER_API_KEY } from '../constants/apiKeys';

export type SkyCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy';

export interface WeatherDay {
  date: string; // YYYYMMDD
  condition: SkyCondition;
  tMin: number;
  tMax: number;
}

const SHORT_TERM_URL =
  'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';
const MID_LAND_URL =
  'https://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst';
const MID_TA_URL =
  'https://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa';

const JEJU_NX = 53; // 제주시 격자 좌표 (기존 52는 서귀포 남서쪽으로 오류)
const JEJU_NY = 38;
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

export async function fetchWeatherForecast(): Promise<WeatherDay[]> {
  if (!WEATHER_API_KEY) return buildMockForecast();

  try {
    const [shortTerm, midTerm] = await Promise.all([
      fetchShortTerm(),
      fetchMidTerm(),
    ]);
    // D+0~3은 단기(정확), D+4~9는 중기 — D+3 중복 제거
    return [...shortTerm, ...midTerm.slice(1)];
  } catch {
    return buildMockForecast();
  }
}
