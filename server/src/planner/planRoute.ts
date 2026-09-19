import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { AiRoutePlan, ClaudeRoutePlan, RoutePlanRequest, claudeRoutePlanSchema } from './schema.js';
import { validatePlan } from './feasibility.js';
import { PreviousAttempt, SYSTEM_PROMPT, buildUserMessage } from './prompt.js';
import { EFFORT, MODEL, THINKING, client } from './claude.js';

const MAX_ATTEMPTS = 2;
// 첫 시도가 이보다 오래 걸렸으면 재시도하지 않는다 — 더 기다리게 하느니 앱의 알고리즘 일정으로 넘기는 편이 낫다
const RETRY_BUDGET_MS = 15_000;

function toAppPlan(req: RoutePlanRequest, plan: ClaudeRoutePlan): AiRoutePlan {
  return {
    daysReason: plan.daysReason,
    days: plan.days.map(day => ({
      note: day.note,
      spotIds: day.spots.map(n => req.spots[n - 1].id),
    })),
  };
}

export async function planRoute(req: RoutePlanRequest): Promise<AiRoutePlan | null> {
  const startedAt = Date.now();
  let previous: PreviousAttempt | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const attemptStartedAt = Date.now();
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      thinking: THINKING,
      output_config: { effort: EFFORT, format: zodOutputFormat(claudeRoutePlanSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(req, previous) }],
    });
    console.log(
      `[route-plan] attempt=${attempt} model=${response.model} effort=${EFFORT} thinking=${THINKING.type} stop=${response.stop_reason} ` +
        `${Date.now() - attemptStartedAt}ms in=${response.usage.input_tokens} out=${response.usage.output_tokens}`,
    );

    // 거절(refusal)·토큰 초과 등은 재시도해도 결과가 같을 가능성이 높아 바로 앱의 알고리즘으로 넘긴다
    if (response.stop_reason !== 'end_turn' || !response.parsed_output) return null;

    const errors = validatePlan(req, response.parsed_output);
    if (errors.length === 0) return toAppPlan(req, response.parsed_output);

    console.warn(`[route-plan] attempt=${attempt} 검증 실패:`, errors);
    if (Date.now() - startedAt > RETRY_BUDGET_MS) return null;
    previous = { plan: response.parsed_output, errors };
  }

  return null;
}
