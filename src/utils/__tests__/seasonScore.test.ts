import { seasonScore } from '../seasonScore';
import { Spot } from '../../types';

const spot = (category: Spot['category'], tags: string[]): Spot => ({
  id: 't', name: '테스트', category, lat: 33, lon: 126,
  durationMinutes: 60, emoji: '📍', tags,
});

describe('seasonScore', () => {
  it('겨울: 실내·문화·미식 우대, 해변은 감점', () => {
    expect(seasonScore(spot('culture', []), 'winter')).toBe(2);
    expect(seasonScore(spot('nature', ['박물관']), 'winter')).toBe(2);
    expect(seasonScore(spot('nature', ['해변', '수영']), 'winter')).toBe(0);
  });

  it('여름: 물놀이 우대', () => {
    expect(seasonScore(spot('nature', ['해변', '수영']), 'summer')).toBe(2);
    expect(seasonScore(spot('culture', []), 'summer')).toBe(1);
  });

  it('봄: 꽃·숲 우대 / 가을: 트레킹 우대', () => {
    expect(seasonScore(spot('photo', ['벚꽃']), 'spring')).toBe(2);
    expect(seasonScore(spot('nature', ['트레킹']), 'fall')).toBe(2);
  });

  it('알 수 없는 계절은 기본 1점', () => {
    expect(seasonScore(spot('nature', []), 'unknown')).toBe(1);
  });
});
