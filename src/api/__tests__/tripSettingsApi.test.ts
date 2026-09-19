import axios from 'axios';
import { requestTripSettings } from '../tripSettingsApi';

jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('../../constants/config', () => ({ PLANNER_API_URL: 'http://test', plannerHeaders: () => undefined }));
const post = jest.mocked(axios.post);
const settings = { themes: ['food'], season: 'fall', startTime: 10, endTime: 20,
  people: 3, budget: 2, luggage: 'medium' };

test.each(['storm', 123, null])('rejects invalid weather: %s', async weather => {
  post.mockResolvedValue({ data: { settings: { ...settings, weather }, summary: '' } });
  expect(await requestTripSettings('Trip')).toBeNull();
});

test('adapts source branch settings to the current weather contract', async () => {
  post.mockResolvedValue({ data: { settings, summary: 'Trip' } });
  expect(await requestTripSettings('Trip')).toEqual({ settings: { ...settings, weather: 'sunny' }, summary: 'Trip' });
});

test('rejects impossible activity hours', async () => {
  post.mockResolvedValue({ data: { settings: { ...settings, endTime: 9 }, summary: '' } });
  expect(await requestTripSettings('Trip')).toBeNull();
});

test('rejects an unexpected response body', async () => {
  post.mockResolvedValue({ data: '<html>tunnel</html>' });
  expect(await requestTripSettings('Trip')).toBeNull();
});
