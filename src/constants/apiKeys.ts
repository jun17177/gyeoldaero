// API 키는 프로젝트 루트 .env에서 주입한다 (EXPO_PUBLIC_* 는 Expo가 빌드 시 자동 인라인).
// 값 설정은 .env.example 참고. 미설정 시 빈 문자열 → 날씨는 mock, TourAPI는 시드 데이터로 폴백.
export const TOUR_API_KEY = process.env.EXPO_PUBLIC_TOUR_API_KEY ?? '';
// 기상청 단기예보 (data.go.kr 통합 인증키). 빈 문자열이면 mock 날씨로 동작합니다.
export const WEATHER_API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY ?? '';
