import { themeScore, matchesThemes } from '../themeProfiles';
import { Spot } from '../../types';

const spot = (category: Spot['category'], tags: string[]): Spot => ({
  id: 't', name: '테스트', category, lat: 33, lon: 126,
  durationMinutes: 60, emoji: '📍', tags,
});

describe('themeScore', () => {
  it('카테고리+태그 모두 일치 → 4점 (테마 맞춤)', () => {
    expect(themeScore(spot('nature', ['산책', '숲']), ['healing'])).toBe(4);
    expect(themeScore(spot('photo', ['일몰', '포토']), ['photo'])).toBe(4);
  });

  it('카테고리만 일치 → 2점', () => {
    expect(themeScore(spot('nature', ['세계유산']), ['healing'])).toBe(2);
  });

  it('태그만 일치 → 2점 (다른 카테고리라도 테마 성격이면 포함)', () => {
    // photo 카테고리의 꽃밭 명소가 힐링 태그(꽃)로 매칭
    expect(themeScore(spot('photo', ['꽃밭', '감성']), ['healing'])).toBe(2);
  });

  it('무관 → 0점', () => {
    expect(themeScore(spot('food', ['흑돼지']), ['healing'])).toBe(0);
  });

  it('복수 테마 중 최고 점수를 취한다', () => {
    const s = spot('night', ['야경', '일몰']);
    expect(themeScore(s, ['healing', 'night'])).toBe(4); // night 기준 4
  });

  it('태그 부분 일치 지원 (벚꽃 → 꽃)', () => {
    expect(themeScore(spot('photo', ['벚꽃']), ['healing'])).toBe(2);
  });
});

describe('matchesThemes', () => {
  it('점수 0이면 제외, 1점 이상이면 포함', () => {
    expect(matchesThemes(spot('food', ['흑돼지']), ['healing'])).toBe(false);
    expect(matchesThemes(spot('food', ['흑돼지']), ['food'])).toBe(true);
    expect(matchesThemes(spot('photo', ['꽃밭']), ['healing'])).toBe(true);
  });
});
