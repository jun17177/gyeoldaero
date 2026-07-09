import { haversineDistance } from '../haversine';

describe('haversineDistance', () => {
  it('같은 좌표는 거리 0', () => {
    expect(haversineDistance(33.5, 126.5, 33.5, 126.5)).toBeCloseTo(0, 5);
  });

  it('대칭성: d(a,b) === d(b,a)', () => {
    const ab = haversineDistance(33.5074, 126.4927, 33.4390, 126.9229);
    const ba = haversineDistance(33.4390, 126.9229, 33.5074, 126.4927);
    expect(ab).toBeCloseTo(ba, 6);
  });

  it('위도 1도 차이 ≈ 111km', () => {
    const d = haversineDistance(33, 126, 34, 126);
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });

  it('제주공항→성산 대략 30~45km 범위', () => {
    const d = haversineDistance(33.5074, 126.4927, 33.4390, 126.9229);
    expect(d).toBeGreaterThan(30);
    expect(d).toBeLessThan(45);
  });
});
