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
