import { createHash, timingSafeEqual } from 'node:crypto';
import { RequestHandler } from 'express';

// 길이가 달라도 같은 시간에 비교하도록 해시로 맞춘 뒤 timingSafeEqual을 쓴다
// (!== 로 비교하면 앞 글자부터 맞는지에 따라 응답 시간이 달라져 토큰을 추측당할 수 있다)
function sameToken(received: string | undefined, expected: string): boolean {
  const digest = (v: string) => createHash('sha256').update(v).digest();
  return timingSafeEqual(digest(received ?? ''), digest(expected));
}

// PLANNER_TOKEN이 설정돼 있으면 같은 값을 헤더로 보낸 요청만 통과시킨다.
// LLM을 호출하는 라우트는 전부 이걸 거쳐야 한다 — 주소만 알면 누구나
// Anthropic 크레딧을 쓸 수 있기 때문. (토큰 미설정 시에는 열린 상태로 동작)
export const requirePlannerToken: RequestHandler = (req, res, next) => {
  const token = process.env.PLANNER_TOKEN;
  if (token && !sameToken(req.get('x-planner-token'), token)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
};
