import { TripSchedule, DayPlan, TimelineItem, Spot } from '../types';
import { nearestNeighbor } from './nearestNeighbor';
import { getTransportMode, LUGGAGE_FACTOR, SEASON_FACTOR } from './timeBudget';
import { estimateTravelMinutes } from './travelTime';
import { colors } from '../constants/theme';
import { ACCOMMODATION_COORDS } from '../constants/accommodation';
import { fetchNearbyRestaurants } from '../api/kakaoApi';

type MealKind = 'lunch' | 'dinner';
type PlanInput = Pick<TripSchedule, 'spots' | 'settings' | 'accommodation'>;

const MEALS: MealKind[] = ['lunch', 'dinner'];
const MEAL_MINUTES = 60;
// slot: 식사가 걸쳐야 하는 기준 시각(도착·출발 시각이 이걸 비켜가면 그 식사는 없는 날로 봄 — 서버 가용시간 계산과 같은 기준)
// earliest~latest: 이 사이에 들어서면 식사. latest를 넘기면(긴 명소 뒤 등) 그 식사는 건너뜀
const MEAL_WINDOW: Record<MealKind, { slot: number; earliest: number; latest: number }> = {
  lunch:  { slot: 12 * 60, earliest: 11 * 60 + 30, latest: 14 * 60 },
  dinner: { slot: 18 * 60, earliest: 17 * 60 + 30, latest: 20 * 60 },
};
const MEAL_NAME: Record<MealKind, string> = { lunch: '점심 식사', dinner: '저녁 식사' };
// 다음 명소가 식사 마감을 넘길 만큼 길면, earliest보다 이만큼 이르더라도 식사를 먼저 한다
const EARLY_MEAL_MARGIN = 30;
const MAX_DAYS = 10;

interface PendingMeal {
  dayIdx: number;
  itemIdx: number;
  lat: number;
  lon: number;
  meal: MealKind;
}

interface Layout {
  dayPlans: DayPlan[];
  pendingMeals: PendingMeal[];
  leftover: number;
}

interface LayoutOptions {
  totalDays: number;
  // 알고리즘 모드에선 모든 날이 같은 큐를 이어서 소비하고, AI 모드에선 날짜마다 정해진 목록을 받는다
  queueForDay: (dayIdx: number) => Spot[];
  // 지정하면 (경과시간 + 다음 명소 + 남은 식사) × 보정계수가 하루 가용시간을 넘을 때 다음 날로 넘긴다.
  // AI 모드는 서버에서 같은 기준의 검증을 마친 배정이라 지정하지 않음
  capacitySlack?: number;
  // 최대 일수에서도 명소가 남으면 마지막 날에 몰아서라도 배치 — 조용히 누락시키지 않기 위함
  unboundedLastDay?: boolean;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function closestMeal(meals: MealKind[], time: number): MealKind {
  return meals.reduce((a, b) =>
    Math.abs(time - MEAL_WINDOW[a].slot) <= Math.abs(time - MEAL_WINDOW[b].slot) ? a : b,
  );
}

function layoutDays(
  schedule: PlanInput,
  { totalDays, queueForDay, capacitySlack, unboundedLastDay }: LayoutOptions,
): Layout {
  const { settings, accommodation } = schedule;
  const { startTime, endTime, firstDayArrival, lastDayDeparture, luggage } = settings;
  const transportMode = getTransportMode(luggage);
  const accomCoords = ACCOMMODATION_COORDS[accommodation];

  const dayPlans: DayPlan[] = [];
  const pendingMeals: PendingMeal[] = [];
  let queue: Spot[] = [];

  for (let d = 0; d < totalDays; d++) {
    const isLastDay = d === totalDays - 1;
    const dayStart = (d === 0 ? firstDayArrival ?? startTime : startTime) * 60;
    const dayEnd = (isLastDay ? lastDayDeparture ?? endTime : endTime) * 60;
    const isFullDay = dayStart === startTime * 60 && dayEnd === endTime * 60;
    const slack = unboundedLastDay && isLastDay ? undefined : capacitySlack;
    const mealDone: Record<MealKind, boolean> = {
      lunch: !(dayStart <= MEAL_WINDOW.lunch.slot && dayEnd >= MEAL_WINDOW.lunch.slot + MEAL_MINUTES),
      dinner: !(dayStart <= MEAL_WINDOW.dinner.slot && dayEnd >= MEAL_WINDOW.dinner.slot + MEAL_MINUTES),
    };

    queue = queueForDay(d);
    const items: TimelineItem[] = [];
    let cursor = dayStart;
    let placedSpots = 0;
    let lastLat = accomCoords.lat;
    let lastLon = accomCoords.lon;

    // 식당 후보는 모든 날의 배치가 확정된 뒤 한꺼번에 조회 — 일수를 바꿔 재배치할 때 API를 중복 호출하지 않기 위함
    const pushMeal = (meal: MealKind, restaurantName?: string) => {
      const time = Math.max(cursor, MEAL_WINDOW[meal].earliest);
      if (!restaurantName) {
        pendingMeals.push({ dayIdx: d, itemIdx: items.length, lat: lastLat, lon: lastLon, meal });
      }
      items.push({
        type: 'meal',
        time: formatTime(time),
        name: MEAL_NAME[meal],
        duration: MEAL_MINUTES,
        dotColor: colors.warning,
        options: restaurantName ? [restaurantName] : [],
      });
      cursor = time + MEAL_MINUTES;
      mealDone[meal] = true;
    };

    items.push({
      type: 'accommodation',
      time: formatTime(cursor),
      name: '숙소 출발',
      duration: 0,
      dotColor: colors.teal,
    });

    while (queue.length > 0) {
      const spot = queue[0];
      for (const meal of MEALS) {
        if (!mealDone[meal] && cursor > MEAL_WINDOW[meal].latest) mealDone[meal] = true;
      }
      const openMeals = MEALS.filter(m => !mealDone[m]);
      const moveCost = estimateTravelMinutes(lastLat, lastLon, spot.lat, spot.lon, transportMode);

      // 사용자가 직접 고른 식당(카페 제외)은 도착 시각에 가까운 남은 식사로 배정.
      // 점심·저녁이 이미 채워졌다면(식당을 여러 곳 고른 경우) 일반 명소로 처리
      const arrival = cursor + moveCost;
      const asMeal =
        spot.category === 'food' && spot.foodType === 'restaurant' && openMeals.length > 0
          ? closestMeal(openMeals, arrival)
          : null;
      // 식당은 식사 시간 전에 도착하면 그때까지 기다리므로, 가용시간 검사에 그 대기까지 포함한다
      const stayEnd = asMeal
        ? Math.max(arrival, MEAL_WINDOW[asMeal].earliest) + MEAL_MINUTES
        : arrival + spot.durationMinutes;
      const needed = stayEnd - cursor;

      if (!asMeal) {
        const due = openMeals.find(m => {
          const w = MEAL_WINDOW[m];
          return cursor >= w.earliest || (cursor >= w.earliest - EARLY_MEAL_MARGIN && cursor + needed > w.latest);
        });
        if (due) {
          pushMeal(due);
          continue;
        }
      }

      if (slack !== undefined) {
        const mealReserve = (openMeals.length - (asMeal ? 1 : 0)) * MEAL_MINUTES;
        const fits = (cursor - dayStart + needed + mealReserve) * slack <= dayEnd - dayStart;
        // 빈 온전한 하루에도 안 들어가는 긴 명소(예: 한라산 등반)는 그냥 배치 —
        // 안 그러면 일수를 아무리 늘려도 자리가 없어 뒤따르는 명소까지 전부 누락됨
        const forcePlace = placedSpots === 0 && isFullDay;
        if (!fits && !forcePlace) break;
      }

      items.push({
        type: 'move',
        time: formatTime(cursor),
        name: '이동',
        duration: moveCost,
        dotColor: colors.border,
      });
      cursor += moveCost;

      if (asMeal) {
        pushMeal(asMeal, spot.name);
      } else {
        items.push({
          type: 'spot',
          time: formatTime(cursor),
          name: spot.name,
          duration: spot.durationMinutes,
          dotColor: colors.primary,
          linkUrl: spot.businessHoursUrl,
        });
        cursor += spot.durationMinutes;
      }
      lastLat = spot.lat;
      lastLon = spot.lon;
      placedSpots++;
      queue.shift();
    }

    for (const meal of MEALS) {
      if (!mealDone[meal] && cursor <= MEAL_WINDOW[meal].latest) pushMeal(meal);
    }

    items.push({
      type: 'accommodation',
      time: formatTime(Math.max(cursor, Math.min(cursor + 60, dayEnd))),
      name: isLastDay ? '공항 출발' : '숙소 복귀',
      duration: 0,
      dotColor: colors.teal,
    });

    dayPlans.push({ day: d + 1, items });
  }

  return { dayPlans, pendingMeals, leftover: queue.length };
}

// 최근접 이웃 순서로 하루씩 채워, 모든 명소가 들어가는 가장 짧은 일수를 찾는다 — 이 일수가 알고리즘의 추천 기간
function layoutGreedy(schedule: PlanInput, weatherFactor: number): Layout {
  const { spots, settings, accommodation } = schedule;
  const accomCoords = ACCOMMODATION_COORDS[accommodation];
  const orderedSpots = nearestNeighbor(spots, accomCoords.lat, accomCoords.lon);
  const capacitySlack = LUGGAGE_FACTOR[settings.luggage] * weatherFactor;

  for (let totalDays = 1; ; totalDays++) {
    const atMaxDays = totalDays >= MAX_DAYS;
    const queue = [...orderedSpots];
    const layout = layoutDays(schedule, {
      totalDays,
      queueForDay: () => queue,
      capacitySlack,
      unboundedLastDay: atMaxDays,
    });
    if (layout.leftover === 0 || atMaxDays) return layout;
  }
}

// 알고리즘 일정의 일수. 명소 선택 화면의 기간 표시가 실제 타임라인과 같은 값이 되도록 같은 배치를 그대로 돌린다
export function countTripDays(
  input: PlanInput,
  weatherFactor: number = SEASON_FACTOR[input.settings.season],
): number {
  return layoutGreedy(input, weatherFactor).dayPlans.length;
}

// weatherFactor: 예보를 반영한 보정값(WeatherScreen). 예보가 없으면 계절 보정계수를 쓴다
// dayAssignment: AI가 정한 날짜별 방문 목록(순서 포함). 주어지면 그대로 따르고,
// 없으면 최근접 이웃 순서를 하루 가용시간만큼씩 채운다
export async function generateTimeline(
  schedule: TripSchedule,
  weatherFactor: number = SEASON_FACTOR[schedule.settings.season],
  dayAssignment?: Spot[][],
): Promise<DayPlan[]> {
  const isFoodTheme = schedule.settings.themes.includes('food');
  // "미식" 테마 선택 시 더 넓은 반경에서 더 많은 후보를 검색
  const mealSearchRadius = isFoodTheme ? 3000 : 1500;
  const mealSearchLimit = isFoodTheme ? 5 : 3;

  const layout = dayAssignment
    ? layoutDays(schedule, { totalDays: dayAssignment.length, queueForDay: d => [...dayAssignment[d]] })
    : layoutGreedy(schedule, weatherFactor);

  const mealOptions = await Promise.all(
    layout.pendingMeals.map(m =>
      fetchNearbyRestaurants(m.lat, m.lon, m.meal, mealSearchRadius, mealSearchLimit),
    ),
  );
  layout.pendingMeals.forEach((m, i) => {
    layout.dayPlans[m.dayIdx].items[m.itemIdx].options = mealOptions[i];
  });

  return layout.dayPlans;
}
