import { Spot } from '../types';
import { haversineDistance } from '../algorithms/haversine';

// 시드 명소와 비짓제주 명소를 "같은 장소"로 이어 사진을 가져오기 위한 이름 매칭.
// merge 단계(mergeSpots)와 지연 보강 단계(tourApi.fetchSpotImage)가 같은 기준을 쓰도록
// 여기 한 곳에만 둔다 — 두 곳의 기준이 어긋나면 dedupe로 API 항목은 지워지는데
// 사진은 못 받는 구멍이 생긴다.

// 이름에서 지워도 같은 장소인 문장부호. 가운뎃점과 마침표를 함께 지워야
// 시드 "제주4·3평화공원"과 비짓제주 "제주4.3평화공원"이 같은 키가 된다.
const PUNCTUATION = /[\s·・.,\-–—_/'"()[\]]/g;

// 같은 장소를 다르게 적은 표기를 한쪽으로 모은다 (예: 월정리해수욕장 = 월정리해변)
const SPELLING_VARIANTS: [RegExp, string][] = [
  [/해수욕장/g, '해변'],
  [/짚라인/g, '집라인'],
];

export function canonicalName(name: string): string {
  let s = name.replace(PUNCTUATION, '').toLowerCase();
  for (const [pattern, to] of SPELLING_VARIANTS) s = s.replace(pattern, to);
  return s;
}

// 이름 하나에서 비교에 쓸 키를 모두 뽑는다.
// "제주 야경 (사라봉)"처럼 괄호 안에 진짜 지명이 들어있는 경우가 있어
// 괄호를 뗀 형태와 괄호 안쪽을 모두 키로 삼는다.
// 후보 명소 수가 3000곳 가까이 되고 시드마다 전부 훑어서, 같은 객체의 키는 한 번만 계산한다
const keyCache = new WeakMap<object, string[]>();

export function photoKeys(spot: { name: string; photoAliases?: string[] }): string[] {
  const cached = keyCache.get(spot);
  if (cached) return cached;
  const keys = [canonicalName(spot.name)];
  const add = (raw: string) => {
    const key = canonicalName(raw);
    if (key.length >= 2 && !keys.includes(key)) keys.push(key);
  };
  add(spot.name.replace(/\([^)]*\)/g, ''));
  for (const inner of spot.name.matchAll(/\(([^)]*)\)/g)) add(inner[1]);
  for (const alias of spot.photoAliases ?? []) add(alias);
  keyCache.set(spot, keys);
  return keys;
}

// 부분 일치로 같은 장소라고 볼 최소 글자 수 — "우도" 같은 2자 이름의 오탐을 막는다
const MIN_PARTIAL_LENGTH = 3;
// 부분 일치는 좌표가 가까울 때만 인정한다. 이름이 완전히 같으면 거리는 보지 않는다
// (시드 좌표가 많이 어긋난 명소가 있어 거리로 자르면 오히려 정확한 짝을 놓친다).
// 시드 좌표 오차가 큰 편이라 넉넉히 둔다 — 에코랜드는 실제 위치와 6.8km 어긋나 있다.
const MAX_PARTIAL_MATCH_KM = 10;

/**
 * 사진을 가진 후보 중 seed와 같은 장소로 보이는 것을 고른다.
 * 이름 완전 일치를 가장 우선하고, 없으면 10km 안에서 이름이 포함 관계인 것 중
 * 길이 차가 가장 작은(= 군더더기가 가장 적은) 후보를 고른다.
 */
export function findPhotoMatch(
  seed: { name: string; lat: number; lon: number; photoAliases?: string[] },
  candidates: Spot[],
): Spot | undefined {
  const keys = photoKeys(seed);
  let partial: { spot: Spot; extra: number; km: number } | undefined;

  for (const candidate of candidates) {
    if (!candidate.imageUrl) continue;
    // 후보 쪽도 같은 방식으로 키를 뽑아야 양쪽 표기가 대칭으로 비교된다.
    // 비짓제주 "우도(해양도립공원)"가 시드 "우도"와 이어지는 건 이 덕분이다.
    const names = photoKeys(candidate);

    if (keys.some(k => names.includes(k))) return candidate; // 완전 일치 — 더 볼 것 없음

    const km = haversineDistance(seed.lat, seed.lon, candidate.lat, candidate.lon);
    if (km > MAX_PARTIAL_MATCH_KM) continue;

    for (const key of keys) {
      for (const name of names) {
        const [shorter, longer] = key.length <= name.length ? [key, name] : [name, key];
        if (shorter.length < MIN_PARTIAL_LENGTH || !longer.includes(shorter)) continue;
        const extra = longer.length - shorter.length;
        if (!partial || extra < partial.extra || (extra === partial.extra && km < partial.km)) {
          partial = { spot: candidate, extra, km };
        }
      }
    }
  }

  return partial?.spot;
}
