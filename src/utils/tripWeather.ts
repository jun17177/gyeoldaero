import { WeatherDay, SkyCondition } from '../api/weatherApi';
import { addDays, toYyyymmdd } from './calendar';
import { parseYyyymmdd } from './date';

export interface TripWeather {
  // 여행 일수만큼의 칸. 예보가 있는 날은 날씨, 없는 날(예보 범위 밖·이미 지난 날)은 null
  days: (SkyCondition | null)[];
  tMin: number; // 예보가 있는 날들 중 가장 낮은 최저기온
  tMax: number; // 예보가 있는 날들 중 가장 높은 최고기온
}

// 저장된 일정(출발일 + 총 일수)과 10일 예보를 겹쳐 목록 카드에 보여줄 날씨를 만든다.
// 출발일이 없거나 겹치는 예보가 하루도 없으면 null (호출부에서 날씨 줄을 숨긴다).
export function tripWeather(startDate: string | undefined, totalDays: number, forecast: WeatherDay[]): TripWeather | null {
  const start = parseYyyymmdd(startDate);
  if (!start || forecast.length === 0) return null;
  const len = Math.max(Math.floor(totalDays) || 1, 1);
  const byDate = new Map(forecast.map(d => [d.date, d]));

  const days: (SkyCondition | null)[] = [];
  const found: WeatherDay[] = [];
  for (let i = 0; i < len; i++) {
    const f = byDate.get(toYyyymmdd(addDays(start, i)));
    days.push(f ? f.condition : null);
    if (f) found.push(f);
  }
  if (found.length === 0) return null;
  return {
    days,
    tMin: Math.min(...found.map(d => d.tMin)),
    tMax: Math.max(...found.map(d => d.tMax)),
  };
}
