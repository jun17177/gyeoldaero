import { TripSchedule } from '../types';

type AccommodationId = TripSchedule['accommodation'];

// Record<AccommodationId, ...>로 고정 — 숙소 선택지가 바뀌면 tsc가 누락된 키를 잡아준다.
// (이 테이블이 화면·알고리즘에 중복 정의돼 있어 한쪽만 갱신되는 바람에 애월·한림·중문·성산이
//  좌표를 못 찾고 제주시로 대체되던 버그가 있었음)
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

// 사용자가 고를 수 있는 숙소 — custom은 UI 선택지가 아니라 제외
const SELECTABLE_IDS = ['jejucity', 'aewol', 'hallim', 'jungmun', 'seogwipo', 'seongsan'] as const;

export const ACCOMMODATION_OPTIONS: { id: AccommodationId; label: string }[] =
  SELECTABLE_IDS.map(id => ({ id, label: ACCOMMODATION_LABEL[id] }));
