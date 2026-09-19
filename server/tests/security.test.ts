import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requirePlannerToken } from '../src/routes/requireToken';

// 미들웨어를 직접 호출해 통과/차단을 확인한다 (서버를 띄우지 않고)
function run(token: string | undefined, header: string | undefined) {
  const prev = process.env.PLANNER_TOKEN;
  if (token === undefined) delete process.env.PLANNER_TOKEN;
  else process.env.PLANNER_TOKEN = token;

  let status = 0; let passed = false;
  const req = { get: (_: string) => header } as never;
  const res = { status(s: number) { status = s; return this; }, json() { return this; } } as never;
  requirePlannerToken(req, res, () => { passed = true; });

  if (prev === undefined) delete process.env.PLANNER_TOKEN;
  else process.env.PLANNER_TOKEN = prev;
  return { status, passed };
}

test('토큰 미설정이면 통과시킨다 (로컬 개발 편의)', () => {
  assert.equal(run(undefined, undefined).passed, true);
});

test('토큰이 설정되면 맞는 헤더만 통과시킨다', () => {
  assert.equal(run('secret', 'secret').passed, true);
  assert.equal(run('secret', 'wrong').passed, false);
  assert.equal(run('secret', 'wrong').status, 401);
  assert.equal(run('secret', undefined).status, 401);
});
