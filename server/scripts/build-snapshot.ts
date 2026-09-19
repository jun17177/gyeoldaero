import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { getVisitJejuSpots } from '../src/visitJeju';

// 비짓제주 명소 목록을 받아 저장소에 담을 스냅샷으로 저장한다.
// 배포 환경은 재시작마다 메모리·파일시스템이 비어 첫 요청이 수집을 기다리게 되는데,
// 이 스냅샷이 있으면 즉시 응답하고 최신 데이터는 뒤에서 받는다.
//
//   npm run build:snapshot
//
// 명소가 크게 바뀌었을 때만 다시 돌리면 된다 (관광지 목록은 자주 바뀌지 않는다).
async function main() {
  const out = path.join(__dirname, '..', 'data', 'spots-snapshot.json.gz');
  console.log('비짓제주 명소 수집 중… (3회 훑기, 약 30초)');
  await getVisitJejuSpots();

  // 1회분으로 먼저 응답하고 나머지는 뒤에서 채우므로, 개수가 더 늘지 않을 때까지 기다린다
  let prev = -1;
  let stable = 0;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const n = (await getVisitJejuSpots()).length;
    process.stdout.write(`\r  수집 중: ${n}곳`);
    stable = n === prev ? stable + 1 : 0;
    if (stable >= 3) break; // 3회(9초) 연속 그대로면 끝난 것으로 본다
    prev = n;
  }
  console.log('');
  const finalSpots = await getVisitJejuSpots();

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, zlib.gzipSync(JSON.stringify(finalSpots)));
  const kb = (fs.statSync(out).size / 1024).toFixed(0);
  console.log(`스냅샷 저장: ${finalSpots.length}곳 · ${kb}KB → ${path.relative(process.cwd(), out)}`);
  process.exit(0);
}

main().catch(e => { console.error('스냅샷 생성 실패:', e.message); process.exit(1); });
