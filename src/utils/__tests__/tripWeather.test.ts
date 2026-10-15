import { tripWeather, weatherAdvice } from '../tripWeather';
import { WeatherDay } from '../../api/weatherApi';

// 2026-10-15(목)부터 10일치 예보
const forecast: WeatherDay[] = [
  { date: '20261015', condition: 'cloudy', tMin: 14, tMax: 21 },
  { date: '20261016', condition: 'cloudy', tMin: 17, tMax: 23 },
  { date: '20261017', condition: 'rainy',  tMin: 20, tMax: 26 },
  { date: '20261018', condition: 'rainy',  tMin: 19, tMax: 28 },
  { date: '20261019', condition: 'sunny',  tMin: 19, tMax: 23 },
  { date: '20261020', condition: 'sunny',  tMin: 18, tMax: 25 },
  { date: '20261021', condition: 'snowy',  tMin: 15, tMax: 24 },
  { date: '20261022', condition: 'sunny',  tMin: 14, tMax: 15 },
  { date: '20261023', condition: 'cloudy', tMin: 13, tMax: 18 },
  { date: '20261024', condition: 'sunny',  tMin: 12, tMax: 20 },
];

describe('tripWeather', () => {
  it('일정 전체가 예보 안이면 날짜마다 날씨를 돌려주고 기온은 전체 최저~최고', () => {
    expect(tripWeather('20261016', 3, forecast)).toEqual({
      days: ['cloudy', 'rainy', 'rainy'],
      forecastDays: [forecast[1], forecast[2], forecast[3]],
      tMin: 17,
      tMax: 28,
    });
  });

  it('forecastDays는 칸마다 그날의 기온까지 담고, 예보 없는 날은 null', () => {
    const w = tripWeather('20261024', 2, forecast);
    expect(w?.forecastDays).toEqual([forecast[9], null]);
    expect(w?.forecastDays[0]).toMatchObject({ tMin: 12, tMax: 20 });
  });

  it('일부만 예보 안이면 없는 날은 null로 두어 여행 일수와 칸 수가 맞는다', () => {
    const w = tripWeather('20261023', 4, forecast);
    expect(w?.days).toEqual(['cloudy', 'sunny', null, null]);
    expect(w?.tMin).toBe(12);
    expect(w?.tMax).toBe(20); // 예보 있는 두 날(최고 18, 20)만 반영
  });

  it('이미 시작한 여행은 지난 날을 null로 두고 남은 날만 보여준다', () => {
    // 오늘이 10/15이고 10/13에 출발한 4일 일정 → 13·14일은 예보 없음
    const w = tripWeather('20261013', 4, forecast);
    expect(w?.days).toEqual([null, null, 'cloudy', 'cloudy']);
  });

  it('예보와 하루도 안 겹치면 null (날씨 줄을 숨긴다)', () => {
    expect(tripWeather('20261101', 3, forecast)).toBeNull();
    expect(tripWeather('20261001', 3, forecast)).toBeNull();
  });

  it('출발일이 없거나 잘못됐거나 예보가 비었으면 null', () => {
    expect(tripWeather(undefined, 3, forecast)).toBeNull();
    expect(tripWeather('bad', 3, forecast)).toBeNull();
    expect(tripWeather('20261016', 3, [])).toBeNull();
  });

  it('월을 넘는 구간과 당일치기', () => {
    const f: WeatherDay[] = [
      { date: '20261031', condition: 'sunny', tMin: 10, tMax: 20 },
      { date: '20261101', condition: 'rainy', tMin: 9, tMax: 15 },
    ];
    expect(tripWeather('20261031', 2, f)?.days).toEqual(['sunny', 'rainy']);
    expect(tripWeather('20261101', 1, f)?.days).toEqual(['rainy']);
    expect(tripWeather('20261101', 0, f)?.days).toEqual(['rainy']); // 0일은 1일로 취급
  });
});

describe('weatherAdvice', () => {
  it('일정 전체가 예보 안이고 비·눈이 있으면 조정을 제안한다 (비·눈 오는 일차 목록 포함)', () => {
    // 10/16 구름, 10/17 비, 10/18 비
    expect(weatherAdvice('20261016', 3, forecast)).toEqual({ state: 'suggest', badDays: [2, 3] });
  });

  it('눈이 오는 날도 비와 같이 센다', () => {
    expect(weatherAdvice('20261020', 3, forecast)).toEqual({ state: 'suggest', badDays: [2] }); // 20 맑음, 21 눈, 22 맑음
  });

  it('비·눈이 없으면 안내하지 않는다', () => {
    expect(weatherAdvice('20261022', 1, forecast)).toBeNull();
    expect(weatherAdvice('20261019', 2, forecast)).toBeNull(); // 맑음, 맑음
  });

  it('이미 같은 예보로 조정한 일정(weatherPlan이 같음)은 adjusted', () => {
    expect(weatherAdvice('20261016', 3, forecast, 'cloudy,rainy,rainy')).toEqual({ state: 'adjusted', badDays: [2, 3] });
  });

  it('조정 뒤 예보가 바뀌었으면(weatherPlan이 다름) 다시 제안한다', () => {
    expect(weatherAdvice('20261016', 3, forecast, 'cloudy,sunny,sunny')?.state).toBe('suggest');
  });

  it('예보가 일정 일부만 덮으면 partial (자동 조정 불가)', () => {
    // 10/23부터 4일: 23 구름, 24 맑음, 25·26 예보 없음 → 비·눈 없음이라 null
    expect(weatherAdvice('20261023', 4, forecast)).toBeNull();
    // 10/21(눈)부터 5일: 21 눈, 22 맑음, 23 구름, 24 맑음, 25 예보 없음
    expect(weatherAdvice('20261021', 5, forecast)).toEqual({ state: 'partial', badDays: [1] });
  });

  it('출발일이 없거나 예보와 안 겹치면 null', () => {
    expect(weatherAdvice(undefined, 3, forecast)).toBeNull();
    expect(weatherAdvice('20261201', 3, forecast)).toBeNull();
    expect(weatherAdvice('20261016', 3, [])).toBeNull();
  });
});
