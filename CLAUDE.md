# 결대로 (Gyeoldaero) — Claude Code 프로젝트 가이드

## 프로젝트 개요
- **앱 이름**: 결대로 (Gyeoldaero)
- **슬로건**: 당신의 결을 따라, 여행의 결을 설계합니다
- **플랫폼**: React Native + Expo (iOS / Android 크로스 플랫폼)
- **MVP 지역**: 제주도
- **팀**: 주해든 · 김태겸 · 조현준
- **핵심 가치**: 여행 취향과 제약 조건(짐·날씨·시간)을 입력하면 AI가 최적 동선과 적정 기간을 자동으로 설계하는 제주 여행 AI 동선 플래너

---

## 기술 스택

### FrontEnd
- React Native (Expo SDK)
- TypeScript
- React Navigation v6 (화면 전환)
- AsyncStorage (로컬 일정 저장)
- Axios (API 통신)

### BackEnd
- Node.js + Express
- 핵심 알고리즘 (아래 참고)

### 외부 API
- 한국관광공사 TourAPI (명소 데이터)
- 카카오 Local API (맛집·길찾기)
- 기상청 단기예보 API (날씨)

### 데이터베이스
- SQLite (명소 캐시)
- AsyncStorage (일정 로컬 저장)

---

## 디자인 시스템

### 컬러 (반드시 준수)
```typescript
export const colors = {
  primary: '#3D5A73',      // 백록담 슬레이트 — 버튼, 강조, 헤더
  primaryLight: '#EEF2F6', // 설원 안개 — 선택 카드 배경
  primaryDark: '#2A3F52',  // 심설 — 호버, 눌림
  background: '#F7F8FA',   // 눈밭 크림 — 전체 배경
  surface: '#FFFFFF',      // 카드 배경
  text: '#1C2B38',         // 현무암 — 본문
  textMuted: '#7A8A96',    // 돌담 — 보조 텍스트
  border: '#DDE4EB',       // 서리 — 테두리
  warning: '#D97706',      // 오름 — 식사 타임라인 점
  danger: '#DC2626',       // 한란 — 삭제 버튼
  teal: '#0A7B7B',         // 숙소 타임라인 점
};
```

### 폰트
- 본문: `Noto Sans KR` (Regular, Medium, Bold)
- 타이틀/로고: `Noto Serif KR` (Bold)

### 공통 스타일 규칙
- 버튼 높이: 56px, 모서리 반경: 14px
- 카드 모서리 반경: 12~16px
- 좌우 패딩: 24px
- 카드 간 간격: 10~12px

---

## 화면 구성 (총 8개 화면)

| 화면 ID | 컴포넌트명 | 설명 |
|---|---|---|
| S0 | `SavedListScreen` | 앱 진입 첫 화면. 저장 일정 리스트 또는 빈 상태+슬로건 |
| S1 | `SplashScreen` | 앱 로딩 스플래시 |
| S2 | `HomeScreen` | 직접 설정 / 자동 설정 선택 |
| S3a | `TravelStyleScreen` | 테마(6종)·날씨·계절 선택 |
| S3b | `DetailConditionScreen` | 활동시간·인원·예산·짐무게·첫날도착·마지막날출발 |
| S4 | `SpotSelectScreen` | 명소 카드 담기, 기간 자동 산출, 숙소 선택 |
| S5 | `TimelineScreen` | 최적 일정 타임라인, 맛집 선택, 저장 |
| S6 | `SavedDetailScreen` | 저장된 일정 상세 보기 + 영업중 링크 |

### 화면 흐름
```
S0 (저장된 일정)
  ├─ 카드 탭 → S5 (결과 타임라인 불러오기)
  └─ "새로운 여행 시작하기" → S2 (홈)

S2 (홈)
  ├─ 직접 설정 → S3a
  └─ 자동 설정 → S3a

S3a → S3b → S4 → S5

S5
  ├─ 💾 일정 저장 → S0
  └─ ← 다시 선택 → S4
```

---

## 핵심 알고리즘

### 1. Haversine 공식 (두 GPS 좌표 간 거리)
```typescript
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

### 2. Nearest Neighbor 경로 최적화 (TSP)
```typescript
export function nearestNeighbor(
  spots: Spot[],
  startLat: number,
  startLon: number
): Spot[] {
  const unvisited = [...spots];
  const route: Spot[] = [];
  let curLat = startLat, curLon = startLon;
  while (unvisited.length > 0) {
    let minDist = Infinity, minIdx = 0;
    unvisited.forEach((s, i) => {
      const d = haversineDistance(curLat, curLon, s.lat, s.lon);
      if (d < minDist) { minDist = d; minIdx = i; }
    });
    const next = unvisited.splice(minIdx, 1)[0];
    route.push(next);
    curLat = next.lat;
    curLon = next.lon;
  }
  return route;
}
```

### 3. Time Budget 기간 산출
```typescript
export function calcTripDays(params: {
  spots: Spot[];
  startTime: number;          // 하루 활동 시작 (예: 9)
  endTime: number;            // 하루 활동 종료 (예: 19)
  firstDayArrival?: number;   // 첫날 도착 시각
  lastDayDeparture?: number;  // 마지막날 출발 시각
  luggage: 'light' | 'medium' | 'heavy' | 'very_heavy';
  weatherFactor?: number;     // 날씨 보정계수 기본 1.0
}): number {
  const dailyMinutes = (params.endTime - params.startTime) * 60;
  const mealTime = 120;
  const bufferTime = 30;
  const luggageFactor = { light:1.0, medium:1.1, heavy:1.2, very_heavy:1.4 }[params.luggage];
  const wf = params.weatherFactor ?? 1.0;

  let total = params.spots.reduce((s, sp) => s + sp.durationMinutes, 0);
  total += Math.max(params.spots.length - 1, 0) * 20; // 이동시간
  total += mealTime + bufferTime;
  total *= luggageFactor * wf;

  const firstDay = params.firstDayArrival
    ? (params.endTime - params.firstDayArrival) * 60
    : dailyMinutes;
  const lastDay = params.lastDayDeparture
    ? (params.lastDayDeparture - params.startTime) * 60
    : dailyMinutes;

  if (total <= firstDay) return 1;
  const remaining = total - firstDay - lastDay;
  if (remaining <= 0) return 2;
  return Math.ceil(remaining / dailyMinutes) + 2;
}
```

### 4. 짐 무게 교통수단 필터링
```typescript
export const getTransportMode = (luggage: string): 'transit' | 'car' =>
  ['light', 'medium'].includes(luggage) ? 'transit' : 'car';
```

---

## 데이터 타입 정의

```typescript
// 명소
export interface Spot {
  id: string;
  name: string;
  category: 'nature' | 'culture' | 'food' | 'photo' | 'night';
  lat: number;
  lon: number;
  durationMinutes: number;
  imageUrl?: string;
  tags: string[];
  businessHoursUrl?: string;
}

// 여행 일정
export interface TripSchedule {
  id: string;
  name: string;
  createdAt: string;
  days: number;
  spots: Spot[];
  accommodation: 'airport' | 'jejucity' | 'seogwipo' | 'east' | 'west' | 'custom';
  tags: string[];
  settings: TripSettings;
}

// 여행 설정
export interface TripSettings {
  themes: ('healing' | 'activity' | 'food' | 'culture' | 'photo' | 'night')[];
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  season: 'spring' | 'summer' | 'fall' | 'winter';
  startTime: number;           // 활동 시작 시각
  endTime: number;             // 활동 종료 시각
  firstDayArrival?: number;    // 첫날 도착 시각
  lastDayDeparture?: number;   // 마지막날 출발 시각
  people: number;
  budget: number;              // 하루 교통 예산 (만원)
  luggage: 'light' | 'medium' | 'heavy' | 'very_heavy';
}

// 타임라인 아이템
export interface TimelineItem {
  type: 'spot' | 'meal' | 'accommodation' | 'move';
  time: string;
  name: string;
  duration: number;
  dotColor: string;  // primary=명소, warning=식사, teal=숙소
  options?: string[]; // 식사 선택지 (최대 3개)
  linkUrl?: string;
}

// 하루 일정
export interface DayPlan {
  day: number;
  items: TimelineItem[];
}
```

---

## 폴더 구조 (권장)

```
gyeoldaero/
├── app/                    # Expo Router or React Navigation
│   ├── (tabs)/
│   └── ...
├── src/
│   ├── screens/            # 화면 컴포넌트
│   │   ├── SavedListScreen.tsx
│   │   ├── SplashScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── TravelStyleScreen.tsx
│   │   ├── DetailConditionScreen.tsx
│   │   ├── SpotSelectScreen.tsx
│   │   ├── TimelineScreen.tsx
│   │   └── SavedDetailScreen.tsx
│   ├── components/         # 공통 컴포넌트
│   │   ├── SpotCard.tsx
│   │   ├── TimelineRow.tsx
│   │   ├── SavedCard.tsx
│   │   ├── ThemeTile.tsx
│   │   └── PrimaryButton.tsx
│   ├── algorithms/         # 핵심 알고리즘
│   │   ├── haversine.ts
│   │   ├── nearestNeighbor.ts
│   │   └── timeBudget.ts
│   ├── api/                # 외부 API 연동
│   │   ├── tourApi.ts
│   │   ├── kakaoApi.ts
│   │   └── weatherApi.ts
│   ├── storage/            # AsyncStorage 관리
│   │   └── scheduleStorage.ts
│   ├── types/              # TypeScript 타입
│   │   └── index.ts
│   ├── constants/          # 컬러, 폰트 등
│   │   └── theme.ts
│   └── data/               # 제주 명소 시드 데이터
│       └── jejuSpots.ts
├── assets/
├── CLAUDE.md               # 이 파일
└── package.json
```

---

## S0 저장된 일정 화면 상세 스펙

### 일정 있는 상태
- 상단: "저장된 일정" (Noto Serif KR Bold 26px)
- 리스트 카드: 이모지 썸네일 + 기간 뱃지 + 제목 + 저장일·명소 수 + 태그
- 하단: "새로운 여행 시작하기" 버튼 (primary)

### 빈 상태 (첫 실행)
- 결대로 로고 (물결 + 텍스트)
- "아직 저장된 일정이 없어요" 텍스트
- 슬로건: "당신의 결대로 여행의 한 페이지를 채워주세요"
- 하단: "새로운 여행 시작하기" 버튼

---

## 개발 우선순위

1. **프로젝트 초기 세팅** (Expo + TypeScript + Navigation)
2. **타입 정의 & 테마 상수** (types/index.ts, constants/theme.ts)
3. **핵심 알고리즘** (algorithms/)
4. **제주 명소 시드 데이터** (data/jejuSpots.ts)
5. **화면 구현** (S0 → S1 → S2 → S3a → S3b → S4 → S5 → S6)
6. **AsyncStorage 저장/불러오기**
7. **외부 API 연동** (TourAPI, 카카오, 기상청)
8. **통합 테스트 & QA**
