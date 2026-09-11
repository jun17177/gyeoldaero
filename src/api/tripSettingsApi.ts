import axios from 'axios';
import { PLANNER_API_URL } from '../constants/config';
import { AiTripSettings, TripSettings } from '../types';

const TIMEOUT_MS = 60_000;

const THEMES: readonly TripSettings['themes'][number][] = ['healing', 'activity', 'food', 'culture', 'photo', 'night'];
const SEASONS: readonly TripSettings['season'][] = ['spring', 'summer', 'fall', 'winter'];
const LUGGAGE: readonly TripSettings['luggage'][] = ['light', 'medium', 'heavy', 'very_heavy'];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isHour = (v: unknown): boolean => typeof v === 'number' && v >= 0 && v <= 24;

// 서버 주소를 잘못 넣었거나 터널 경고 페이지처럼 200으로 엉뚱한 응답이 올 수 있어 형태를 확인한다
function isTripSettings(v: unknown): v is TripSettings {
  return isRecord(v)
    && Array.isArray(v.themes) && v.themes.length > 0
    && (v.themes as unknown[]).every(t => THEMES.includes(t as TripSettings['themes'][number]))
    && SEASONS.includes(v.season as TripSettings['season'])
    && isHour(v.startTime) && isHour(v.endTime)
    && (v.firstDayArrival === undefined || isHour(v.firstDayArrival))
    && (v.lastDayDeparture === undefined || isHour(v.lastDayDeparture))
    && typeof v.people === 'number'
    && typeof v.budget === 'number'
    && LUGGAGE.includes(v.luggage as TripSettings['luggage']);
}

// 자유 문장을 여행 조건으로 바꿔 달라고 서버(Claude)에 요청. 서버 주소가 없거나 실패하면 null
export async function requestTripSettings(text: string): Promise<AiTripSettings | null> {
  if (!PLANNER_API_URL) return null;
  try {
    const res = await axios.post<unknown>(`${PLANNER_API_URL}/api/trip-settings`, { text }, {
      timeout: TIMEOUT_MS,
    });
    const data = res.data;
    if (isRecord(data) && typeof data.summary === 'string' && isTripSettings(data.settings)) {
      return { settings: data.settings, summary: data.summary };
    }
    console.warn('[tripSettings] 예상과 다른 응답 — EXPO_PUBLIC_PLANNER_API_URL이 AI 서버를 가리키는지 확인하세요');
    return null;
  } catch (e) {
    console.warn('[tripSettings] 자동 설정 요청 실패:', e instanceof Error ? e.message : e);
    return null;
  }
}
