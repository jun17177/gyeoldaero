import { findSpotOf } from '../findSpot';
import { Spot } from '../../types';

const spot = (id: string, name: string): Spot => ({
  id, name, category: 'nature', lat: 33.4, lon: 126.5,
  durationMinutes: 90, emoji: '', tags: [],
});

const spots = [spot('a', '사라봉'), spot('b', '사라봉'), spot('c', '성산일출봉')];

test('spotId로 정확히 짚는다 — 이름이 같아도 구분된다', () => {
  expect(findSpotOf(spots, { spotId: 'b', name: '사라봉' })?.id).toBe('b');
  expect(findSpotOf(spots, { spotId: 'a', name: '사라봉' })?.id).toBe('a');
});

test('spotId가 없는 예전 저장 일정은 이름으로 찾는다', () => {
  expect(findSpotOf(spots, { name: '성산일출봉' })?.id).toBe('c');
});

test('id가 더 이상 없으면(명소 삭제 후) 이름으로 폴백한다', () => {
  expect(findSpotOf(spots, { spotId: 'zzz', name: '성산일출봉' })?.id).toBe('c');
});

test('찾을 수 없으면 undefined', () => {
  expect(findSpotOf(spots, { spotId: 'zzz', name: '없는곳' })).toBeUndefined();
});
