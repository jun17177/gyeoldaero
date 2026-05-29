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
  tags: string[];
  settings: TripSettings;
  dayPlans?: DayPlan[];
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
  SavedDetail: { scheduleId: string };
};
