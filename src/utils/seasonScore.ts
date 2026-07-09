import { Spot } from '../types';

// 계절에 맞는 명소에 높은 점수 부여 → 명소 목록 정렬·자동 담기에 사용
export function seasonScore(spot: Spot, season: string): number {
  const tags = spot.tags;
  switch (season) {
    case 'winter':
      if (['culture', 'food'].includes(spot.category)) return 2;
      if (tags.some(t => ['실내', '수족관', '박물관', '시장', '체험'].includes(t))) return 2;
      if (tags.some(t => ['해변', '수영', '스노클링', '서핑'].includes(t))) return 0;
      return 1;
    case 'summer':
      if (tags.some(t => ['해변', '수영', '서핑', '스쿠버', '스노클링', '에메랄드'].includes(t))) return 2;
      if (['food'].includes(spot.category)) return 1;
      return 1;
    case 'spring':
      if (tags.some(t => ['꽃', '정원', '동백', '녹차', '벚꽃', '봄'].includes(t))) return 2;
      if (tags.some(t => ['산림욕', '숲', '힐링', '피톤치드'].includes(t))) return 2;
      return 1;
    case 'fall':
      if (tags.some(t => ['트레킹', '등산', '산림욕', '숲', '단풍'].includes(t))) return 2;
      return 1;
    default:
      return 1;
  }
}
