# 결대로 (Gyeoldaero) 프로젝트 정리

> 마지막 갱신: 2026-10-15 — 네이버 지도 기반 버전(구 `태겸_네이버`)을 `main`으로 확정한 시점 기준

## 1. 프로젝트 한눈에 보기

`결대로`는 사용자의 여행 취향과 조건을 바탕으로 제주도 여행 동선을 설계해주는 모바일 여행 플래너 앱입니다.

- 사용자가 선호하는 여행 스타일과 제약(시간·인원·예산·짐·날씨)을 입력한다.
- 제주 명소를 직접 고르거나, 자연어로 말하면 AI가 조건을 채워주고 추천한다.
- 선택된 명소로 여행 일수와 날짜별 동선을 계산한다 (AI 설계, 실패 시 알고리즘).
- 하루 단위 타임라인과 지도로 일정을 보여준다.
- 일정을 앱 내부에 저장하고, 출발일을 고르면 그 구간 예보에 비·눈이 있을 때 실내 명소 중심으로 일정을 다시 설계한다.

구현 형태는 `React Native + Expo` 앱과 `Express` 백엔드(`server/`)입니다.
iOS/Android는 Expo Go 또는 APK로, 웹은 `expo start --web`으로 확인할 수 있습니다.

---

## 2. 해결하려는 문제

- 어디를 갈지 정하는 데 시간이 오래 걸린다.
- 고른 장소들이 실제로 이동 가능한 순서인지 판단하기 어렵다.
- "며칠이 적당한가"를 계산하기 어렵다.
- 식사, 숙소 복귀, 첫날 도착·마지막 날 출발 시각, 짐, 날씨 같은 현실 조건이 빠지기 쉽다.

---

## 3. 현재 구현 상태

| 영역 | 상태 |
|---|---|
| 화면 12개 + 전체 흐름 | 완료 |
| 일정 알고리즘 (거리·이동시간·일수·타임라인) | 완료 |
| AI 자동 설정·동선 설계·명소 추천 (Claude, 서버 경유) | 완료 — 실제 호출은 `PLANNER_TOKEN` 필요 |
| 명소 데이터 (비짓제주 약 3,000곳 + 시드 59곳) | 완료 |
| 날씨 10일 예보 (Open-Meteo) + 일정 반영 | 완료 |
| 네이버 지도 동선·지오코딩·길찾기 | 완료 — 실제 호출은 네이버 키 필요 |
| 일정 저장·상세·공유 | 완료 |
| 백엔드 Render 배포, APK 빌드 설정 | 완료 |
| 테스트 | 앱 31 suites / 200 tests 통과 |

남은 일은 `TODO.md`를 참고하세요. 대표적으로 토큰·지도 키를 갖고 하는 end-to-end 검증이 있습니다.

---

## 4. 기술 스택

| 분류 | 기술 |
|---|---|
| 프레임워크 | React Native 0.86, Expo SDK 57, React 19 |
| 언어 | TypeScript 6 |
| 네비게이션 | `@react-navigation/native` 7, `@react-navigation/stack` 7 |
| 로컬 저장 | `@react-native-async-storage/async-storage` |
| HTTP | axios |
| 지도 | 네이버 지도 (`react-native-webview` / 웹은 대체 화면) |
| 그래픽 | `react-native-svg`, `@expo/vector-icons` |
| 백엔드 | Node.js + Express + `@anthropic-ai/sdk` + zod (`server/`) |
| 테스트 | Jest 29 (+ Testing Library), 서버는 node:test |

---

## 5. 외부 API 구조

| 용도 | 서비스 | 키 | 비고 |
|---|---|---|---|
| 명소 목록·사진 | 비짓제주 (서버가 수집·스냅샷) | 서버 `VISITJEJU_API_KEY` | 앱은 `EXPO_PUBLIC_SERVER_URL`만 필요 |
| 명소 폴백 | 한국관광공사 TourAPI | `EXPO_PUBLIC_TOUR_API_KEY` | 서버 주소가 없을 때만 사용 |
| 날씨 | Open-Meteo | 없음 | 제주 좌표 10일 예보 (`weatherApi.ts`) |
| 지도·지오코딩·길찾기 | 네이버 클라우드 Maps | `EXPO_PUBLIC_NAVER_MAP_API_KEY_ID` / `..._KEY` | 없으면 직선 지도·주소검색 불가 |
| AI | Claude (서버 경유) | 앱: `EXPO_PUBLIC_PLANNER_API_TOKEN`, 서버: `ANTHROPIC_API_KEY` | 토큰이 없으면 AI만 401 |

더 이상 쓰지 않는 서비스: **기상청 단기·중기예보**(발급 키 거절로 항상 mock으로 떨어져 교체), **카카오 로컬 API**(네이버로 교체).

API 키는 모두 `.env`에서 주입합니다. 코드(`src/constants/apiKeys.ts`, `naverApiKeys.ts`)는 `process.env`를 읽을 뿐 값을 담지 않습니다.
설정 방법은 `README.md`와 저장소 밖 `API_설정_가이드.md`를 참고하세요.

---

## 6. 화면 구성

앱 진입점은 `App.tsx`이며 Stack 네비게이션으로 12개 화면이 등록돼 있습니다.

| ID | 화면 | 설명 |
|---|---|---|
| S1 | SplashScreen | 로딩 스플래시, 이후 저장 목록으로 이동 |
| S0 | SavedListScreen | 저장된 일정 목록, 여행 날짜 범위, 10일 예보와 겹치는 일정은 날씨 아이콘 한 줄 + 기온 범위 |
| S6 | SavedDetailScreen | 저장 일정 상세, 지도·편집·공유·삭제, 일차별 날씨, 비·눈 예보 시 "날씨 반영해 조정하기" 안내 |
| S2 | HomeScreen | 직접 설정 / 자동 설정 선택 |
| S2a | AutoSetupScreen | 자연어를 여행 조건으로 변환(AI), 확인 후 진행 |
| S3a | TravelStyleScreen | 테마 6종·계절 (날씨는 S4에서 자동 조회) |
| S3b | DetailConditionScreen | 활동시간·인원·예산·짐·도착/출발 시각(24시간) |
| S4 | SpotSelectScreen | 테마 추천 정렬, 명소 담기, 숙소 선택, AI 추천, 기간 산출 |
| S5 | TimelineScreen | 날짜별 타임라인, 명소 편집, 맛집 선택, 저장 |
| S5_2 | WeatherScreen | 10일 예보에서 출발일 선택, 10일 밖은 달력(오늘~1년 뒤)으로 직접 선택 → 저장 |
| S5_3 | RouteMapScreen | 네이버 지도 동선 |
| S5_1 | BusinessHoursScreen | 명소 영업시간·정보 바로가기 |

### 사용자 흐름

```
Splash → SavedList ─ 카드 탭 → SavedDetail ─ 편집 → Timeline / 지도 → RouteMap
              └─ 새 여행 → Home ─ 직접 설정 → TravelStyle → DetailCondition ┐
                              └─ 자동 설정 → AutoSetup ─┬────────────────────┤
                                                        └→ (바로 SpotSelect) ┤
                                                                    SpotSelect
                                                                        ↓
                                    Timeline ─ BusinessHours / RouteMap
                                        ↓ 저장
                                     Weather(출발일 선택) → SavedList
```

---

## 7. 핵심 기능 설명

### 7.1 취향 기반 일정 설계
테마(`healing`, `activity`, `food`, `culture`, `photo`, `night`)는 명소를 걸러내는 필터가 아니라
**추천 우선순위**입니다(`constants/themeProfiles.ts`). 맞는 명소가 위로 올라오고 "★ 테마 맞춤" 뱃지가 붙지만,
나머지 명소도 전부 선택할 수 있습니다. 계절 점수(`utils/seasonScore.ts`)도 정렬에 반영됩니다.

### 7.2 세부 조건과 보정
활동 시간, 첫날 도착·마지막 날 출발 시각, 인원, 예산, 짐 무게를 입력합니다.
일수와 하루 여유는 **짐 계수 × 날씨 계수 × 계절 계수**로 보정합니다.

| 요소 | 값 |
|---|---|
| 짐 무게 | 가벼움 1.0 / 보통 1.1 / 무거움 1.2 / 매우 무거움 1.4 |
| 날씨 | 맑음·흐림 1.0 / 비 1.2 / 눈 1.3 (계절 계수를 곱함) |

날씨는 API에서 4단계(맑음·흐림·비·눈)로 변환해 쓰므로 제공처에 의존하지 않습니다. 날씨 계수는 **여행 날짜의 예보**로만 구합니다(날짜 구간의 날씨 계수 평균 × 계절 계수, `weatherFactor.ts`). 날짜를 고르기 전(명소 선택·타임라인 단계)에는 날씨 영향 없이 계절 계수만 쓰고, 명소 선택 화면의 "오늘 ☁ 구름" 칩은 참고용입니다. 예전에는 오늘 날씨를 써서 여행 날짜와 무관하게 일수가 부풀려지곤 했습니다.

출발일은 10일 예보 목록에서 고르거나, "10일 이후 날짜 직접 선택" 달력(`TripCalendar`, 오늘부터 1년 뒤까지)에서 고를 수 있습니다. 달력으로 고른 날짜가 10일 예보 안에 온전히 들어오면 예보 선택과 똑같이 처리하고, 예보 밖이면 날짜만 저장합니다(날씨 재설계 없음, 가까워졌을 때 일정을 다시 저장하면 반영).

출발일을 고른 뒤 저장할 때는 별개로, 그 구간 10일 예보에 비·눈이 하루라도 있으면 날짜별 날씨(`weatherByDay`)를 서버 AI 설계에 넘겨 **비·눈 오는 날에 실내 명소가 배정**되도록 일정을 다시 설계합니다(예보 조회 실패 시에는 건너뜀, 재설계에 실패하면 기존 일정을 그대로 저장).

### 7.2-1 비·눈이 오면 (야외 위주 일정)
- 비·눈이어도 야외 명소를 막거나 빼지 않습니다. 명소 칩 옆에는 "실내/야외"만 표시됩니다.
- 출발일이 10일 예보 안에 온전히 들어오고 비·눈이 있으면, 저장할 때 AI가 비·눈 오는 날에 **실내 명소**를 모으고 야외 명소는 맑은 날로 옮깁니다(서버가 검증). 그때의 일수 보정도 그 날짜들의 예보로 구합니다.
- **실내 명소가 비·눈 오는 날 수보다 적으면**(야외 위주) 조정해 봐야 바꿀 자리가 없으므로, 저장 상세에서 "실내 명소 추천 보기"를 보여줍니다. 일정 중심에서 가까운 순, 선택한 테마와 맞으면 앞에 둔 확실한 실내 명소(박물관·미술관·수족관·동굴·카페 등)를 최대 4곳 추천하고, 담으면 편집 화면으로 가서 저장 시 AI가 비 오는 날에 배정합니다.
- 서버·토큰이 없어 AI가 못 돌면 기존 일정을 그대로 두고 날짜만 저장합니다(알림 표시).
- "실내"의 기준: 분류가 문화이거나 태그에 실내·박물관·미술관·전시·시장·카페·수족관·동굴이 있는 곳. 레일바이크·승마·카약 같은 "체험"은 야외입니다.

### 7.3 명소 데이터
- 서버가 비짓제주에서 약 3,000곳을 수집하고, 스냅샷(`spots-snapshot.json.gz`)으로 즉시 응답한 뒤 뒤에서 갱신합니다.
- 앱에는 엄선 시드 59곳(사진 URL 포함)이 있어 서버가 없어도 목록이 비지 않습니다.
- 시드와 API 명소는 이름 유사도로 중복을 제거해 병합합니다(`utils/mergeSpots.ts`).

### 7.4 일정 자동 생성
1. `planTrip.ts`가 서버 AI 설계(`/api/route-plan`)를 먼저 시도합니다. 서버가 시간 한도·누락·중복을 검증하고 필요하면 재시도합니다.
2. 실패하거나 서버가 없으면 `generateTimeline.ts`의 알고리즘으로 대체합니다(최근접 이웃 + 거리 기반 이동시간).
3. 결과 화면에 AI 동선인지 기본 동선인지 표시합니다.

타임라인에는 숙소 출발, 이동, 명소, 점심·저녁 식사, 숙소 복귀(마지막 날은 공항 출발)가 들어가며,
식사 슬롯은 주변 음식점 후보 3개 중에서 고를 수 있습니다.

### 7.5 일정 편집·저장·공유
- 타임라인에서 명소 순서 변경(↑↓), 제거(✕)가 가능하고 기간이 즉시 재계산됩니다.
- 저장 키는 `gyeoldaero_schedules` (AsyncStorage). 새 일정만 저장할 때 이름을 입력하고, 저장된 일정을 편집해 다시 저장하면 이름을 묻지 않고 같은 항목을 갱신합니다. 이름은 저장 목록 카드의 연필 아이콘으로 따로 바꿉니다(제자리 수정, 복제 없음).
- 상세 화면에서 일정 텍스트를 시스템 공유 시트로 내보낼 수 있습니다.

---

## 8. 백엔드 (`server/`)

앱에 Claude API 키를 넣지 않기 위한 프록시이자 비짓제주 수집기입니다.

| 경로 | 용도 |
|---|---|
| `GET /health` | 상태 확인 |
| `GET /api/visitjeju/spots` | 명소 목록 |
| `POST /api/trip-settings` | 자연어 → 여행 조건 |
| `POST /api/route-plan` | 날짜별 방문 배정 |
| `POST /api/recommend-spots`, `/api/trip-comment` | 명소 추천, 일정 코멘트 |

`/api` 아래 AI 경로는 `x-planner-token` 헤더(= `PLANNER_TOKEN`)로 보호됩니다. 배포는 Render 무료 플랜(`render.yaml`)이며
15분 무활동 시 잠들고 깨는 데 약 1분 걸립니다. 자세한 절차는 `README.md`의 "백엔드 서버" 절을 보세요.

---

## 9. 프로젝트 폴더 구조

```text
gyeoldaero/
├── App.tsx, app.json, eas.json, render.yaml, index.ts
├── README.md, TODO.md, PROJECT_OVERVIEW.md, 기록.md, 점검리스트.md, EAS빌드.md, AI_MERGE.md
├── AGENTS.md, CLAUDE.md          # AI 에이전트용 프로젝트 가이드
├── src/
│   ├── algorithms/   # 거리·경로·일수·이동시간·타임라인·AI 변환·planTrip
│   ├── api/          # 서버(AI·비짓제주), 네이버, Open-Meteo, TourAPI
│   ├── components/   # SpotCard, RangeSlider, RouteMapWebView, StateView, WaveLogo 등
│   ├── constants/    # theme, themeProfiles, config, 키 주입
│   ├── data/         # 시드 명소 59곳
│   ├── hooks/        # 폰트 로딩
│   ├── screens/      # 12개 화면
│   ├── storage/      # 일정 저장, 사진 캐시
│   ├── types/        # 공통 타입
│   └── utils/        # 날짜, 명소 병합, 계절 점수, 공유 텍스트 등
├── server/           # Express 백엔드 (planner, routes, llm, 스냅샷, 테스트)
├── assets/           # 아이콘·스플래시
└── app_des/          # 디자인 시안 PNG
```

---

## 10. 개발 환경 세팅

```bash
git clone https://github.com/jun17177/gyeoldaero.git
cd gyeoldaero
npm install
cp .env.example .env     # 값 채우기는 README.md 참고
npx expo start
```

- 실제 기기: Expo Go로 QR 스캔 (같은 WiFi, 또는 `--tunnel`)
- 시뮬레이터: 실행 후 `i`
- 웹: `npx expo start --web` (지도는 대체 화면)
- 맥 없이 발표: `npx eas-cli build --platform android --profile preview` (APK)

---

## 11. 알려진 주의사항

- **키가 없으면 기능이 줄어듭니다.** 플래너 토큰 없음 → AI만 막힘, 네이버 키 없음 → 직선 지도·주소검색 불가.
- **EXPO_PUBLIC_* 값은 번들에 박힙니다.** APK·웹 빌드를 받은 사람이 꺼내 볼 수 있으므로 토큰은 길고 무작위한 값을 쓰고, 지도 키에는 패키지명 제한을 거세요.
- **무료 서버 콜드 스타트.** 발표 직전에 `/health`를 한 번 호출해 깨워두세요.
- **2026-09-10 키 유출 사고.** 키가 적힌 문서를 저장소 안으로 옮겨 data.go.kr 키가 공개 이력에 올라간 적이 있습니다. 키 문서(`API_설정_가이드.md`)는 저장소 밖에 두고 `.gitignore`로 막아 둡니다. 경위는 저장소 밖 `TROUBLESHOOTING.md`에 있습니다.
- **웹 개발 모드의 `Maximum update depth exceeded` 경고.** 명소 약 3,000개 리스트에서 react-native-web 내부 스택에서 나는 것으로 보이며 네이티브 재현 여부는 미확인입니다.

---

## 12. 한 줄 요약

`결대로`는 사용자의 취향과 조건에 맞춰 제주 여행 동선을 AI와 알고리즘으로 설계하고, 날씨와 지도를 반영한 타임라인으로 보여주며, 일정을 저장·공유할 수 있는 Expo 기반 모바일 여행 플래너입니다.
