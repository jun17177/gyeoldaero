import { haversineDistance } from './haversine';
import { isJejuCoord } from '../constants/jejuBounds';

// 실시간 교통 API 없이, 직선거리에 도로 굴곡 보정을 곱하고 이동수단별 평균 속도로 나눠 추정
const ROAD_DETOUR_FACTOR = 1.3; // 제주 도로는 해안선·중산간 지형 탓에 직선거리보다 굴곡짐
const AVG_SPEED_KMH: Record<'car' | 'transit', number> = {
  car: 40,
  transit: 25, // 정류장 대기·환승 포함
};
const BOARDING_OVERHEAD_MIN = 5; // 주차·승하차 등 고정 오버헤드
const MIN_TRAVEL_MIN = 10;
// 좌표를 모르는 곳(좌표 검사가 생기기 전에 저장된 일정 등)은 제주 안의 평균적인 이동으로 가정 —
// 그대로 계산하면 수만 분이 나와 일정 전체가 망가짐
const UNKNOWN_LOCATION_TRAVEL_MIN = 30;

export function estimateTravelMinutes(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
  mode: 'car' | 'transit' = 'car',
): number {
  if (!isJejuCoord(lat1, lon1) || !isJejuCoord(lat2, lon2)) return UNKNOWN_LOCATION_TRAVEL_MIN;
  const roadDistanceKm = haversineDistance(lat1, lon1, lat2, lon2) * ROAD_DETOUR_FACTOR;
  const minutes = (roadDistanceKm / AVG_SPEED_KMH[mode]) * 60 + BOARDING_OVERHEAD_MIN;
  return Math.max(MIN_TRAVEL_MIN, Math.round(minutes));
}
