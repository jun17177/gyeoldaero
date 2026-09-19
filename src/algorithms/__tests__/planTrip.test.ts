import { planTrip } from '../planTrip';
import { requestAiRoutePlan } from '../../api/routePlanApi';
import { TripSchedule } from '../../types';

jest.mock('../../api/routePlanApi', () => ({ requestAiRoutePlan: jest.fn() }));
const request = jest.mocked(requestAiRoutePlan);
const schedule: TripSchedule = {
  id: 'test', name: 'Trip', createdAt: '', days: 0, tags: [],
  accommodation: 'custom', customAccommodationCoords: { lat: 33.3, lon: 126.3 },
  settings: { themes: ['healing'], weather: 'sunny', season: 'spring',
    startTime: 9, endTime: 19, people: 2, budget: 1, luggage: 'light' },
  spots: ['a', 'b'].map((id, i) => ({ id, name: id, category: 'nature',
    lat: 33.3 + i * 0.01, lon: 126.3, durationMinutes: 30, tags: [], emoji: '' })),
};

beforeEach(() => request.mockReset());

test('preserves AI day assignments and order for saving and maps', async () => {
  request.mockResolvedValue({ daysReason: 'Reason', days: [
    { spotIds: ['b'], note: 'First' }, { spotIds: ['a'], note: 'Second' },
  ] });
  const result = await planTrip(schedule);
  expect(result.planSource).toBe('ai');
  expect(result.days).toBe(2);
  expect(result.spots?.map(s => s.id)).toEqual(['b', 'a']);
  expect(result.dayPlans.map(p => p.items.filter(i => i.type === 'spot').map(i => i.name)))
    .toEqual([['b'], ['a']]);
  expect(result.dayPlans[0].note).toBe('First');
  expect(request.mock.calls[0][0].travelMinutes[0][1]).toBe(10);
});

test.each([['a'], ['a', 'a'], ['a', 'unknown'], []])('rejects missing or invalid IDs: %j', async (...ids) => {
  request.mockResolvedValue({ daysReason: '', days: [{ spotIds: ids, note: '' }] });
  const result = await planTrip(schedule);
  expect(result.planSource).toBe('algorithm');
  expect(result.dayPlans.flatMap(p => p.items.filter(i => i.type === 'spot').map(i => i.name)).sort())
    .toEqual(['a', 'b']);
});

test('server unavailable falls back to the existing timeline', async () => {
  request.mockResolvedValue(null);
  expect((await planTrip(schedule)).planSource).toBe('algorithm');
});

test('arrival and departure windows are retained in AI timelines', async () => {
  request.mockResolvedValue({ daysReason: '', days: [
    { spotIds: ['a'], note: '' }, { spotIds: ['b'], note: '' },
  ] });
  const result = await planTrip({ ...schedule, settings: {
    ...schedule.settings, firstDayArrival: 15, lastDayDeparture: 11,
  } });
  expect(result.dayPlans[0].items[0].time).toBe('15:00');
  expect(result.dayPlans[1].items.some(i => i.type === 'meal')).toBe(false);
});
