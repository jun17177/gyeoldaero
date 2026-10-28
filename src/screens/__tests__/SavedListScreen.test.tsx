import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import SavedListScreen from '../SavedListScreen';
import { TripSchedule } from '../../types';

function make(id: string, name: string): TripSchedule {
  return {
    id, name, createdAt: '', days: 2, accommodation: 'jejucity', tags: [], spots: [],
    settings: { themes: ['healing'], weather: 'sunny', season: 'spring', startTime: 9, endTime: 19, people: 2, budget: 5, luggage: 'light' },
  } as unknown as TripSchedule;
}

let mockStore: TripSchedule[] = [];
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ navigate: mockNavigate }),
    useFocusEffect: (cb: () => void | (() => void)) => React.useEffect(cb, []),
  };
});
jest.mock('../../storage/scheduleStorage', () => ({
  loadAllSchedules: jest.fn(() => Promise.resolve([...mockStore])),
  deleteSchedule: jest.fn((id: string) => { mockStore = mockStore.filter(s => s.id !== id); return Promise.resolve(); }),
  deleteSchedules: jest.fn((ids: string[]) => { mockStore = mockStore.filter(s => !ids.includes(s.id)); return Promise.resolve(); }),
  renameSchedule: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('../../api/weatherApi', () => ({
  fetchWeatherForecastCached: jest.fn(() => Promise.reject(new Error('offline'))),
}));

beforeEach(() => {
  mockStore = [make('a', '여행 A'), make('b', '여행 B'), make('c', '여행 C')];
  mockNavigate.mockClear();
  jest.restoreAllMocks();
});

// Alert.alert의 "삭제" 버튼을 눌러 준다
function confirmDelete() {
  const spy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
    buttons?.find(b => b.text === '삭제')?.onPress?.();
  });
  return spy;
}

describe('저장된 일정 — 여러 개 선택 삭제', () => {
  it('선택 모드에서는 카드를 눌러도 상세로 가지 않고 선택만 된다', async () => {
    render(<SavedListScreen />);
    await screen.findByText('여행 A');
    fireEvent.press(screen.getByText('선택'));
    fireEvent.press(screen.getByText('여행 A'));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText('1개 삭제')).toBeTruthy();
  });

  it('선택하지 않으면 삭제 버튼이 비활성이다', async () => {
    render(<SavedListScreen />);
    await screen.findByText('여행 A');
    fireEvent.press(screen.getByText('선택'));
    expect(screen.getByText('삭제할 일정을 선택하세요')).toBeTruthy();
  });

  it('고른 일정만 한 번에 지우고 선택 모드를 나간다', async () => {
    const spy = confirmDelete();
    render(<SavedListScreen />);
    await screen.findByText('여행 A');
    fireEvent.press(screen.getByText('선택'));
    fireEvent.press(screen.getByText('여행 A'));
    fireEvent.press(screen.getByText('여행 C'));
    fireEvent.press(screen.getByText('2개 삭제'));
    expect(spy.mock.calls[0][1]).toContain('2개');
    await waitFor(() => expect(mockStore.map(s => s.id)).toEqual(['b']), { timeout: 3000 });
    await waitFor(() => expect(screen.queryByText('여행 A')).toBeNull());
    expect(screen.queryByText('여행 C')).toBeNull();
    expect(screen.getByText('여행 B')).toBeTruthy();
    expect(screen.getByText('새로운 여행 시작하기')).toBeTruthy();
  });

  it('전체 선택 후 지우면 빈 화면이 된다', async () => {
    confirmDelete();
    render(<SavedListScreen />);
    await screen.findByText('여행 A');
    fireEvent.press(screen.getByText('선택'));
    fireEvent.press(screen.getByText('전체 선택'));
    expect(screen.getByText('3개 삭제')).toBeTruthy();
    fireEvent.press(screen.getByText('3개 삭제'));
    await screen.findByText('아직 저장된 일정이 없어요');
  });

  it('취소하면 아무것도 지우지 않고 선택이 풀린다', async () => {
    render(<SavedListScreen />);
    await screen.findByText('여행 A');
    fireEvent.press(screen.getByText('선택'));
    fireEvent.press(screen.getByText('여행 A'));
    fireEvent.press(screen.getByText('취소'));
    expect(screen.getByText('선택')).toBeTruthy();
    expect(screen.getByText('여행 A')).toBeTruthy();
    expect(mockStore).toHaveLength(3);
  });
});
