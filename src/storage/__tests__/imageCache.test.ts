jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    setItem: jest.fn((k: string, v: string) => { store[k] = v; return Promise.resolve(); }),
    getItem: jest.fn((k: string) => Promise.resolve(k in store ? store[k] : null)),
    clear: jest.fn(() => { store = {}; return Promise.resolve(); }),
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadImageCache, saveImageToCache, __resetImageCacheForTest } from '../imageCache';

beforeEach(async () => {
  await (AsyncStorage as unknown as { clear: () => Promise<void> }).clear();
  __resetImageCacheForTest();
});

describe('imageCache', () => {
  it('비어있으면 빈 객체', async () => {
    expect(await loadImageCache()).toEqual({});
  });

  it('저장 → 조회 왕복', async () => {
    await saveImageToCache('bijarim', 'https://img/1.jpg');
    await saveImageToCache('hallasan', 'https://img/2.jpg');
    __resetImageCacheForTest(); // 디스크에서 다시 읽게
    const cache = await loadImageCache();
    expect(cache).toEqual({ bijarim: 'https://img/1.jpg', hallasan: 'https://img/2.jpg' });
  });

  it('손상된 저장 데이터 → 빈 객체로 안전 폴백', async () => {
    await (AsyncStorage.setItem as jest.Mock)('gyeoldaero_spot_images', '{깨진 JSON');
    expect(await loadImageCache()).toEqual({});
  });
});
