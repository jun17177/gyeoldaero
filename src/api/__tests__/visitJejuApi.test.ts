import axios from 'axios';
import { fetchVisitJejuSpots } from '../visitJejuApi';
jest.mock('axios', () => ({ get: jest.fn() }));
const get = jest.mocked(axios.get);

test('failed requests can retry and successful requests share a cache', async () => {
  get.mockRejectedValueOnce(new Error('offline'));
  await expect(fetchVisitJejuSpots()).rejects.toThrow('비짓제주');
  const spots = [{ id: 'visitjeju:id', name: 'Place', imageUrl: 'https://example.com/image.jpg' }];
  get.mockResolvedValueOnce({ data: { spots } });
  const [a, b] = await Promise.all([fetchVisitJejuSpots(), fetchVisitJejuSpots()]);
  // 서버는 businessHoursUrl을 보내지 않고 앱이 id에서 조합한다 (응답 용량 절감)
  const withLink = spots.map(s => ({
    ...s,
    businessHoursUrl: 'https://www.visitjeju.net/kr/detail/view?contentsid=id',
  }));
  expect(a).toEqual(withLink);
  expect(b).toEqual(withLink);
  expect(get).toHaveBeenCalledTimes(2);
  await fetchVisitJejuSpots();
  expect(get).toHaveBeenCalledTimes(2);
});
