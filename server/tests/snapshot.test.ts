import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// 배포 환경의 콜드 스타트를 막아주는 스냅샷이 실제로 쓸 수 있는 상태인지 지킨다.
// 깨진 채로 커밋되면 첫 요청이 다시 수집 30초를 기다리게 된다.
const SNAPSHOT = path.join(__dirname, '..', 'data', 'spots-snapshot.json.gz');

test('스냅샷 파일이 있고 압축을 풀 수 있다', () => {
  assert.ok(fs.existsSync(SNAPSHOT), 'npm run build:snapshot 으로 생성하세요');
  const spots = JSON.parse(zlib.gunzipSync(fs.readFileSync(SNAPSHOT)).toString('utf8'));
  assert.ok(Array.isArray(spots));
  assert.ok(spots.length > 2000, `명소가 너무 적습니다 (${spots.length}곳)`);
});

test('스냅샷의 모든 명소가 필수 필드를 갖는다', () => {
  const spots = JSON.parse(zlib.gunzipSync(fs.readFileSync(SNAPSHOT)).toString('utf8'));
  const bad = spots.filter((s: Record<string, unknown>) =>
    !s.id || !s.name || !s.imageUrl ||
    typeof s.lat !== 'number' || typeof s.lon !== 'number');
  assert.equal(bad.length, 0, `필드가 빠진 명소 ${bad.length}곳`);
});

test('스냅샷 좌표가 제주 범위 안이다', () => {
  const spots = JSON.parse(zlib.gunzipSync(fs.readFileSync(SNAPSHOT)).toString('utf8'));
  const out = spots.filter((s: { lat: number; lon: number }) =>
    s.lat < 33 || s.lat > 34 || s.lon < 126 || s.lon > 127);
  assert.equal(out.length, 0);
});
