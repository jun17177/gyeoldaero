import { z } from 'zod';

export const MAX_SPOTS = 30;
export const MAX_DAYS = 10;

const weather = z.enum(['sunny', 'cloudy', 'rainy', 'snowy']);
export type SkyCondition = z.infer<typeof weather>;
const hour = z.number().min(0).max(24);

export const routePlanRequestSchema = z
  .object({
    spots: z
      .array(
        z.object({
          id: z.string().min(1).max(200),
          name: z.string().min(1).max(200),
          category: z.enum(['nature', 'activity', 'culture', 'food', 'photo', 'night']),
          durationMinutes: z.number().positive().max(24 * 60),
          tags: z.array(z.string().max(100)).max(20),
          foodType: z.enum(['cafe', 'restaurant']).optional(),
        }),
      )
      .min(1)
      .max(MAX_SPOTS),
    // 날씨는 설정이 아니라 weatherByDay(예보)로만 받는다. z.object는 모르는 키를 버리므로
    // 예전 앱이 settings.weather를 보내도 요청은 그대로 통과
    settings: z.object({
      themes: z.array(z.enum(['healing', 'activity', 'food', 'culture', 'photo', 'night'])).max(6),
      season: z.enum(['spring', 'summer', 'fall', 'winter']),
      startTime: hour,
      endTime: hour,
      firstDayArrival: hour.nullish(),
      lastDayDeparture: hour.nullish(),
      people: z.number().int().positive().max(50),
      budget: z.number().nonnegative(),
      luggage: z.enum(['light', 'medium', 'heavy', 'very_heavy']),
    }),
    accommodationLabel: z.string().min(1).max(30),
    // [0] = 숙소, [k] = spots[k - 1]
    travelMinutes: z.array(z.array(z.number().nonnegative().max(24 * 60))),
    baseline: z.object({
      // 기준안은 참고용이라 AI 계획 한도(MAX_DAYS)보다 길 수 있다
      days: z.number().int().positive().max(100),
      order: z.array(z.string()),
    }),
    slackFactor: z.number().min(1).max(3),
    weatherByDay: z.array(weather).max(MAX_DAYS).optional(),
  })
  .refine(r => r.settings.startTime < r.settings.endTime, {
    message: 'startTime must be before endTime',
  })
  .refine(
    r =>
      r.travelMinutes.length === r.spots.length + 1 &&
      r.travelMinutes.every(row => row.length === r.spots.length + 1),
    { message: 'travelMinutes must be a (spots + 1) square matrix' },
  )
  .refine(r => new Set(r.spots.map(s => s.id)).size === r.spots.length, {
    message: 'duplicate spot id',
  });

export type RoutePlanRequest = z.infer<typeof routePlanRequestSchema>;

// Claude 출력 스키마. 명소는 id 대신 목록 번호(1부터)로 받는다 — 출력 토큰이 줄어 응답이 빨라지고 id를 잘못 옮겨 적을 여지도 없음.
// 범위 제약은 structured outputs가 전부 지원하지 않아 validatePlan에서 검사하고,
// 기간(일수)은 days.length로 정해지므로 별도 필드를 두지 않는다 — 두 값이 어긋날 여지를 없애기 위함
export const claudeRoutePlanSchema = z.object({
  days: z.array(
    z.object({
      // spots보다 먼저 쓰게 해서, 추론을 꺼도 모델이 그날 합계를 적어 보며 한도를 확인하도록 한다 (앱에는 보내지 않음)
      work: z.string(),
      spots: z.array(z.number().int()),
      note: z.string(),
    }),
  ),
  daysReason: z.string(),
});

export type ClaudeRoutePlan = z.infer<typeof claudeRoutePlanSchema>;

// 앱에 돌려주는 형태 (src/types/index.ts의 AiRoutePlan과 맞춰야 함)
export interface AiRoutePlan {
  days: { spotIds: string[]; note: string }[];
  daysReason: string;
}
