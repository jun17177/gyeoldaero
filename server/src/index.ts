import express, { type NextFunction, type Request, type Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { routePlanRequestSchema } from './schema.js';
import { planRoute } from './planRoute.js';

const PORT = Number(process.env.PORT ?? 8787);

// 아직 사용자 인증이 없어서 주소만 알면 누구나 Claude 비용을 쓸 수 있음 — 공개 배포 전까지의 최소한의 IP별 제한
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX_REQUESTS = 30;
const recentRequests = new Map<string, number[]>();

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip ?? 'unknown';
  const now = Date.now();
  const recent = (recentRequests.get(key) ?? []).filter(t => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_REQUESTS) {
    res.status(429).json({ error: 'rate_limited' });
    return;
  }
  recent.push(now);
  recentRequests.set(key, recent);
  next();
}

const app = express();
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/route-plan', rateLimit, async (req, res) => {
  const parsed = routePlanRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'invalid_request',
      issues: parsed.error.issues.slice(0, 5).map(i => `${i.path.map(String).join('.')}: ${i.message}`),
    });
    return;
  }

  try {
    const plan = await planRoute(parsed.data);
    if (!plan) {
      res.status(422).json({ error: 'plan_unavailable' });
      return;
    }
    res.json(plan);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      res.status(503).json({ error: 'upstream_busy' });
      return;
    }
    if (err instanceof Anthropic.APIError) {
      console.error('[route-plan] Claude API 오류:', err.status, err.message);
      res.status(502).json({ error: 'upstream_error' });
      return;
    }
    throw err;
  }
});

// 인증 설정 누락 등 예상 못 한 오류도 스택이 담긴 HTML 대신 JSON으로 — 앱은 실패하면 알고리즘으로 대체한다
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server] 처리되지 않은 오류:', err);
  res.status(500).json({ error: 'internal_error' });
});

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('ANTHROPIC_API_KEY가 설정되지 않았어요. server/.env.example을 참고해 server/.env를 만드세요.');
}

// 같은 Wi-Fi의 휴대폰(Expo Go)에서도 접속할 수 있도록 모든 인터페이스에서 수신
app.listen(PORT, '0.0.0.0', () => {
  console.log(`결대로 planner server: http://localhost:${PORT}`);
});
