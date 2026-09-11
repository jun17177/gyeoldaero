import { ClaudeRoutePlan, RoutePlanRequest, SkyCondition } from './schema.js';
import { DayWindow, dayBudget, dayWindows, hhmm, mealSlots } from './feasibility.js';

type Settings = RoutePlanRequest['settings'];

const WEATHER_KR: Record<SkyCondition, string> = {
  sunny: '맑음', cloudy: '흐림', rainy: '비', snowy: '눈',
};
const SEASON_KR: Record<Settings['season'], string> = {
  spring: '봄', summer: '여름', fall: '가을', winter: '겨울',
};
const THEME_KR: Record<Settings['themes'][number], string> = {
  healing: '힐링', activity: '액티비티', food: '미식',
  culture: '문화탐방', photo: '사진·감성', night: '야경·야간',
};
const CATEGORY_KR: Record<RoutePlanRequest['spots'][number]['category'], string> = {
  nature: '자연', activity: '액티비티', culture: '문화',
  food: '미식', photo: '사진', night: '야경·야간',
};
const LUGGAGE_KR: Record<Settings['luggage'], string> = {
  light: '가벼움(백팩)', medium: '보통(작은 캐리어)',
  heavy: '무거움(큰 캐리어)', very_heavy: '매우 무거움',
};

export const SYSTEM_PROMPT = `당신은 제주도 여행 동선을 설계하는 플래너입니다. 사용자가 고른 명소를 날짜별로 나누고 하루 안의 방문 순서를 정한 뒤, 무리 없이 다닐 수 있는 여행 기간(일수)을 추천합니다.

## 반드시 지킬 조건
- 입력된 모든 명소를 정확히 한 번씩 배정합니다. 명소는 목록의 번호로 적습니다.
- 날짜마다 (숙소→첫 명소 이동 + 명소 간 이동 + 체류 시간) 합계가 그날 한도를 넘지 않아야 합니다. 식사 시간과 짐·날씨 보정은 한도에 이미 반영되어 있습니다.
  - 이동 시간은 제공된 행렬 값을 씁니다. 숙소로 돌아오는 이동은 넣지 않습니다.
  - 분류가 "식당"인 곳은 그날 식사를 대신하므로, 그날 식사 횟수까지는 체류 0분으로 계산합니다.
  - 식당에 식사 시간(점심 11:30~14:00, 저녁 17:30~20:00)보다 일찍 도착하면 그때까지 기다려야 합니다. 이 대기 때문에 하루가 끝 시각을 넘지 않도록 식당 순서를 잡습니다.
  - 명소가 하나뿐인 날은 한도를 넘어도 괜찮습니다.
- 이 작업은 여러 단계의 계산이 필요합니다. 답하기 전에 날짜별 합계를 한도와 하나씩 비교해 확인하세요.

## 좋은 동선의 기준
- 가까운 권역끼리 같은 날에 묶고(제주시 / 애월·한림 서쪽 / 중문·서귀포 남쪽 / 성산·구좌 동쪽 등), 하루 안에서는 왔던 길을 되돌아가지 않게 순서를 정합니다.
- 일출 명소는 그날 첫 순서, 야경·야간 명소는 그날 마지막 순서에 둡니다.
- 비나 눈이 오는 날에는 실내 명소(박물관·미술관·시장·카페·체험)를 먼저 배치하고, 해변·오름·트레킹은 맑은 날로 옮깁니다.
- 식당은 점심(12시)이나 저녁(18시) 무렵에 도착하도록 순서를 잡습니다.
- 인원이 많거나 짐이 무거우면 하루를 빡빡하게 채우지 말고 여유를 둡니다.
- 기간은 모든 명소를 여유 있게 소화하는 최소 일수로 정합니다. 기준안은 참고용이며 달라져도 괜찮습니다.

## 출력
- days: 날짜 순서대로 적습니다. spots는 그날 방문 순서대로의 명소 번호, note는 그날 동선을 사용자에게 보여줄 한 줄 요약입니다 (예: "서쪽 해안을 따라 협재에서 한림공원까지, 저녁은 애월에서").
- daysReason: 이 기간을 추천하는 이유를 사용자에게 보여줄 한국어 1~2문장입니다. 계산식이나 명소 번호는 쓰지 않습니다.`;

function describeDay(req: RoutePlanRequest, win: DayWindow): string {
  return `${hhmm(win.start)}~${hhmm(win.end)}, 식사 ${mealSlots(win)}회 → 한도 ${dayBudget(req, win)}분`;
}

export interface PreviousAttempt {
  plan: ClaudeRoutePlan;
  errors: string[];
}

export function buildUserMessage(req: RoutePlanRequest, previous?: PreviousAttempt): string {
  const s = req.settings;
  const numberById = new Map(req.spots.map((spot, i) => [spot.id, i + 1]));
  const [single] = dayWindows(s, 1);
  const [first, middle, last] = dayWindows(s, 3);

  const lines = [
    '## 여행 조건',
    `- 인원 ${s.people}명, 짐 ${LUGGAGE_KR[s.luggage]}`,
    `- 계절 ${SEASON_KR[s.season]}, 테마 ${s.themes.map(t => THEME_KR[t]).join(', ') || '지정 없음'}`,
    `- 숙소 위치 ${req.accommodationLabel}`,
    '',
    '## 하루 한도 (이동 + 체류 합계)',
    `- 당일치기: ${describeDay(req, single)}`,
    `- 2일 이상: 첫날 ${describeDay(req, first)} / 중간 날 ${describeDay(req, middle)} / 마지막 날 ${describeDay(req, last)}`,
    '',
    '## 날씨',
    req.weatherByDay?.length
      ? req.weatherByDay.map((w, i) => `DAY${i + 1} ${WEATHER_KR[w]}`).join(', ') + ' (그 이후 날짜는 예보 없음)'
      : '날짜별 예보 없음 — 날씨는 고려하지 않아도 됩니다.',
    '',
    '## 명소 (번호. 이름 | 분류 | 체류 | 태그)',
    ...req.spots.map((spot, i) => {
      const restaurant = spot.category === 'food' && spot.foodType === 'restaurant';
      const kind = restaurant ? '식당' : spot.foodType === 'cafe' ? '카페' : CATEGORY_KR[spot.category];
      const stay = restaurant ? '식사 대체' : `${spot.durationMinutes}분`;
      return `${i + 1}. ${spot.name} | ${kind} | ${stay} | ${spot.tags.join(', ') || '-'}`;
    }),
    '',
    '## 이동 시간 행렬 (분, 짐 무게에 맞는 교통수단 기준)',
    '행·열 번호 0은 숙소, k는 위 명소 k번입니다.',
    ...req.travelMinutes.map((row, i) => `${i}: ${row.join(' ')}`),
    '',
    '## 기준안 (단순 최근접 이웃 알고리즘 결과)',
    `- 기간 ${req.baseline.days}일`,
    `- 방문 순서: ${req.baseline.order.map(id => numberById.get(id) ?? '?').join(' → ')}`,
  ];

  if (previous) {
    const previousDays = previous.plan.days
      .map((d, i) => `DAY${i + 1} [${d.spots.join(', ')}]`)
      .join(' ');
    lines.push(
      '',
      '## 이전 안이 검증을 통과하지 못했습니다',
      `이전 안: ${previousDays}`,
      ...previous.errors.map(e => `- ${e}`),
      '위 문제를 모두 해결한 새 안을 만드세요.',
    );
  }

  return lines.join('\n');
}
