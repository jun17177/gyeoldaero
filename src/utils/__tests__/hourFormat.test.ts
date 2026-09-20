import { to24Hour, from24Hour, formatHourLabel, DISPLAY_HOURS } from '../hourFormat';

describe('오전/오후 ↔ 24시간 변환', () => {
  it('오전 12시는 0시, 오후 12시는 12시다 (헷갈리기 쉬운 경계)', () => {
    expect(to24Hour('am', 12)).toBe(0);
    expect(to24Hour('pm', 12)).toBe(12);
  });

  it('오전 1~11시는 그대로, 오후 1~11시는 +12', () => {
    expect(to24Hour('am', 9)).toBe(9);
    expect(to24Hour('pm', 9)).toBe(21);
    expect(to24Hour('pm', 11)).toBe(23);
  });

  it('0~23시 전부 왕복 변환이 일치한다', () => {
    for (let h = 0; h < 24; h++) {
      const { period, display } = from24Hour(h);
      expect(to24Hour(period, display)).toBe(h);
      expect(DISPLAY_HOURS).toContain(display);
    }
  });

  it('라벨을 한글로 만든다', () => {
    expect(formatHourLabel(0)).toBe('오전 12시');
    expect(formatHourLabel(9)).toBe('오전 9시');
    expect(formatHourLabel(12)).toBe('오후 12시');
    expect(formatHourLabel(23)).toBe('오후 11시');
    expect(formatHourLabel(undefined)).toBe('설정 안 함');
  });
});
