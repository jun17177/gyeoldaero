import axios from 'axios';
import { TOUR_API_KEY } from '../constants/apiKeys';
import { Spot } from '../types';
import { fetchVisitJejuSpots, hasVisitJejuServer } from './visitJejuApi';
import { findPhotoMatch } from '../utils/spotPhoto';
import { haversineDistance } from '../algorithms/haversine';

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
  if (!TOUR_API_KEY.trim()) throw new Error('관광 API 키가 설정되지 않았습니다.');
  let res;
  try {
    res = await axios.get(`${BASE_URL}/${endpoint}`, {
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
  } catch (error) {
    // Axios 오류 객체에는 인증키가 담긴 요청 설정이 포함되어 있어 그대로 전달하지 않는다.
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      throw new Error('관광 API 접근이 거절되었습니다. 서비스키와 이용 권한을 확인해주세요.');
    }
    throw new Error('관광 API에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
  const header = res.data?.response?.header;
  if (res.data?.OpenAPI_ServiceResponse || (header?.resultCode !== undefined && String(header.resultCode) !== '0000' && String(header.resultCode) !== '0')) {
    throw new Error('관광 API가 요청을 처리하지 못했습니다. 서비스키와 이용 상태를 확인해주세요.');
  }
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
  if (hasVisitJejuServer) {
    const spots = await fetchVisitJejuSpots();
    return category === 'all' ? spots : spots.filter(s => s.category === category);
  }
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
  return results.flat();
}

// GPS 기반 주변 명소 조회
export async function fetchNearbySpots(
  lat: number,
  lon: number,
  radiusMeters = 5000,
): Promise<Spot[]> {
  if (hasVisitJejuServer) {
    return (await fetchVisitJejuSpots())
      .filter(s => haversineDistance(lat, lon, s.lat, s.lon) * 1000 <= radiusMeters)
      .sort((a, b) => haversineDistance(lat, lon, a.lat, a.lon) - haversineDistance(lat, lon, b.lat, b.lon));
  }
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

// GPS 기반 주변 음식점 조회 — 타임라인 식사 추천에서 사용
export async function fetchNearbyRestaurants(
  lat: number,
  lon: number,
  radiusMeters = 5000,
): Promise<Spot[]> {
  if (hasVisitJejuServer) return (await fetchNearbySpots(lat, lon, radiusMeters)).filter(s => s.category === 'food');
  const items = await apiGet<TourItem>('locationBasedList2', {
    mapX: lon.toString(),
    mapY: lat.toString(),
    radius: radiusMeters.toString(),
    contentTypeId: '39', // 음식점
    arrange: 'S', // 거리순
  });
  return items
    .filter(item => parseFloat(item.mapy) !== 0 && parseFloat(item.mapx) !== 0)
    .map(mapToSpot);
}

// 명소 대표 이미지 조회 — imageUrl 없는 명소를 실제 사진으로 보강할 때 사용.
// TourAPI contentId(숫자 id)면 상세 이미지, 그 외(시드 id)면 이름 키워드 검색. 실패 시 undefined.
export async function fetchSpotImage(spot: Pick<Spot, 'id' | 'name' | 'lat' | 'lon' | 'photoAliases'>): Promise<string | undefined> {
  if (hasVisitJejuServer) {
    try {
      const spots = await fetchVisitJejuSpots();
      const byId = spots.find(s => s.id === spot.id)?.imageUrl;
      // merge 단계와 같은 기준으로 맞춘다 (spotPhoto.findPhotoMatch)
      return byId ?? findPhotoMatch(spot, spots)?.imageUrl;
    } catch { return undefined; }
  }
  interface ImageItem { originimgurl?: string; smallimageurl?: string }
  const detailImage = async (contentId: string): Promise<string | undefined> => {
    const imgs = await apiGet<ImageItem>('detailImage2', { contentId, imageYN: 'Y' });
    return imgs.find(i => i.originimgurl)?.originimgurl ?? imgs[0]?.smallimageurl;
  };

  try {
    if (/^\d+$/.test(spot.id)) {
      const img = await detailImage(spot.id);
      if (img) return img;
    }
    // 주의: searchKeyword2 + areaCode=39 조합은 일부 제주 명소(비자림 등)가 0건으로 나오는
    // TourAPI 데이터 불일치가 있어, 지역필터 없이 검색 후 주소로 제주만 걸러낸다.
    const found = await apiGet<TourItem>('searchKeyword2', { keyword: spot.name });
    const jejuOnly = found.filter(i => (i.addr1 ?? '').includes('제주'));
    const withImage = jejuOnly.find(i => i.firstimage)?.firstimage;
    if (withImage) return withImage;
    // firstimage가 비어도 검색 결과가 있으면 그 contentid의 상세 이미지로 2차 시도
    const first = jejuOnly[0];
    if (first?.contentid) return await detailImage(first.contentid);
    return undefined;
  } catch {
    return undefined;
  }
}

// 명소 홈페이지 URL 조회 — BusinessHoursScreen에서 사용
export async function fetchSpotHomepage(contentId: string): Promise<string | undefined> {
  if (contentId.startsWith('visitjeju:')) return `https://www.visitjeju.net/kr/detail/view?contentsid=${encodeURIComponent(contentId.slice(10))}`;
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
