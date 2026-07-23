import axios from 'axios';
import { TOUR_API_KEY } from '../constants/apiKeys';
import { Spot } from '../types';

const BASE_URL = 'https://apis.data.go.kr/B551011/KorService2';
const AREA_CODE_JEJU = '39';

interface TourItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1: string;
  firstimage: string;
  firstimage2: string;
  mapy: string;
  mapx: string;
  cat1: string;
  cat2: string;
  cat3: string;
}

function mapCategory(typeId: string): Spot['category'] {
  if (typeId === '14') return 'culture';
  if (typeId === '39') return 'food';
  if (typeId === '28') return 'activity';
  return 'nature';
}

function categoryEmoji(cat: Spot['category']): string {
  const map: Record<Spot['category'], string> = {
    nature: '🏝️', activity: '🏄', culture: '🏛️', food: '🍴', photo: '📸', night: '🌙',
  };
  return map[cat];
}

function estimateDuration(typeId: string): number {
  if (typeId === '39') return 60;
  if (typeId === '28') return 120;
  return 90;
}

function extractTags(item: TourItem): string[] {
  const parts = (item.addr1 ?? '').split(' ');
  // e.g. "제주특별자치도 서귀포시 중문동" → ["중문동"]
  return parts.length >= 3 ? [parts[2]] : [];
}

function mapToSpot(item: TourItem): Spot {
  const category = mapCategory(item.contenttypeid);
  return {
    id: item.contentid,
    name: item.title,
    category,
    lat: parseFloat(item.mapy) || 0,
    lon: parseFloat(item.mapx) || 0,
    durationMinutes: estimateDuration(item.contenttypeid),
    imageUrl: item.firstimage || item.firstimage2 || undefined,
    emoji: categoryEmoji(category),
    tags: extractTags(item),
  };
}

async function apiGet<T>(endpoint: string, params: Record<string, string>): Promise<T[]> {
  const res = await axios.get(`${BASE_URL}/${endpoint}`, {
    params: {
      serviceKey: TOUR_API_KEY,
      MobileOS: 'ETC',
      MobileApp: '결대로',
      _type: 'json',
      numOfRows: '50',
      pageNo: '1',
      ...params,
    },
    timeout: 10000,
  });
  const body = res.data?.response?.body;
  if (!body?.items?.item) return [];
  const items = body.items.item;
  return Array.isArray(items) ? items : [items];
}

async function fetchByTypeId(contentTypeId: string): Promise<Spot[]> {
  const items = await apiGet<TourItem>('areaBasedList2', {
    areaCode: AREA_CODE_JEJU,
    contentTypeId,
    arrange: 'P',
  });
  return items
    .filter(item => parseFloat(item.mapy) !== 0 && parseFloat(item.mapx) !== 0)
    .map(mapToSpot);
}

// 필터 탭별 제주 명소 조회 — SpotSelectScreen에서 사용
export async function fetchJejuSpotsByCategory(
  category: 'all' | Spot['category'],
): Promise<Spot[]> {
  const typeMap: Record<string, string[]> = {
    all:      ['12', '14', '28', '39'],
    nature:   ['12'],
    activity: ['28'],
    culture:  ['14'],
    food:     ['39'],
    photo:    ['12'],
    night:    ['12'],
  };
  const results = await Promise.all(
    (typeMap[category] ?? ['12']).map(id => fetchByTypeId(id)),
  );
  const spots = results.flat();
  // photo·night은 TourAPI 전용 타입이 없어 관광지(12)에서 가져오므로 카테고리를 강제 설정
  if (category === 'photo' || category === 'night') {
    return spots.map(s => ({ ...s, category: category as Spot['category'], emoji: categoryEmoji(category as Spot['category']) }));
  }
  return spots;
}

// GPS 기반 주변 명소 조회
export async function fetchNearbySpots(
  lat: number,
  lon: number,
  radiusMeters = 5000,
): Promise<Spot[]> {
  const items = await apiGet<TourItem>('locationBasedList2', {
    mapX: lon.toString(),
    mapY: lat.toString(),
    radius: radiusMeters.toString(),
    arrange: 'S', // 거리순
  });
  return items
    .filter(item => parseFloat(item.mapy) !== 0 && parseFloat(item.mapx) !== 0)
    .map(mapToSpot);
}

// 명소 홈페이지 URL 조회 — BusinessHoursScreen에서 사용
export async function fetchSpotHomepage(contentId: string): Promise<string | undefined> {
  interface DetailItem { homepage?: string; }
  const items = await apiGet<DetailItem>('detailCommon2', {
    contentId,
    defaultYN: 'Y',
    firstImageYN: 'N',
    areacodeYN: 'N',
    catcodeYN: 'N',
    addrinfoYN: 'N',
    mapinfoYN: 'N',
    overviewYN: 'N',
  });
  if (!items.length) return undefined;
  const html = items[0].homepage ?? '';
  const match = html.match(/href=["']([^"']+)["']/);
  return match?.[1];
}
