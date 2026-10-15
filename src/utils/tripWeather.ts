import { WeatherDay, SkyCondition } from '../api/weatherApi';
import { addDays, toYyyymmdd } from './calendar';
import { parseYyyymmdd } from './date';

export interface TripWeather {
  // 여행 일수만큼의 칸. 예보가 있는 날은 날씨, 없는 날(예보 범위 밖·이미 지난 날)은 null
  days: (SkyCondition | null)[];
  // 같은 칸의 예보 전체(기온 포함). 없는 날은 null
  forecastDays: (WeatherDay | null)[];
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
  const forecastDays: (WeatherDay | null)[] = [];
  const found: WeatherDay[] = [];
  for (let i = 0; i < len; i++) {
    const f = byDate.get(toYyyymmdd(addDays(start, i)));
    days.push(f ? f.condition : null);
    forecastDays.push(f ?? null);
    if (f) found.push(f);
  }
  if (found.length === 0) return null;
  return {
    days,
    forecastDays,
    tMin: Math.min(...found.map(d => d.tMin)),
    tMax: Math.max(...found.map(d => d.tMax)),
  };
}

export type WeatherAdviceState =
  | 'suggest'     // 일정 전체가 예보 안이고 비·눈이 있으며, 아직 날씨를 반영하지 않음 → 조정 제안
  | 'needIndoor'  // 비·눈 오는 날을 채울 실내 명소가 부족함 → 조정해도 바뀔 게 없으니 실내 명소 추천을 제안
  | 'adjusted'    // 이미 같은 예보로 날씨를 반영해 조정한 일정
  | 'partial';    // 비·눈은 있지만 예보가 일정 일부만 덮어 자동 조정은 못 함

export interface WeatherAdvice {
  state: WeatherAdviceState;
  badDays: number[];      // 비·눈이 오는 날 (1부터 센 일차)
  fullyCovered: boolean;  // 일정 전체가 예보 안인지 (자동 조정 가능 여부)
}

// 상세 화면의 날씨 안내를 정한다. 비·눈이 없거나 예보가 안 겹치면 null (안내 없음).
// 날씨 반영 재설계(WeatherScreen.replanForWeather)가 일정 전체가 예보 안에 있을 때만 동작하므로 같은 조건으로 판단한다.
// rainyDaySpotCount(비 오는 날 갈 만한 실내 명소 수)가 비·눈 오는 날 수보다 적으면 needIndoor —
// 야외 명소만으로는 조정해도 자리를 바꿀 곳이 없기 때문이다. (넘기지 않으면 이 판단은 건너뛴다)
export function weatherAdvice(
  startDate: string | undefined,
  totalDays: number,
  forecast: WeatherDay[],
  weatherPlan?: string,
  rainyDaySpotCount?: number,
): WeatherAdvice | null {
  const tw = tripWeather(startDate, totalDays, forecast);
  if (!tw) return null;
  const badDays = tw.days.flatMap((c, i) => (c === 'rainy' || c === 'snowy' ? [i + 1] : []));
  if (badDays.length === 0) return null;
  const fullyCovered = tw.days.every(c => c !== null);

  const adjusted = fullyCovered && weatherPlan === tw.days.join(',');
  if (adjusted) return { state: 'adjusted', badDays, fullyCovered };
  if (rainyDaySpotCount !== undefined && rainyDaySpotCount < badDays.length) {
    return { state: 'needIndoor', badDays, fullyCovered };
  }
  return { state: fullyCovered ? 'suggest' : 'partial', badDays, fullyCovered };
}
