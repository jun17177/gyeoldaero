import { DayPlan, Spot, TripSchedule } from '../types';
import { fetchNearbyRestaurants } from './tourApi';
import { fetchSpotRecommendations } from './aiApi';
import { ACCOMMODATION_COORDS } from '../algorithms/generateTimeline';

// 식사 시점 직전 명소 위치 기준으로 실제 음식점을 찾아
// 타임라인 meal 아이템의 options(하드코딩 메뉴)를 식당 이름 3개로 교체한다.
// TourAPI·LLM 어느 쪽이 실패해도 원본 dayPlans를 그대로 반환한다 (폴백).
export async function enrichMealOptions(
  dayPlans: DayPlan[],
  schedule: TripSchedule,
): Promise<DayPlan[]> {
  const accomCoords =
    schedule.accommodation === 'custom' && schedule.customAccommodationCoords
      ? schedule.customAccommodationCoords
      : (ACCOMMODATION_COORDS[schedule.accommodation] ?? ACCOMMODATION_COORDS.jejucity);
  const spotByName = new Map(schedule.spots.map(s => [s.name, s]));

  // TourAPI 호출 제한(429) 방지를 위해 식사 슬롯을 순차 처리한다
  const enriched: DayPlan[] = [];
  for (const plan of dayPlans) {
    const items = [...plan.items];
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      if (item.type !== 'meal') continue;

      // 식사 시점 직전 spot의 좌표를 기준점으로 잡는다
      let coord = accomCoords;
      for (let i = idx - 1; i >= 0; i--) {
        const prev = items[i];
        if (prev.type === 'spot') {
          const spot = spotByName.get(prev.name);
          if (spot) coord = { lat: spot.lat, lon: spot.lon };
          break;
        }
      }

      try {
        const nearby = await fetchNearbyRestaurants(coord.lat, coord.lon, 5000);
        if (nearby.length === 0) continue;

        const candidates = nearby.slice(0, 10);
        const picked = await pickRestaurants(candidates, schedule);
        items[idx] = { ...item, options: picked.map(r => r.name) };
      } catch (e) {
        console.warn('[mealRecommend] 식당 조회 실패, 기본 옵션 유지:', e);
      }
    }
    enriched.push({ ...plan, items });
  }

  return enriched;
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
