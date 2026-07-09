import { calcTripDays, getTransportMode } from '../timeBudget';
import { Spot } from '../../types';

const spot = (id: string, durationMinutes = 60): Spot => ({
  id, name: id, category: 'nature', lat: 33, lon: 126,
  durationMinutes, emoji: '📍', tags: [],
});

describe('getTransportMode', () => {
  it('가벼운 짐 → 대중교통', () => {
    expect(getTransportMode('light')).toBe('transit');
    expect(getTransportMode('medium')).toBe('transit');
  });
  it('무거운 짐 → 자동차', () => {
    expect(getTransportMode('heavy')).toBe('car');
    expect(getTransportMode('very_heavy')).toBe('car');
  });
});

describe('calcTripDays', () => {
  const base = { startTime: 9, endTime: 19, luggage: 'light' as const };

  it('명소 1개 소량 → 당일치기(1일)', () => {
    // 60(체류) + 20(이동) + 150(식사+버퍼) = 230분 ≤ 첫날 600분
    expect(calcTripDays({ ...base, spots: [spot('a', 60)] })).toBe(1);
  });

  it('명소 10개(각 120분) → 3일', () => {
    // 1200 + 200 + 150 = 1550분; 첫날600·마지막600 소진 후 350분 → ceil(350/600)+2 = 3
    const spots = Array.from({ length: 10 }, (_, i) => spot(`s${i}`, 120));
    expect(calcTripDays({ ...base, spots })).toBe(3);
  });

  it('짐이 무거우면 일수가 줄지 않음(단조 증가)', () => {
    const spots = Array.from({ length: 8 }, (_, i) => spot(`s${i}`, 120));
    const light = calcTripDays({ ...base, spots, luggage: 'light' });
    const heavy = calcTripDays({ ...base, spots, luggage: 'very_heavy' });
    expect(heavy).toBeGreaterThanOrEqual(light);
  });

  it('악천후 보정계수가 일수를 줄이지 않음(단조 증가)', () => {
    const spots = Array.from({ length: 8 }, (_, i) => spot(`s${i}`, 120));
    const sunny = calcTripDays({ ...base, spots, weatherFactor: 1.0 });
    const rainy = calcTripDays({ ...base, spots, weatherFactor: 1.3 });
    expect(rainy).toBeGreaterThanOrEqual(sunny);
  });

  it('첫날 도착이 늦으면 일수가 줄지 않음(단조 증가)', () => {
    const spots = Array.from({ length: 5 }, (_, i) => spot(`s${i}`, 120));
    const early = calcTripDays({ ...base, spots });
    const lateArrival = calcTripDays({ ...base, spots, firstDayArrival: 17 });
    expect(lateArrival).toBeGreaterThanOrEqual(early);
  });
});
