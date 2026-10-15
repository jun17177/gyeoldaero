import { addSpotsToSchedule, countRainyDaySpots, isRainyDaySpot, recommendIndoorSpots } from '../indoorSuggest';
import { Spot, TripSchedule } from '../../types';

const spot = (over: Partial<Spot> & Pick<Spot, 'id' | 'name'>): Spot => ({
  category: 'nature', lat: 33.46, lon: 126.94, durationMinutes: 90, emoji: '', tags: [], ...over,
});

const schedule = (spots: Spot[], themes: TripSchedule['settings']['themes'] = ['activity']): TripSchedule => ({
  id: 't1', name: '테스트', createdAt: '2026-10-01T00:00:00.000Z', days: 2, spots,
  accommodation: 'jejucity', tags: [], startDate: '20261110',
  settings: { themes, weather: 'sunny', season: 'fall', startTime: 9, endTime: 19, people: 2, budget: 5, luggage: 'light' },
});

describe('isRainyDaySpot / countRainyDaySpots', () => {
  it('박물관·카페·체험은 비 오는 날 갈 곳, 식당과 자연은 아니다', () => {
    expect(isRainyDaySpot(spot({ id: 'a', name: '국립박물관', category: 'culture' }))).toBe(true);
    expect(isRainyDaySpot(spot({ id: 'b', name: '카페', category: 'food', foodType: 'cafe' }))).toBe(true);
    expect(isRainyDaySpot(spot({ id: 'c', name: '체험관', tags: ['실내체험'] }))).toBe(true);
    // 야외 체험(레일바이크·승마·카약 등)은 '체험' 태그만으로 실내가 되지 않는다
    expect(isRainyDaySpot(spot({ id: 'f', name: '레일바이크', category: 'activity', tags: ['레일바이크', '가족', '체험'] }))).toBe(false);
    // 분류는 문화여도 이름·태그가 야외를 가리키면 후보에서 뺀다
    // 시드 식당은 foodType이 없다 — 명시된 카페가 아니면 식당으로 본다
    expect(isRainyDaySpot(spot({ id: 'j', name: '명진전복', category: 'food', tags: ['전복'] }))).toBe(false);
    expect(isRainyDaySpot(spot({ id: 'k', name: '성읍민속마을', category: 'culture', tags: ['민속'] }))).toBe(false);
    expect(isRainyDaySpot(spot({ id: 'g', name: '제주민속촌', category: 'culture', tags: ['전통', '민속', '체험'] }))).toBe(false);
    expect(isRainyDaySpot(spot({ id: 'h', name: '김녕미로공원', category: 'culture', tags: ['미로'] }))).toBe(false);
    expect(isRainyDaySpot(spot({ id: 'i', name: '아쿠아플라넷 제주', category: 'culture', tags: ['수족관'] }))).toBe(true);
    expect(isRainyDaySpot(spot({ id: 'd', name: '흑돼지집', category: 'food', foodType: 'restaurant' }))).toBe(false);
    expect(isRainyDaySpot(spot({ id: 'e', name: '한라산' }))).toBe(false);
  });

  it('식당·야외는 세지 않는다', () => {
    const list = [
      spot({ id: 'a', name: '박물관', category: 'culture' }),
      spot({ id: 'b', name: '식당', category: 'food', foodType: 'restaurant' }),
      spot({ id: 'c', name: '오름' }),
    ];
    expect(countRainyDaySpots(list)).toBe(1);
  });
});

describe('recommendIndoorSpots', () => {
  const mine = schedule([spot({ id: 'o1', name: '성산일출봉' }), spot({ id: 'o2', name: '섭지코지' })]);
  const pool = [
    spot({ id: 'm1', name: '가까운 박물관', category: 'culture', lat: 33.46, lon: 126.94 }),
    spot({ id: 'm2', name: '조금 먼 전시관', category: 'culture', lat: 33.40, lon: 126.80 }),
    spot({ id: 'far', name: '서쪽 끝 박물관', category: 'culture', lat: 33.30, lon: 126.20 }),
    spot({ id: 'out', name: '해변', category: 'nature', lat: 33.46, lon: 126.94 }),
    spot({ id: 'res', name: '식당', category: 'food', foodType: 'restaurant', lat: 33.46, lon: 126.94 }),
    spot({ id: 'dup', name: '성산일출봉 전시관', category: 'culture', lat: 33.46, lon: 126.94 }),
  ];

  it('실내 명소만, 가까운 순으로 추천한다 (식당·야외·너무 먼 곳 제외)', () => {
    const r = recommendIndoorSpots(mine, pool);
    expect(r.map(s => s.id)).toEqual(['m1', 'm2']);
  });

  it('이미 일정에 있는 곳(이름이 같거나 포함)은 제외한다', () => {
    const withDup = schedule([...mine.spots, spot({ id: 'x', name: '가까운 박물관', category: 'culture' })]);
    expect(recommendIndoorSpots(withDup, pool).map(s => s.id)).not.toContain('m1');
    expect(recommendIndoorSpots(mine, pool).map(s => s.id)).not.toContain('dup'); // '성산일출봉 전시관'은 '성산일출봉'을 포함 → 같은 곳으로 본다
  });

  it('선택한 테마와 맞는 명소를 가까운 곳보다 앞에 둔다', () => {
    const themed = [
      spot({ id: 'near', name: '가까운 전시', category: 'night', tags: ['전시'], lat: 33.46, lon: 126.94 }),
      spot({ id: 'themeFar', name: '조금 먼 박물관', category: 'culture', tags: ['박물관'], lat: 33.40, lon: 126.80 }),
    ];
    const r = recommendIndoorSpots(schedule(mine.spots, ['culture']), themed);
    expect(r[0].id).toBe('themeFar');
  });

  it('개수 제한과 빈 일정 처리', () => {
    const many = Array.from({ length: 10 }, (_, i) => spot({ id: `p${i}`, name: `박물관${i}번`, category: 'culture' }));
    expect(recommendIndoorSpots(mine, many, 3)).toHaveLength(3);
    expect(recommendIndoorSpots(schedule([]), many)).toEqual([]);
  });
});

describe('addSpotsToSchedule', () => {
  it('명소를 보태고 dayPlans·AI 결과·날씨 조정 표식을 비워 새로 만들게 하며 일수를 다시 계산한다', () => {
    const base: TripSchedule = {
      ...schedule([spot({ id: 'o1', name: '성산일출봉' })]),
      dayPlans: [{ day: 1, items: [] }], aiComment: '코멘트', weatherPlan: 'rainy,sunny', planSource: 'ai',
    };
    const added = spot({ id: 'm1', name: '국립박물관', category: 'culture' });
    const next = addSpotsToSchedule(base, [added]);
    expect(next.spots.map(s => s.id)).toEqual(['o1', 'm1']);
    expect(next.dayPlans).toBeUndefined();
    expect(next.aiComment).toBeUndefined();
    expect(next.weatherPlan).toBeUndefined();
    expect(next.planSource).toBe('algorithm');
    expect(next.days).toBeGreaterThanOrEqual(1);
    expect(next.startDate).toBe('20261110'); // 출발일은 유지
  });
});
