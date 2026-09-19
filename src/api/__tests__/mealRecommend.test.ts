import { enrichMealOptions } from '../mealRecommend';
import { fetchNearbyRestaurants } from '../tourApi';
import { fetchSpotRecommendations } from '../aiApi';
import { DayPlan, Spot, TripSchedule } from '../../types';

jest.mock('../tourApi', () => ({ fetchNearbyRestaurants: jest.fn() }));
jest.mock('../aiApi', () => ({ fetchSpotRecommendations: jest.fn() }));
const nearby = jest.mocked(fetchNearbyRestaurants);
const recommend = jest.mocked(fetchSpotRecommendations);

const spot = (id: string, lat: number, lon: number): Spot => ({
  id, name: id, category: 'food', lat, lon, durationMinutes: 60, emoji: '', tags: [],
});
const meal = (name: string) => ({ type: 'meal' as const, time: '12:00', name, duration: 60, dotColor: '#000', options: ['기본'] });
const spotItem = (name: string) => ({ type: 'spot' as const, time: '10:00', name, duration: 90, dotColor: '#000' });

const schedule = {
  id: 'x', name: '', createdAt: '', days: 2, accommodation: 'jejucity',
  spots: [spot('명소A', 33.4, 126.5), spot('명소B', 33.3, 126.6)], tags: [],
  settings: { themes: ['food'], weather: 'sunny', season: 'fall', startTime: 9, endTime: 19, people: 2, budget: 5, luggage: 'light' },
} as unknown as TripSchedule;

const plans: DayPlan[] = [
  { day: 1, items: [spotItem('명소A'), meal('점심 식사'), meal('저녁 식사')] },
  { day: 2, items: [spotItem('명소B'), meal('점심 식사')] },
];

beforeEach(() => {
  nearby.mockReset(); recommend.mockReset();
  nearby.mockImplementation(async () => Array.from({ length: 6 }, (_, i) => spot(`식당${i}`, 33.4, 126.5)));
  recommend.mockImplementation(async () => ({
    recommendations: [{ spotId: '식당0', reason: '' }, { spotId: '식당1', reason: '' }],
    summary: '',
  }));
});

test('식사 슬롯의 옵션을 실제 식당 이름으로 바꾼다', async () => {
  const out = await enrichMealOptions(plans, schedule);
  const meals = out.flatMap(p => p.items.filter(i => i.type === 'meal'));
  expect(meals).toHaveLength(3);
  meals.forEach(m => expect(m.options).toEqual(['식당0', '식당1']));
});

test('같은 기준 좌표는 한 번만 조회한다 (중복 LLM 호출 제거)', async () => {
  await enrichMealOptions(plans, schedule);
  // 1일차 두 식사는 모두 명소A 기준 → 좌표 2종(명소A, 명소B)만 조회
  expect(nearby).toHaveBeenCalledTimes(2);
  expect(recommend).toHaveBeenCalledTimes(2);
});

test('취소되면 더 이상 조회하지 않는다', async () => {
  const out = await enrichMealOptions(plans, schedule, () => true);
  expect(nearby).not.toHaveBeenCalled();
  expect(out).toEqual(plans); // 원본 유지
});

test('조회 실패 시 기본 옵션을 유지한다', async () => {
  nearby.mockRejectedValue(new Error('network'));
  const out = await enrichMealOptions(plans, schedule);
  out.flatMap(p => p.items.filter(i => i.type === 'meal'))
    .forEach(m => expect(m.options).toEqual(['기본']));
});
