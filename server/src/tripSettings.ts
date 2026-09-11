import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { EFFORT, MODEL, THINKING, client } from './claude.js';

const THEMES = ['healing', 'activity', 'food', 'culture', 'photo', 'night'] as const;
const SEASONS = ['spring', 'summer', 'fall', 'winter'] as const;
const LUGGAGE = ['light', 'medium', 'heavy', 'very_heavy'] as const;

type Theme = (typeof THEMES)[number];
type Season = (typeof SEASONS)[number];
type Luggage = (typeof LUGGAGE)[number];

const isTheme = (v: string): v is Theme => (THEMES as readonly string[]).includes(v);
const isSeason = (v: string): v is Season => (SEASONS as readonly string[]).includes(v);
const isLuggage = (v: string): v is Luggage => (LUGGAGE as readonly string[]).includes(v);

export const tripSettingsRequestSchema = z.object({
  text: z.string().trim().min(1).max(500),
});

// SDK가 structured outputs 스키마로 바꿀 때 enum·범위 제약은 강제 조건이 아닌 설명문으로 옮겨진다.
// 그래서 enum 대신 문자열로 받고 허용되지 않는 값은 sanitize에서 기본값으로 바꾼다 — 값 하나 때문에 파싱이 실패해 기능 전체가 멈추지 않도록
const claudeTripSettingsSchema = z.object({
  themes: z.array(z.string()),
  season: z.string(),
  startTime: z.number().int(),
  endTime: z.number().int(),
  firstDayArrival: z.number().int().nullable(),
  lastDayDeparture: z.number().int().nullable(),
  people: z.number().int(),
  budget: z.number(),
  luggage: z.string(),
  summary: z.string(),
});

type ClaudeTripSettings = z.infer<typeof claudeTripSettingsSchema>;

// 앱에 돌려주는 형태 (src/types/index.ts의 AiTripSettings와 맞춰야 함)
export interface TripSettingsResult {
  settings: {
    themes: Theme[];
    season: Season;
    startTime: number;
    endTime: number;
    firstDayArrival?: number;
    lastDayDeparture?: number;
    people: number;
    budget: number;
    luggage: Luggage;
  };
  summary: string;
}

const SYSTEM_PROMPT = `당신은 제주 여행 앱 '결대로'의 설정 도우미입니다. 사용자가 원하는 여행을 자유롭게 적은 글을 읽고 앱의 여행 설정 값으로 바꿉니다. 글에 없는 값은 아래 기본값을 쓰고, 추측이 필요하면 글의 분위기에 맞게 정합니다. 괄호 밖의 영어 값만 그대로 씁니다.

- themes: 글에 드러난 취향을 모두 고릅니다. healing(휴식·힐링·바다 보며 쉬기), activity(체험·레포츠·오름·트레킹), food(맛집·카페·시장), culture(역사·박물관·전시), photo(사진·감성·경치 좋은 곳), night(야경·야시장·밤 산책). 드러난 취향이 없으면 healing.
- season: 여행 시기의 계절입니다(3~5월 spring, 6~8월 summer, 9~11월 fall, 12~2월 winter). '다음 달', '크리스마스' 같은 시기 표현이 있으면 오늘 날짜를 기준으로 정하고, 없으면 오늘 날짜의 계절로 정합니다.
- startTime, endTime: 하루 활동 시작·종료 시각(0~24 사이 정수 시). 기본은 9시~19시이고, '늦잠', '아침 일찍', '밤늦게까지' 같은 표현을 반영합니다.
- firstDayArrival, lastDayDeparture: 첫날 제주 도착 시각, 마지막 날 출발 시각(정수 시). 언급이 없으면 null.
- people: 본인을 포함한 인원. '부모님이랑'은 3명, '친구랑'은 2명처럼 추정하고, 단서가 없으면 2.
- budget: 하루 교통 예산(만 원 단위 정수). 언급이 없으면 1.
- luggage: light(백팩), medium(작은 캐리어), heavy(큰 캐리어), very_heavy(아이 짐 등 아주 많음). 언급이 없으면 동행과 분위기를 보고 정하되 애매하면 medium.
- summary: 이해한 내용을 사용자에게 보여줄 한국어 한두 문장입니다. '3박 4일'처럼 설정에 없는 요청이 있으면 "여행 기간은 명소를 고르면 자동으로 계산돼요"처럼 안내합니다. 여행과 무관한 글이면 기본값으로 채우고 그 사실을 알려줍니다.`;

const clampHour = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));

function seasonOfMonth(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

export function sanitizeTripSettings(raw: ClaudeTripSettings, now: Date = new Date()): TripSettingsResult {
  const seoulMonth = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', month: 'numeric' }).format(now));
  const themes = [...new Set(raw.themes.filter(isTheme))];
  let startTime = clampHour(raw.startTime, 0, 23);
  let endTime = clampHour(raw.endTime, 1, 24);
  if (endTime <= startTime) {
    startTime = 9;
    endTime = 19;
  }
  return {
    settings: {
      themes: themes.length > 0 ? themes : ['healing'],
      season: isSeason(raw.season) ? raw.season : seasonOfMonth(seoulMonth),
      startTime,
      endTime,
      firstDayArrival: raw.firstDayArrival === null ? undefined : clampHour(raw.firstDayArrival, 0, 24),
      lastDayDeparture: raw.lastDayDeparture === null ? undefined : clampHour(raw.lastDayDeparture, 0, 24),
      people: clampHour(raw.people, 1, 20),
      budget: Math.max(0, Math.round(raw.budget)),
      luggage: isLuggage(raw.luggage) ? raw.luggage : 'medium',
    },
    summary: raw.summary,
  };
}

export async function extractTripSettings(text: string): Promise<TripSettingsResult | null> {
  // 시기 표현('다음 달' 등)을 계절로 바꾸려면 오늘 날짜가 필요하다. 매 요청 달라지므로 시스템 프롬프트가 아닌 메시지에 넣는다
  const today = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'full' }).format(new Date());
  const startedAt = Date.now();
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    thinking: THINKING,
    output_config: { effort: EFFORT, format: zodOutputFormat(claudeTripSettingsSchema) },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `오늘 날짜: ${today}\n\n<여행_설명>\n${text}\n</여행_설명>` }],
  });
  console.log(
    `[trip-settings] model=${response.model} effort=${EFFORT} thinking=${THINKING.type} stop=${response.stop_reason} ` +
      `${Date.now() - startedAt}ms in=${response.usage.input_tokens} out=${response.usage.output_tokens}`,
  );

  if (response.stop_reason !== 'end_turn' || !response.parsed_output) return null;
  return sanitizeTripSettings(response.parsed_output);
}
