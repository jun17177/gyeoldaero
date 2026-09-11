import { TripSchedule } from '../types';

type AccommodationId = TripSchedule['accommodation'];

export const ACCOMMODATION_COORDS: Record<AccommodationId, { lat: number; lon: number }> = {
  jejucity: { lat: 33.4996, lon: 126.5312 }, // 제주시 (공항 포함)
  aewol:    { lat: 33.4600, lon: 126.3100 }, // 애월
  hallim:   { lat: 33.3925, lon: 126.2376 }, // 한림 (서쪽 해안)
  jungmun:  { lat: 33.2453, lon: 126.4126 }, // 중문 리조트
  seogwipo: { lat: 33.2541, lon: 126.5600 }, // 서귀포 시내
  seongsan: { lat: 33.4390, lon: 126.9229 }, // 성산 (동쪽)
  custom:   { lat: 33.4996, lon: 126.5312 },
};

export const ACCOMMODATION_LABEL: Record<AccommodationId, string> = {
  jejucity: '제주시',
  aewol:    '애월',
  hallim:   '한림',
  jungmun:  '중문',
  seogwipo: '서귀포',
  seongsan: '성산',
  custom:   '직접입력',
};
