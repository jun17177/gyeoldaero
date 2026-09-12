// 서버 주소는 비밀값이 아니라서 Expo의 EXPO_PUBLIC_ 환경변수로 받는다 (.env.local에 설정).
// 비어 있으면 AI 동선을 건너뛰고 기존 알고리즘으로만 일정을 만든다
export const PLANNER_API_URL = process.env.EXPO_PUBLIC_PLANNER_API_URL ?? '';

// 한 번에 AI에 보낼 수 있는 최대 명소 수 — server/src/schema.ts의 MAX_SPOTS와 같아야 함
export const AI_MAX_SPOTS = 30;

// 서버에 PLANNER_TOKEN을 설정했다면 같은 값을 넣는다. 앱 번들에서 꺼낼 수 있어 비밀번호는 아니고,
// 주소만 알고 호출하는 것을 막는 용도
const PLANNER_API_TOKEN = process.env.EXPO_PUBLIC_PLANNER_API_TOKEN ?? '';

export const plannerHeaders = (): Record<string, string> | undefined =>
  PLANNER_API_TOKEN ? { 'x-planner-token': PLANNER_API_TOKEN } : undefined;
