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

function formatTime(hour: number, minute: number): string {
  const h = Math.floor(hour + minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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

  const dayPlans: DayPlan[] = [];
  let spotIdx = 0;

  // 추정 일수(totalDays)를 채우되, 못 담은 명소가 남으면 날짜를 추가해 "누락 없이" 전부 배치한다.
  // 상한 (totalDays + orderedSpots.length)은 한 명소가 하루보다 큰 극단 케이스의 무한루프 방지용.
  let d = 0;
  while ((d < totalDays || spotIdx < orderedSpots.length) && d < totalDays + orderedSpots.length) {
    const items: TimelineItem[] = [];
    const dayStart = d === 0 && firstDayArrival !== undefined ? firstDayArrival : startTime;
    let cursor = dayStart * 60;
    const dayEnd = (d === totalDays - 1 && lastDayDeparture !== undefined ? lastDayDeparture : endTime) * 60;
    const mealBudget = 120;

    items.push({
      type: 'accommodation',
      time: formatTime(0, cursor),
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

      if (!addedLunch && cursor < lunchSlot && cursor + needed > lunchSlot - 30) {
        items.push({
          type: 'meal',
          time: formatTime(0, lunchSlot),
          name: '점심 식사',
          duration: 60,
          dotColor: colors.warning,
          options: MEAL_OPTIONS.lunch,
        });
        cursor = lunchSlot + 60;
        addedLunch = true;
        continue;
      }

      if (!addedDinner && cursor < dinnerSlot && cursor + needed > dinnerSlot - 30) {
        items.push({
          type: 'meal',
          time: formatTime(0, dinnerSlot),
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
      if (cursor + needed + mealBudget > dayEnd && placedThisDay > 0) break;

      items.push({
        type: 'move',
        time: formatTime(0, cursor),
        name: '이동',
        duration: moveCost,
        dotColor: colors.border,
      });
      cursor += moveCost;

      items.push({
        type: 'spot',
        time: formatTime(0, cursor),
        name: spot.name,
        duration: spot.durationMinutes,
        dotColor: colors.primary,
        linkUrl: spot.businessHoursUrl,
      });
      cursor += spot.durationMinutes;
      spotIdx++;
      placedThisDay++;
    }

    // 남은 식사는 자연스러운 시간대(점심 11~13시, 저녁 17~19시)에 배치하고 cursor를 갱신해 중첩 방지
    if (!addedLunch && cursor <= 13 * 60) {
      const lunchTime = Math.min(Math.max(cursor, 11 * 60), 13 * 60);
      items.push({
        type: 'meal',
        time: formatTime(0, lunchTime),
        name: '점심 식사',
        duration: 60,
        dotColor: colors.warning,
        options: MEAL_OPTIONS.lunch,
      });
      cursor = lunchTime + 60;
    }
    if (!addedDinner && cursor <= 19 * 60) {
      const dinnerTime = Math.min(Math.max(cursor, 17 * 60), 19 * 60);
      items.push({
        type: 'meal',
        time: formatTime(0, dinnerTime),
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
      time: formatTime(0, Math.min(cursor + 60, dayEnd)),
      name: isFinalDay ? '공항 출발' : '숙소 복귀',
      duration: 0,
      dotColor: colors.teal,
    });

    dayPlans.push({ day: d + 1, items });
    d++;
  }

  return dayPlans;
}
