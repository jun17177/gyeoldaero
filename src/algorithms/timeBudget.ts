import { Spot } from '../types';

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
}): number {
  const dailyMinutes = (params.endTime - params.startTime) * 60;
  const mealTime = 120;
  const bufferTime = 30;
  const luggageFactor = { light: 1.0, medium: 1.1, heavy: 1.2, very_heavy: 1.4 }[params.luggage];
  const wf = params.weatherFactor ?? 1.0;

  let total = params.spots.reduce((s, sp) => s + sp.durationMinutes, 0);
  total += Math.max(params.spots.length - 1, 0) * 20;
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
