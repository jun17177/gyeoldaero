import { Spot } from '../types';
import { jejuSpots } from '../data/jejuSpots';
import { fetchJejuSpotsByCategory } from './tourApi';
import { mergeSeedAndApiSpots } from '../utils/mergeSpots';

// 추천 후보 풀: 시드 + (가능하면) 서버의 비짓제주 명소. 서버가 없거나 실패하면 시드만 쓴다.
export async function loadSpotPool(): Promise<Spot[]> {
  try {
    const api = await fetchJejuSpotsByCategory('all');
    return mergeSeedAndApiSpots(jejuSpots, api);
  } catch {
    return jejuSpots;
  }
}
