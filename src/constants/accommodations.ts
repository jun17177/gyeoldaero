import { TripSchedule } from '../types';

type AccommodationId = TripSchedule['accommodation'];

// 숙소 좌표·이름·선택지의 단일 출처. 예전에는 화면과 알고리즘이 각자 표를 갖고 있어
// 한쪽만 고치면 어긋났다 (이름 키가 빠진 숙소가 조용히 제주시로 대체되는 버그의 원인).
// Record<AccommodationId, ...>로 고정해 숙소가 늘면 누락된 키를 tsc가 잡아준다.
// 'airport'는 이전 버전에서 저장된 일정에 남아 있을 수 있어 좌표만 유지한다.
export const ACCOMMODATION_COORDS: Record<AccommodationId | 'airport', { lat: number; lon: number }> = {
  airport:  { lat: 33.5074, lon: 126.4927 },
  jejucity: { lat: 33.4996, lon: 126.5312 }, // 제주시
  aewol:    { lat: 33.4600, lon: 126.3100 }, // 애월
  hallim:   { lat: 33.3925, lon: 126.2376 }, // 한림 (서쪽 해안)
  jungmun:  { lat: 33.2453, lon: 126.4126 }, // 중문 리조트
  seogwipo: { lat: 33.2541, lon: 126.5600 }, // 서귀포 시내
  seongsan: { lat: 33.4390, lon: 126.9229 }, // 성산 (동쪽)
  custom:   { lat: 33.4996, lon: 126.5312 }, // 직접 입력 (좌표는 customAccommodationCoords가 우선)
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

// 숙소 선택 칩 순서 (직접입력이 맨 앞)
const OPTION_ORDER: AccommodationId[] = ['custom', 'jejucity', 'aewol', 'hallim', 'jungmun', 'seogwipo', 'seongsan'];

export const ACCOMMODATION_OPTIONS: { id: AccommodationId; label: string }[] =
  OPTION_ORDER.map(id => ({ id, label: ACCOMMODATION_LABEL[id] }));
