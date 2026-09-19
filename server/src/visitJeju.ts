import { z } from 'zod';

const itemSchema = z.object({
  contentsid: z.string(), title: z.string(),
  contentscd: z.object({ label: z.string(), value: z.string() }),
  latitude: z.coerce.number(), longitude: z.coerce.number(),
  tag: z.string().nullish(), alltag: z.string().nullish(),
  repPhoto: z.object({ photoid: z.object({ imgpath: z.string().nullish(), thumbnailpath: z.string().nullish() }).nullish() }).nullish(),
});
const pageSchema = z.object({ result: z.union([z.string(), z.number()]), pageCount: z.coerce.number().int().min(0).max(200), items: z.array(z.unknown()) });

export function mapVisitJejuItem(raw: unknown) {
  const parsed = itemSchema.safeParse(raw);
  if (!parsed.success) return null;
  const item = parsed.data;
  if (item.latitude < 33 || item.latitude > 34 || item.longitude < 126 || item.longitude > 127) return null;
  const label = item.contentscd.label;
  if (!['관광지', '음식', '음식점'].includes(label)) return null;
  const tags = (item.tag || item.alltag || '').split(',').map(t => t.trim()).filter(Boolean);
  const category = label.startsWith('음식') ? 'food' as const
    : tags.some(t => /박물관|미술관|전시|역사/.test(t)) ? 'culture' as const
    : tags.some(t => /레저|서핑|승마|액티비티/.test(t)) ? 'activity' as const : 'nature' as const;
  const image = item.repPhoto?.photoid?.thumbnailpath || item.repPhoto?.photoid?.imgpath;
  const imageUrl = image && /^https:\/\//.test(image) ? image : undefined;
  // 사진 없는 명소는 카드가 아이콘만 남아 비어 보이므로 목록에서 제외한다
  // (전체의 0.3% 수준 — 비짓제주 원본에 repPhoto가 없는 항목)
  if (!imageUrl) return null;
  return {
    id: `visitjeju:${item.contentsid}`, name: item.title, category,
    lat: item.latitude, lon: item.longitude, durationMinutes: category === 'food' ? 60 : 90,
    imageUrl, emoji: '', tags,
    // businessHoursUrl은 id에서 그대로 조합할 수 있어 내려보내지 않는다 (전체 222KB 절감).
    // 앱의 visitJejuApi가 받는 즉시 채워 넣는다.
  };
}

type VisitSpot = NonNullable<ReturnType<typeof mapVisitJejuItem>>;
let cache: { spots: VisitSpot[]; expires: number } | undefined;
let pending: Promise<VisitSpot[]> | undefined;

async function fetchPage(page: number) {
  const key = process.env.VISITJEJU_API_KEY?.trim();
  if (!key) throw new Error('visitjeju_not_configured');
  const url = new URL('https://api.visitjeju.net/vsjApi/contents/searchList');
  url.searchParams.set('apiKey', key);
  url.searchParams.set('locale', 'kr');
  url.searchParams.set('page', String(page));
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('visitjeju_upstream_error');
  const data = pageSchema.parse(await response.json());
  if (!['200', '00'].includes(String(data.result))) throw new Error('visitjeju_upstream_error');
  return data;
}

// 비짓제주 API는 한 번 전체를 훑어도 매번 약 10%가 빠진 채로 돌아온다(동시·순차 무관).
// 실측: 1회 2768곳 → 2회 3016곳 → 3회 3066곳에서 수렴. 그래서 한 번 갱신할 때 세 번 훑는다.
const SWEEPS_PER_REFRESH = 3;

async function sweepOnce(): Promise<unknown[]> {
  const first = await fetchPage(1);
  const items = [...first.items];
  // 세 요청씩만 보낸다
  for (let page = 2; page <= first.pageCount; page += 3) {
    const pages = await Promise.all(Array.from({ length: Math.min(3, first.pageCount - page + 1) }, (_, i) => fetchPage(page + i)));
    pages.forEach(p => items.push(...p.items));
  }
  return items;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function absorb(into: Map<string, VisitSpot>, items: unknown[]): void {
  for (const item of items) {
    const spot = mapVisitJejuItem(item);
    if (spot) into.set(spot.id, spot);
  }
}

// 남은 수집을 응답 뒤에 이어서 돌린다. 한 번 훑는 데 10초쯤 걸려서
// 세 번을 다 기다리면 첫 요청이 30초가 된다 — 1회분으로 먼저 응답하고 여기서 채운다.
let toppingUp = false;
function topUpInBackground(): void {
  if (toppingUp) return;
  toppingUp = true;
  void (async () => {
    try {
      for (let i = 1; i < SWEEPS_PER_REFRESH; i++) {
        const merged = new Map((cache?.spots ?? []).map(s => [s.id, s]));
        absorb(merged, await sweepOnce());
        if (merged.size) cache = { spots: [...merged.values()], expires: Date.now() + CACHE_TTL_MS };
      }
    } catch { /* 보충 실패는 무시 — 이미 1회분 결과가 캐시에 있다 */ }
    finally { toppingUp = false; }
  })();
}

export async function getVisitJejuSpots(): Promise<VisitSpot[]> {
  if (cache && cache.expires > Date.now()) return cache.spots;
  if (pending) return pending;
  pending = (async () => {
    // 이전 결과 위에 쌓는다 — 이번 수집이 불완전해도 이미 확보한 명소가 사라지지 않는다
    const merged = new Map((cache?.spots ?? []).map(s => [s.id, s]));
    absorb(merged, await sweepOnce());
    const spots = [...merged.values()];
    if (!spots.length) throw new Error('visitjeju_empty');
    cache = { spots, expires: Date.now() + CACHE_TTL_MS };
    topUpInBackground(); // 나머지 수집분은 응답을 막지 않고 뒤에서 채운다
    return spots;
  })();
  try { return await pending; }
  catch { if (cache) return cache.spots; throw new Error('visitjeju_unavailable'); }
  finally { pending = undefined; }
}
