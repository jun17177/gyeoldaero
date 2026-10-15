// 달력 화면(TripCalendar)이 쓰는 날짜 계산. 시간대 영향을 받지 않도록 항상 "로컬 날짜(0시)"로만 다룬다.

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

// 2월 29일 + 1년 같은 경우 3월 1일로 넘어가지 않고 2월 말일로 맞춘다
export function addYears(d: Date, n: number): Date {
  const y = d.getFullYear() + n;
  const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
  return new Date(y, d.getMonth(), Math.min(d.getDate(), lastDay));
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// 날짜 비교용 정수 (연·월·일만 반영) — 시각이 달라도 같은 날이면 같은 값
export function dayKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function toYyyymmdd(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}${mm}${dd}`;
}

// 연·월 이동. month는 0~11, 범위를 넘으면 연도가 따라 바뀐다.
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

// 그 달을 일~토 7열 격자로 만든다. 1일 앞과 말일 뒤의 빈칸은 null.
export function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// start부터 totalDays일 동안(시작일 포함)에 date가 들어가는지
export function isInTripRange(date: Date, start: Date | null, totalDays: number): boolean {
  if (!start) return false;
  const len = Math.max(totalDays, 1);
  const k = dayKey(date);
  return k >= dayKey(start) && k <= dayKey(addDays(start, len - 1));
}
