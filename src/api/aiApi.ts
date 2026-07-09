import axios from 'axios';
import { Spot, TripSettings } from '../types';

// 결대로 백엔드(gyeoldaero-server) 주소.
// 실기기(Expo Go)에서는 localhost가 폰 자신을 가리키므로 Mac의 LAN IP를 써야 한다.
// 우선순위: .env의 EXPO_PUBLIC_SERVER_URL > 아래 기본값 (`ipconfig getifaddr en0`로 확인)
const BASE_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://192.168.219.114:3001';

const client = axios.create({ baseURL: BASE_URL, timeout: 20000 });

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
