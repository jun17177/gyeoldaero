import axios from 'axios';
import { fetchJejuSpotsByCategory, fetchSpotImage } from '../tourApi';

jest.mock('axios', () => ({ get: jest.fn(), isAxiosError: (error: { isAxiosError?: boolean }) => error?.isAxiosError === true }));
jest.mock('../../constants/apiKeys', () => ({ TOUR_API_KEY: 'test-key' }));
const get = jest.mocked(axios.get);

test('403 produces a safe error without request credentials', async () => {
  get.mockRejectedValue({ isAxiosError: true, response: { status: 403 }, config: { params: { serviceKey: 'test-key' } } });
  await expect(fetchJejuSpotsByCategory('nature')).rejects.toThrow('접근이 거절');
});

test('HTTP 200 authentication failure is not treated as an empty list', async () => {
  get.mockResolvedValue({ data: { response: { header: { resultCode: '30' } } } });
  await expect(fetchJejuSpotsByCategory('nature')).rejects.toThrow('요청을 처리하지 못했습니다');
});

test('successful list includes the actual place image', async () => {
  get.mockResolvedValue({ data: { response: { header: { resultCode: '0000' }, body: { items: { item: [
    { contentid: '1', contenttypeid: '12', title: 'Place', mapy: '33.4', mapx: '126.5', firstimage: 'https://example.com/place.jpg' },
  ] } } } } });
  const spots = await fetchJejuSpotsByCategory('nature');
  expect(spots[0].imageUrl).toBe('https://example.com/place.jpg');
});

test('failed image lookup returns undefined for the icon fallback', async () => {
  get.mockRejectedValue(new Error('network'));
  await expect(fetchSpotImage({ id: '1', name: 'Place', lat: 33.4, lon: 126.5 })).resolves.toBeUndefined();
});
