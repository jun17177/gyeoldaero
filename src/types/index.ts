export interface Spot {
  foodType?: 'cafe' | 'restaurant';
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
  // 비짓제주에 다른 이름으로 등록된 명소를 사진 매칭에 이어주기 위한 별칭
  // (예: 넥슨컴퓨터박물관 → "넥슨뮤지엄")
  photoAliases?: string[];
}

export interface TripSchedule {
  planSource?: 'ai' | 'algorithm';
  aiReason?: string;
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
  mealOptionsEnriched?: boolean;
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
  // 어떤 명소인지 가리키는 id (type==='spot'). 이름이 같은 명소가 생겨도 정확히 한 곳만 짚기 위함.
  // 이 필드가 생기기 전에 저장된 일정에는 없으므로 조회할 때 이름으로 폴백한다.
  spotId?: string;
  duration: number;
  dotColor: string;
  options?: string[];
  selectedOption?: string;  // 사용자가 고른 식당 (meal 전용)
  linkUrl?: string;
}

export interface DayPlan {
  note?: string;
  day: number;
  items: TimelineItem[];
}

export type SkyCondition = TripSettings['weather'];

// server/src/schema.ts의 routePlanRequestSchema와 형태를 맞춰야 함
export interface RoutePlanRequest {
  spots: Pick<Spot, 'id' | 'name' | 'category' | 'durationMinutes' | 'tags' | 'foodType'>[];
  settings: TripSettings;
  accommodationLabel: string;
  travelMinutes: number[][]; // [0] = 숙소, [k] = spots[k - 1]. 분 단위 추정치
  baseline: { days: number; order: string[] };
  slackFactor: number; // 짐 무게 × 날씨 보정계수
  weatherByDay?: SkyCondition[];
}

export interface AiRoutePlan {
  days: { spotIds: string[]; note: string }[];
  daysReason: string;
}

// 자동 설정: 자유 문장을 Claude가 해석한 결과 (server/src/tripSettings.ts의 TripSettingsResult와 맞춰야 함)
export interface AiTripSettings {
  settings: TripSettings;
  summary: string; // AI가 이해한 내용 — 화면에 그대로 보여줌
}

export type RootStackParamList = {
  AutoSetup: undefined;
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
