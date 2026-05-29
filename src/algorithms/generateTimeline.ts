import { TripSchedule, DayPlan, TimelineItem } from '../types';
import { nearestNeighbor } from './nearestNeighbor';
import { calcTripDays } from './timeBudget';
import { colors } from '../constants/theme';

const ACCOMMODATION_COORDS: Record<string, { lat: number; lon: number }> = {
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
  const orderedSpots = nearestNeighbor(spots, accomCoords.lat, accomCoords.lon);
  const moveDurationsBySpotId = schedule.moveDurationsBySpotId ?? {};
  const totalDays = calcTripDays({
    spots: orderedSpots,
    startTime,
    endTime,
    firstDayArrival,
    lastDayDeparture,
    luggage,
    moveDurationsBySpotId,
  });

  const dailyMinutes = (endTime - startTime) * 60;
  const dayCapacities: number[] = [];
  for (let d = 0; d < totalDays; d++) {
    if (d === 0 && firstDayArrival !== undefined) {
      dayCapacities.push((endTime - firstDayArrival) * 60);
    } else if (d === totalDays - 1 && lastDayDeparture !== undefined) {
      dayCapacities.push((lastDayDeparture - startTime) * 60);
    } else {
      dayCapacities.push(dailyMinutes);
    }
  }

  const dayPlans: DayPlan[] = [];
  let spotIdx = 0;

  for (let d = 0; d < totalDays; d++) {
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

      if (cursor + needed + mealBudget > dayEnd) break;

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
    }

    if (!addedLunch && cursor <= 13 * 60) {
      items.push({
        type: 'meal',
        time: formatTime(0, Math.min(cursor, 12 * 60)),
        name: '점심 식사',
        duration: 60,
        dotColor: colors.warning,
        options: MEAL_OPTIONS.lunch,
      });
    }
    if (!addedDinner && cursor <= 19 * 60) {
      items.push({
        type: 'meal',
        time: formatTime(0, Math.min(cursor + 60, 18 * 60)),
        name: '저녁 식사',
        duration: 60,
        dotColor: colors.warning,
        options: MEAL_OPTIONS.dinner,
      });
    }

    items.push({
      type: 'accommodation',
      time: formatTime(0, Math.min(cursor + 60, dayEnd)),
      name: d === totalDays - 1 ? '공항 출발' : '숙소 복귀',
      duration: 0,
      dotColor: colors.teal,
    });

    dayPlans.push({ day: d + 1, items });
  }

  return dayPlans;
}
