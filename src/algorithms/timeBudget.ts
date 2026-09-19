import { Spot } from '../types';

export const LUGGAGE_FACTOR = { light: 1, medium: 1.1, heavy: 1.2, very_heavy: 1.4 };
export const SEASON_FACTOR = { spring: 1, summer: 1.1, fall: 1, winter: 1.15 };

export const getTransportMode = (luggage: string): 'transit' | 'car' =>
  ['light', 'medium'].includes(luggage) ? 'transit' : 'car';

export function calcTripDays(params: {
  spots: Spot[];
  startTime: number;
  endTime: number;
  firstDayArrival?: number;
  lastDayDeparture?: number;
  luggage: 'light' | 'medium' | 'heavy' | 'very_heavy';
  weatherFactor?: number;
  moveDurationsBySpotId?: Record<string, number>;
}): number {
  // 활동시간이 0 이하이면 나눗셈이 Infinity가 되어 호출부(generateTimeline)가 무한루프에 빠질 수 있으므로 최소 1분 보장
  const dailyMinutes = Math.max((params.endTime - params.startTime) * 60, 1);
  const mealTime = 120;
  const bufferTime = 30;
  const luggageFactor = { light: 1.0, medium: 1.1, heavy: 1.2, very_heavy: 1.4 }[params.luggage];
  const wf = params.weatherFactor ?? 1.0;

  let total = params.spots.reduce((s, sp) => s + sp.durationMinutes, 0);
  total += params.spots.reduce(
    (s, sp) => s + (params.moveDurationsBySpotId?.[sp.id] ?? 20),
    0
  );
  total += mealTime + bufferTime;
  total *= luggageFactor * wf;

  const firstDay = params.firstDayArrival !== undefined
    ? Math.max(0, (params.endTime - params.firstDayArrival) * 60)
    : dailyMinutes;
  const lastDay = params.lastDayDeparture !== undefined
    ? Math.max(0, (params.lastDayDeparture - params.startTime) * 60)
    : dailyMinutes;

  if (total <= firstDay) return 1;
  const remaining = total - firstDay - lastDay;
  if (remaining <= 0) return 2;
  return Math.ceil(remaining / dailyMinutes) + 2;
}
