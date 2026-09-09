import { TripSchedule, DayPlan, TimelineItem } from '../types';
import { nearestNeighbor } from './nearestNeighbor';
import { calcTripDays, getTransportMode } from './timeBudget';
import { estimateTravelMinutes } from './travelTime';
import { colors } from '../constants/theme';
import { fetchNearbyRestaurants } from '../api/kakaoApi';

const ACCOMMODATION_COORDS: Record<string, { lat: number; lon: number }> = {
  airport:   { lat: 33.5074, lon: 126.4927 },
  jejucity:  { lat: 33.4996, lon: 126.5312 },
  seogwipo:  { lat: 33.2541, lon: 126.5600 },
  east:      { lat: 33.4390, lon: 126.9229 },
  west:      { lat: 33.3925, lon: 126.2376 },
  custom:    { lat: 33.4996, lon: 126.5312 },
};

function formatTime(hour: number, minute: number): string {
  const h = Math.floor(hour + minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// weatherFactor: 여행 구간 날씨가 나쁠 때(비·눈) WeatherScreen에서 계산해 넘겨주는 보정값. 기본 1.0(맑음/미지정)
export async function generateTimeline(schedule: TripSchedule, weatherFactor = 1.0): Promise<DayPlan[]> {
  const { spots, settings, accommodation } = schedule;
  const { startTime, endTime, firstDayArrival, lastDayDeparture, luggage } = settings;

  const isFoodTheme = settings.themes.includes('food');
  // "미식" 테마 선택 시 더 넓은 반경에서 더 많은 후보를 검색
  const mealSearchRadius = isFoodTheme ? 3000 : 1500;
  const mealSearchLimit = isFoodTheme ? 5 : 3;

  const transportMode = getTransportMode(luggage);

  const accomCoords = ACCOMMODATION_COORDS[accommodation] ?? ACCOMMODATION_COORDS.jejucity;
  const orderedSpots = nearestNeighbor(spots, accomCoords.lat, accomCoords.lon);
  const totalDays = calcTripDays({
    spots: orderedSpots,
    startTime,
    endTime,
    firstDayArrival,
    lastDayDeparture,
    luggage,
    weatherFactor,
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

    items.push({
      type: 'accommodation',
      time: formatTime(0, cursor),
      name: `숙소 출발`,
      duration: 0,
      dotColor: colors.teal,
    });

    let addedLunch = false;
    let addedDinner = false;
    let lastLat = accomCoords.lat;
    let lastLon = accomCoords.lon;

    while (spotIdx < orderedSpots.length) {
      const spot = orderedSpots[spotIdx];
      const moveCost = estimateTravelMinutes(lastLat, lastLon, spot.lat, spot.lon, transportMode);
      const needed = spot.durationMinutes + moveCost;

      const lunchSlot = 12 * 60;
      const dinnerSlot = 18 * 60;

      // 사용자가 직접 고른 식당(카페 제외)은 동선상 위치를 고려해 비어있는 점심/저녁 슬롯에 배정.
      // 두 슬롯이 이미 채워졌다면(식당을 2곳 이상 고른 경우) 더 이상 식사로 취급하지 않고 일반 명소로 처리
      const isChosenRestaurant = spot.category === 'food' && spot.foodType === 'restaurant';
      if (isChosenRestaurant && (!addedLunch || !addedDinner)) {
        const slot: 'lunch' | 'dinner' =
          !addedLunch && !addedDinner
            ? (Math.abs(cursor - lunchSlot) <= Math.abs(cursor - dinnerSlot) ? 'lunch' : 'dinner')
            : (!addedLunch ? 'lunch' : 'dinner');
        const slotTime = slot === 'lunch' ? lunchSlot : dinnerSlot;

        items.push({
          type: 'meal',
          time: formatTime(0, slotTime),
          name: slot === 'lunch' ? '점심 식사' : '저녁 식사',
          duration: 60,
          dotColor: colors.warning,
          options: [spot.name],
        });
        cursor = Math.max(cursor, slotTime) + 60;
        if (slot === 'lunch') addedLunch = true; else addedDinner = true;
        lastLat = spot.lat;
        lastLon = spot.lon;
        spotIdx++;
        continue;
      }

      if (!addedLunch && cursor < lunchSlot && cursor + needed > lunchSlot - 30) {
        items.push({
          type: 'meal',
          time: formatTime(0, lunchSlot),
          name: '점심 식사',
          duration: 60,
          dotColor: colors.warning,
          options: await fetchNearbyRestaurants(lastLat, lastLon, 'lunch', mealSearchRadius, mealSearchLimit),
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
          options: await fetchNearbyRestaurants(lastLat, lastLon, 'dinner', mealSearchRadius, mealSearchLimit),
        });
        cursor = dinnerSlot + 60;
        addedDinner = true;
        continue;
      }

      // 아직 안 채운 식사만큼만 여유 시간을 예약 — 이미 점심·저녁이 다 채워졌다면 남은 시간을 온전히 명소 배치에 쓸 수 있음
      const remainingMealBudget = (addedLunch ? 0 : 60) + (addedDinner ? 0 : 60);
      if (cursor + needed + remainingMealBudget > dayEnd) break;

      if (items.length > 1) {
        items.push({
          type: 'move',
          time: formatTime(0, cursor),
          name: '이동',
          duration: moveCost,
          dotColor: colors.border,
        });
        cursor += moveCost;
      }

      items.push({
        type: 'spot',
        time: formatTime(0, cursor),
        name: spot.name,
        duration: spot.durationMinutes,
        dotColor: colors.primary,
        linkUrl: spot.businessHoursUrl,
      });
      cursor += spot.durationMinutes;
      lastLat = spot.lat;
      lastLon = spot.lon;
      spotIdx++;
    }

    if (!addedLunch && cursor <= 13 * 60) {
      items.push({
        type: 'meal',
        time: formatTime(0, Math.min(cursor, 12 * 60)),
        name: '점심 식사',
        duration: 60,
        dotColor: colors.warning,
        options: await fetchNearbyRestaurants(lastLat, lastLon, 'lunch', mealSearchRadius, mealSearchLimit),
      });
    }
    if (!addedDinner && cursor <= 19 * 60) {
      items.push({
        type: 'meal',
        time: formatTime(0, Math.min(cursor + 60, 18 * 60)),
        name: '저녁 식사',
        duration: 60,
        dotColor: colors.warning,
        options: await fetchNearbyRestaurants(lastLat, lastLon, 'dinner', mealSearchRadius, mealSearchLimit),
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
