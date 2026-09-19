import { Spot, TimelineItem } from '../types';

// 타임라인 항목이 가리키는 명소를 찾는다.
// spotId로 찾는 것이 정확하지만, 이 필드가 생기기 전에 저장된 일정에는 없으므로 이름으로 폴백한다.
// (이름 폴백은 같은 이름이 둘이면 첫 번째를 고른다 — 새로 만든 일정은 spotId가 있어 이 문제가 없다)
export function findSpotOf(spots: Spot[], item: Pick<TimelineItem, 'spotId' | 'name'>): Spot | undefined {
  if (item.spotId) {
    const byId = spots.find(s => s.id === item.spotId);
    if (byId) return byId;
  }
  return spots.find(s => s.name === item.name);
}
