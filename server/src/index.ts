import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import aiRouter from './routes/ai';
import plannerRouter from './routes/planner';
import { getVisitJejuSpots } from './visitJeju';
import { requirePlannerToken } from './routes/requireToken';

const app = express();
// 명소 목록이 1MB가 넘어 압축 여부가 앱 첫 로딩 체감을 좌우한다 (1.26MB → 약 250KB)
app.use(compression());
// 허용할 출처를 ALLOWED_ORIGINS(쉼표 구분)로 제한한다.
// 비워두면 모두 허용 — 로컬 개발 편의를 위한 기본값이므로 배포 시에는 반드시 설정할 것.
// (Expo 네이티브 앱 요청에는 Origin 헤더가 없어 항상 통과한다)
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',').map(o => o.trim()).filter(Boolean);
app.use(cors(allowedOrigins.length === 0 ? undefined : {
  origin: (origin, cb) =>
    !origin || allowedOrigins.includes(origin)
      ? cb(null, true)
      : cb(new Error('origin_not_allowed')),
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, provider: process.env.LLM_PROVIDER ?? 'claude' });
});

// 웹 버전 앱(expo export --platform web 결과물). 발표 때 QR로 바로 써볼 수 있게
// 같은 서버에서 서빙한다. 갱신은 `npm run build:web` (앱 저장소 루트에서).
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));

// 명소 목록은 LLM을 쓰지 않고 앱이 토큰 없이 부르므로, 토큰 검사보다 먼저 등록한다.
// (app.use('/api', ...)는 /api 아래 전체에 걸리므로 순서가 중요하다)
app.get('/api/visitjeju/spots', async (_req, res) => {
  try { res.json({ spots: await getVisitJejuSpots() }); }
  catch { res.status(503).json({ error: 'visitjeju_unavailable' }); }
});

// LLM을 호출하는 라우트는 모두 토큰 검사를 거친다 (ai/planner 양쪽)
app.use('/api', requirePlannerToken, aiRouter);
app.use('/api', requirePlannerToken, plannerRouter);

// 웹 앱은 클라이언트 라우팅을 쓰므로, API가 아닌 경로는 index.html로 돌려준다
app.get(/^(?!\/api|\/health).*/, (_req, res, next) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'), err => err && next());
});

// 에러 핸들러 — 잘못된 JSON 등도 HTML 스택트레이스 대신 JSON으로 응답
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: '잘못된 JSON 형식입니다' });
  }
  // 허용 목록에 없는 출처 — 서버 오류가 아니므로 403으로 돌려준다
  if (err.message === 'origin_not_allowed') {
    return res.status(403).json({ error: 'origin_not_allowed' });
  }
  console.error('[server]', err);
  res.status(500).json({ error: '서버 오류가 발생했습니다' });
});

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`결대로 서버 실행 중: http://localhost:${PORT}`);
  console.log(`LLM Provider: ${process.env.LLM_PROVIDER ?? 'claude'}`);
});
