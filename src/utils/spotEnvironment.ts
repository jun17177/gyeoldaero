import { Spot } from '../types';

// 실내/야외 판정 — 서버 planner/feasibility.ts의 isIndoor와 같은 기준이어야 한다.
// (서버는 비·눈 오는 날 배치 검증에, 앱은 타임라인 표기에 쓴다)
const INDOOR_TAG_HINTS = ['실내', '박물관', '미술관', '전시', '시장', '카페', '체험', '수족관', '동굴'];

export function isIndoorSpot(spot: Pick<Spot, 'category' | 'tags'>): boolean {
  return spot.category === 'culture'
    || spot.category === 'food'
    || spot.tags.some(tag => INDOOR_TAG_HINTS.some(hint => tag.includes(hint)));
}

export function environmentLabel(spot: Pick<Spot, 'category' | 'tags'>): string {
  return isIndoorSpot(spot) ? '실내' : '야외';
}
