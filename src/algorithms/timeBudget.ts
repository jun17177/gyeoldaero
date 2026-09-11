import { Spot, TripSettings } from '../types';
import { estimateTravelMinutes } from './travelTime';

export const getTransportMode = (luggage: string): 'transit' | 'car' =>
  ['light', 'medium'].includes(luggage) ? 'transit' : 'car';

// 짐이 무거울수록 이동·체류가 느려지는 것을 반영. AI 동선 요청의 보정계수로도 쓰여서 export
export const LUGGAGE_FACTOR: Record<TripSettings['luggage'], number> = {
  light: 1.0,
  medium: 1.1,
  heavy: 1.2,
  very_heavy: 1.4,
};

// 더위·추위로 이동·활동이 느려지는 정도. 날짜별 예보를 모를 때(출발일 선택 전) 쓰는 기본 보정계수
export const SEASON_FACTOR: Record<TripSettings['season'], number> = {
  spring: 1.0,
  summer: 1.1,
  fall: 1.0,
  winter: 1.15,
};

export function calcTripDays(params: {
  spots: Spot[]; // 동선(nearestNeighbor) 순서로 정렬된 상태여야 함
  startTime: number;
  endTime: number;
  firstDayArrival?: number;
  lastDayDeparture?: number;
  luggage: 'light' | 'medium' | 'heavy' | 'very_heavy';
  weatherFactor?: number;
}): number {
  const dailyMinutes = (params.endTime - params.startTime) * 60;
  const mealTime = 120;
  const bufferTime = 30;
  const luggageFactor = LUGGAGE_FACTOR[params.luggage];
  const wf = params.weatherFactor ?? 1.0;
  const mode = getTransportMode(params.luggage);

  let total = params.spots.reduce((s, sp) => s + sp.durationMinutes, 0);
  for (let i = 1; i < params.spots.length; i++) {
    const prev = params.spots[i - 1];
    const cur = params.spots[i];
    total += estimateTravelMinutes(prev.lat, prev.lon, cur.lat, cur.lon, mode);
  }
  total += mealTime + bufferTime;
  total *= luggageFactor * wf;

  const firstDay = params.firstDayArrival
    ? (params.endTime - params.firstDayArrival) * 60
    : dailyMinutes;
  const lastDay = params.lastDayDeparture
    ? (params.lastDayDeparture - params.startTime) * 60
    : dailyMinutes;

  if (total <= firstDay) return 1;
  const remaining = total - firstDay - lastDay;
  if (remaining <= 0) return 2;
  return Math.ceil(remaining / dailyMinutes) + 2;
}
