import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gyeoldaero_spot_images';

// 명소 사진 URL 캐시 — TourAPI 이미지 보강 결과를 저장해
// 화면 재진입 시 즉시 사진을 보여주고 불필요한 API 재호출을 막는다.
// (성공한 URL만 캐시 — 실패는 세션 내 imgTried로만 관리해 나중에 재시도 여지를 남긴다)

let mem: Record<string, string> | null = null;

export async function loadImageCache(): Promise<Record<string, string>> {
  if (mem) return mem;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    mem = raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    mem = {};
  }
  return mem;
}

export async function saveImageToCache(spotId: string, url: string): Promise<void> {
  const cache = await loadImageCache();
  cache[spotId] = url;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // 저장 실패해도 메모리 캐시는 유지 — 다음 저장 때 함께 재시도됨
  }
}

// 테스트 전용: 모듈 메모리 캐시 초기화
export function __resetImageCacheForTest(): void {
  mem = null;
}
