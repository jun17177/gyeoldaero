import axios from 'axios';
import { Spot } from '../types';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
export const hasVisitJejuServer = Boolean(SERVER_URL);
let cache: { spots: Spot[]; expires: number } | undefined;

// 'visitjeju:CNTS_...' → 비짓제주 상세 페이지 URL
function detailUrl(id: string): string | undefined {
  if (!id.startsWith('visitjeju:')) return undefined;
  return `https://www.visitjeju.net/kr/detail/view?contentsid=${encodeURIComponent(id.slice('visitjeju:'.length))}`;
}
let pending: Promise<Spot[]> | undefined;

export async function fetchVisitJejuSpots(): Promise<Spot[]> {
  if (cache && cache.expires > Date.now()) return cache.spots;
  if (pending) return pending;
  pending = (async () => {
    try {
      // 서버 콜드 스타트가 약 9초라 30초면 충분하다 (이전 90초는 발표 중 화면이 오래 멈춘다)
      const { data } = await axios.get<{ spots: Spot[] }>(`${SERVER_URL}/api/visitjeju/spots`, { timeout: 30000 });
      if (!Array.isArray(data.spots) || !data.spots.length) throw new Error('empty');
      // 영업정보 링크는 서버가 보내지 않고 id에서 조합한다 (응답 222KB 절감)
      const spots = data.spots.map(s => (s.businessHoursUrl ? s : { ...s, businessHoursUrl: detailUrl(s.id) }));
      cache = { spots, expires: Date.now() + 60 * 60 * 1000 };
      return spots;
    } catch { throw new Error('비짓제주 명소 정보를 불러오지 못했습니다.'); }
  })();
  try { return await pending; } finally { pending = undefined; }
}
