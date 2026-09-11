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
  // category === 'food'일 때만 의미 있음. 'restaurant'는 동선상 점심/저녁 슬롯에 배정,
  // 'cafe'·미지정은 일반 명소로 취급
  foodType?: 'cafe' | 'restaurant';
  // TourAPI contenttypeid. TourAPI 출처 명소만 값이 있고, 명소 상세 조회(detailIntro2)에 필요
  contentTypeId?: string;
}

export interface TripSchedule {
  id: string;
  name: string;
  createdAt: string;
  days: number;
  spots: Spot[];
  accommodation: 'jejucity' | 'aewol' | 'hallim' | 'jungmun' | 'seogwipo' | 'seongsan' | 'custom';
  tags: string[];
  settings: TripSettings;
  dayPlans?: DayPlan[];
  startDate?: string; // YYYYMMDD
  // 동선·기간을 누가 정했는지. 화면의 "AI 추천" 표기를 실제와 맞추기 위함
  planSource?: 'ai' | 'algorithm';
  aiReason?: string; // AI가 이 기간을 추천한 이유
}

// 날씨는 여행 설정에서 고르지 않는다 — 출발일을 정한 뒤 예보(WeatherScreen)로만 알 수 있음
export type SkyCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy';

export interface TripSettings {
  themes: ('healing' | 'activity' | 'food' | 'culture' | 'photo' | 'night')[];
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
  linkUrl?: string;
}

export interface DayPlan {
  day: number;
  items: TimelineItem[];
  note?: string; // AI가 요약한 그날 동선
}

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
  Splash: undefined;
  SavedList: undefined;
  Home: undefined;
  TravelStyle: undefined;
  AutoSetup: undefined;
  DetailCondition: { settings: Partial<TripSettings> };
  SpotSelect: { settings: TripSettings };
  Timeline: { schedule: TripSchedule };
  BusinessHours: { schedule: TripSchedule };
  Weather: { schedule: TripSchedule; scheduleName: string };
  SavedDetail: { scheduleId: string };
  SpotDetail: { spot: Spot };
};
