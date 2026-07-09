export interface Spot {
  id: string;
  name: string;
  category: 'nature' | 'activity' | 'culture' | 'food' | 'photo' | 'night';
  lat: number;
  lon: number;
  durationMinutes: number;
  imageUrl?: string;
  emoji: string;
  tags: string[];
  businessHoursUrl?: string;
}

export interface TripSchedule {
  id: string;
  name: string;
  createdAt: string;
  days: number;
  spots: Spot[];
  accommodation: 'jejucity' | 'aewol' | 'hallim' | 'jungmun' | 'seogwipo' | 'seongsan' | 'custom';
  customAccommodationAddress?: string;
  customAccommodationCoords?: {
    lat: number;
    lon: number;
  };
  moveDurationsBySpotId?: Record<string, number>;
  tags: string[];
  settings: TripSettings;
  dayPlans?: DayPlan[];
  aiComment?: string;   // AI 플래너 코멘트 — 저장 시 함께 보관해 재방문 시 재호출 방지
  startDate?: string;   // 여행 출발일 (YYYYMMDD) — 날씨 화면에서 선택, 미선택 시 undefined
  manualSpotOrder?: boolean; // 사용자가 타임라인에서 직접 순서를 조정함 — 자동 재정렬(nearestNeighbor) 건너뜀
}

export interface TripSettings {
  themes: ('healing' | 'activity' | 'food' | 'culture' | 'photo' | 'night')[];
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  season: 'spring' | 'summer' | 'fall' | 'winter';
  startTime: number;
  endTime: number;
  firstDayArrival?: number;
  lastDayDeparture?: number;
  people: number;
  budget: number;
  luggage: 'light' | 'medium' | 'heavy' | 'very_heavy';
}

export interface TimelineItem {
  type: 'spot' | 'meal' | 'accommodation' | 'move';
  time: string;
  name: string;
  duration: number;
  dotColor: string;
  options?: string[];
  selectedOption?: string;  // 사용자가 고른 식당 (meal 전용)
  linkUrl?: string;
}

export interface DayPlan {
  day: number;
  items: TimelineItem[];
}

export type RootStackParamList = {
  Splash: undefined;
  SavedList: undefined;
  Home: undefined;
  TravelStyle: { mode: 'manual' | 'auto' };
  DetailCondition: { settings: Partial<TripSettings>; mode?: 'manual' | 'auto' };
  SpotSelect: { settings: TripSettings; mode?: 'manual' | 'auto' };
  Timeline: { schedule: TripSchedule };
  RouteMap: { schedule: TripSchedule; initialDay?: number };
  Weather: { schedule: TripSchedule; scheduleName: string };
  BusinessHours: { schedule: TripSchedule };
  SavedDetail: { schedule: TripSchedule };
};
