import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import TripCalendar from '../TripCalendar';

const min = new Date(2026, 9, 15);   // 2026-10-15 (오늘로 가정)
const max = new Date(2027, 9, 15);   // 1년 뒤

const setup = (over: Partial<React.ComponentProps<typeof TripCalendar>> = {}) => {
  const onSelect = jest.fn();
  render(<TripCalendar tripDays={3} selectedStart={null} onSelect={onSelect} minDate={min} maxDate={max} {...over} />);
  return { onSelect };
};

describe('TripCalendar', () => {
  it('시작 달(선택이 없으면 minDate의 달)을 보여준다', () => {
    setup();
    expect(screen.getByText('2026년 10월')).toBeTruthy();
  });

  it('선택된 출발일이 있으면 그 달부터 보여주고 출발/도착을 라벨로 구분한다', () => {
    setup({ selectedStart: new Date(2026, 10, 24) });
    expect(screen.getByText('2026년 11월')).toBeTruthy();
    expect(screen.getByLabelText('11월 24일 출발')).toBeTruthy();
    expect(screen.getByLabelText('11월 26일 도착')).toBeTruthy();
    expect(screen.getByLabelText('11월 25일')).toBeTruthy(); // 가운데 날은 구간이지만 라벨은 그대로
  });

  it('날짜를 탭하면 그 날짜로 onSelect가 불린다', () => {
    const { onSelect } = setup();
    fireEvent.press(screen.getByLabelText('10월 20일'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    const d: Date = onSelect.mock.calls[0][0];
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 20]);
  });

  it('지난 날짜(오늘 이전)는 눌러도 선택되지 않는다', () => {
    const { onSelect } = setup();
    fireEvent.press(screen.getByLabelText('10월 14일'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('첫 달에서는 이전 달 이동이 막히고, 다음 달로는 이동된다', () => {
    setup();
    fireEvent.press(screen.getByLabelText('이전 달'));
    expect(screen.getByText('2026년 10월')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('다음 달'));
    expect(screen.getByText('2026년 11월')).toBeTruthy();
  });

  it('마지막 달(1년 뒤)에서는 다음 달 이동이 막히고 그 달의 최대일 뒤는 선택되지 않는다', () => {
    const { onSelect } = setup({ selectedStart: new Date(2027, 9, 10) });
    expect(screen.getByText('2027년 10월')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('다음 달'));
    expect(screen.getByText('2027년 10월')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('10월 16일')); // maxDate(10/15) 다음 날
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('10월 15일'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('출발일이 범위 안이면 도착일이 최대 날짜를 넘어도 칠해진다', () => {
    setup({ selectedStart: new Date(2027, 9, 14), tripDays: 4 });
    expect(screen.getByLabelText('10월 17일 도착')).toBeTruthy();
  });
});
