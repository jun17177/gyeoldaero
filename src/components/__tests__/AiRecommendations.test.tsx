import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AiRecommendations from '../AiRecommendations';
import { Spot } from '../../types';

const spot = (id: string, name: string): Spot => ({
  id, name, category: 'nature', lat: 33.4, lon: 126.5,
  durationMinutes: 90, emoji: '', tags: [],
});
const recs = [
  { spot: spot('a', '성산일출봉'), reason: '일출이 좋아요' },
  { spot: spot('b', '협재해수욕장'), reason: '에메랄드빛 바다' },
];

describe('AI 맞춤 추천', () => {
  it('추천 명소와 이유를 보여준다', () => {
    render(<AiRecommendations loading={false} recs={recs} summary="가을 힐링 코스"
      selectedIds={new Set()} onToggle={jest.fn()} />);
    expect(screen.getByText('AI 맞춤 추천')).toBeTruthy();
    expect(screen.getByText('가을 힐링 코스')).toBeTruthy();
    expect(screen.getByText('성산일출봉')).toBeTruthy();
    expect(screen.getByText('에메랄드빛 바다')).toBeTruthy();
  });

  it('추천이 없고 로딩도 아니면 아무것도 그리지 않는다', () => {
    render(<AiRecommendations loading={false} recs={[]} summary=""
      selectedIds={new Set()} onToggle={jest.fn()} />);
    expect(screen.queryByText('AI 맞춤 추천')).toBeNull();
  });

  it('카드를 누르면 해당 명소로 onToggle이 불린다', () => {
    const onToggle = jest.fn();
    render(<AiRecommendations loading={false} recs={recs} summary=""
      selectedIds={new Set()} onToggle={onToggle} />);
    fireEvent.press(screen.getByText('협재해수욕장'));
    expect(onToggle).toHaveBeenCalledWith(recs[1].spot);
  });

  it('담긴 명소는 다시 눌러도 같은 자리에 남는다 (목록이 재구성되지 않는다)', () => {
    const { rerender } = render(
      <AiRecommendations loading={false} recs={recs} summary=""
        selectedIds={new Set()} onToggle={jest.fn()} />);
    const before = screen.getAllByText(/성산일출봉|협재해수욕장/).map(n => n.props.children);
    rerender(
      <AiRecommendations loading={false} recs={recs} summary=""
        selectedIds={new Set(['b'])} onToggle={jest.fn()} />);
    const after = screen.getAllByText(/성산일출봉|협재해수욕장/).map(n => n.props.children);
    expect(after).toEqual(before); // 순서 유지
  });
});
