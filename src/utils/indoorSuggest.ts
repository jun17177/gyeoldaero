import { Spot, TripSchedule } from '../types';
import { isIndoorSpot } from './spotEnvironment';
import { isSameSpotName } from './mergeSpots';
import { haversineDistance } from '../algorithms/haversine';
import { themeScore } from '../constants/themeProfiles';
import { generateTimeline } from '../algorithms/generateTimeline';

// 분류가 '문화'여도 민속촌·미로공원처럼 실제로는 야외인 곳이 있어, 이름·태그에 야외 단서가 있으면 비 오는 날 후보에서 뺀다.
// (서버의 배치 검증은 더 느슨한 isIndoorSpot 기준을 쓰지만, 사용자에게 "비 오는 날 가라"고 권하는 곳은 확실한 실내만 고른다)
const OUTDOOR_HINTS = ['공원', '민속촌', '민속마을', '마을', '미로', '정원', '수목원', '숲', '오름', '해변', '해수욕장', '폭포', '올레', '트레킹', '승마', '카약', '레일바이크', '카트', '목장'];

function looksOutdoor(spot: Pick<Spot, 'tags'> & { name?: string }): boolean {
  const texts = [spot.name ?? '', ...spot.tags];
  return texts.some(t => OUTDOOR_HINTS.some(h => t.includes(h)));
}

// 식당은 식사 시간에 들르는 곳이라 "비 오는 날 갈 명소"로 세지 않는다. 카페·박물관·미술관 등은 센다.
export function isRainyDaySpot(spot: Pick<Spot, 'category' | 'tags' | 'foodType'> & { name?: string }): boolean {
  // 미식 분류는 카페만 센다 (시드 식당은 foodType이 없어, 명시된 카페가 아니면 식당으로 본다)
  if (spot.category === 'food' && spot.foodType !== 'cafe') return false;
  return isIndoorSpot(spot) && !looksOutdoor(spot);
}

export function countRainyDaySpots(spots: (Pick<Spot, 'category' | 'tags' | 'foodType'> & { name?: string })[]): number {
  return spots.filter(isRainyDaySpot).length;
}

const MAX_DISTANCE_KM = 60; // 제주 안에서 하루 동선으로 이어질 만한 거리

// 일정에 없는 실내 명소 중 비·눈 오는 날 가기 좋은 곳을 추린다.
// 일정 명소들의 중심에서 가까운 순으로, 사용자가 고른 테마와 맞으면 앞에 둔다.
export function recommendIndoorSpots(schedule: TripSchedule, pool: Spot[], limit = 4): Spot[] {
  if (schedule.spots.length === 0) return [];
  const lat = schedule.spots.reduce((s, p) => s + p.lat, 0) / schedule.spots.length;
  const lon = schedule.spots.reduce((s, p) => s + p.lon, 0) / schedule.spots.length;

  return pool
    .filter(s => isRainyDaySpot(s))
    .filter(s => !schedule.spots.some(x => x.id === s.id || isSameSpotName(x.name, s.name)))
    .map(s => ({ s, dist: haversineDistance(lat, lon, s.lat, s.lon), theme: themeScore(s, schedule.settings.themes) }))
    .filter(x => x.dist <= MAX_DISTANCE_KM)
    .sort((a, b) => b.theme - a.theme || a.dist - b.dist)
    .slice(0, limit)
    .map(x => x.s);
}

// 고른 실내 명소를 일정에 보태고, 편집 화면(Timeline)이 새 동선을 만들도록 기존 dayPlans를 비운다.
// (Timeline의 명소 편집과 같은 방식 — 저장하면 날씨 선택 화면에서 AI가 비·눈 오는 날에 이 명소들을 배정한다)
export function addSpotsToSchedule(schedule: TripSchedule, added: Spot[]): TripSchedule {
  const base: TripSchedule = {
    ...schedule,
    spots: [...schedule.spots, ...added],
    dayPlans: undefined,
    mealOptionsEnriched: false,
    moveDurationsBySpotId: undefined,
    planSource: 'algorithm',
    aiReason: undefined,
    aiComment: undefined,
    weatherPlan: undefined, // 명소가 바뀌었으니 이전 날씨 조정은 더 이상 유효하지 않다
  };
  return { ...base, days: generateTimeline(base).length };
}
