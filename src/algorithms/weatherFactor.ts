import { SEASON_FACTOR } from './timeBudget';
import { SkyCondition, TripSettings } from '../types';

// 날씨 → 일수 보정계수. 기간 산정의 단일 기준이다 (비·눈이 오면 이동·실내외 전환으로 시간이 더 든다).
export const CONDITION_FACTOR: Record<SkyCondition, number> = {
  sunny: 1.0, cloudy: 1.0, rainy: 1.2, snowy: 1.3,
};

// 여행 날짜의 예보로 구한 보정계수 = 계절 계수 × 날짜별 날씨 계수의 평균.
// 예전에는 "오늘 날씨"를 썼지만 여행 날짜와 무관해 일수가 부풀려지곤 했다.
// 예보가 비어 있으면 날씨 영향 없이 계절 계수만 쓴다.
export function forecastWeatherFactor(season: TripSettings['season'], conditions: SkyCondition[]): number {
  const base = SEASON_FACTOR[season] ?? 1;
  if (conditions.length === 0) return base;
  const mean = conditions.reduce((sum, c) => sum + (CONDITION_FACTOR[c] ?? 1), 0) / conditions.length;
  return base * mean;
}
