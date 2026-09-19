import axios from 'axios';
import { fetchJejuWeather, fetchWeatherForecast } from '../weatherApi';

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

beforeEach(() => get.mockReset());

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
