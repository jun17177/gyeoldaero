import { TripSchedule, DayPlan } from '../types';
import { formatStartDate, parseYyyymmdd } from './date';

const TYPE_MARK: Record<string, string> = {
  accommodation: '🏨',
  meal: '🍽️',
  move: '🚗',
  spot: '📍',
};

function daysLabel(days: number): string {
  if (days <= 1) return '당일치기';
  return `${days - 1}박 ${days}일`;
}

// 저장된 일정을 공유용 텍스트로 변환한다 (카카오톡/메모 등에 붙여넣기 좋은 형태).
export function buildShareText(schedule: TripSchedule, plans: DayPlan[]): string {
  const lines: string[] = [];

  lines.push(`🌊 결대로 · ${schedule.name}`);
  const dep = formatStartDate(schedule.startDate);
  lines.push(`${dep ? `${dep} 출발 · ` : ''}${daysLabel(schedule.days)} · 명소 ${schedule.spots.length}곳`);

  const base = parseYyyymmdd(schedule.startDate);
  plans.forEach(plan => {
    let dateLabel = '';
    if (base) {
      const d = new Date(base);
      d.setDate(base.getDate() + (plan.day - 1));
      dateLabel = ` (${d.getMonth() + 1}월 ${d.getDate()}일)`;
    }
    lines.push('');
    lines.push(`━ ${plan.day}일차${dateLabel} ━`);
    plan.items.forEach(item => {
      const name =
        item.type === 'meal' && item.selectedOption ? item.selectedOption : item.name;
      lines.push(`${item.time}  ${TYPE_MARK[item.type] ?? ''} ${name}`.trimEnd());
    });
  });

  lines.push('');
  lines.push('— 당신의 결을 따라, 여행의 결을 설계합니다');
  return lines.join('\n');
}
