import React from 'react';
import { render, screen } from '@testing-library/react-native';
import BusinessHoursScreen from '../BusinessHoursScreen';
import { TripSchedule } from '../../types';

// jest.mock 팩토리는 외부 변수를 참조할 수 없어 mock 접두사를 쓴다
const mockSchedule = {
  id: 't', name: '제주 여행', createdAt: '', days: 1,
  accommodation: 'jejucity', tags: [], spots: [],
  settings: { themes: [], weather: 'sunny', season: 'fall', startTime: 9, endTime: 19, people: 2, budget: 5, luggage: 'light' },
  dayPlans: [{ day: 1, items: [
    { type: 'accommodation', time: '09:00', name: '숙소 출발', duration: 0, dotColor: '#000' },
    { type: 'move', time: '09:10', name: '이동', duration: 20, dotColor: '#000' },
    { type: 'spot', time: '09:30', name: '성산일출봉', duration: 90, dotColor: '#000', spotId: 's1' },
    { type: 'spot', time: '11:10', name: '만장굴', duration: 60, dotColor: '#000', spotId: 's2' },
    { type: 'meal', time: '12:00', name: '점심 식사', duration: 60, dotColor: '#000', options: ['A식당'] },
  ] }],
} as unknown as TripSchedule;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  useRoute: () => ({ params: { schedule: mockSchedule } }),
}));

describe('바로가기 화면', () => {
  it('모든 일정 항목을 보여준다', () => {
    render(<BusinessHoursScreen />);
    for (const name of ['숙소 출발', '이동', '성산일출봉', '만장굴', '점심 식사']) {
      expect(screen.getByText(name)).toBeTruthy();
    }
  });

  it('명소에만 지도 링크를 단다 — 이동·식사·숙소에는 달지 않는다', () => {
    render(<BusinessHoursScreen />);
    // 명소 2곳에만 링크. "이동 제주"를 검색하게 되는 버튼이 생기면 안 된다
    expect(screen.getAllByTestId('link-button')).toHaveLength(2);
  });
});
