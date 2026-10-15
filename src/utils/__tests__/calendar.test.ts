import {
  addDays, addYears, buildMonthGrid, dayKey, isInTripRange, isSameDay, shiftMonth, startOfDay, toYyyymmdd,
} from '../calendar';

describe('buildMonthGrid', () => {
  it('2026년 11월: 1일은 일요일, 30일까지, 5주', () => {
    const weeks = buildMonthGrid(2026, 10); // 11월 = index 10
    expect(weeks.every(w => w.length === 7)).toBe(true);
    expect(weeks[0][0]?.getDate()).toBe(1); // 2026-11-01은 일요일
    const days = weeks.flat().filter((d): d is Date => d !== null);
    expect(days).toHaveLength(30);
    expect(days[29].getDate()).toBe(30);
    expect(weeks).toHaveLength(5);
  });

  it('1일 앞과 말일 뒤는 빈칸(null)으로 채운다 — 2026년 10월은 1일이 목요일', () => {
    const weeks = buildMonthGrid(2026, 9);
    expect(weeks[0].slice(0, 4)).toEqual([null, null, null, null]);
    expect(weeks[0][4]?.getDate()).toBe(1);
    // 10월 31일은 토요일이라 마지막 칸까지 날짜로 차고, 11월 30일은 월요일이라 뒤가 빈칸이다
    const octLast = weeks[weeks.length - 1];
    expect(octLast[6]?.getDate()).toBe(31);
    const novLast = buildMonthGrid(2026, 10).slice(-1)[0];
    expect(novLast[1]?.getDate()).toBe(30);
    expect(novLast.slice(2)).toEqual([null, null, null, null, null]);
  });

  it('윤년 2월은 29일까지, 평년 2월은 28일까지', () => {
    const count = (y: number) => buildMonthGrid(y, 1).flat().filter(Boolean).length;
    expect(count(2028)).toBe(29);
    expect(count(2027)).toBe(28);
  });

  it('6주가 필요한 달도 격자가 7의 배수 — 2026년 8월(1일이 토요일, 31일)', () => {
    const weeks = buildMonthGrid(2026, 7);
    expect(weeks).toHaveLength(6);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
  });
});

describe('shiftMonth', () => {
  it('연도를 넘겨 이동한다', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth(2026, 5, 14)).toEqual({ year: 2027, month: 7 });
    expect(shiftMonth(2026, 5, -17)).toEqual({ year: 2025, month: 0 });
  });
});

describe('날짜 유틸', () => {
  it('addYears: 윤일은 2월 말일로 맞춘다', () => {
    expect(toYyyymmdd(addYears(new Date(2028, 1, 29), 1))).toBe('20290228');
    expect(toYyyymmdd(addYears(new Date(2026, 9, 15), 1))).toBe('20271015');
  });

  it('addDays는 월·연을 넘긴다', () => {
    expect(toYyyymmdd(addDays(new Date(2026, 11, 30), 3))).toBe('20270102');
  });

  it('isSameDay/dayKey/startOfDay는 시각을 무시한다', () => {
    const a = new Date(2026, 10, 5, 23, 59);
    const b = new Date(2026, 10, 5, 0, 1);
    expect(isSameDay(a, b)).toBe(true);
    expect(dayKey(a)).toBe(dayKey(b));
    expect(startOfDay(a).getHours()).toBe(0);
  });

  it('toYyyymmdd는 0을 채운다', () => {
    expect(toYyyymmdd(new Date(2026, 0, 5))).toBe('20260105');
  });
});

describe('isInTripRange', () => {
  const start = new Date(2026, 10, 5);

  it('시작일부터 총 일수만큼(시작일 포함)이 구간', () => {
    expect(isInTripRange(new Date(2026, 10, 4), start, 3)).toBe(false);
    expect(isInTripRange(new Date(2026, 10, 5), start, 3)).toBe(true);
    expect(isInTripRange(new Date(2026, 10, 7), start, 3)).toBe(true);
    expect(isInTripRange(new Date(2026, 10, 8), start, 3)).toBe(false);
  });

  it('월을 넘는 구간과 당일치기(1일)', () => {
    expect(isInTripRange(new Date(2026, 11, 1), new Date(2026, 10, 29), 4)).toBe(true);
    expect(isInTripRange(new Date(2026, 10, 6), start, 1)).toBe(false);
    expect(isInTripRange(new Date(2026, 10, 5), start, 0)).toBe(true); // 0은 1일로 취급
  });

  it('시작일이 없으면 false', () => {
    expect(isInTripRange(start, null, 3)).toBe(false);
  });
});
