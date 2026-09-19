import { DayPlan, Spot, TimelineItem, TripSchedule } from '../types';
import { fetchNearbyRestaurants } from './tourApi';
import { fetchSpotRecommendations } from './aiApi';
import { ACCOMMODATION_COORDS } from '../algorithms/generateTimeline';

// 식사 시점 직전 명소 위치 기준으로 실제 음식점을 찾아
// 타임라인 meal 아이템의 options(하드코딩 메뉴)를 식당 이름 3개로 교체한다.
// TourAPI·LLM 어느 쪽이 실패해도 원본 dayPlans를 그대로 반환한다 (폴백).

// 식사 슬롯마다 조회 + LLM 선별을 순차로 돌리면 4일 일정(식사 8회)에 20초가 넘는다.
// 동시에 돌리되 외부 API 호출 제한을 고려해 이 수만큼만 겹친다.
const CONCURRENCY = 4;

interface MealSlot {
  dayIdx: number;
  itemIdx: number;
  lat: number;
  lon: number;
}

// 동시 실행 수를 제한하면서 순서대로 결과를 모은다
async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function enrichMealOptions(
  dayPlans: DayPlan[],
  schedule: TripSchedule,
  shouldCancel: () => boolean = () => false,
): Promise<DayPlan[]> {
  const accomCoords =
    schedule.accommodation === 'custom' && schedule.customAccommodationCoords
      ? schedule.customAccommodationCoords
      : (ACCOMMODATION_COORDS[schedule.accommodation] ?? ACCOMMODATION_COORDS.jejucity);
  const spotByName = new Map(schedule.spots.map(s => [s.name, s]));

  // 1) 식사 슬롯과 기준 좌표(식사 직전 명소, 없으면 숙소)를 먼저 모은다
  const slots: MealSlot[] = [];
  dayPlans.forEach((plan, dayIdx) => {
    plan.items.forEach((item, itemIdx) => {
      if (item.type !== 'meal') return;
      let coord = accomCoords;
      for (let i = itemIdx - 1; i >= 0; i--) {
        const prev = plan.items[i];
        if (prev.type === 'spot') {
          const spot = spotByName.get(prev.name);
          if (spot) coord = { lat: spot.lat, lon: spot.lon };
          break;
        }
      }
      slots.push({ dayIdx, itemIdx, lat: coord.lat, lon: coord.lon });
    });
  });
  if (slots.length === 0) return dayPlans;

  // 2) 같은 기준점은 결과가 같으므로 한 번만 조회·선별한다 (좌표를 약 100m 단위로 묶음)
  const cache = new Map<string, Promise<string[]>>();
  const keyOf = (s: MealSlot) => `${s.lat.toFixed(3)},${s.lon.toFixed(3)}`;

  const resolve = (slot: MealSlot): Promise<string[]> => {
    const key = keyOf(slot);
    const hit = cache.get(key);
    if (hit) return hit;
    const task = (async (): Promise<string[]> => {
      try {
        const nearby = await fetchNearbyRestaurants(slot.lat, slot.lon, 5000);
        if (nearby.length === 0 || shouldCancel()) return [];
        const picked = await pickRestaurants(nearby.slice(0, 10), schedule);
        return picked.map(r => r.name);
      } catch (e) {
        console.warn('[mealRecommend] 식당 조회 실패, 기본 옵션 유지:', e);
        return [];
      }
    })();
    cache.set(key, task);
    return task;
  };

  const names = await mapWithLimit(slots, CONCURRENCY, slot =>
    shouldCancel() ? Promise.resolve<string[]>([]) : resolve(slot),
  );

  // 3) 결과를 원래 자리에 되돌려 놓는다
  const itemsByDay = dayPlans.map(plan => [...plan.items]);
  slots.forEach((slot, i) => {
    const options = names[i];
    if (options.length === 0) return; // 실패·취소 시 기본 옵션 유지
    const item = itemsByDay[slot.dayIdx][slot.itemIdx] as TimelineItem;
    itemsByDay[slot.dayIdx][slot.itemIdx] = { ...item, options };
  });

  return dayPlans.map((plan, i) => ({ ...plan, items: itemsByDay[i] }));
}

// 후보가 충분하면 LLM이 테마에 맞게 3곳 선별, 실패하면 가까운 순 3곳
async function pickRestaurants(candidates: Spot[], schedule: TripSchedule): Promise<Spot[]> {
  if (candidates.length > 3) {
    const result = await fetchSpotRecommendations({
      spots: candidates,
      settings: schedule.settings,
      maxCount: 3,
    });
    if (result && result.recommendations.length > 0) {
      const byId = new Map(candidates.map(s => [s.id, s]));
      const picked = result.recommendations
        .map(r => byId.get(r.spotId))
        .filter((s): s is Spot => !!s);
      if (picked.length > 0) return picked.slice(0, 3);
    }
  }
  return candidates.slice(0, 3);
}
