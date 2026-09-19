import { isIndoorSpot, environmentLabel } from '../spotEnvironment';
import { Spot } from '../../types';

const s = (category: Spot['category'], tags: string[] = []) => ({ category, tags });

describe('isIndoorSpot', () => {
  it('문화·미식 카테고리는 실내', () => {
    expect(isIndoorSpot(s('culture'))).toBe(true);
    expect(isIndoorSpot(s('food'))).toBe(true);
  });

  it('태그로 실내를 알아본다 (동굴·박물관·시장)', () => {
    expect(isIndoorSpot(s('nature', ['동굴', '용암']))).toBe(true);
    expect(isIndoorSpot(s('photo', ['전시', '감성']))).toBe(true);
  });

  it('일반 자연 명소는 야외', () => {
    expect(isIndoorSpot(s('nature', ['등산', '자연']))).toBe(false);
    expect(environmentLabel(s('nature', ['바다']))).toBe('야외');
  });

  it('라벨을 한글로 돌려준다', () => {
    expect(environmentLabel(s('culture'))).toBe('실내');
  });
});
