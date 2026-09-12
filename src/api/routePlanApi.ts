import axios from 'axios';
import { PLANNER_API_URL, plannerHeaders } from '../constants/config';
import { AiRoutePlan, RoutePlanRequest } from '../types';

// 서버가 Claude 응답을 검증하고 필요하면 한 번 재시도까지 하므로 넉넉하게 기다린다
const TIMEOUT_MS = 150_000;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

// 서버 주소를 잘못 넣었거나 터널 경고 페이지처럼 200으로 엉뚱한 응답이 올 수 있어 형태를 확인한다
function isAiRoutePlan(data: unknown): data is AiRoutePlan {
  return isRecord(data)
    && typeof data.daysReason === 'string'
    && Array.isArray(data.days)
    && (data.days as unknown[]).every(day =>
      isRecord(day)
      && typeof day.note === 'string'
      && Array.isArray(day.spotIds)
      && (day.spotIds as unknown[]).every(id => typeof id === 'string'));
}

// Claude API 키를 앱에 넣지 않기 위해 server/를 거쳐 호출. 실패하면 null → 호출부가 알고리즘 결과로 대체
export async function requestAiRoutePlan(req: RoutePlanRequest): Promise<AiRoutePlan | null> {
  if (!PLANNER_API_URL) return null;
  try {
    const res = await axios.post<unknown>(`${PLANNER_API_URL}/api/route-plan`, req, {
      timeout: TIMEOUT_MS,
      headers: plannerHeaders(),
    });
    if (isAiRoutePlan(res.data)) return res.data;
    console.warn('[routePlan] 예상과 다른 응답 — EXPO_PUBLIC_PLANNER_API_URL이 AI 동선 서버를 가리키는지 확인하세요');
    return null;
  } catch (e) {
    console.warn('[routePlan] AI 동선 요청 실패 — 알고리즘으로 대체:', e instanceof Error ? e.message : e);
    return null;
  }
}
