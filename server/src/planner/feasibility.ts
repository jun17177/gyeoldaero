import { ClaudeRoutePlan, MAX_DAYS, RoutePlanRequest } from './schema.js';

const MEAL_MINUTES = 60;
// 앱 generateTimeline의 MEAL_WINDOW·EARLY_MEAL_MARGIN과 같아야 함 — 서버 검증과 앱 타임라인이 같은 시각을 계산하도록
const MEAL_WINDOWS = [
  { slot: 12 * 60, earliest: 11 * 60 + 30, latest: 14 * 60 },
  { slot: 18 * 60, earliest: 17 * 60 + 30, latest: 20 * 60 },
];
const EARLY_MEAL_MARGIN = 30;
// 이 추정식과 앱의 타임라인 생성기(generateTimeline)는 반올림 등에서 조금씩 달라 여유를 둔다
const TOLERANCE_MINUTES = 30;

export interface DayWindow {
  start: number; // 분
  end: number;
}

export function hhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function dayWindows(settings: RoutePlanRequest['settings'], totalDays: number): DayWindow[] {
  const { startTime, endTime, firstDayArrival, lastDayDeparture } = settings;
  return Array.from({ length: totalDays }, (_, i) => ({
    start: (i === 0 ? firstDayArrival ?? startTime : startTime) * 60,
    end: (i === totalDays - 1 ? lastDayDeparture ?? endTime : endTime) * 60,
  }));
}

export function capacityOf(win: DayWindow): number {
  return Math.max(0, win.end - win.start);
}

export function mealSlots(win: DayWindow): number {
  return MEAL_WINDOWS.filter(w => win.start <= w.slot && win.end >= w.slot + MEAL_MINUTES).length;
}

// 그날 이동 + 체류에 쓸 수 있는 시간. 식사 시간과 짐·날씨 보정계수를 미리 빼 두어
// Claude는 이동·체류 합계만 이 값과 비교하면 된다 — 계산이 단순할수록 추론이 짧아져 응답이 빨라짐
export function dayBudget(req: RoutePlanRequest, win: DayWindow): number {
  return Math.floor(capacityOf(win) / req.slackFactor) - mealSlots(win) * MEAL_MINUTES;
}

function isRestaurant(spot: RoutePlanRequest['spots'][number]): boolean {
  return spot.category === 'food' && spot.foodType === 'restaurant';
}

const INDOOR_TAG_HINTS = ['실내', '박물관', '미술관', '전시', '시장', '카페', '체험', '수족관', '동굴'];

// 비·눈 오는 날 배치를 모델이 명소 이름만 보고 추측하지 않도록 서버가 분류한다 (프롬프트 표시와 검증에 함께 사용)
export function isIndoor(spot: RoutePlanRequest['spots'][number]): boolean {
  return spot.category === 'culture'
    || spot.category === 'food'
    || spot.tags.some(tag => INDOOR_TAG_HINTS.some(hint => tag.includes(hint)));
}

// spotIdxs: 그날 방문 순서대로의 spots 배열 인덱스
export function usedMinutes(req: RoutePlanRequest, spotIdxs: number[], win: DayWindow): number {
  let total = 0;
  let prev = 0;
  let mealsLeft = mealSlots(win);
  for (const idx of spotIdxs) {
    const spot = req.spots[idx];
    let stay = spot.durationMinutes;
    // 식당은 그날 식사를 대신하므로 식사 횟수까지는 체류 0분 (식사 시간은 이미 한도에서 빠져 있음).
    // 넘치는 식당은 앱에서 일반 명소로 배치되므로 원래 체류 시간으로 계산
    if (isRestaurant(spot) && mealsLeft > 0) {
      stay = 0;
      mealsLeft--;
    }
    total += req.travelMinutes[prev][idx + 1] + stay;
    prev = idx + 1;
  }
  return Math.round(total);
}

// 앱 타임라인과 같은 규칙(식사 시간대에 들어서면 식사, 식당은 식사 시간까지 대기)으로 그날 마지막 일정이 끝나는 시각을 구한다.
// 한도(dayBudget)는 대기 시간을 모르므로, 식당에 너무 일찍 도착해 기다리다 마감을 넘기는 배정은 이 검사로 잡는다
export function simulateDayEnd(
  req: RoutePlanRequest,
  spotIdxs: number[],
  win: DayWindow,
): { end: number; waited: number } {
  const mealDone = MEAL_WINDOWS.map(w => !(win.start <= w.slot && win.end >= w.slot + MEAL_MINUTES));
  let cursor = win.start;
  let prev = 0;
  let waited = 0;
  let i = 0;

  while (i < spotIdxs.length) {
    const idx = spotIdxs[i];
    const spot = req.spots[idx];
    MEAL_WINDOWS.forEach((w, m) => {
      if (!mealDone[m] && cursor > w.latest) mealDone[m] = true;
    });
    const openMeals = MEAL_WINDOWS.map((_, m) => m).filter(m => !mealDone[m]);
    const arrival = cursor + req.travelMinutes[prev][idx + 1];

    if (isRestaurant(spot) && openMeals.length > 0) {
      const meal = openMeals.reduce((a, b) =>
        Math.abs(arrival - MEAL_WINDOWS[a].slot) <= Math.abs(arrival - MEAL_WINDOWS[b].slot) ? a : b,
      );
      const mealStart = Math.max(arrival, MEAL_WINDOWS[meal].earliest);
      waited += mealStart - arrival;
      cursor = mealStart + MEAL_MINUTES;
      mealDone[meal] = true;
    } else {
      const needed = arrival - cursor + spot.durationMinutes;
      const due = openMeals.find(m => {
        const w = MEAL_WINDOWS[m];
        return cursor >= w.earliest || (cursor >= w.earliest - EARLY_MEAL_MARGIN && cursor + needed > w.latest);
      });
      if (due !== undefined) {
        const mealStart = Math.max(cursor, MEAL_WINDOWS[due].earliest);
        waited += mealStart - cursor;
        cursor = mealStart + MEAL_MINUTES;
        mealDone[due] = true;
        continue;
      }
      // 이동 중에 식사 시간이 되면 도착해서 먼저 먹는다 (앱 generateTimeline과 같은 규칙)
      const onArrival = openMeals.find(m => arrival >= MEAL_WINDOWS[m].earliest && arrival <= MEAL_WINDOWS[m].latest);
      if (onArrival !== undefined) {
        cursor = arrival + MEAL_MINUTES + spot.durationMinutes;
        mealDone[onArrival] = true;
      } else {
        cursor = arrival + spot.durationMinutes;
      }
    }
    prev = idx + 1;
    i++;
  }

  return { end: cursor, waited };
}

// 반환값은 Claude에게 재시도 피드백으로 그대로 전달되므로 프롬프트와 같은 단위(명소 번호, 이동+체류 분, 시각)로 적는다
export function validatePlan(req: RoutePlanRequest, plan: ClaudeRoutePlan): string[] {
  const totalDays = plan.days.length;
  if (totalDays < 1 || totalDays > MAX_DAYS) {
    return [`기간은 1~${MAX_DAYS}일이어야 해요 (현재 ${totalDays}일).`];
  }

  const errors: string[] = [];
  const seen = new Set<number>();
  const windows = dayWindows(req.settings, totalDays);
  const dayIdxs: number[][] = [];

  // 추론 없이 짜면 하루에 한두 곳만 넣어 기간이 부풀려지는 경우가 있었다 — 한도를 지키는 단순 알고리즘보다 하루 넘게 길면 다시 짜게 한다
  if (totalDays > req.baseline.days + 1) {
    errors.push(`기간 ${totalDays}일은 너무 깁니다. 기준안 ${req.baseline.days}일보다 하루 넘게 길지 않도록 한도 안에서 하루에 명소를 더 넣으세요.`);
  }

  plan.days.forEach((day, d) => {
    const idxs: number[] = [];
    for (const n of day.spots) {
      const spot = req.spots[n - 1];
      if (!spot) {
        errors.push(`DAY ${d + 1}: 없는 명소 번호 ${n}`);
        continue;
      }
      if (seen.has(n)) {
        errors.push(`DAY ${d + 1}: ${n}번 ${spot.name}을(를) 두 번 배정`);
        continue;
      }
      seen.add(n);
      idxs.push(n - 1);
    }
    dayIdxs.push(idxs);

    // 명소가 하나뿐인 날은 더 나눌 방법이 없으므로(예: 긴 등반 코스) 초과를 허용
    if (idxs.length <= 1) return;

    const win = windows[d];
    const budget = dayBudget(req, win);
    const used = usedMinutes(req, idxs, win);
    if (used > budget + TOLERANCE_MINUTES) {
      errors.push(`DAY ${d + 1}: 이동+체류 ${used}분이 한도 ${budget}분을 초과`);
      return;
    }

    const { end, waited } = simulateDayEnd(req, idxs, win);
    if (end > win.end + TOLERANCE_MINUTES) {
      errors.push(
        `DAY ${d + 1}: 실제 시각으로는 ${hhmm(end)}에 끝나 마감 ${hhmm(win.end)}을 넘김` +
          (waited > 0 ? ` (식사 시간까지 기다리는 ${waited}분 포함 — 식당을 식사 시간 무렵으로 옮기세요)` : ''),
      );
    }
  });

  // 비·눈 오는 날에 야외 명소가 있고 맑은 날에 실내 명소가 있으면 서로 바꿀 수 있다.
  // 프롬프트로 부탁하는 것만으로는 잘 지켜지지 않아 검증으로 막는다 (바꿀 실내 명소가 없으면 통과)
  const weatherByDay = req.weatherByDay ?? [];
  if (weatherByDay.length > 0) {
    const isBadWeather = (d: number) => weatherByDay[d] === 'rainy' || weatherByDay[d] === 'snowy';
    const label = (i: number) => `${i + 1}번 ${req.spots[i].name}`;
    const indoorOnGoodDays = dayIdxs.flatMap((idxs, d) =>
      isBadWeather(d) ? [] : idxs.filter(i => isIndoor(req.spots[i])),
    );

    dayIdxs.forEach((idxs, d) => {
      if (!isBadWeather(d) || indoorOnGoodDays.length === 0) return;
      const outdoor = idxs.filter(i => !isIndoor(req.spots[i]));
      if (outdoor.length === 0) return;
      errors.push(
        `DAY ${d + 1}(${weatherByDay[d] === 'snowy' ? '눈' : '비'}): 야외 명소 ${outdoor.map(label).join(', ')}가 있습니다. ` +
          `맑은 날에 있는 실내 명소(${indoorOnGoodDays.map(label).join(', ')})와 자리를 바꾸세요.`,
      );
    });
  }

  const missing = req.spots
    .map((spot, i) => ({ spot, n: i + 1 }))
    .filter(({ n }) => !seen.has(n));
  if (missing.length > 0) {
    errors.push(`배정되지 않은 명소: ${missing.map(({ spot, n }) => `${n}번 ${spot.name}`).join(', ')}`);
  }
  return errors;
}
