import { formatStartDate, formatTripRange, parseYyyymmdd } from '../date';

describe('parseYyyymmdd', () => {
  it('정상 날짜를 Date로 파싱', () => {
    const d = parseYyyymmdd('20260712');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(6); // 7월 = index 6
    expect(d?.getDate()).toBe(12);
  });

  it('undefined/빈값/형식오류 → null', () => {
    expect(parseYyyymmdd(undefined)).toBeNull();
    expect(parseYyyymmdd('')).toBeNull();
    expect(parseYyyymmdd('2026-07-12')).toBeNull();
    expect(parseYyyymmdd('2026071')).toBeNull();
  });

  it('달력에 없는 날짜(2월 31일)는 이월되지 않고 null', () => {
    expect(parseYyyymmdd('20260231')).toBeNull();
  });
});

describe('formatStartDate', () => {
  it('YYYYMMDD → "M월 D일 (요일)"', () => {
    // 2026-07-12는 일요일
    expect(formatStartDate('20260712')).toBe('7월 12일 (일)');
  });

  it('미설정/오류 값이면 null', () => {
    expect(formatStartDate(undefined)).toBeNull();
    expect(formatStartDate('bad')).toBeNull();
    expect(formatStartDate('20260231')).toBeNull();
  });
});

describe('formatTripRange', () => {
  const now = new Date(2026, 9, 15); // 2026-10-15

  it('출발일 + 일수로 시작~끝 날짜를 만든다 (3일 = 11/5 ~ 11/7)', () => {
    // 2026-11-05는 목요일, 11-07은 토요일
    expect(formatTripRange('20261105', 3, now)).toEqual({ start: '11월 5일 (목)', end: '11월 7일 (토)' });
  });

  it('월을 넘기는 일정도 계산한다', () => {
    expect(formatTripRange('20261030', 4, now)).toEqual({ start: '10월 30일 (금)', end: '11월 2일 (월)' });
  });

  it('해를 넘기면 연도를 붙인다', () => {
    expect(formatTripRange('20261230', 4, now)).toEqual({ start: '12월 30일 (수)', end: '2027년 1월 2일 (토)' });
  });

  it('올해가 아닌 출발일에는 시작에도 연도를 붙인다', () => {
    expect(formatTripRange('20270301', 2, now)?.start).toBe('2027년 3월 1일 (월)');
  });

  it('당일치기는 end가 null', () => {
    expect(formatTripRange('20261105', 1, now)).toEqual({ start: '11월 5일 (목)', end: null });
    expect(formatTripRange('20261105', 0, now)?.end).toBeNull();
  });

  it('출발일이 없거나 잘못되면 null', () => {
    expect(formatTripRange(undefined, 3, now)).toBeNull();
    expect(formatTripRange('bad', 3, now)).toBeNull();
    expect(formatTripRange('20260231', 3, now)).toBeNull();
  });
});
