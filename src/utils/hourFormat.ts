// 0~23시를 오전/오후 × 1~12시로 오가는 변환.
// 화면(DetailConditionScreen)과 테스트가 같은 규칙을 쓰도록 여기 모아둔다.
export type Period = 'am' | 'pm';

export const DISPLAY_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// 오전 12시 = 0시, 오후 12시 = 12시
export function to24Hour(period: Period, display: number): number {
  if (period === 'am') return display === 12 ? 0 : display;
  return display === 12 ? 12 : display + 12;
}

export function from24Hour(h: number): { period: Period; display: number } {
  return { period: h < 12 ? 'am' : 'pm', display: h % 12 === 0 ? 12 : h % 12 };
}

export function formatHourLabel(v: number | undefined): string {
  if (v === undefined) return '설정 안 함';
  const { period, display } = from24Hour(v);
  return `${period === 'am' ? '오전' : '오후'} ${display}시`;
}
