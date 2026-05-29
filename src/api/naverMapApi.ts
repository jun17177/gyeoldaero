import axios from 'axios';
import { NAVER_MAP_API_KEY, NAVER_MAP_API_KEY_ID } from '../constants/naverApiKeys';

const NAVER_MAP_BASE_URL = 'https://maps.apigw.ntruss.com';

interface NaverApiResponse<T> {
  status: string;
  meta?: {
    totalCount?: number;
    page?: number;
    count?: number;
  };
  addresses?: T[];
  results?: T[];
  errorMessage?: string;
}

interface GeocodeAddress {
  roadAddress?: string;
  jibunAddress?: string;
  englishAddress?: string;
  x: string;
  y: string;
}

interface ReverseGeocodeRegion {
  area0?: { name?: string };
  area1?: { name?: string };
  area2?: { name?: string };
  area3?: { name?: string };
  area4?: { name?: string };
}

interface ReverseGeocodeLand {
  name?: string;
  number1?: string;
  number2?: string;
}

interface ReverseGeocodeResult {
  name?: string;
  region?: ReverseGeocodeRegion;
  land?: ReverseGeocodeLand;
}

interface DirectionRoute {
  summary?: {
    distance?: number;
    duration?: number;
    tollFare?: number;
    taxiFare?: number;
    fuelPrice?: number;
  };
}

interface DirectionResponse {
  code: number;
  message: string;
  currentDateTime?: string;
  route?: {
    traoptimal?: DirectionRoute[];
  };
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  roadAddress?: string;
  jibunAddress?: string;
  englishAddress?: string;
}

export interface ReverseGeocodeResultData {
  fullAddress: string;
  area1?: string;
  area2?: string;
  area3?: string;
  area4?: string;
}

export interface DrivingRouteSummary {
  distanceMeters: number;
  durationMinutes: number;
  tollFare?: number;
  taxiFare?: number;
  fuelPrice?: number;
}

function buildHeaders() {
  return {
    'X-NCP-APIGW-API-KEY-ID': NAVER_MAP_API_KEY_ID,
    'X-NCP-APIGW-API-KEY': NAVER_MAP_API_KEY,
  };
}

function ensureSuccess<T>(data: NaverApiResponse<T>, fallbackMessage: string) {
  if (data.status && data.status !== 'OK') {
    throw new Error(data.errorMessage || fallbackMessage);
  }
}

function compactAddressParts(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ').trim();
}

function formatLandNumber(land?: ReverseGeocodeLand): string | undefined {
  if (!land?.number1) return undefined;
  if (!land.number2) return land.number1;
  return `${land.number1}-${land.number2}`;
}

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const res = await axios.get<NaverApiResponse<GeocodeAddress>>(
    `${NAVER_MAP_BASE_URL}/map-geocode/v2/geocode`,
    {
      headers: buildHeaders(),
      params: { query: trimmed },
      timeout: 10000,
    }
  );

  ensureSuccess(res.data, '네이버 주소 검색에 실패했습니다.');

  const first = res.data.addresses?.[0];
  if (!first) return null;

  return {
    lat: parseFloat(first.y),
    lon: parseFloat(first.x),
    roadAddress: first.roadAddress,
    jibunAddress: first.jibunAddress,
    englishAddress: first.englishAddress,
  };
}

export async function reverseGeocodeCoords(
  lat: number,
  lon: number
): Promise<ReverseGeocodeResultData | null> {
  const res = await axios.get<NaverApiResponse<ReverseGeocodeResult>>(
    `${NAVER_MAP_BASE_URL}/map-reversegeocode/v2/gc`,
    {
      headers: buildHeaders(),
      params: {
        coords: `${lon},${lat}`,
        orders: 'roadaddr,addr',
        output: 'json',
      },
      timeout: 10000,
    }
  );

  ensureSuccess(res.data, '네이버 좌표 역변환에 실패했습니다.');

  const first = res.data.results?.[0];
  if (!first) return null;

  const area1 = first.region?.area1?.name;
  const area2 = first.region?.area2?.name;
  const area3 = first.region?.area3?.name;
  const area4 = first.region?.area4?.name;
  const landName = first.land?.name;
  const landNumber = formatLandNumber(first.land);

  return {
    fullAddress: compactAddressParts([area1, area2, area3, area4, landName, landNumber]),
    area1,
    area2,
    area3,
    area4,
  };
}

export async function geocodeJejuAddress(query: string): Promise<GeocodeResult | null> {
  const normalized = query.includes('제주') ? query : `제주 ${query}`;
  return geocodeAddress(normalized);
}

export async function fetchDrivingRouteSummary(params: {
  start: { lat: number; lon: number };
  goal: { lat: number; lon: number };
}): Promise<DrivingRouteSummary | null> {
  const res = await axios.get<DirectionResponse>(
    `${NAVER_MAP_BASE_URL}/map-direction/v1/driving`,
    {
      headers: buildHeaders(),
      params: {
        start: `${params.start.lon},${params.start.lat}`,
        goal: `${params.goal.lon},${params.goal.lat}`,
        option: 'traoptimal',
      },
      timeout: 10000,
    }
  );

  if (res.data.code !== 0) {
    throw new Error(res.data.message || '네이버 길찾기 조회에 실패했습니다.');
  }

  const summary = res.data.route?.traoptimal?.[0]?.summary;
  if (!summary?.distance || !summary?.duration) return null;

  return {
    distanceMeters: summary.distance,
    durationMinutes: Math.ceil(summary.duration / 1000 / 60),
    tollFare: summary.tollFare,
    taxiFare: summary.taxiFare,
    fuelPrice: summary.fuelPrice,
  };
}
