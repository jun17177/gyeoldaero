// 서버 주소는 비밀값이 아니라서 Expo의 EXPO_PUBLIC_ 환경변수로 받는다 (.env.local에 설정).
// 비어 있으면 AI 동선을 건너뛰고 기존 알고리즘으로만 일정을 만든다
export const PLANNER_API_URL = process.env.EXPO_PUBLIC_PLANNER_API_URL ?? '';

// 한 번에 AI에 보낼 수 있는 최대 명소 수 — server/src/schema.ts의 MAX_SPOTS와 같아야 함
export const AI_MAX_SPOTS = 30;
