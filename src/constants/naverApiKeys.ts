// 네이버 지도 API 키는 프로젝트 루트 .env에서 주입한다 (EXPO_PUBLIC_* 는 Expo가 빌드 시 자동 인라인).
// 값 설정은 .env.example 참고.
export const NAVER_MAP_API_KEY_ID = process.env.EXPO_PUBLIC_NAVER_MAP_API_KEY_ID ?? '';
export const NAVER_MAP_API_KEY = process.env.EXPO_PUBLIC_NAVER_MAP_API_KEY ?? '';
