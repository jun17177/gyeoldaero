import { Spot } from '../types';

// 이름 비교용 정규화 — 공백·괄호·구분점 제거
function normalizeName(n: string): string {
  return n.replace(/[\s()·,]/g, '');
}

// 같은 장소로 보이는 이름인지: 정규화 후 완전 일치이거나,
// 한쪽이 다른쪽을 포함(짧은 쪽이 3자 이상일 때만 — "우도" 같은 2자 이름의 오탐 방지)
export function isSameSpotName(a: string, b: string): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (x === y) return true;
  const shorter = x.length <= y.length ? x : y;
  const longer = x.length <= y.length ? y : x;
  return shorter.length >= 3 && longer.includes(shorter);
}

// 시드(엄선 태그·체류시간)를 기본으로 두고, 시드에 없는 API 명소만 보태서 병합한다.
// 시드가 앞에 오므로 테마 점수 정렬에서 성격 태그를 가진 시드가 자연히 우선된다.
export function mergeSeedAndApiSpots(seed: Spot[], api: Spot[]): Spot[] {
  const fresh = api.filter(a => !seed.some(s => isSameSpotName(s.name, a.name)));
  return [...seed, ...fresh];
}
