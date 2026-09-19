import { TripSchedule, DayPlan, TimelineItem } from '../types';
import { nearestNeighbor } from './nearestNeighbor';
import { calcTripDays } from './timeBudget';
import { colors } from '../constants/theme';

export const ACCOMMODATION_COORDS: Record<string, { lat: number; lon: number }> = {
  airport:   { lat: 33.5074, lon: 126.4927 },
  jejucity:  { lat: 33.4996, lon: 126.5312 },
  aewol:     { lat: 33.4600, lon: 126.3100 },
  hallim:    { lat: 33.3925, lon: 126.2376 },
  jungmun:   { lat: 33.2453, lon: 126.4126 },
  seogwipo:  { lat: 33.2541, lon: 126.5600 },
  seongsan:  { lat: 33.4390, lon: 126.9229 },
  custom:    { lat: 33.4996, lon: 126.5312 },
};

const MEAL_OPTIONS: Record<'lunch' | 'dinner', string[]> = {
  lunch: ['흑돼지 두루치기', '갈치조림 정식', '한치물회'],
  dinner: ['성게국수', '옥돔구이 정식', '해물탕'],
};

// 일수 보정계수 — 기간 산정의 단일 기준. (계절 × 날씨) 곱으로 SpotSelect 미리보기와 동일하게 산출한다.
const CONDITION_FACTOR: Record<string, number> = {
  sunny: 1.0, cloudy: 1.0, rainy: 1.2, snowy: 1.3, // weatherApi CONDITION_META와 일치
};
const SEASON_FACTOR: Record<string, number> = {
  spring: 1.0, summer: 1.1, fall: 1.0, winter: 1.15, // 더위/추위로 이동·활동 시간 증가
};

// 하루를 넘긴 시각(24:20 같은 값)을 그대로 내보내지 않는다.
// 종일 걸리는 명소 하나가 하루를 넘기는 경우가 있어, 그때는 '다음날'을 붙여 표시한다.
function formatTime(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  const clock = `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return h >= 24 ? `다음날 ${clock}` : clock;
}

export function generateTimeline(schedule: TripSchedule): DayPlan[] {
  const { spots, settings, accommodation } = schedule;
  const { startTime, endTime, firstDayArrival, lastDayDeparture, luggage } = settings;

  const accomCoords =
    accommodation === 'custom' && schedule.customAccommodationCoords
      ? schedule.customAccommodationCoords
      : (ACCOMMODATION_COORDS[accommodation] ?? ACCOMMODATION_COORDS.jejucity);
  // 사용자가 직접 순서를 조정한 일정은 그 순서를 존중하고, 아니면 최근접 이웃으로 최적화
  const orderedSpots = schedule.manualSpotOrder
    ? [...spots]
    : nearestNeighbor(spots, accomCoords.lat, accomCoords.lon);
  const moveDurationsBySpotId = schedule.moveDurationsBySpotId ?? {};
  const totalDays = calcTripDays({
    spots: orderedSpots,
    weatherFactor:
      (SEASON_FACTOR[settings.season] ?? 1.0) * (CONDITION_FACTOR[settings.weather] ?? 1.0),
    startTime,
    endTime,
    firstDayArrival,
    lastDayDeparture,
    luggage,
    moveDurationsBySpotId,
  });

  // 추정 일수(totalDays)를 채우되, 못 담은 명소가 남으면 날짜를 추가해 "누락 없이" 전부 배치한다.
  // 상한 (totalDays + orderedSpots.length)은 한 명소가 하루보다 큰 극단 케이스의 무한루프 방지용.
  const buildDays = (totalDays: number): DayPlan[] => {
  const dayPlans: DayPlan[] = [];
  let spotIdx = 0;
  let d = 0;
  while ((d < totalDays || spotIdx < orderedSpots.length) && d < totalDays + orderedSpots.length) {
    const items: TimelineItem[] = [];
    const dayStart = d === 0 && firstDayArrival !== undefined ? firstDayArrival : startTime;
    let cursor = dayStart * 60;
    const dayEnd = (d === totalDays - 1 && lastDayDeparture !== undefined ? lastDayDeparture : endTime) * 60;
    // 도착·출발 시각으로 짧아지지 않은, 온전한 하루인지
    const isFullDayWindow = cursor === startTime * 60 && dayEnd === endTime * 60;
    const mealBudget = 120;

    items.push({
      type: 'accommodation',
      time: formatTime(cursor),
      name: `숙소 출발`,
      duration: 0,
      dotColor: colors.teal,
    });

    let addedLunch = false;
    let addedDinner = false;
    let placedThisDay = 0;

    while (spotIdx < orderedSpots.length) {
      const spot = orderedSpots[spotIdx];
      const moveCost = moveDurationsBySpotId[spot.id] ?? 20;
      const needed = spot.durationMinutes + moveCost;

      const lunchSlot = 12 * 60;
      const dinnerSlot = 18 * 60;

      // 식사는 그날 마감 안에 끝날 수 있을 때만 넣는다 (마지막 날 이른 출발 등)
      const mealFitsToday = (at: number) => at + 60 <= dayEnd;

      if (!addedLunch && mealFitsToday(lunchSlot) && cursor < lunchSlot && cursor + needed > lunchSlot - 30) {
        items.push({
          type: 'meal',
          time: formatTime(lunchSlot),
          name: '점심 식사',
          duration: 60,
          dotColor: colors.warning,
          options: MEAL_OPTIONS.lunch,
        });
        cursor = lunchSlot + 60;
        addedLunch = true;
        continue;
      }

      if (!addedDinner && mealFitsToday(dinnerSlot) && cursor < dinnerSlot && cursor + needed > dinnerSlot - 30) {
        items.push({
          type: 'meal',
          time: formatTime(dinnerSlot),
          name: '저녁 식사',
          duration: 60,
          dotColor: colors.warning,
          options: MEAL_OPTIONS.dinner,
        });
        cursor = dinnerSlot + 60;
        addedDinner = true;
        continue;
      }

      // 하루 예산 초과: 이미 명소를 담았으면 다음 날로. 아직 하나도 못 담았으면
      // (한 명소가 하루보다 큰 극단 케이스) 누락 방지를 위해 단독으로라도 배치한다.
      // 단, 첫날 늦은 도착·마지막날 이른 출발로 짧아진 날에는 밀어 넣지 않는다 —
      // 온전한 하루로 넘겨야 도착·출발 시각을 지킬 수 있고, 넘긴 명소는 다음 날에 배치된다.
      if (cursor + needed + mealBudget > dayEnd && (placedThisDay > 0 || !isFullDayWindow)) break;

      items.push({
        type: 'move',
        time: formatTime(cursor),
        name: '이동',
        duration: moveCost,
        dotColor: colors.border,
      });
      cursor += moveCost;

      items.push({
        type: 'spot',
        time: formatTime(cursor),
        name: spot.name,
        spotId: spot.id,
        duration: spot.durationMinutes,
        dotColor: colors.primary,
        linkUrl: spot.businessHoursUrl,
      });
      cursor += spot.durationMinutes;
      spotIdx++;
      placedThisDay++;
    }

    // 남은 식사는 자연스러운 시간대(점심 11~13시, 저녁 17~19시)에 배치하고 cursor를 갱신해 중첩 방지.
    // 마감을 넘기는 식사는 넣지 않는다 — 11시에 출발하는 날에 17시 저녁이 잡히던 문제
    if (!addedLunch && cursor <= 13 * 60 && Math.min(Math.max(cursor, 11 * 60), 13 * 60) + 60 <= dayEnd) {
      const lunchTime = Math.min(Math.max(cursor, 11 * 60), 13 * 60);
      items.push({
        type: 'meal',
        time: formatTime(lunchTime),
        name: '점심 식사',
        duration: 60,
        dotColor: colors.warning,
        options: MEAL_OPTIONS.lunch,
      });
      cursor = lunchTime + 60;
    }
    if (!addedDinner && cursor <= 19 * 60 && Math.min(Math.max(cursor, 17 * 60), 19 * 60) + 60 <= dayEnd) {
      const dinnerTime = Math.min(Math.max(cursor, 17 * 60), 19 * 60);
      items.push({
        type: 'meal',
        time: formatTime(dinnerTime),
        name: '저녁 식사',
        duration: 60,
        dotColor: colors.warning,
        options: MEAL_OPTIONS.dinner,
      });
      cursor = dinnerTime + 60;
    }

    // 이번 날에 모든 명소가 배치됐고 계획 마지막 날 이상이면 = 실제 마지막 날 → '공항 출발'
    const isFinalDay = spotIdx >= orderedSpots.length && d >= totalDays - 1;
    items.push({
      type: 'accommodation',
      time: formatTime(Math.max(cursor, Math.min(cursor + 60, dayEnd))),
      name: isFinalDay ? '공항 출발' : '숙소 복귀',
      duration: 0,
      dotColor: colors.teal,
    });

    dayPlans.push({ day: d + 1, items });
    d++;
  }

  return dayPlans;
  };

  // 실제로 만들어진 일수가 추정과 다르면 "마지막 날"이 달라지고, 그러면 마지막 날 출발 시각
  // (lastDayDeparture)이 엉뚱한 날에 적용된다. 두 값이 같아질 때까지 그 일수를 기준으로 다시 배치한다.
  // 일수는 늘어나기만 하므로 반드시 멈춘다 (상한은 명소 수).
  let target = totalDays;
  for (let i = 0; i <= orderedSpots.length; i++) {
    const plans = buildDays(target);
    if (plans.length === target) return plans;
    target = plans.length;
  }
  return buildDays(target);
}
