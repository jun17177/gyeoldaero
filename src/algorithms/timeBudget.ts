import { Spot } from '../types';
import { estimateTravelMinutes } from './travelTime';

export const getTransportMode = (luggage: string): 'transit' | 'car' =>
  ['light', 'medium'].includes(luggage) ? 'transit' : 'car';

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
  const luggageFactor = { light: 1.0, medium: 1.1, heavy: 1.2, very_heavy: 1.4 }[params.luggage];
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
