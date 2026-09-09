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

const CAFE_CAT3_CODE = 'A05020900'; // TourAPI 음식점 cat3: 카페/전통찻집
const CAFE_NAME_HINTS = ['카페', '커피', 'cafe', 'coffee', '베이커리', '디저트'];

// contenttypeid 39(음식점) 중 카페류는 정찬 개념이 아니므로 일반 명소로 취급하고,
// 그 외는 점심/저녁 동선 배정 대상인 'restaurant'로 분류
function classifyFoodType(item: TourItem): Spot['foodType'] {
  if (item.cat3 === CAFE_CAT3_CODE) return 'cafe';
  const lowerTitle = (item.title ?? '').toLowerCase();
  if (CAFE_NAME_HINTS.some(hint => lowerTitle.includes(hint.toLowerCase()))) return 'cafe';
  return 'restaurant';
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
    foodType: category === 'food' ? classifyFoodType(item) : undefined,
    contentTypeId: item.contenttypeid,
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

export interface SpotDetailInfo {
  overview?: string;
  tel?: string;
  homepage?: string;
  businessHours?: string;
}

// detailIntro2 응답에서 영업시간/이용시간에 해당하는 필드는 contenttypeid별로 이름이 다름
const BUSINESS_HOURS_FIELD: Record<string, string> = {
  '12': 'usetime',        // 관광지
  '14': 'usetime',        // 문화시설
  '15': 'playtime',       // 축제/공연/행사
  '28': 'usetimeleports', // 레포츠
  '32': 'checkintime',    // 숙박
  '38': 'opentime',       // 쇼핑
  '39': 'opentimefood',   // 음식점
};

function stripHtml(text?: string): string | undefined {
  if (!text) return undefined;
  const cleaned = text.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
  return cleaned || undefined;
}

function extractHref(html?: string): string | undefined {
  if (!html) return undefined;
  return html.match(/href=["']([^"']+)["']/)?.[1];
}

// 명소 상세 정보(설명·전화번호·홈페이지·영업시간) 조회 — SpotDetailScreen에서 사용.
// contentId가 TourAPI 출처가 아니면(시드 데이터·카카오 카페) 빈 결과가 돌아옴 — 호출부에서 폴백 처리
export async function fetchSpotDetail(contentId: string, contentTypeId?: string): Promise<SpotDetailInfo> {
  interface CommonItem { overview?: string; tel?: string; homepage?: string; }
  const commonItems = await apiGet<CommonItem>('detailCommon2', {
    contentId,
    defaultYN: 'Y',
    overviewYN: 'Y',
    firstImageYN: 'N',
    areacodeYN: 'N',
    catcodeYN: 'N',
    addrinfoYN: 'N',
    mapinfoYN: 'N',
  });
  const common = commonItems[0];

  let businessHours: string | undefined;
  const field = contentTypeId ? BUSINESS_HOURS_FIELD[contentTypeId] : undefined;
  if (field) {
    const introItems = await apiGet<Record<string, string>>('detailIntro2', {
      contentId,
      contentTypeId: contentTypeId!,
    });
    businessHours = stripHtml(introItems[0]?.[field]);
  }

  return {
    overview: stripHtml(common?.overview),
    tel: common?.tel || undefined,
    homepage: extractHref(common?.homepage),
    businessHours,
  };
}
