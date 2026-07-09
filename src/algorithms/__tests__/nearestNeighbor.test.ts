import { nearestNeighbor } from '../nearestNeighbor';
import { Spot } from '../../types';

const spot = (id: string, lat: number, lon: number): Spot => ({
  id, name: id, category: 'nature', lat, lon,
  durationMinutes: 60, emoji: '📍', tags: [],
});

describe('nearestNeighbor', () => {
  it('시작점에서 가까운 순서로 방문', () => {
    const near = spot('near', 33.01, 126.0);
    const mid = spot('mid', 33.1, 126.0);
    const far = spot('far', 33.5, 126.0);
    const route = nearestNeighbor([far, near, mid], 33.0, 126.0);
    expect(route.map(s => s.id)).toEqual(['near', 'mid', 'far']);
  });

  it('결과 길이는 입력과 동일', () => {
    const spots = [spot('a', 33.1, 126.1), spot('b', 33.2, 126.2), spot('c', 33.3, 126.3)];
    expect(nearestNeighbor(spots, 33, 126)).toHaveLength(3);
  });

  it('입력 배열을 변형하지 않음(불변)', () => {
    const spots = [spot('a', 33.1, 126.1), spot('b', 33.2, 126.2)];
    const copy = [...spots];
    nearestNeighbor(spots, 33, 126);
    expect(spots).toEqual(copy);
  });

  it('빈 배열 → 빈 결과', () => {
    expect(nearestNeighbor([], 33, 126)).toEqual([]);
  });

  it('모든 명소를 정확히 한 번씩 포함', () => {
    const spots = [spot('a', 33.1, 126.1), spot('b', 33.9, 126.9), spot('c', 33.3, 126.2)];
    const ids = nearestNeighbor(spots, 33, 126).map(s => s.id).sort();
    expect(ids).toEqual(['a', 'b', 'c']);
  });
});
