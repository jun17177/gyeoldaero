// 앱(gyeoldaero-main/src/types)과 맞춘 요청/응답 타입

export interface SpotCandidate {
  id: string;
  name: string;
  category: string;
  tags: string[];
}

export interface TripSettingsInput {
  themes: string[];
  season: string;
  weather: string;       // sunny | cloudy | rainy | snowy
  luggage: string;       // light | medium | heavy | very_heavy
  people: number;
}

// POST /api/recommend-spots
export interface RecommendSpotsRequest {
  spots: SpotCandidate[];          // 후보 명소 (앱이 TourAPI에서 받은 목록)
  settings: TripSettingsInput;
  maxCount?: number;               // 기본 5
}

export interface SpotRecommendation {
  spotId: string;
  reason: string;                  // 한 줄 추천 이유
}

export interface RecommendSpotsResponse {
  recommendations: SpotRecommendation[];
  summary: string;                 // 전체 추천 한 줄 요약
}

// POST /api/trip-comment
export interface TripCommentRequest {
  days: number;
  spots: { name: string; category: string }[];  // 최적화된 방문 순서
  settings: TripSettingsInput;
  weatherLabel?: string;           // 예: "비 18°"
}

export interface TripCommentResponse {
  comment: string;                 // 일정에 대한 자연어 코멘트 (2~3문장)
}
