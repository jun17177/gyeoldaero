import axios from 'axios';
import { TripSettings } from '../types';

// Open-Meteo 예보 API — 인증키·가입이 필요 없고 제주 좌표로 10일치를 한 번에 준다.
// (기상청 단기+중기예보를 조합하던 구현을 대체. 기상청 쪽은 data.go.kr / API허브 양쪽 모두
//  발급키가 거절돼 실제로는 항상 mock으로 떨어지고 있었다.)
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// 제주시 좌표
const JEJU_COORDS = { latitude: 33.4996, longitude: 126.5312 };

// WeatherScreen의 날짜 선택 범위
const FORECAST_DAYS = 10;

type WeatherCondition = TripSettings['weather']; // 'sunny' | 'cloudy' | 'rainy' | 'snowy'

export interface JejuWeather {
  condition: WeatherCondition;
  label: string;        // 한글 라벨 (예: '비')
  emoji: string;        // 🌤️ ☁️ 🌧️ ❄️
  tempC: number | null; // 현재 기온 (°C)
  pop: number | null;   // 오늘 강수확률 (%)
  factor: number;       // calcTripDays용 날씨 보정계수 (sunny=1.0 기준)
  isMock: boolean;      // 조회에 실패해 가짜 데이터로 동작했는지
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

/**
 * WMO 기상 코드를 앱의 4단계 날씨로 변환.
 * 0 맑음 / 1~3 구름 / 45,48 안개 / 51~67 이슬비·비 / 71~77 눈 /
 * 80~82 소나기 / 85,86 소낙눈 / 95~99 뇌우
 */
function classify(code: number): WeatherCondition {
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snowy';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rainy';
  if (code === 0 || code === 1) return 'sunny';
  return 'cloudy'; // 2, 3(흐림), 45·48(안개)
}

// YYYY-MM-DD → YYYYMMDD (WeatherScreen과 TripSchedule.startDate가 쓰는 형식)
function compactDate(iso: string): string {
  return iso.replace(/-/g, '');
}

function formatDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

interface ForecastResponse {
  current?: { temperature_2m?: number; weather_code?: number };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
}

async function fetchForecast(): Promise<ForecastResponse> {
  const { data } = await axios.get<ForecastResponse>(FORECAST_URL, {
    params: {
      ...JEJU_COORDS,
      current: 'temperature_2m,weather_code',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      timezone: 'Asia/Seoul',
      forecast_days: FORECAST_DAYS,
    },
    timeout: 10000,
  });
  return data;
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

// 제주 오늘 날씨 조회. 조회에 실패하면 mock(맑음)으로 폴백한다.
export async function fetchJejuWeather(): Promise<JejuWeather> {
  try {
    const data = await fetchForecast();
    const code = data.current?.weather_code ?? data.daily?.weather_code?.[0];
    if (code === undefined) return mockWeather();

    const condition = classify(code);
    const meta = CONDITION_META[condition];
    const temp = data.current?.temperature_2m;
    const pop = data.daily?.precipitation_probability_max?.[0];

    return {
      condition,
      label: meta.label,
      emoji: meta.emoji,
      tempC: temp ?? null,
      pop: pop ?? null,
      factor: meta.factor,
      isMock: false,
    };
  } catch (e) {
    console.warn('[weatherApi] 날씨 조회 실패, mock 사용:', e instanceof Error ? e.message : e);
    return mockWeather();
  }
}

// ─────────────────────────────────────────────────────────────
// 10일 예보 (WeatherScreen 날짜 선택용)
// ─────────────────────────────────────────────────────────────

export type SkyCondition = WeatherCondition; // 'sunny' | 'cloudy' | 'rainy' | 'snowy'

export interface WeatherDay {
  date: string; // YYYYMMDD
  condition: SkyCondition;
  tMin: number;
  tMax: number;
}

const MOCK_PATTERN: SkyCondition[] = ['sunny', 'sunny', 'cloudy', 'sunny', 'rainy'];

function buildMockForecast(): WeatherDay[] {
  const today = new Date();
  return Array.from({ length: FORECAST_DAYS }, (_, i) => {
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

export interface WeatherForecast {
  days: WeatherDay[];
  isMock: boolean; // 조회에 실패해 가짜 예보로 채웠는지 — 화면에서 실제 예보처럼 보이지 않게 쓴다
}

// 오늘부터 10일치 예보. 실패하면 mock으로 폴백해 날짜 선택 화면이 비지 않게 한다.
export async function fetchWeatherForecast(): Promise<WeatherForecast> {
  try {
    const daily = (await fetchForecast()).daily;
    const days = daily?.time?.length ?? 0;
    if (!daily?.time || days === 0) return { days: buildMockForecast(), isMock: true };

    return {
      days: daily.time.map((iso, i) => ({
        date: compactDate(iso),
        condition: classify(daily.weather_code?.[i] ?? 0),
        tMin: Math.round(daily.temperature_2m_min?.[i] ?? 0),
        tMax: Math.round(daily.temperature_2m_max?.[i] ?? 0),
      })),
      isMock: false,
    };
  } catch (e) {
    console.warn('[weatherApi] 10일 예보 조회 실패, mock 사용:', e instanceof Error ? e.message : e);
    return { days: buildMockForecast(), isMock: true };
  }
}
