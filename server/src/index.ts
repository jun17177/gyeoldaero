import express, { type NextFunction, type Request, type Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { routePlanRequestSchema } from './schema.js';
import { planRoute } from './planRoute.js';
import { extractTripSettings, tripSettingsRequestSchema } from './tripSettings.js';

const PORT = Number(process.env.PORT ?? 8787);

// 공개 주소에 올릴 때 최소한의 접근 제한. 앱 번들에서 토큰을 꺼낼 수 있으므로 비밀번호는 아니고,
// 주소만 알고 호출하는 것을 막는 용도다. 제대로 된 인증은 사용자 로그인이 생긴 뒤에 붙인다
const TOKEN = process.env.PLANNER_TOKEN ?? '';

function requireToken(req: Request, res: Response, next: NextFunction) {
  if (!TOKEN || req.get('x-planner-token') === TOKEN) {
    next();
    return;
  }
  res.status(401).json({ error: 'unauthorized' });
}

// 토큰을 쓰더라도 한 명이 계속 호출하는 것은 막아야 하므로 IP별 제한은 그대로 둔다
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

// Claude API 오류를 응답으로 바꾼다. 처리했으면 true — 앱은 어떤 실패든 알고리즘 일정·직접 설정으로 넘어간다
function sendClaudeError(res: Response, err: unknown, tag: string): boolean {
  if (err instanceof Anthropic.RateLimitError) {
    res.status(503).json({ error: 'upstream_busy' });
    return true;
  }
  if (err instanceof Anthropic.APIError) {
    console.error(`[${tag}] Claude API 오류:`, err.status, err.message);
    res.status(502).json({ error: 'upstream_error' });
    return true;
  }
  return false;
}

const app = express();
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/route-plan', requireToken, rateLimit, async (req, res) => {
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
    if (!sendClaudeError(res, err, 'route-plan')) throw err;
  }
});

app.post('/api/trip-settings', requireToken, rateLimit, async (req, res) => {
  const parsed = tripSettingsRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }

  try {
    const result = await extractTripSettings(parsed.data.text);
    if (!result) {
      res.status(422).json({ error: 'settings_unavailable' });
      return;
    }
    res.json(result);
  } catch (err) {
    if (!sendClaudeError(res, err, 'trip-settings')) throw err;
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
if (!TOKEN) {
  console.warn('PLANNER_TOKEN이 없어 인증 없이 동작합니다 (로컬 개발용). 공개 주소에 올릴 때는 반드시 설정하세요.');
}

// 같은 Wi-Fi의 휴대폰(Expo Go)에서도 접속할 수 있도록 모든 인터페이스에서 수신
app.listen(PORT, '0.0.0.0', () => {
  console.log(`결대로 planner server: http://localhost:${PORT}`);
});
