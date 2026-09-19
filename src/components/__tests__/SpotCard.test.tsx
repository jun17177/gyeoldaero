import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SpotCard from '../SpotCard';
import { Spot } from '../../types';

const spot = (over: Partial<Spot> = {}): Spot => ({
  id: 's1', name: '성산일출봉', category: 'nature',
  lat: 33.458, lon: 126.942, durationMinutes: 90, emoji: '', tags: [], ...over,
});

const noop = () => {};

describe('SpotCard', () => {
  it('이름과 분류·체류시간을 보여준다', () => {
    render(<SpotCard item={spot()} isSelected={false} isThemePick={false} onPress={noop} />);
    expect(screen.getByText('성산일출봉')).toBeTruthy();
    expect(screen.getByText('자연 · 90분')).toBeTruthy();
  });

  it('담긴 명소는 "담김"으로 표시된다', () => {
    render(<SpotCard item={spot()} isSelected isThemePick={false} onPress={noop} />);
    expect(screen.getByText('✓ 담김')).toBeTruthy();
  });

  it('테마에 맞으면 뱃지를 보여준다', () => {
    render(<SpotCard item={spot()} isSelected={false} isThemePick onPress={noop} />);
    expect(screen.getByText('★ 테마 맞춤')).toBeTruthy();
  });

  it('탭하면 해당 명소로 onPress가 불린다', () => {
    const onPress = jest.fn();
    const item = spot();
    render(<SpotCard item={item} isSelected={false} isThemePick={false} onPress={onPress} />);
    fireEvent.press(screen.getByText('성산일출봉'));
    expect(onPress).toHaveBeenCalledWith(item);
  });
});
