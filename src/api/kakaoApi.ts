import axios from 'axios';
import { KAKAO_API_KEY } from '../constants/apiKeys';
import { Spot } from '../types';

const CATEGORY_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/category.php';
const RESTAURANT_CATEGORY_CODE = 'FD6'; // 음식점
const CAFE_CATEGORY_CODE = 'CE7'; // 카페

interface KakaoCategoryDocument {
  id: string;
  place_name: string;
  distance: string;
  x: string; // 경도
  y: string; // 위도
}

// TourAPI에는 잘 안 잡히는 소규모·신생 카페를 보완하기 위한 제주도 권역별 검색 중심점
const JEJU_HUBS = [
  { lat: 33.4996, lon: 126.5312 }, // 제주시
  { lat: 33.2541, lon: 126.5600 }, // 서귀포
  { lat: 33.4390, lon: 126.9229 }, // 성산(동쪽)
  { lat: 33.3925, lon: 126.2376 }, // 한림(서쪽)
];
const HUB_SEARCH_RADIUS = 20000; // 카카오 로컬 API 최대 반경(20km)

// API 키 미설정 또는 응답 없음 시 사용할 fallback
const FALLBACK_OPTIONS: Record<'lunch' | 'dinner', string[]> = {
  lunch: ['흑돼지 두루치기', '갈치조림 정식', '한치물회'],
  dinner: ['성게국수', '옥돔구이 정식', '해물탕'],
};

// 좌표 기준 반경 내 음식점 검색 — generateTimeline의 식사 옵션으로 사용
export async function fetchNearbyRestaurants(
  lat: number,
  lon: number,
  meal: 'lunch' | 'dinner',
  radiusMeters = 1500,
  limit = 3,
): Promise<string[]> {
  if (!KAKAO_API_KEY) return FALLBACK_OPTIONS[meal];

  try {
    const res = await axios.get(CATEGORY_SEARCH_URL, {
      headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
      params: {
        category_group_code: RESTAURANT_CATEGORY_CODE,
        x: lon.toString(),
        y: lat.toString(),
        radius: radiusMeters,
        sort: 'distance',
        size: limit,
      },
      timeout: 8000,
    });
    const documents: KakaoCategoryDocument[] = res.data?.documents ?? [];
    if (!documents.length) return FALLBACK_OPTIONS[meal];
    return documents.map(d => d.place_name);
  } catch {
    return FALLBACK_OPTIONS[meal];
  }
}

function categoryEmoji(): string {
  return '☕';
}

async function fetchCafesNearHub(hub: { lat: number; lon: number }): Promise<KakaoCategoryDocument[]> {
  try {
    const res = await axios.get(CATEGORY_SEARCH_URL, {
      headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
      params: {
        category_group_code: CAFE_CATEGORY_CODE,
        x: hub.lon.toString(),
        y: hub.lat.toString(),
        radius: HUB_SEARCH_RADIUS,
        sort: 'accuracy',
        size: 15,
      },
      timeout: 8000,
    });
    return res.data?.documents ?? [];
  } catch {
    return [];
  }
}

// TourAPI 명소 목록을 보완하기 위한 제주 전역 카페 검색 — SpotSelectScreen에서 '미식' 테마 선택 시 사용
export async function fetchJejuCafes(): Promise<Spot[]> {
  if (!KAKAO_API_KEY) return [];

  const results = await Promise.all(JEJU_HUBS.map(fetchCafesNearHub));
  const seen = new Set<string>();
  const spots: Spot[] = [];

  for (const doc of results.flat()) {
    if (seen.has(doc.id)) continue;
    seen.add(doc.id);
    spots.push({
      id: `kakao-${doc.id}`,
      name: doc.place_name,
      category: 'food',
      foodType: 'cafe',
      lat: parseFloat(doc.y) || 0,
      lon: parseFloat(doc.x) || 0,
      durationMinutes: 60,
      emoji: categoryEmoji(),
      tags: [],
    });
  }
  return spots;
}
