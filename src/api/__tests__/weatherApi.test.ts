import axios from 'axios';
import { fetchJejuWeather, fetchWeatherForecast, fetchWeatherForecastCached, resetForecastCache } from '../weatherApi';

jest.mock('axios', () => ({ get: jest.fn() }));
const get = jest.mocked(axios.get);

// Open-Meteo 응답 형태 (WMO 코드: 0 맑음, 3 흐림, 61 비, 71 눈)
const response = (overrides: Record<string, unknown> = {}) => ({
  data: {
    current: { temperature_2m: 23.5, weather_code: 0 },
    daily: {
      time: Array.from({ length: 10 }, (_, i) => `2026-09-${String(19 + i).padStart(2, '0')}`),
      weather_code: [0, 3, 61, 71, 0, 0, 0, 0, 0, 0],
      temperature_2m_max: Array(10).fill(24.6),
      temperature_2m_min: Array(10).fill(21.4),
      precipitation_probability_max: Array(10).fill(92),
      ...(overrides.daily as object ?? {}),
    },
    ...overrides,
  },
});

beforeEach(() => { get.mockReset(); resetForecastCache(); });

describe('fetchJejuWeather', () => {
  it('현재 기온·강수확률을 실제 값으로 돌려준다', async () => {
    get.mockResolvedValue(response());
    const w = await fetchJejuWeather();
    expect(w).toMatchObject({ condition: 'sunny', tempC: 23.5, pop: 92, isMock: false });
  });

  it('비 예보면 기간 보정계수가 올라간다', async () => {
    get.mockResolvedValue(response({ current: { temperature_2m: 18, weather_code: 61 } }));
    const w = await fetchJejuWeather();
    expect(w.condition).toBe('rainy');
    expect(w.factor).toBe(1.2);
  });

  it('조회 실패 시 mock으로 폴백하고 isMock을 세운다', async () => {
    get.mockRejectedValue(new Error('network'));
    const w = await fetchJejuWeather();
    expect(w).toMatchObject({ condition: 'sunny', isMock: true, tempC: null });
  });
});

describe('fetchWeatherForecast', () => {
  it('10일치를 YYYYMMDD로 돌려주고 WMO 코드를 4단계로 변환한다', async () => {
    get.mockResolvedValue(response());
    const { days, isMock } = await fetchWeatherForecast();
    expect(isMock).toBe(false);
    expect(days).toHaveLength(10);
    expect(days[0]).toEqual({ date: '20260919', condition: 'sunny', tMin: 21, tMax: 25 });
    expect(days.slice(0, 4).map(d => d.condition)).toEqual(['sunny', 'cloudy', 'rainy', 'snowy']);
  });

  it('조회 실패 시에도 날짜 선택이 비지 않도록 10일을 채우고 isMock을 세운다', async () => {
    get.mockRejectedValue(new Error('network'));
    const { days, isMock } = await fetchWeatherForecast();
    expect(isMock).toBe(true);
    expect(days).toHaveLength(10);
    expect(days[0].date).toMatch(/^\d{8}$/);
  });
});

describe('fetchWeatherForecastCached', () => {
  const t0 = 1_000_000;

  it('30분 안에는 다시 요청하지 않고 같은 예보를 돌려준다', async () => {
    get.mockResolvedValue(response());
    const a = await fetchWeatherForecastCached(t0);
    const b = await fetchWeatherForecastCached(t0 + 29 * 60 * 1000);
    expect(get).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);
  });

  it('30분이 지나면 다시 받는다', async () => {
    get.mockResolvedValue(response());
    await fetchWeatherForecastCached(t0);
    await fetchWeatherForecastCached(t0 + 31 * 60 * 1000);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('동시에 여러 번 불러도 요청은 한 번만 나간다', async () => {
    get.mockResolvedValue(response());
    const [a, b, c] = await Promise.all([
      fetchWeatherForecastCached(t0), fetchWeatherForecastCached(t0), fetchWeatherForecastCached(t0),
    ]);
    expect(get).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('실패(임시 예보)는 캐시하지 않아 다음 호출에서 다시 시도한다', async () => {
    get.mockRejectedValueOnce(new Error('network'));
    const first = await fetchWeatherForecastCached(t0);
    expect(first.isMock).toBe(true);

    get.mockResolvedValue(response());
    const second = await fetchWeatherForecastCached(t0 + 1000);
    expect(second.isMock).toBe(false);
    expect(get).toHaveBeenCalledTimes(2);
  });
});
