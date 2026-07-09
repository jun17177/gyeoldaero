import { isSameSpotName, mergeSeedAndApiSpots } from '../mergeSpots';
import { Spot } from '../../types';

const spot = (id: string, name: string): Spot => ({
  id, name, category: 'nature', lat: 33, lon: 126,
  durationMinutes: 90, emoji: '📍', tags: [],
});

describe('isSameSpotName', () => {
  it('완전 일치', () => {
    expect(isSameSpotName('성산일출봉', '성산일출봉')).toBe(true);
  });

  it('포함 관계 → 같은 장소 (에코랜드 / 에코랜드테마파크)', () => {
    expect(isSameSpotName('에코랜드', '에코랜드테마파크')).toBe(true);
  });

  it('괄호·공백 무시 (제주 야경 (사라봉) / 사라봉)', () => {
    expect(isSameSpotName('제주 야경 (사라봉)', '사라봉')).toBe(true);
  });

  it('비슷하지만 다른 장소는 구분 (사라봉 vs 사라오름, 한라산 vs 한라수목원)', () => {
    expect(isSameSpotName('사라봉', '사라오름')).toBe(false);
    expect(isSameSpotName('한라산', '한라수목원')).toBe(false);
  });

  it('2자 이름은 포함 판정 안 함 (우도 vs 우도해녀의집 — 오탐 방지)', () => {
    expect(isSameSpotName('우도', '우도해녀의집')).toBe(false);
    expect(isSameSpotName('우도', '우도')).toBe(true); // 완전 일치는 허용
  });
});

describe('mergeSeedAndApiSpots', () => {
  const seed = [spot('ecoland', '에코랜드'), spot('hallasan', '한라산')];
  const api = [
    spot('100', '에코랜드테마파크'), // 시드와 중복 → 제외
    spot('101', '함덕해수욕장'),      // 신규 → 추가
  ];

  it('시드가 앞에 오고, 중복 API는 빠지고, 신규 API만 추가된다', () => {
    const merged = mergeSeedAndApiSpots(seed, api);
    expect(merged.map(s => s.id)).toEqual(['ecoland', 'hallasan', '101']);
  });

  it('시드의 상세 정보(체류시간 등)가 보존된다', () => {
    const richSeed = [{ ...spot('hallasan', '한라산'), durationMinutes: 360 }];
    const merged = mergeSeedAndApiSpots(richSeed, [spot('200', '한라산')]);
    expect(merged).toHaveLength(1);
    expect(merged[0].durationMinutes).toBe(360); // API의 90분이 아니라 시드 값
  });
});
