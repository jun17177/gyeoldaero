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

// ── 추천 전용 기준 ──────────────────────────────────────────────
// "일정에 실내 명소가 몇 곳인가"(위 isRainyDaySpot)는 사용자가 고른 곳을 느슨하게 세지만,
// 사용자에게 "비 오는 날 여기 가세요"라고 권하는 곳은 근거가 분명해야 한다.
// 비짓제주 태그에는 '비.눈'·'실내관광지' 같은 명시적 표시가 있어 이를 우선한다.
// 분류가 문화여도 유적지·절은 야외이고, 숙소(템플스테이·호텔)는 명소가 아니라서 뺀다.
const LODGING_HINTS = ['템플스테이', '숙소', '호텔', '펜션', '게스트하우스', '캠핑', '글램핑'];
const HERITAGE_HINTS = ['유적', '사찰', '절'];
const NON_ATTRACTION_HINTS = ['컨벤션']; // 실내이긴 해도 관광 명소가 아닌 시설

function tagsOf(spot: { name?: string; tags: string[] }): string[] {
  return [spot.name ?? '', ...spot.tags];
}

// 비 오는 날 가기 좋다는 근거의 강도: 3 = 비·눈 명시, 2 = 실내 관광지·박물관류, 1 = '실내' 태그·전시·카페 등, 0 = 근거 없음
export function rainEvidence(spot: Pick<Spot, 'tags'> & { name?: string }): number {
  const tags = spot.tags;
  const has = (hints: string[]) => tags.some(t => hints.some(h => t.includes(h)));
  if (has(['비.눈', '비눈', '우천'])) return 3;
  if (has(['실내관광지', '실내가볼만한곳', '미술/박물관', '박물관', '미술관', '수족관', '과학관', '아쿠아'])) return 2;
  if (has(['실내', '전시', '카페', '동굴', '시장', '전시관'])) return 1;
  return 0;
}

function isRecommendable(spot: Pick<Spot, 'category' | 'tags' | 'foodType'> & { name?: string }): boolean {
  if (!isRainyDaySpot(spot) || rainEvidence(spot) === 0) return false;
  if (tagsOf(spot).some(t => [...LODGING_HINTS, ...NON_ATTRACTION_HINTS].some(h => t.includes(h)))) return false;
  // 이름이 '○○사'로 끝나는 절, 유적지 태그는 야외로 본다
  if (spot.tags.some(t => HERITAGE_HINTS.some(h => t.includes(h) && h !== '절'))) return false;
  if (spot.name && /사$/.test(spot.name.replace(/\s+/g, ''))) return false;
  return true;
}

const MAX_DISTANCE_KM = 60; // 제주 안에서 하루 동선으로 이어질 만한 거리

// 일정에 없는 실내 명소 중 비·눈 오는 날 가기 좋은 곳을 추린다.
// 근거(비·눈 명시 > 실내 관광지·박물관 > 실내 태그)가 강한 순, 사용자가 고른 테마와 맞는 순, 일정 중심에서 가까운 순.
export function recommendIndoorSpots(schedule: TripSchedule, pool: Spot[], limit = 4): Spot[] {
  if (schedule.spots.length === 0) return [];
  const lat = schedule.spots.reduce((s, p) => s + p.lat, 0) / schedule.spots.length;
  const lon = schedule.spots.reduce((s, p) => s + p.lon, 0) / schedule.spots.length;

  return pool
    .filter(s => isRecommendable(s))
    .filter(s => !schedule.spots.some(x => x.id === s.id || isSameSpotName(x.name, s.name)))
    .map(s => ({ s, dist: haversineDistance(lat, lon, s.lat, s.lon), theme: themeScore(s, schedule.settings.themes), evidence: rainEvidence(s) }))
    .filter(x => x.dist <= MAX_DISTANCE_KM)
    // 근거가 강한 곳 → 선택한 테마와 맞는 곳 → 가까운 곳 순
    .sort((a, b) => b.evidence - a.evidence || b.theme - a.theme || a.dist - b.dist)
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
