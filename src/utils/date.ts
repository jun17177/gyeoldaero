// 여행 출발일(startDate, 'YYYYMMDD') 표시용 포맷터

const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토'];

export function parseYyyymmdd(s?: string): Date | null {
  if (!s || !/^\d{8}$/.test(s)) return null;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6)) - 1;
  const d = Number(s.slice(6, 8));
  const dt = new Date(y, m, d);
  // 2월 31일 같은 값이 자동 이월되는 것을 걸러내기 위해 왕복 검증
  if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) return null;
  return dt;
}

// '20260712' → '7월 12일 (일)' / 잘못된 값이면 null
export function formatStartDate(s?: string): string | null {
  const dt = parseYyyymmdd(s);
  if (!dt) return null;
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일 (${WEEKDAY_KR[dt.getDay()]})`;
}

// 여행 기간 표시용: 출발일 + 총 일수(days, 2 = 1박 2일) → 시작/끝 날짜 문구.
// 당일치기(days <= 1)면 end는 null. 올해가 아닌 해에는 연도를 붙여 헷갈리지 않게 한다.
// 출발일이 없거나 잘못되면 null (호출부에서 "날짜 미정"으로 표시).
export function formatTripRange(
  startDate: string | undefined,
  days: number,
  now: Date = new Date(),
): { start: string; end: string | null } | null {
  const start = parseYyyymmdd(startDate);
  if (!start) return null;
  const fmt = (d: Date) => {
    const year = d.getFullYear() === now.getFullYear() ? '' : `${d.getFullYear()}년 `;
    return `${year}${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_KR[d.getDay()]})`;
  };
  if (!Number.isFinite(days) || days <= 1) return { start: fmt(start), end: null };
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + days - 1);
  return { start: fmt(start), end: fmt(end) };
}
