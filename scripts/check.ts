/**
 * 알고리즘·타임라인·서버 검증 로직 회귀 테스트.
 * Claude API나 외부 API를 호출하지 않으므로 키 없이 언제든 돌릴 수 있다.
 *
 *   npm run check
 */
import { countTripDays, generateTimeline } from '../src/algorithms/generateTimeline';
import { planWithAi } from '../src/algorithms/planTrip';
import { getTransportMode, LUGGAGE_FACTOR } from '../src/algorithms/timeBudget';
import { estimateTravelMinutes } from '../src/algorithms/travelTime';
import { ACCOMMODATION_COORDS } from '../src/constants/accommodation';
import { jejuSpots } from '../src/data/jejuSpots';
import { DayPlan, Spot, TripSchedule, TripSettings } from '../src/types';
import { validatePlan } from '../server/src/feasibility.js';
import { routePlanRequestSchema } from '../server/src/schema.js';
import { sanitizeTripSettings } from '../server/src/tripSettings.js';

let failed = 0;

function check(label: string, ok: boolean, detail = '') {
  if (!ok) failed++;
  console.log(`${ok ? '  PASS' : '  FAIL'} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
}

function section(title: string) {
  console.log(`\n${title}`);
}

const BASE_SETTINGS: TripSettings = {
  themes: ['healing'],
  season: 'spring',
  startTime: 9,
  endTime: 19,
  people: 2,
  budget: 1,
  luggage: 'medium',
};

function makeSchedule(spots: Spot[], settings: TripSettings = BASE_SETTINGS): TripSchedule {
  return { id: 't', name: 't', createdAt: '', days: 0, spots, accommodation: 'aewol', tags: [], settings };
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// 명소 이름 + 사용자가 고른 식당 이름(식사 항목의 유일한 선택지)
function placedNames(plans: DayPlan[]): string[] {
  return plans.flatMap(plan =>
    plan.items.flatMap(item =>
      item.type === 'spot' ? [item.name]
      : item.type === 'meal' && item.options?.length === 1 ? [item.options[0]]
      : [],
    ),
  );
}

function checkTimeline(label: string, spots: Spot[], plans: DayPlan[]) {
  const placed = placedNames(plans);
  const missing = spots.filter(s => !placed.includes(s.name)).map(s => s.name);
  const duplicated = placed.filter((name, i) => placed.indexOf(name) !== i);
  const backwards = plans.filter(plan =>
    plan.items.some((item, i) => i > 0 && toMinutes(item.time) < toMinutes(plan.items[i - 1].time)),
  );
  check(
    `${label} (${plans.length}일)`,
    missing.length === 0 && duplicated.length === 0 && backwards.length === 0,
    [
      missing.length ? `누락 ${missing.join(', ')}` : '',
      duplicated.length ? `중복 ${duplicated.join(', ')}` : '',
      backwards.length ? `시간 역행 DAY${backwards.map(p => p.day).join(',')}` : '',
    ].filter(Boolean).join(' / '),
  );
}

const spotByName = (name: string): Spot => {
  const spot = jejuSpots.find(s => s.name.includes(name));
  if (!spot) throw new Error(`시드 데이터에 "${name}"이(가) 없습니다`);
  return spot;
};

// 서버 검증용 요청. 앱(planWithAi)이 만드는 것과 같은 형태
function buildRoutePlanRequest(
  spots: Spot[],
  settings: TripSettings,
  baselineDays: number,
  weatherByDay?: ('sunny' | 'cloudy' | 'rainy' | 'snowy')[],
) {
  const accom = ACCOMMODATION_COORDS.jejucity;
  const mode = getTransportMode(settings.luggage);
  const points = [accom, ...spots];
  return routePlanRequestSchema.parse({
    spots: spots.map(s => ({
      id: s.id, name: s.name, category: s.category,
      durationMinutes: s.durationMinutes, tags: s.tags.slice(0, 8), foodType: s.foodType,
    })),
    settings,
    accommodationLabel: '제주시',
    travelMinutes: points.map((a, i) =>
      points.map((b, j) => (i === j ? 0 : estimateTravelMinutes(a.lat, a.lon, b.lat, b.lon, mode))),
    ),
    baseline: { days: baselineDays, order: spots.map(s => s.id) },
    slackFactor: LUGGAGE_FACTOR[settings.luggage],
    weatherByDay,
  });
}

const planOf = (days: number[][]) => ({
  days: days.map(spots => ({ work: '', spots, note: '' })),
  daysReason: '',
});

async function main() {
  section('■ 타임라인 (알고리즘)');
  const twelve = jejuSpots.slice(0, 12);
  checkTimeline('명소 12개', twelve, await generateTimeline(makeSchedule(twelve)));

  const longSpot = jejuSpots.reduce((a, b) => (a.durationMinutes >= b.durationMinutes ? a : b));
  const withLong = [longSpot, ...jejuSpots.filter(s => s !== longSpot).slice(0, 5)];
  const narrow: TripSettings = { ...BASE_SETTINGS, startTime: 10, endTime: 17 };
  checkTimeline(
    `짧은 활동시간(10~17시) + ${longSpot.name} ${longSpot.durationMinutes}분`,
    withLong,
    await generateTimeline(makeSchedule(withLong, narrow)),
  );

  const arrivalDeparture: TripSettings = { ...BASE_SETTINGS, firstDayArrival: 14, lastDayDeparture: 15 };
  const eight = jejuSpots.slice(0, 8);
  checkTimeline('첫날 14시 도착 · 마지막 날 15시 출발', eight, await generateTimeline(makeSchedule(eight, arrivalDeparture)));

  const restaurants: Spot[] = [
    { ...jejuSpots[20], id: 'r1', name: '테스트식당1', category: 'food', foodType: 'restaurant' },
    { ...jejuSpots[21], id: 'r2', name: '테스트식당2', category: 'food', foodType: 'restaurant' },
  ];
  const withFood = [...jejuSpots.slice(0, 4), ...restaurants];
  checkTimeline('직접 고른 식당 2곳', withFood, await generateTimeline(makeSchedule(withFood)));

  const heavy: TripSettings = { ...BASE_SETTINGS, luggage: 'very_heavy' };
  checkTimeline('짐 매우 무거움 + 비(보정 1.82)', twelve, await generateTimeline(makeSchedule(twelve, heavy), 1.3));

  section('■ 타임라인 (AI 배정)');
  const six = jejuSpots.slice(12, 18);
  const assignment = [[six[0], six[1]], [six[2]], [six[3], six[4], six[5]]];
  const aiPlans = await generateTimeline(makeSchedule(six), 1.0, assignment);
  checkTimeline('AI가 정한 날짜별 배정', six, aiPlans);
  check(
    'AI가 정한 방문 순서 유지',
    aiPlans.every((plan, d) =>
      JSON.stringify(plan.items.filter(i => i.type === 'spot').map(i => i.name)) ===
      JSON.stringify(assignment[d].map(s => s.name)),
    ),
  );

  // 긴 이동이 점심 시간을 가로지르면 도착해서 점심을 먼저 먹어야 한다
  const crossLunch = [spotByName('동문시장'), spotByName('성산일출봉'), spotByName('섭지코지')];
  const crossLunchPlan = await generateTimeline(
    { ...makeSchedule(crossLunch), accommodation: 'jejucity' }, 1.0, [crossLunch],
  );
  check(
    '긴 이동 중 점심 시간이 되면 도착 후 식사',
    crossLunchPlan[0].items.some(i => i.name === '점심 식사'),
    crossLunchPlan[0].items.filter(i => i.type !== 'move').map(i => `${i.time} ${i.name}`).join(' | '),
  );

  section('■ 기간 계산');
  for (const season of ['spring', 'winter'] as const) {
    for (const count of [5, 9, 14]) {
      const schedule = makeSchedule(jejuSpots.slice(0, count), { ...BASE_SETTINGS, season });
      const shown = countTripDays(schedule);
      const actual = (await generateTimeline(schedule)).length;
      check(`명소 선택 화면 기간 = 타임라인 기간 (${season}, 명소 ${count}개)`, shown === actual, `${shown}일 vs ${actual}일`);
    }
  }

  section('■ AI 호출 (서버 주소 없음)');
  check('서버 주소가 없으면 null', (await planWithAi(makeSchedule(twelve))) === null);

  section('■ 서버 요청 검증');
  const nine = [
    '성산일출봉', '섭지코지', '만장굴', '비자림', '협재', '산방산', '천지연', '국립제주박물관', '동문시장',
  ].map(spotByName);
  const req = buildRoutePlanRequest(nine, BASE_SETTINGS, 4);
  check('정상 요청 통과', routePlanRequestSchema.safeParse({ ...req }).success);
  check('행렬 크기가 안 맞으면 거절', !routePlanRequestSchema.safeParse({ ...req, travelMinutes: [[0]] }).success);

  section('■ 서버 일정 검증');
  check('정상 배정은 통과', validatePlan(req, planOf([[8, 9], [3, 4], [1, 2], [6, 5], [7]])).length === 0);

  const broken = validatePlan(req, planOf([[1, 2, 3, 4, 5, 6], [3, 99]]));
  check('한도 초과를 잡아냄', broken.some(e => e.includes('한도')), broken.join(' / '));
  check('중복 배정을 잡아냄', broken.some(e => e.includes('두 번')));
  check('없는 번호를 잡아냄', broken.some(e => e.includes('없는 명소 번호')));
  check('누락된 명소를 잡아냄', broken.some(e => e.includes('배정되지 않은')));

  const oneSpotPerDay = validatePlan(req, planOf([[1], [2], [3], [4], [5], [6], [7], [8], [9]]));
  check(
    '명소 하나뿐인 날은 한도 초과를 허용',
    oneSpotPerDay.every(e => !e.includes('이동+체류')),
    oneSpotPerDay.join(' / '),
  );
  check('기준안보다 하루 넘게 길면 거절', oneSpotPerDay.some(e => e.includes('너무 깁니다')));

  // 식당을 첫 순서에 넣으면 09:10에 도착해 점심 시간(11:30)까지 기다리게 되어,
  // 이동+체류 합계(210분)는 한도(300분) 안이지만 실제로는 15:50에 끝나 마감 15:00을 넘긴다
  const waitingReq = routePlanRequestSchema.parse({
    spots: [
      { id: 'f', name: '테스트식당', category: 'food', durationMinutes: 60, tags: [], foodType: 'restaurant' },
      { id: 'a', name: '테스트명소A', category: 'nature', durationMinutes: 90, tags: [] },
      { id: 'b', name: '테스트명소B', category: 'nature', durationMinutes: 60, tags: [] },
    ],
    settings: { ...BASE_SETTINGS, luggage: 'light', lastDayDeparture: 15 },
    accommodationLabel: '제주시',
    travelMinutes: [
      [0, 10, 40, 50],
      [10, 0, 30, 40],
      [40, 30, 0, 20],
      [50, 40, 20, 0],
    ],
    baseline: { days: 1, order: ['f', 'a', 'b'] },
    slackFactor: 1.0,
  });
  const waiting = validatePlan(waitingReq, planOf([[1, 2, 3]]));
  check('식사 시간까지 기다리다 마감을 넘기면 거절', waiting.some(e => e.includes('실제 시각')), waiting.join(' / '));

  section('■ 날씨에 맞는 배치 검증');
  // nine 기준 실내: 3(만장굴) 8(국립제주박물관) 9(동문시장) / 야외: 1 2 4 5 6 7
  const rainyReq = buildRoutePlanRequest(nine, BASE_SETTINGS, 4, ['sunny', 'rainy', 'sunny', 'sunny', 'sunny']);
  const outdoorOnRainy = validatePlan(rainyReq, planOf([[8, 9], [4], [1, 2], [3, 6], [5, 7]]));
  check(
    '비 오는 날 야외 명소 + 맑은 날 실내 명소 → 거절',
    outdoorOnRainy.some(e => e.includes('자리를 바꾸세요')),
    outdoorOnRainy.join(' / '),
  );
  check(
    '비 오는 날 실내 명소만 있으면 통과',
    !validatePlan(rainyReq, planOf([[8, 9], [3], [1, 2], [4, 6], [5, 7]]))
      .some(e => e.includes('자리를 바꾸세요')),
  );
  check(
    '맑은 날에 바꿀 실내 명소가 없으면 통과',
    !validatePlan(rainyReq, planOf([[1, 2], [3, 8, 9], [4, 6], [5, 7]]))
      .some(e => e.includes('자리를 바꾸세요')),
  );

  section('■ 자동 설정 값 보정');
  const raw = {
    themes: ['healing'], season: 'spring', startTime: 9, endTime: 19,
    firstDayArrival: null, lastDayDeparture: null, people: 2, budget: 1, luggage: 'medium', summary: 's',
  };
  const september = new Date('2026-09-11T12:00:00+09:00');
  const sanitized = (patch: Record<string, unknown>) =>
    sanitizeTripSettings({ ...raw, ...patch } as Parameters<typeof sanitizeTripSettings>[0], september).settings;

  check('없는 테마는 걸러냄', JSON.stringify(sanitized({ themes: ['beach', 'food', 'food'] }).themes) === '["food"]');
  check('테마가 모두 틀리면 healing', JSON.stringify(sanitized({ themes: ['beach'] }).themes) === '["healing"]');
  check('틀린 계절은 오늘 기준 계절(9월=가을)', sanitized({ season: '가을' }).season === 'fall');
  check('틀린 짐 값은 medium', sanitized({ luggage: 'huge' }).luggage === 'medium');
  check('시작이 끝보다 늦으면 9~19시', sanitized({ startTime: 20, endTime: 18 }).startTime === 9);
  check('null 도착·출발은 설정 안 함', sanitized({}).firstDayArrival === undefined);
  check('범위를 벗어난 도착 시각은 보정', sanitized({ firstDayArrival: 30 }).firstDayArrival === 24);
  check('인원은 1~20명으로 보정', sanitized({ people: 99 }).people === 20);

  console.log(`\n${failed === 0 ? '모두 통과' : `실패 ${failed}건`}`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main();
