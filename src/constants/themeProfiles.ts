import { Spot, TripSettings } from '../types';

type ThemeId = TripSettings['themes'][number];

interface ThemeProfile {
  categories: Spot['category'][]; // 테마의 기본 카테고리
  tags: string[];                 // 테마 성격을 드러내는 태그 키워드 (부분 일치)
}

// 테마별 성격 정의 — 카테고리 1:1 하드매핑을 넘어, 태그로 "테마다운" 명소를 골라낸다.
// jejuSpots 시드의 실제 태그 분포를 기준으로 작성.
export const THEME_PROFILES: Record<ThemeId, ThemeProfile> = {
  healing: {
    categories: ['nature'],
    tags: ['힐링', '산책', '숲', '산림욕', '피톤치드', '정원', '수목원', '계곡', '폭포', '오름', '꽃'],
  },
  activity: {
    categories: ['activity'],
    tags: ['체험', '레포츠', '서핑', '카약', '승마', '스쿠버', '집라인', '레일바이크', '트레킹', '등산', '수영'],
  },
  food: {
    categories: ['food'],
    tags: ['맛집', '시장', '흑돼지', '해산물', '고기국수', '물회', '해장국', '별미', '전복'],
  },
  culture: {
    categories: ['culture'],
    tags: ['역사', '박물관', '민속', '전통', '전시', '세계유산', '갤러리', '미술', '건축', '추모'],
  },
  photo: {
    categories: ['photo'],
    tags: ['포토', '사진', '감성', '인생샷', '일몰', '노을', '뷰', '에메랄드', '해안절벽', '꽃밭'],
  },
  night: {
    categories: ['night'],
    tags: ['야경', '일몰', '노을', '야시장', '등대', '전망'],
  },
};

// 명소가 선택 테마들의 성격에 얼마나 부합하는지 (0~4)
// 카테고리 일치 +2, 성격 태그 일치 +2 — 여러 테마 중 가장 높은 점수를 취한다.
export function themeScore(spot: Spot, themes: ThemeId[]): number {
  let best = 0;
  for (const t of themes) {
    const p = THEME_PROFILES[t];
    if (!p) continue;
    let s = 0;
    if (p.categories.includes(spot.category)) s += 2;
    if (spot.tags.some(tag => p.tags.some(k => tag.includes(k)))) s += 2;
    if (s > best) best = s;
    if (best === 4) break;
  }
  return best;
}

// 카테고리 또는 태그 중 하나라도 테마에 닿으면 노출 대상
export function matchesThemes(spot: Spot, themes: ThemeId[]): boolean {
  return themeScore(spot, themes) > 0;
}
