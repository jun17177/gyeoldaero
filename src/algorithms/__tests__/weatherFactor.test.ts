import { CONDITION_FACTOR, forecastWeatherFactor } from '../weatherFactor';

describe('forecastWeatherFactor', () => {
  it('맑은 날만 있으면 계절 계수 그대로', () => {
    expect(forecastWeatherFactor('spring', ['sunny', 'cloudy'])).toBe(1);
    expect(forecastWeatherFactor('winter', ['sunny'])).toBeCloseTo(1.15);
  });

  it('날짜별 날씨 계수의 평균을 곱한다 (비 하루 + 맑음 하루 = 1.1)', () => {
    expect(forecastWeatherFactor('spring', ['rainy', 'sunny'])).toBeCloseTo(1.1);
    expect(forecastWeatherFactor('fall', ['rainy', 'rainy', 'snowy'])).toBeCloseTo((1.2 + 1.2 + 1.3) / 3);
  });

  it('여름·겨울 계절 계수와 곱해진다', () => {
    expect(forecastWeatherFactor('summer', ['rainy'])).toBeCloseTo(1.1 * 1.2);
  });

  it('예보가 비어 있으면 날씨 영향 없이 계절 계수만', () => {
    expect(forecastWeatherFactor('winter', [])).toBeCloseTo(1.15);
  });

  it('조건별 계수는 기존 값과 같다 (맑음·흐림 1.0, 비 1.2, 눈 1.3)', () => {
    expect(CONDITION_FACTOR).toEqual({ sunny: 1, cloudy: 1, rainy: 1.2, snowy: 1.3 });
  });
});
