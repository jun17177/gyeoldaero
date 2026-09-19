import { generateTimeline } from '../generateTimeline';
import { TripSchedule, Spot } from '../../types';

const spot = (id: string, lat: number, lon: number): Spot => ({
  id, name: `명소${id}`, category: 'nature', lat, lon,
  durationMinutes: 90, emoji: '📍', tags: [],
});

const makeSchedule = (spots: Spot[]): TripSchedule => ({
  id: 't1', name: '테스트', createdAt: '2026-01-01T00:00:00.000Z',
  days: 0, spots, accommodation: 'jejucity', tags: [],
  settings: {
    themes: ['healing'], weather: 'sunny', season: 'spring',
    startTime: 9, endTime: 19, people: 2, budget: 5, luggage: 'light',
  },
});

describe('generateTimeline', () => {
  it('긴 명소 뒤에도 복귀 시간이 이전 일정보다 앞서지 않는다', () => {
    const plans = generateTimeline(makeSchedule([{ ...spot('long', 33.5, 126.5), durationMinutes: 800 }]));
    for (const plan of plans) {
      // '다음날 08:40'은 자정을 넘긴 시각 — 비교를 위해 24시간을 더해 분으로 환산한다
      const minutes = (time: string) => {
        const nextDay = time.startsWith('다음날');
        const [h, m] = time.replace('다음날', '').trim().split(':').map(Number);
        return h * 60 + m + (nextDay ? 24 * 60 : 0);
      };
      for (let i = 1; i < plan.items.length; i++) {
        const prev = plan.items[i - 1];
        expect(minutes(plan.items[i].time)).toBeGreaterThanOrEqual(minutes(prev.time) + prev.duration);
      }
    }
  });
  const spots = [
    spot('1', 33.45, 126.30),
    spot('2', 33.50, 126.53),
    spot('3', 33.25, 126.56),
    spot('4', 33.39, 126.92),
  ];
  const plans = generateTimeline(makeSchedule(spots));

  it('day 번호가 1..N 순차', () => {
    expect(plans.map(p => p.day)).toEqual(plans.map((_, i) => i + 1));
  });

  it('각 날짜에 최소 1개 아이템', () => {
    plans.forEach(p => expect(p.items.length).toBeGreaterThan(0));
  });

  it('하루는 숙소 아이템으로 시작', () => {
    expect(plans[0].items[0].type).toBe('accommodation');
  });

  // 누락 방지 수정(2026-07): 추정 일수에 못 담은 명소가 남으면 날짜를 추가해 전부 배치한다.
  it('모든 명소가 정확히 한 번씩 등장 (누락 없음)', () => {
    const names = plans
      .flatMap(p => p.items.filter(i => i.type === 'spot').map(i => i.name))
      .sort();
    expect(names).toEqual(spots.map(s => s.name).sort());
  });

  it('식사(meal) 아이템이 포함됨', () => {
    const hasMeal = plans.some(p => p.items.some(i => i.type === 'meal'));
    expect(hasMeal).toBe(true);
  });

  it('manualSpotOrder면 자동 재정렬 없이 주어진 순서를 그대로 따른다', () => {
    // 일부러 최근접 순서와 반대(먼 곳부터)로 배열
    const far = spot('far', 33.25, 126.92);
    const near = spot('near', 33.49, 126.54); // 제주시 숙소와 가까움
    const manual = { ...makeSchedule([far, near]), manualSpotOrder: true };
    const p = generateTimeline(manual);
    const names = p.flatMap(x => x.items.filter(i => i.type === 'spot').map(i => i.name));
    expect(names).toEqual(['명소far', '명소near']); // nearestNeighbor였다면 near가 먼저였을 것
  });

  it('하루 활동시간보다 큰 명소도 누락 없이 단독 배치된다', () => {
    const big = { ...spot('big', 33.5, 126.5), durationMinutes: 800 }; // 하루(10h=600분) 초과
    const p = generateTimeline(makeSchedule([big]));
    const names = p.flatMap(x => x.items.filter(i => i.type === 'spot').map(i => i.name));
    expect(names).toContain('명소big');
  });

  it('명소가 많아 추정 일수를 넘겨도 누락 없이 모두 배치 + 일수 순차', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      spot(String(i), 33.3 + i * 0.02, 126.3 + i * 0.03)
    );
    const p = generateTimeline(makeSchedule(many));
    // day 번호 순차
    expect(p.map(x => x.day)).toEqual(p.map((_, i) => i + 1));
    // 모든 명소가 정확히 한 번씩
    const names = p
      .flatMap(x => x.items.filter(i => i.type === 'spot').map(i => i.name))
      .sort();
    expect(names).toEqual(many.map(s => s.name).sort());
  });
});

describe('시각 표기·마지막 날 기준', () => {
  const longSpots = Array.from({ length: 12 }, (_, i) => ({
    ...spot(`long${i}`, 33.4, 126.5), durationMinutes: 300,
  }));

  it('24시를 넘는 시각을 그대로 내보내지 않는다 (24:20 → 다음날 00:20)', () => {
    const plans = generateTimeline(makeSchedule(longSpots));
    const times = plans.flatMap(p => p.items.map(i => i.time));
    for (const t of times) {
      const hour = Number(t.replace('다음날', '').trim().split(':')[0]);
      expect(hour).toBeLessThan(24);
      expect(t).toMatch(/^(다음날 )?\d{2}:\d{2}$/);
    }
  });

  it('일정이 늘어나도 마지막 날 출발 시각이 실제 마지막 날에 적용된다', () => {
    const base = makeSchedule(longSpots);
    const plans = generateTimeline({
      ...base,
      settings: { ...base.settings, lastDayDeparture: 11 },
    });
    const last = plans[plans.length - 1];
    const minutes = (t: string) => {
      const [h, m] = t.replace('다음날', '').trim().split(':').map(Number);
      return h * 60 + m + (t.startsWith('다음날') ? 24 * 60 : 0);
    };
    // 마지막 날 마지막 일정은 출발 시각(11시)을 넘지 않아야 한다
    expect(minutes(last.items[last.items.length - 1].time)).toBeLessThanOrEqual(11 * 60);
  });

  it('명소는 여전히 하나도 누락되지 않는다', () => {
    const plans = generateTimeline(makeSchedule(longSpots));
    const names = plans.flatMap(p => p.items.filter(i => i.type === 'spot').map(i => i.name)).sort();
    expect(names).toEqual(longSpots.map(s => s.name).sort());
  });
});
