import { formatStartDate, parseYyyymmdd } from '../date';

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
