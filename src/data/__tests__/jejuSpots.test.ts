import { jejuSpots } from '../jejuSpots';
import { isJejuCoord } from '../../constants/jejuBounds';
import { haversineDistance } from '../../algorithms/haversine';

describe('제주 명소 시드 데이터', () => {
  it('id가 중복되지 않는다', () => {
    const ids = jejuSpots.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('모든 좌표가 제주 범위 안에 있다', () => {
    expect(jejuSpots.filter(s => !isJejuCoord(s.lat, s.lon)).map(s => s.name)).toEqual([]);
  });

  it('좌표가 한라산에서 60km를 넘지 않는다 (섬 밖 좌표 방지)', () => {
    const far = jejuSpots.filter(s => haversineDistance(33.3617, 126.5292, s.lat, s.lon) > 60);
    expect(far.map(s => s.name)).toEqual([]);
  });

  it('체류시간이 1분~하루 범위다', () => {
    const bad = jejuSpots.filter(s => s.durationMinutes <= 0 || s.durationMinutes > 24 * 60);
    expect(bad.map(s => s.name)).toEqual([]);
  });

  it('모든 명소가 사진 URL을 가진다 (서버 없이도 카드가 비지 않도록)', () => {
    const noImg = jejuSpots.filter(s => !s.imageUrl);
    expect(noImg.map(s => s.name)).toEqual([]);
  });

  it('사진 URL이 https다', () => {
    const bad = jejuSpots.filter(s => s.imageUrl && !s.imageUrl.startsWith('https://'));
    expect(bad.map(s => s.name)).toEqual([]);
  });

  it('이름이 중복되지 않는다 (타임라인 조회 혼선 방지)', () => {
    const names = jejuSpots.map(s => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
