import { AiRoutePlan, DayPlan, SkyCondition, Spot, TripSchedule } from '../types';
import { nearestNeighbor } from './nearestNeighbor';
import { getTransportMode, LUGGAGE_FACTOR, SEASON_FACTOR } from './timeBudget';
import { estimateTravelMinutes } from './travelTime';
import { countTripDays, generateTimeline } from './generateTimeline';
import { requestAiRoutePlan } from '../api/routePlanApi';
import { ACCOMMODATION_COORDS, ACCOMMODATION_LABEL } from '../constants/accommodation';
import { AI_MAX_SPOTS } from '../constants/config';

export interface PlannedTrip {
  days: number;
  dayPlans: DayPlan[];
  planSource: 'ai' | 'algorithm';
  aiReason?: string;
}

interface PlanOptions {
  // 예보를 반영한 보정계수(WeatherScreen). 없으면 계절 보정계수를 쓴다
  weatherFactor?: number;
  // 여행 첫날부터의 날짜별 예보. WeatherScreen에서 출발일을 고른 뒤에만 알 수 있음
  weatherByDay?: SkyCondition[];
}

const MAX_TAGS_PER_SPOT = 8;

function toDayAssignment(plan: AiRoutePlan, spots: Spot[]): Spot[][] | null {
  const byId = new Map(spots.map(s => [s.id, s]));
  const days: Spot[][] = [];
  for (const day of plan.days) {
    const daySpots: Spot[] = [];
    for (const id of day.spotIds) {
      const spot = byId.get(id);
      if (!spot) return null;
      daySpots.push(spot);
    }
    days.push(daySpots);
  }
  return days;
}

// 최근접 이웃 순서 + 하루 가용시간으로 만든 일정. 네트워크는 식당 후보 조회뿐이라 1초 안팎이면 끝난다
export async function planWithAlgorithm(schedule: TripSchedule, weatherFactor?: number): Promise<PlannedTrip> {
  const dayPlans = await generateTimeline(schedule, weatherFactor);
  return { days: dayPlans.length, dayPlans, planSource: 'algorithm' };
}

// Claude가 날짜별 배정·방문 순서·기간을 정한 일정. 서버 주소가 없거나, 명소가 너무 많거나, 요청·검증이 실패하면 null
export async function planWithAi(schedule: TripSchedule, options: PlanOptions = {}): Promise<PlannedTrip | null> {
  const { spots, settings, accommodation } = schedule;
  if (spots.length === 0 || spots.length > AI_MAX_SPOTS) return null;
  const weatherFactor = options.weatherFactor ?? SEASON_FACTOR[settings.season];

  try {
    const accom = ACCOMMODATION_COORDS[accommodation];
    const mode = getTransportMode(settings.luggage);
    const baselineOrder = nearestNeighbor(spots, accom.lat, accom.lon);

    // AI와 앱이 같은 이동시간 추정치를 쓰도록 앱에서 계산해 넘긴다
    const points = [accom, ...spots];
    const travelMinutes = points.map((a, i) =>
      points.map((b, j) => (i === j ? 0 : estimateTravelMinutes(a.lat, a.lon, b.lat, b.lon, mode))),
    );

    const aiPlan = await requestAiRoutePlan({
      spots: spots.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        durationMinutes: s.durationMinutes,
        tags: s.tags.slice(0, MAX_TAGS_PER_SPOT),
        foodType: s.foodType,
      })),
      settings,
      accommodationLabel: ACCOMMODATION_LABEL[accommodation],
      travelMinutes,
      baseline: { days: countTripDays(schedule, weatherFactor), order: baselineOrder.map(s => s.id) },
      slackFactor: LUGGAGE_FACTOR[settings.luggage] * weatherFactor,
      weatherByDay: options.weatherByDay,
    });

    const assignment = aiPlan ? toDayAssignment(aiPlan, spots) : null;
    if (!aiPlan || !assignment) return null;

    const dayPlans = await generateTimeline(schedule, weatherFactor, assignment);
    return {
      days: dayPlans.length,
      dayPlans: dayPlans.map((plan, i) => ({ ...plan, note: aiPlan.days[i]?.note })),
      planSource: 'ai',
      aiReason: aiPlan.daysReason,
    };
  } catch (e) {
    // 화면이 AI 대기 상태에 갇히지 않도록 어떤 실패든 null로 돌려 알고리즘 일정으로 넘긴다
    console.warn('[planWithAi] 실패 — 알고리즘으로 대체:', e instanceof Error ? e.message : e);
    return null;
  }
}

// AI 일정을 기다렸다가, 실패하면 알고리즘 일정으로 대체
export async function planTrip(schedule: TripSchedule, options: PlanOptions = {}): Promise<PlannedTrip> {
  return (await planWithAi(schedule, options)) ?? planWithAlgorithm(schedule, options.weatherFactor);
}
