import { RequestHandler } from 'express';

// PLANNER_TOKEN이 설정돼 있으면 같은 값을 헤더로 보낸 요청만 통과시킨다.
// LLM을 호출하는 라우트는 전부 이걸 거쳐야 한다 — 주소만 알면 누구나
// Anthropic 크레딧을 쓸 수 있기 때문. (토큰 미설정 시에는 열린 상태로 동작)
export const requirePlannerToken: RequestHandler = (req, res, next) => {
  const token = process.env.PLANNER_TOKEN;
  if (token && req.get('x-planner-token') !== token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
};
