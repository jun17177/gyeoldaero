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

const INDOOR_TAG_HINTS = ['실내', '박물관', '미술관', '전시', '시장', '카페', '체험', '수족관', '동굴'];

// 비·눈 오는 날 배치를 모델이 명소 이름만 보고 추측하지 않도록 미리 분류해 넘긴다 — 추론을 꺼도 날씨에 맞게 배치하도록
function isIndoor(spot: RoutePlanRequest['spots'][number]): boolean {
  return spot.category === 'culture'
    || spot.category === 'food'
    || spot.tags.some(tag => INDOOR_TAG_HINTS.some(hint => tag.includes(hint)));
}

// 제주의 계절별 대략적인 일출·일몰 시각(시). 활동 시간 밖의 일출·야경을 note에 약속하지 않도록 조건에 구체적으로 적는다 —
// "활동 시간 안의 내용만"이라는 일반 규칙은 추론을 끄면 잘 지켜지지 않았다
const SUNRISE_HOUR: Record<Settings['season'], number> = { spring: 6, summer: 5, fall: 6, winter: 7 };
const SUNSET_HOUR: Record<Settings['season'], number> = { spring: 19, summer: 19, fall: 18, winter: 17 };

function timeOfDayLimit(s: Settings): string | null {
  const unavailable: string[] = [];
  if (s.startTime > SUNRISE_HOUR[s.season]) unavailable.push('일출');
  if (s.endTime < SUNSET_HOUR[s.season] + 1) unavailable.push('야경');
  if (unavailable.length === 0) return null;
  return `- 활동 시간(${s.startTime}~${s.endTime}시)에는 ${unavailable.join('·')}을 볼 수 없습니다. note와 daysReason에 쓰지 않습니다.`;
}

export const SYSTEM_PROMPT = `당신은 제주도 여행 동선을 설계하는 플래너입니다. 사용자가 고른 명소를 날짜별로 나누고 하루 안의 방문 순서를 정한 뒤, 무리 없이 다닐 수 있는 여행 기간(일수)을 추천합니다.

## 반드시 지킬 조건
- 입력된 모든 명소를 정확히 한 번씩 배정합니다. 명소는 목록의 번호로 적습니다.
- 날짜마다 (숙소→첫 명소 이동 + 명소 간 이동 + 체류 시간) 합계가 그날 한도를 넘지 않아야 합니다. 식사 시간과 짐·날씨 보정은 한도에 이미 반영되어 있습니다.
  - 이동 시간은 제공된 행렬 값을 씁니다. 숙소로 돌아오는 이동은 넣지 않습니다.
  - 분류가 "식당"인 곳은 그날 식사를 대신하므로, 그날 식사 횟수까지는 체류 0분으로 계산합니다.
  - 식당에 식사 시간(점심 11:30~14:00, 저녁 17:30~20:00)보다 일찍 도착하면 그때까지 기다려야 합니다. 이 대기 때문에 하루가 끝 시각을 넘지 않도록 식당 순서를 잡습니다.
  - 명소가 하나뿐인 날은 한도를 넘어도 괜찮습니다.
- 이 작업은 여러 단계의 계산이 필요합니다. 날짜마다 work에 합계를 적어 한도와 비교한 뒤 spots를 확정하세요.

## 좋은 동선의 기준
- 가까운 권역끼리 같은 날에 묶고(제주시 / 애월·한림 서쪽 / 중문·서귀포 남쪽 / 성산·구좌 동쪽 등), 하루 안에서는 왔던 길을 되돌아가지 않게 순서를 정합니다.
- 야경·야간 명소는 그날 마지막 순서에 둡니다. 일출 명소는 그날 첫 순서에 두되, 하루 활동 시작이 일출 뒤라면 일출을 본다고 쓰지 않습니다.
- 비나 눈이 오는 날에는 '실내'로 표시된 명소를 모아 배치하고, '야외' 명소는 맑은 날로 옮깁니다.
- 식당은 점심(12시)이나 저녁(18시) 무렵에 도착하도록 순서를 잡습니다.
- 한도에는 짐 무게·날씨로 늦어지는 시간이 이미 반영되어 있습니다. 한도 안이라면 하루에 명소를 충분히 넣고, 여유를 따로 더 두지 않습니다.
- 기간은 한도를 지키면서 모든 명소를 넣을 수 있는 최소 일수로 정합니다. 기준안(단순 알고리즘 결과)보다 하루 넘게 길어지면 안 됩니다.

## 출력
- days: 날짜 순서대로 적습니다.
  - work: spots를 정하기 전의 계산 메모입니다. 그날 날씨(예보가 있으면)와 방문 순서대로의 이동·체류 시간 합계를 적고 한도와 비교합니다 (예: "맑음 | 숙소→3 45 + 90, 3→7 20 + 60 = 215 / 한도 380"). 한도를 넘으면 명소를 다른 날로 옮기고 다시 계산합니다. 비·눈 예보가 있는 날에는 '실내' 명소를 모아 넣고 '야외' 명소는 맑은 날로 옮깁니다.
  - spots: work에서 확정한 그날의 방문 순서대로의 명소 번호입니다.
  - note: 그날 동선을 사용자에게 보여줄 한 줄 요약입니다 (예: "서쪽 해안을 따라 협재에서 한림공원까지"). 하루 활동 시간 안에서 실제로 할 수 있는 내용만 씁니다. 식사는 앱이 점심·저녁 시간에 알아서 넣으므로, '식당'으로 표시된 곳이 아니면 어디서 먹는다고 쓰지 않습니다.
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
  const timeLimit = timeOfDayLimit(s);
  // 추론을 끄면 "비 오는 날엔 실내"라는 일반 규칙을 잘 적용하지 못해서, 해당 날짜와 실내 명소 번호를 직접 짚어 준다
  const badWeatherDays = (req.weatherByDay ?? [])
    .map((w, i) => (w === 'rainy' || w === 'snowy' ? `DAY${i + 1}` : ''))
    .filter(Boolean);
  const indoorNumbers = req.spots
    .map((spot, i) => (isIndoor(spot) ? i + 1 : 0))
    .filter(n => n > 0);

  const lines = [
    '## 여행 조건',
    `- 인원 ${s.people}명, 짐 ${LUGGAGE_KR[s.luggage]}`,
    `- 계절 ${SEASON_KR[s.season]}, 테마 ${s.themes.map(t => THEME_KR[t]).join(', ') || '지정 없음'}`,
    `- 숙소 위치 ${req.accommodationLabel}`,
    ...(timeLimit ? [timeLimit] : []),
    '',
    '## 하루 한도 (이동 + 체류 합계)',
    `- 당일치기: ${describeDay(req, single)}`,
    `- 2일 이상: 첫날 ${describeDay(req, first)} / 중간 날 ${describeDay(req, middle)} / 마지막 날 ${describeDay(req, last)}`,
    '',
    '## 날씨',
    req.weatherByDay?.length
      ? req.weatherByDay.map((w, i) => `DAY${i + 1} ${WEATHER_KR[w]}`).join(', ') + ' (그 이후 날짜는 예보 없음)'
      : '날짜별 예보 없음 — 날씨는 고려하지 않아도 됩니다.',
    ...(badWeatherDays.length > 0 && indoorNumbers.length > 0
      ? [`비·눈 오는 날(${badWeatherDays.join(', ')})에는 실내 명소(${indoorNumbers.join(', ')}번)를 모아 배치하세요.`]
      : []),
    '',
    '## 명소 (번호. 이름 | 분류 | 체류 | 실내·야외 | 태그)',
    ...req.spots.map((spot, i) => {
      const restaurant = spot.category === 'food' && spot.foodType === 'restaurant';
      const kind = restaurant ? '식당' : spot.foodType === 'cafe' ? '카페' : CATEGORY_KR[spot.category];
      const stay = restaurant ? '식사 대체' : `${spot.durationMinutes}분`;
      return `${i + 1}. ${spot.name} | ${kind} | ${stay} | ${isIndoor(spot) ? '실내' : '야외'} | ${spot.tags.join(', ') || '-'}`;
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
