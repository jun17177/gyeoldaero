import axios from 'axios';
import { Spot, TripSettings } from '../types';
import { plannerHeaders } from '../constants/config';

// 결대로 백엔드(server/) 주소. .env의 EXPO_PUBLIC_SERVER_URL 하나만 본다.
// 하드코딩 기본값을 두면 값이 낡았을 때 엉뚱한 주소에 매달리므로 두지 않는다 —
// 비어 있으면 호출을 건너뛰고 알고리즘 결과로 대체한다.
const BASE_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? '';

// 서버가 PLANNER_TOKEN을 쓰면 AI 라우트도 같은 토큰을 요구한다 (route-plan과 동일)
const client = axios.create({ baseURL: BASE_URL, timeout: 20000, headers: plannerHeaders() });

export interface SpotRecommendation {
  spotId: string;
  reason: string;
}

export interface RecommendSpotsResult {
  recommendations: SpotRecommendation[];
  summary: string;
}

// 후보 명소 중 사용자 맞춤 추천 — 실패 시 null 반환 (호출부에서 폴백)
export async function fetchSpotRecommendations(params: {
  spots: Spot[];
  settings: TripSettings;
  maxCount?: number;
}): Promise<RecommendSpotsResult | null> {
  if (!BASE_URL) return null; // 서버 주소 미설정 — 호출부가 알고리즘 결과로 대체한다
  try {
    const { data } = await client.post<RecommendSpotsResult>('/api/recommend-spots', {
      // 토큰 절약: 서버에 필요한 필드만 전송
      spots: params.spots.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        tags: s.tags,
      })),
      settings: {
        themes: params.settings.themes,
        season: params.settings.season,
        weather: params.settings.weather,
        luggage: params.settings.luggage,
        people: params.settings.people,
      },
      maxCount: params.maxCount ?? 5,
    });
    return data;
  } catch (e) {
    console.warn('[aiApi] 명소 추천 실패:', e);
    return null;
  }
}

// 최적화된 일정에 대한 AI 코멘트 — 실패 시 null 반환 (호출부에서 폴백)
export async function fetchTripComment(params: {
  days: number;
  spots: Spot[];
  settings: TripSettings;
  weatherLabel?: string;
}): Promise<string | null> {
  if (!BASE_URL) return null;
  try {
    const { data } = await client.post<{ comment: string }>('/api/trip-comment', {
      days: params.days,
      spots: params.spots.map(s => ({ name: s.name, category: s.category })),
      settings: {
        themes: params.settings.themes,
        season: params.settings.season,
        weather: params.settings.weather,
        luggage: params.settings.luggage,
        people: params.settings.people,
      },
      weatherLabel: params.weatherLabel,
    });
    return data.comment;
  } catch (e) {
    console.warn('[aiApi] 일정 코멘트 실패:', e);
    return null;
  }
}
