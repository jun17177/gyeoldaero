# 결대로 (Gyeoldaero) — AI 에이전트 프로젝트 가이드

## 프로젝트 개요
- **앱 이름**: 결대로 (Gyeoldaero)
- **슬로건**: 당신의 결을 따라, 여행의 결을 설계합니다
- **플랫폼**: React Native + Expo (iOS / Android 크로스 플랫폼)
- **언어**: TypeScript (strict mode)
- **MVP 지역**: 제주도
- **팀**: 주해든 · 김태겸 · 조현준
- **핵심 가치**: 여행 취향과 제약 조건(짐·날씨·시간)을 입력하면 AI가 최적 동선과 적정 기간을 자동으로 설계하는 제주 여행 AI 동선 플래너

---

## 코드 작성 원칙

- 모든 코드는 **TypeScript**로 작성한다. `any` 타입 사용 금지.
- 타입은 반드시 `src/types/index.ts`에서 import해서 사용한다.
- 컬러는 반드시 `src/constants/theme.ts`의 `colors` 객체를 사용한다. 하드코딩 금지.
- `SafeAreaView`는 `react-native-safe-area-context`에서 import한다. (`react-native`의 것은 deprecated)
- 새 화면을 추가하면 반드시 `src/types/index.ts`의 `RootStackParamList`와 `App.tsx`에도 등록한다.
- 주석은 WHY가 명확할 때만 작성한다. WHAT을 설명하는 주석은 작성하지 않는다.

---

## 기술 스택

### Frontend
- React Native + Expo SDK 54
- TypeScript
- React Navigation v6 (Stack Navigator)
- react-native-safe-area-context
- react-native-svg (로고, 아이콘 SVG)
- AsyncStorage (로컬 일정 저장)
- Axios (API 통신)

### 핵심 알고리즘 (src/algorithms/)
- `haversine.ts` — GPS 두 좌표 간 거리 계산
- `nearestNeighbor.ts` — TSP 최근접 이웃 경로 최적화
- `timeBudget.ts` — 여행 일수 자동 산출, 교통수단 판별
- `generateTimeline.ts` — DayPlan[] 자동 생성 (식사·이동 슬롯 포함)

### 외부 API (미연동, 추후 구현 예정)
- 한국관광공사 TourAPI — 명소 데이터 (`src/api/tourApi.ts`)
- 카카오 Local API — 맛집·길찾기 (`src/api/kakaoApi.ts`)
- 기상청 단기예보 API — 날씨 (`src/api/weatherApi.ts`)

---

## 폴더 구조

```
gyeoldaero/
├── App.tsx                        # 앱 진입점, Stack Navigator 설정
├── src/
│   ├── screens/                   # 화면 컴포넌트
│   │   ├── SplashScreen.tsx       # S1  스플래시 (2.2초 후 자동 이동)
│   │   ├── SavedListScreen.tsx    # S0  저장된 일정 목록
│   │   ├── HomeScreen.tsx         # S2  홈 (직접/자동 설정 선택)
│   │   ├── TravelStyleScreen.tsx  # S3a 테마·날씨·계절 선택
│   │   ├── DetailConditionScreen.tsx # S3b 시간대·인원·예산·짐 선택
│   │   ├── SpotSelectScreen.tsx   # S4  명소 선택 + 기간 자동 산출
│   │   ├── TimelineScreen.tsx     # S5  타임라인 결과 + 저장
│   │   └── BusinessHoursScreen.tsx # S5-1 영업시간 바로가기 링크
│   ├── components/
│   │   ├── WaveLogo.tsx           # 결대로 SVG 로고 (variant: primary|white)
│   │   └── RangeSlider.tsx        # 시간대 레인지 슬라이더 (PanResponder)
│   ├── algorithms/
│   │   ├── haversine.ts
│   │   ├── nearestNeighbor.ts
│   │   ├── timeBudget.ts
│   │   └── generateTimeline.ts
│   ├── api/                       # 외부 API (추후 구현)
│   │   ├── tourApi.ts
│   │   ├── kakaoApi.ts
│   │   └── weatherApi.ts
│   ├── storage/
│   │   └── scheduleStorage.ts     # AsyncStorage CRUD
│   ├── types/
│   │   └── index.ts               # 모든 타입 정의
│   ├── constants/
│   │   └── theme.ts               # 컬러, spacing, radius, shadows
│   └── data/
│       └── jejuSpots.ts           # 제주 명소 시드 데이터 28개
└── app_des/                       # 디자인 시안 PNG
```

---

## 화면 흐름 및 네비게이션

```
RootStackParamList:
  Splash → SavedList → Home → TravelStyle → DetailCondition → SpotSelect → Timeline → BusinessHours

흐름:
Splash (2.2초) → SavedList
SavedList → Home (새로운 여행 시작하기)
Home → TravelStyle (직접/자동 설정)
TravelStyle → DetailCondition
DetailCondition → SpotSelect
SpotSelect → Timeline
Timeline → SavedList (저장 후)
Timeline → BusinessHours (영업시간 확인)
BusinessHours → Timeline (뒤로)
```

---

## 디자인 시스템

### 컬러 (src/constants/theme.ts)
```typescript
export const colors = {
  primary:      '#3D5A73', // 버튼, 헤더, 강조
  primaryLight: '#EEF2F6', // 선택 카드 배경
  primaryDark:  '#2A3F52', // 눌림 상태
  background:   '#F7F8FA', // 전체 배경
  surface:      '#FFFFFF', // 카드 배경
  text:         '#1C2B38', // 본문
  textMuted:    '#7A8A96', // 보조 텍스트
  border:       '#DDE4EB', // 테두리
  warning:      '#D97706', // 식사 타임라인 점
  danger:       '#DC2626', // 삭제 버튼
  teal:         '#0A7B7B', // 숙소 타임라인 점
};
```

### 공통 규칙
- 버튼 높이: 56px / 모서리: 14px
- 카드 모서리: 12~16px
- 좌우 패딩: 24px (`spacing.xl`)
- 카드 간 간격: 10~12px

---

## 핵심 타입 정의 (src/types/index.ts)

```typescript
interface Spot {
  id: string;
  name: string;
  category: 'nature' | 'culture' | 'food' | 'photo' | 'night';
  lat: number;
  lon: number;
  durationMinutes: number;
  emoji: string;
  tags: string[];
  businessHoursUrl?: string;
}

interface TripSchedule {
  id: string;
  name: string;
  createdAt: string;
  days: number;
  spots: Spot[];
  accommodation: 'airport' | 'jejucity' | 'seogwipo' | 'east' | 'west' | 'custom';
  tags: string[];
  settings: TripSettings;
  dayPlans?: DayPlan[];
}

interface TripSettings {
  themes: ('healing' | 'activity' | 'food' | 'culture' | 'photo' | 'night')[];
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  season: 'spring' | 'summer' | 'fall' | 'winter';
  startTime: number;
  endTime: number;
  firstDayArrival?: number;
  lastDayDeparture?: number;
  people: number;
  budget: number;
  luggage: 'light' | 'medium' | 'heavy' | 'very_heavy';
}

interface TimelineItem {
  type: 'spot' | 'meal' | 'accommodation' | 'move';
  time: string;       // "HH:MM" 형식
  name: string;
  duration: number;   // 분 단위
  dotColor: string;
  options?: string[]; // 식사 선택지
  linkUrl?: string;
}

interface DayPlan {
  day: number;
  items: TimelineItem[];
}
```

---

## 현재 구현 상태

| 항목 | 상태 |
|------|------|
| 전체 화면 8개 | ✅ 완료 |
| 핵심 알고리즘 4개 | ✅ 완료 |
| 제주 명소 시드 데이터 28개 | ✅ 완료 |
| AsyncStorage 저장/불러오기 | ✅ 완료 |
| WaveLogo SVG 컴포넌트 | ✅ 완료 |
| RangeSlider 컴포넌트 | ✅ 완료 |
| 한국관광공사 TourAPI 연동 | ⬜ 미구현 (API 키 필요) |
| 카카오 Local API 연동 | ⬜ 미구현 (API 키 필요) |
| 기상청 API 연동 | ⬜ 미구현 (API 키 필요) |

---

## 작업 시작 전 확인사항

1. `src/types/index.ts` 먼저 확인 — 기존 타입을 재사용한다
2. `src/constants/theme.ts` 확인 — 컬러·간격을 반드시 상수로 사용한다
3. 새 화면 추가 시 `RootStackParamList` + `App.tsx` 동시 업데이트
4. 알고리즘 수정 시 `generateTimeline.ts`의 의존 관계 확인
5. 명소 데이터 추가 시 `jejuSpots.ts`에 동일한 `Spot` 인터페이스 형식 준수
