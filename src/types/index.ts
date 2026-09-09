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
  DetailCondition: { settings: Partial<TripSettings> };
  SpotSelect: { settings: TripSettings };
  Timeline: { schedule: TripSchedule };
  BusinessHours: { schedule: TripSchedule };
  Weather: { schedule: TripSchedule; scheduleName: string };
  SavedDetail: { scheduleId: string };
  SpotDetail: { spot: Spot };
};
