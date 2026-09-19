// API 키는 프로젝트 루트 .env에서 주입한다 (EXPO_PUBLIC_* 는 Expo가 빌드 시 자동 인라인).
// 값 설정은 .env.example 참고. 미설정 시 빈 문자열 → TourAPI는 시드 데이터로 폴백.
export const TOUR_API_KEY = process.env.EXPO_PUBLIC_TOUR_API_KEY ?? '';
// 날씨는 키가 필요 없는 Open-Meteo를 쓴다 (api/weatherApi.ts) — 별도 키 상수 없음.
