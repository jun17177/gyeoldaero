# 결대로 (Gyeoldaero) — AI 에이전트 프로젝트 가이드

> 마지막 갱신: 2026-10-15 (네이버 지도 기반 버전이 `main`)

## 프로젝트 개요
- **앱 이름**: 결대로 (Gyeoldaero)
- **슬로건**: 당신의 결을 따라, 여행의 결을 설계합니다
- **플랫폼**: React Native + Expo (iOS / Android, 웹은 보조)
- **언어**: TypeScript (strict mode)
- **MVP 지역**: 제주도
- **팀**: 주해든 · 김태겸 · 조현준
- **핵심 가치**: 여행 취향과 제약 조건(짐·날씨·시간)을 입력하면 AI가 최적 동선과 적정 기간을 자동으로 설계하는 제주 여행 AI 동선 플래너

---

## 코드 작성 원칙

- 모든 코드는 **TypeScript**로 작성한다. `any` 타입 사용 금지.
- 타입은 반드시 `src/types/index.ts`에서 import해서 사용한다. (이 문서에 타입을 복사해 두지 않는다 — 항상 원본을 본다)
- 컬러는 반드시 `src/constants/theme.ts`의 `colors` 객체를 사용한다. 하드코딩 금지.
- `SafeAreaView`는 `react-native-safe-area-context`에서 import한다. (`react-native`의 것은 deprecated)
- 새 화면을 추가하면 반드시 `src/types/index.ts`의 `RootStackParamList`와 `App.tsx`에도 등록한다.
- 주석은 WHY가 명확할 때만 작성한다. WHAT을 설명하는 주석은 작성하지 않는다.
- **API 키를 코드나 문서에 적지 않는다.** 키는 `.env`(`EXPO_PUBLIC_*`)에만 둔다. 앱은 `process.env`로 읽는다.
- 외부 호출이 실패해도 앱이 멈추면 안 된다. 서버·AI·지도·날씨는 모두 폴백(알고리즘, 시드, 직선 지도, mock 표시)을 가진다.

---

## 기술 스택

### Frontend
- React Native 0.86 + Expo SDK 57 (React 19)
- TypeScript 6
- React Navigation v7 (Stack Navigator)
- react-native-safe-area-context, react-native-svg, react-native-webview
- AsyncStorage (일정·사진 캐시), Axios

### Backend (`server/`)
- Node.js + Express + zod, Claude API(`@anthropic-ai/sdk`) 프록시
- 비짓제주 명소 수집 + 스냅샷, `PLANNER_TOKEN` 인증, CORS 출처 제한
- Render 무료 플랜 배포 (`render.yaml`)

### 외부 API
- 비짓제주 — 명소 목록·사진 (서버 경유)
- 네이버 클라우드 Maps — 지오코딩·길찾기·지도 (`src/api/naverMapApi.ts`)
- Open-Meteo — 날씨 10일 예보, 키 불필요 (`src/api/weatherApi.ts`)
- 한국관광공사 TourAPI — 서버 주소가 없을 때만 쓰는 폴백 (`src/api/tourApi.ts`)
- Claude — 자동 설정·동선 설계·명소 추천 (서버 경유)
- ~~기상청 단기예보~~, ~~카카오 로컬~~ — 더 이상 쓰지 않음 (Open-Meteo·네이버로 교체)

### 핵심 알고리즘 (`src/algorithms/`)
- `haversine.ts` — GPS 두 좌표 간 거리
- `nearestNeighbor.ts` — TSP 최근접 이웃 경로
- `timeBudget.ts` — 여행 일수 산출 (짐 계수 × 날씨·계절 계수, 날씨는 오늘 날씨 기준)
- `travelTime.ts` — 명소 간 이동시간 추정
- `generateTimeline.ts` — `DayPlan[]` 생성 (식사·이동·숙소 슬롯 포함)
- `aiTimeline.ts` — 서버 AI의 날짜별 배정을 타임라인으로 변환
- `planTrip.ts` — AI 설계 시도 → 실패 시 알고리즘으로 폴백

---

## 폴더 구조

```
gyeoldaero/
├── App.tsx                        # 앱 진입점, Stack Navigator 설정
├── src/
│   ├── screens/                   # 화면 12개 (아래 표)
│   ├── components/                # SpotCard, RangeSlider, WaveLogo, StateView,
│   │                              # AiRecommendations, RouteMapWebView(.web)
│   ├── algorithms/                # 위 알고리즘 + __tests__
│   ├── api/                       # server(AI)·visitJeju·naverMap·weather·tour·mealRecommend
│   ├── storage/                   # scheduleStorage, imageCache
│   ├── utils/                     # date, mergeSpots, seasonScore, shareSchedule, spotPhoto ...
│   ├── types/index.ts             # 모든 타입 정의
│   ├── constants/                 # theme, themeProfiles, config, apiKeys, naverApiKeys
│   └── data/jejuSpots.ts          # 엄선 시드 명소 59곳
├── server/                        # 백엔드 (src/planner, routes, llm, tests)
└── app_des/                       # 디자인 시안 PNG
```

---

## 화면 구성 및 네비게이션

| ID | 화면 | 역할 |
|---|---|---|
| S1 | `SplashScreen` | 스플래시 후 `SavedList`로 이동 |
| S0 | `SavedListScreen` | 저장된 일정 목록 |
| S6 | `SavedDetailScreen` | 저장 상세·지도·공유·삭제 |
| S2 | `HomeScreen` | 직접 설정 / 자동 설정 |
| S2a | `AutoSetupScreen` | 자연어 → 여행 조건(AI) |
| S3a | `TravelStyleScreen` | 테마·계절 (날씨는 S4에서 Open-Meteo로 채움) |
| S3b | `DetailConditionScreen` | 시간·인원·예산·짐·도착/출발 |
| S4 | `SpotSelectScreen` | 명소 선택·숙소·AI 추천 |
| S5 | `TimelineScreen` | 타임라인·편집·맛집·저장 |
| S5_2 | `WeatherScreen` | 10일 예보·출발일 선택 → 저장 |
| S5_3 | `RouteMapScreen` | 지도 동선 |
| S5_1 | `BusinessHoursScreen` | 영업시간 바로가기 |

```
Splash → SavedList → SavedDetail → (Timeline | RouteMap)
SavedList → Home → TravelStyle → DetailCondition → SpotSelect
Home → AutoSetup → (SpotSelect | DetailCondition)
SpotSelect → Timeline → (BusinessHours | RouteMap)
Timeline → Weather (저장 직전 출발일 선택) → SavedList
```

---

## 디자인 시스템

컬러·간격·반경·그림자는 모두 `src/constants/theme.ts`에서 가져온다.

| 토큰 | 값 | 용도 |
|---|---|---|
| primary | `#3D5A73` | 버튼, 헤더, 강조 |
| primaryLight | `#EEF2F6` | 선택 카드 배경 |
| warning | `#D97706` | 식사 타임라인 점 |
| teal | `#0A7B7B` | 숙소 타임라인 점 |

공통 규칙: 버튼 높이 56px / 모서리 14px, 카드 모서리 12~16px, 좌우 패딩 24px (`spacing.xl`), 카드 간 간격 10~12px.
폰트는 Noto Sans KR(본문)과 Noto Serif KR(타이틀·로고)를 쓴다.

---

## 현재 구현 상태

| 항목 | 상태 |
|------|------|
| 화면 12개·전체 흐름 | ✅ 완료 |
| 알고리즘 일정 생성 | ✅ 완료 |
| AI 자동 설정·동선 설계·추천 | ✅ 완료 (실호출은 `PLANNER_TOKEN` 필요) |
| 비짓제주 명소 + 시드 59곳 병합 | ✅ 완료 |
| Open-Meteo 날씨·일정 반영 | ✅ 완료 |
| 네이버 지도·지오코딩·길찾기 | ✅ 완료 (실호출은 네이버 키 필요) |
| 서버 Render 배포, APK 빌드 설정 | ✅ 완료 |
| 테스트 | 앱 26 suites / 140 tests 통과 |

남은 일은 `TODO.md`를 본다.

---

## 작업 시작 전 확인사항

1. `src/types/index.ts` 먼저 확인 — 기존 타입을 재사용한다
2. `src/constants/theme.ts` 확인 — 컬러·간격을 반드시 상수로 사용한다
3. 새 화면 추가 시 `RootStackParamList` + `App.tsx` 동시 업데이트
4. 알고리즘 수정 시 `generateTimeline.ts`와 `aiTimeline.ts`·`planTrip.ts`의 의존 관계 확인, `npm test`로 회귀 확인
5. 명소 데이터 추가 시 `jejuSpots.ts`에 동일한 `Spot` 인터페이스 형식 준수
6. 키가 필요한 기능을 만들었다면 `.env.example`, `README.md`, 저장소 밖 `API_설정_가이드.md`도 함께 갱신
