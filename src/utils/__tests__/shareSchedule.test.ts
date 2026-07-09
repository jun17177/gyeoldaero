import { buildShareText } from '../shareSchedule';
import { TripSchedule, DayPlan } from '../../types';

const schedule: TripSchedule = {
  id: 't1', name: '제주 봄여행', createdAt: '2026-01-01T00:00:00.000Z',
  days: 2, startDate: '20260712',
  spots: [
    { id: 's1', name: '성산일출봉', category: 'nature', lat: 33.4, lon: 126.9, durationMinutes: 90, emoji: '🌋', tags: [] },
    { id: 's2', name: '협재해수욕장', category: 'nature', lat: 33.3, lon: 126.2, durationMinutes: 120, emoji: '🏖️', tags: [] },
  ],
  accommodation: 'jejucity', tags: [],
  settings: {
    themes: ['healing'], weather: 'sunny', season: 'spring',
    startTime: 9, endTime: 19, people: 2, budget: 5, luggage: 'light',
  },
};

const plans: DayPlan[] = [
  {
    day: 1,
    items: [
      { type: 'accommodation', time: '09:00', name: '숙소 출발', duration: 0, dotColor: '' },
      { type: 'spot', time: '10:00', name: '성산일출봉', duration: 90, dotColor: '' },
      { type: 'meal', time: '12:00', name: '점심 식사', duration: 60, dotColor: '', selectedOption: '흑돼지 두루치기' },
    ],
  },
  {
    day: 2,
    items: [
      { type: 'spot', time: '10:30', name: '협재해수욕장', duration: 120, dotColor: '' },
    ],
  },
];

describe('buildShareText', () => {
  const text = buildShareText(schedule, plans);

  it('제목과 슬로건이 포함된다', () => {
    expect(text).toContain('결대로 · 제주 봄여행');
    expect(text).toContain('당신의 결을 따라');
  });

  it('출발일과 기간·명소 수가 표시된다', () => {
    expect(text).toContain('7월 12일');
    expect(text).toContain('1박 2일');
    expect(text).toContain('명소 2곳');
  });

  it('일차별 헤더와 각 일차 실제 날짜가 표시된다', () => {
    expect(text).toContain('1일차 (7월 12일)');
    expect(text).toContain('2일차 (7월 13일)');
  });

  it('명소와 선택한 식당(selectedOption)이 반영된다', () => {
    expect(text).toContain('성산일출봉');
    expect(text).toContain('흑돼지 두루치기'); // '점심 식사'가 아니라 선택 식당
    expect(text).not.toContain('12:00  🍽️ 점심 식사');
  });
});
