import Anthropic from '@anthropic-ai/sdk';

const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
type Effort = (typeof EFFORTS)[number];

// 코드 수정 없이 모델·effort를 바꿔가며 응답 시간과 품질을 비교할 수 있도록 환경변수로 받는다
export const MODEL = process.env.PLANNER_MODEL || 'claude-sonnet-5';
// 사용자가 앱 화면에서 기다리는 요청이라 기본은 low. 결과가 부실하면 medium으로 올려 비교한다
export const EFFORT: Effort = EFFORTS.find(e => e === process.env.PLANNER_EFFORT) ?? 'low';
// 실측(명소 9곳): 추론을 켜면(adaptive) 17~25초에 가끔 45초를 넘겼고, 끄고 계산 메모(work)를 쓰게 하면 8~14초(재시도 시 ~22초)였다.
// 한도·누락은 서버 검증과 재시도가 지키므로 기본은 끔. 비 오는 날 배치·기간 등 품질이 아쉬우면 PLANNER_THINKING=adaptive로 켠다
export const THINKING: Anthropic.ThinkingConfigParam =
  process.env.PLANNER_THINKING === 'adaptive' ? { type: 'adaptive' } : { type: 'disabled' };

// 워크스페이스에 묶이지 않은 조직 단위 키는 요청마다 어느 워크스페이스로 보낼지 헤더로 알려야 한다
const WORKSPACE_ID = process.env.ANTHROPIC_WORKSPACE_ID || undefined;

export const client = new Anthropic({
  maxRetries: 1,
  // 한 번의 호출이 이보다 길어지면 끊는다 — 그동안 앱은 알고리즘 일정을 보여주고 있고, 더 기다려도 결과만 늦어진다
  timeout: 30_000,
  defaultHeaders: WORKSPACE_ID ? { 'anthropic-workspace-id': WORKSPACE_ID } : undefined,
});
