# 결대로 (Gyeoldaero)

> 당신의 결(취향)을 따라, 여행의 결(흐름)을 설계합니다  
> 제주 여행 AI 동선 플래너

---

## 팀원

| 이름 | 역할 |
|------|------|
| 주해든 | 백엔드 · 동선 알고리즘 (Haversine, TSP, Time Budget) |
| 김태겸 | 프론트엔드 |
| 조현준 | 기획 · UX 설계 · 디자인 시스템 · 외부 API 연동 |

---

## 시작하기 (처음 받는 사람)

### 1. 필요한 도구

| 도구 | 확인 | 설치 |
| --- | --- | --- |
| Node.js (v20 권장, v18 이상) | `node -v` | https://nodejs.org |
| Git | `git --version` | https://git-scm.com |
| Expo Go (폰) | 앱스토어 검색 | iOS / Android |

### 2. 받아서 실행

```bash
git clone https://github.com/jun17177/gyeoldaero.git
cd gyeoldaero
npm install
cp .env.example .env     # ← 빼먹기 쉬운 단계
npx expo start
```

터미널의 QR을 **Expo Go**로 찍으면 실행됩니다. 기본 브랜치는 `main`이고, 이전 카카오
기반 버전은 `main-kakao-archive`, 2026-10-15 이전의 `main`은 `현준` 브랜치에 보존돼 있습니다.

### `.env`가 왜 따로 필요한가

`.env`는 API 키가 들어 있어 git에 올라가지 않습니다(`.gitignore`). 그래서
클론만으로는 설정이 비어 있고, `.env.example`을 복사해야 합니다.

`.env.example`에는 **서버 주소가 이미 채워져 있습니다**(배포된 주소라 비밀이
아닙니다). 복사만 해도 명소 3,000곳과 날씨는 바로 동작합니다.

### 채워야 하는 값

| 변수 | 없으면 | 구하는 법 |
| --- | --- | --- |
| `EXPO_PUBLIC_PLANNER_API_TOKEN` | AI 기능만 막힘 (401) | 팀 내부 공유 |
| `EXPO_PUBLIC_NAVER_MAP_API_KEY_ID`<br/>`EXPO_PUBLIC_NAVER_MAP_API_KEY` | 지도가 직선 표시, 숙소 주소검색 불가 | 네이버 클라우드 플랫폼 |
| `EXPO_PUBLIC_TOUR_API_KEY` | 서버 주소가 설정돼 있으면 영향 없음 (서버 없이 키만 있을 때만 TourAPI로 명소 조회) | data.go.kr |

토큰은 저장소에 올릴 수 없으니 카톡 등으로 받으세요. 서버의 `PLANNER_TOKEN`과
**글자 하나까지 같아야** 합니다. 키 설정 상세와 취급 규칙은 저장소 밖 `API_설정_가이드.md`를
참고하세요(키가 담긴 문서라 저장소 안으로 옮기지 않습니다).

### 무엇이 없어도 도는가

키를 하나도 안 넣어도 앱은 실행됩니다. 기능만 줄어듭니다.

| 설정 | 명소 | AI 기능 | 날씨 | 지도 |
| --- | --- | --- | --- | --- |
| `.env` 없음 | 59곳 (사진 포함) | 알고리즘 일정 | 동작 | 직선 |
| 예시 복사만 | 3,066곳 | 알고리즘 일정 | 동작 | 직선 |
| \+ 토큰 | 3,066곳 | **동작** | 동작 | 직선 |
| \+ 네이버 키 | 3,066곳 | 동작 | 동작 | **실도로** |

AI가 막혀도 최근접 이웃 알고리즘이 일정을 만들어 주므로 화면 흐름은 끝까지 됩니다.

### 자주 막히는 곳

- **명소가 59곳만 보임** → `.env`가 없거나 서버 주소가 비었습니다
- **AI 추천이 안 뜸** → 토큰이 없거나 서버 값과 다릅니다
- **값을 고쳤는데 그대로** → `npx expo start -c` (환경변수는 번들에 박혀 캐시를 지워야 합니다)
- **첫 로딩이 1분** → 무료 서버가 잠들어 있습니다. 잠시 기다리면 깨어납니다
- **같은 WiFi여야 함** → Expo Go는 맥의 번들러에 붙습니다. 데이터 모드로 쓰려면
  `npx expo start --tunnel`, 맥 없이 쓰려면 APK 빌드(아래)

---

## 폴더 구조

```
gyeoldaero/
├── App.tsx                  # 앱 진입점, 네비게이션 설정
├── src/
│   ├── screens/             # 화면 컴포넌트 (12개)
│   │   ├── SplashScreen.tsx         # S1  로딩 스플래시
│   │   ├── SavedListScreen.tsx      # S0  저장된 일정 목록
│   │   ├── SavedDetailScreen.tsx    # S6  저장 일정 상세·공유·삭제
│   │   ├── HomeScreen.tsx           # S2  홈 (직접 설정 / 자동 설정)
│   │   ├── AutoSetupScreen.tsx      # S2a 자동 설정 (자연어 → 여행 조건, AI)
│   │   ├── TravelStyleScreen.tsx    # S3a 테마·계절 선택
│   │   ├── DetailConditionScreen.tsx# S3b 세부 조건 설정
│   │   ├── SpotSelectScreen.tsx     # S4  명소 선택·숙소·AI 추천
│   │   ├── TimelineScreen.tsx       # S5  결과 타임라인·명소 편집·맛집 선택
│   │   ├── WeatherScreen.tsx        # S5_2 10일 예보·출발일 선택(10일 밖은 달력) → 저장
│   │   ├── RouteMapScreen.tsx       # S5_3 네이버 지도 동선
│   │   └── BusinessHoursScreen.tsx  # S5_1 영업시간 바로가기
│   │
│   ├── components/          # 재사용 컴포넌트
│   │   ├── WaveLogo.tsx             # 결대로 로고 (SVG)
│   │   ├── RangeSlider.tsx          # 시간대 슬라이더
│   │   ├── SpotCard.tsx             # 명소 카드
│   │   ├── AiRecommendations.tsx    # AI 명소 추천 영역
│   │   ├── RouteMapWebView(.web).tsx# 네이버 지도 (네이티브 WebView / 웹은 방문 순서+지도 링크 대체 화면)
│   │   ├── TripCalendar.tsx         # 출발일 선택 월 달력 (기간이 구간으로 칠해짐)
│   │   └── StateView.tsx            # 로딩·에러·빈 상태 공통 뷰
│   │
│   ├── algorithms/          # 핵심 알고리즘
│   │   ├── haversine.ts             # GPS 거리 계산
│   │   ├── nearestNeighbor.ts       # 최적 경로 (TSP 근사)
│   │   ├── timeBudget.ts            # 여행 일수 자동 산출
│   │   ├── travelTime.ts            # 이동 시간 추정
│   │   ├── generateTimeline.ts      # 타임라인 자동 생성
│   │   ├── aiTimeline.ts            # AI 날짜별 배정을 타임라인으로 변환
│   │   └── planTrip.ts              # AI 설계 → 실패 시 알고리즘 폴백
│   │
│   ├── api/                 # 외부 연동 (서버·네이버·Open-Meteo·TourAPI)
│   ├── data/jejuSpots.ts    # 엄선 시드 명소 59곳
│   ├── storage/             # AsyncStorage 일정 저장, 사진 캐시
│   ├── utils/               # 날짜, 명소 병합, 계절 점수, 공유 텍스트 등
│   ├── types/index.ts       # TypeScript 타입 정의
│   └── constants/           # 테마(theme.ts), 테마 프로필, 설정, 키 주입
│
├── server/                  # 백엔드 (Express + Claude 프록시 + 비짓제주 수집)
├── render.yaml              # Render 배포 설정
├── eas.json                 # EAS 빌드 프로필 (APK 등)
└── app_des/                 # 디자인 시안 PNG 파일들
```

---

## 화면 흐름

```
[S1 스플래시] → [S0 저장목록] ─ 카드 탭 → [S6 저장 상세] ─ 지도 → [S5_3 지도]
                    │                          └─ 편집 → [S5 타임라인]
                    └─ 새로운 여행 시작하기
                            │
                        [S2 홈]
                  ┌─────────┴──────────┐
              직접 설정             자동 설정 (AI)
                  │             [S2a 자연어 입력 → 조건 변환]
          [S3a 여행 스타일]              │ (확인 후 바로 S4로 가거나 S3b에서 수정)
                  │                     │
          [S3b 세부 조건] ─────────────┤
                  └─────────┬──────────┘
                      [S4 명소 선택]
                            │
                      [S5 타임라인] ─ 영업시간 → [S5_1]
                            │         └─ 지도   → [S5_3]
                       일정 저장
                            │
                  [S5_2 날씨·출발일 선택] → [S0 목록]
```

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | React Native 0.88 + Expo SDK 58 (React 19) |
| 언어 | TypeScript 6 |
| 네비게이션 | React Navigation v7 (Stack) |
| 로컬 저장 | AsyncStorage |
| 지도 | 네이버 지도 (네이티브 WebView, 웹은 대체 화면), 지오코딩·길찾기 API |
| 날씨 | Open-Meteo (키 불필요, 10일 예보) |
| 명소 데이터 | 비짓제주 API(서버 경유) + 엄선 시드 59곳, TourAPI는 2차 폴백 |
| AI | Claude (서버 경유) — 자동 설정·날짜별 동선 설계·명소 추천 |
| 백엔드 | Node.js + Express (`server/`), Render 무료 플랜 배포 |
| 테스트 | Jest (앱 32 suites / 216 tests), node:test (서버) |

---

## 개발 협업 방법

작업 브랜치는 `main`입니다. 큰 작업은 브랜치를 따서 하고 `main`에는 동작하는 상태만 올려주세요.

### 코드 받아오기 (매일 작업 시작 전)

```bash
git pull origin main
```

### 작업 후 올리기

```bash
git add <바꾼 파일>      # .env·키가 든 파일이 섞이지 않게 git status로 확인
git commit -m "feat: 수정한 내용 간단히 설명"
git push origin main
```

**서버(`server/`)를 고쳤다면** 배포용 포크에도 올려야 반영됩니다(아래 "배포용 포크" 참고).

### 커밋 메시지 규칙

| 태그 | 의미 |
|------|------|
| `feat:` | 새 기능 추가 |
| `fix:` | 버그 수정 |
| `design:` | UI/스타일 수정 |
| `refactor:` | 코드 구조 변경 |
| `docs:` | 문서 수정 |

예시: `feat: S4 명소 검색 필터 추가`

---

## 디자인 시스템 (컬러)

```typescript
primary:      '#3D5A73'  // 백록담 슬레이트 — 버튼, 헤더
primaryLight: '#EEF2F6'  // 설원 안개 — 선택 카드 배경
background:   '#F7F8FA'  // 전체 배경
surface:      '#FFFFFF'  // 카드 배경
text:         '#1C2B38'  // 본문
textMuted:    '#7A8A96'  // 보조 텍스트
warning:      '#D97706'  // 식사 타임라인 점
teal:         '#0A7B7B'  // 숙소 타임라인 점
```

모든 컬러는 `src/constants/theme.ts`에서 가져와 사용하세요.

```typescript
import { colors } from '../constants/theme';
// colors.primary, colors.background ...
```

---

## 테스트

```bash
npm test                          # 전체 (32 suites / 216 tests)
npx jest --selectProjects logic   # 알고리즘·유틸만 (빠름)
npx jest --selectProjects ui      # 화면·컴포넌트 렌더
npx tsc --noEmit                  # 타입 검사
cd server && npm install && npx tsx --test tests/*.test.ts   # 백엔드
```

파일명으로 나뉩니다 — 순수 로직은 `*.test.ts`(Node 환경), 화면 렌더는
`*.test.tsx`(Expo 환경)입니다. 새 테스트를 만들 때 확장자를 맞춰주세요.
서버 테스트는 `server/`에서 `npm install`을 먼저 해야 돌아갑니다.

---

## 발표용 APK 빌드

Expo Go로 실행하면 폰이 맥의 번들러에 붙어야 해서 **같은 WiFi**가 필요합니다
(백엔드를 배포해도 이건 그대로입니다 — 앱 코드를 맥에서 받아오기 때문).
발표처럼 맥 없이 단독 실행해야 하면 APK로 빌드합니다.

```bash
npx eas-cli build --platform android --profile preview
```

빌드는 Expo 클라우드에서 돌고 10~20분 걸립니다. 끝나면 APK 다운로드 링크가
나오고, 폰에서 그 링크를 열어 설치하면 됩니다(안드로이드에서 "출처를 알 수 없는 앱"
설치를 허용해야 할 수 있습니다).

설치한 APK는 **맥과 무관하게 동작**합니다. Render 서버만 살아 있으면 됩니다.
EAS 최초 설정과 iOS 빌드 절차는 `EAS빌드.md`를 참고하세요.

### 환경변수 주의

`.env`는 git에 올라가지 않아 클라우드 빌드가 볼 수 없습니다. 그래서 값을
EAS에 따로 등록해 두었습니다.

```bash
npx eas-cli env:list preview          # 등록된 값 확인
npx eas-cli env:create --scope project --name <이름> --value <값> \
  --environment preview --environment production --visibility plaintext
```

**`.env`를 고쳤으면 EAS 값도 같이 고쳐야** 다음 빌드에 반영됩니다.
특히 서버 주소나 `PLANNER_TOKEN`을 바꿨을 때 놓치기 쉽습니다.

### APK에 담기는 값

`EXPO_PUBLIC_*` 변수는 앱 번들에 그대로 박힙니다. APK를 받은 사람은
네이버 지도 키와 `PLANNER_TOKEN`을 꺼내 볼 수 있습니다(클라이언트 앱의 구조상
피할 수 없습니다). 배포 범위가 넓어지면:

- 네이버 콘솔에서 지도 키에 **패키지명 제한**(`com.gyeoldaero.app`)을 걸어두세요
- `PLANNER_TOKEN`은 길고 무작위한 값을 쓰세요

웹으로 빌드해 배포하는 경우(`npm run build:web`)에도 같은 이유로 키가 번들에 들어갑니다.
그래서 결과물 폴더 `server/public/`은 `.gitignore`로 커밋을 막아 두었습니다.

---

## 백엔드 서버 (server/)

AI 동선 설계·명소 추천·비짓제주 명소 목록을 담당합니다. Claude API 키를 앱 번들에
넣지 않기 위해 앱이 이 서버를 거쳐 갑니다.

| 엔드포인트 | 용도 |
|---|---|
| `GET /health` | 상태 확인 |
| `GET /api/visitjeju/spots` | 비짓제주 명소 목록 (스냅샷 + 백그라운드 갱신) |
| `POST /api/trip-settings` | 자연어 → 여행 조건 변환 (자동 설정) |
| `POST /api/route-plan` | 날짜별 방문 배정 (AI 동선 설계) |
| `POST /api/recommend-spots`, `/api/trip-comment` | 취향 맞춤 명소 추천·일정 코멘트 |

`/api` 아래 AI 경로는 `PLANNER_TOKEN` 헤더로 보호됩니다.
서버 소스는 이 저장소의 `server/` 한 곳에만 있습니다.

```bash
cd server
npm install
cp .env.example .env   # 키를 채운 뒤
npx tsx src/index.ts   # http://localhost:3001
```

앱은 `.env`의 `EXPO_PUBLIC_SERVER_URL`로 이 서버를 찾습니다.

### 실기기에서 쓸 때 — 주소가 바뀝니다

폰에서 `localhost`는 폰 자신을 가리키므로 **맥의 LAN IP**를 넣어야 합니다.

```bash
ipconfig getifaddr en0     # 예: 192.168.0.12
```

```
EXPO_PUBLIC_SERVER_URL=http://192.168.0.12:3001
```

**WiFi가 바뀌면 이 IP도 바뀝니다.** 발표장처럼 네트워크가 달라지는 자리에서는
반드시 현장에서 다시 확인하고 `.env`를 고친 뒤 Expo를 재시작하세요
(환경변수는 번들에 인라인되므로 앱만 새로고침해서는 반영되지 않습니다).
배포된 서버 주소(기본값)를 쓰면 이 문제가 없습니다.

### 서버 없이도 동작합니다 (제한적으로)

서버에 연결되지 않으면 앱은 이렇게 동작합니다.

| 기능 | 서버 있을 때 | 서버 없을 때 |
|---|---|---|
| 명소 목록 | 약 3,000곳 | 시드 59곳 (사진 포함). TourAPI 키가 있으면 TourAPI 결과가 병합됨 |
| 명소 사진 | 비짓제주 실사진 | 시드에 내장된 실사진 |
| AI 동선 설계 | Claude가 날짜별 배정 | 최근접 이웃 알고리즘 |
| AI 명소 추천 | 취향 맞춤 추천 | 테마·계절 점수 정렬 |
| 자동 설정(자연어) | 동작 | 버튼 비활성 |
| 날씨 | Open-Meteo (키 불필요) | 조회 실패 시 안내 표시 |

시드 59곳은 사진 URL이 데이터에 들어 있어 서버가 없어도 카드가 비지 않습니다.
즉 **서버가 죽어도 일정 설계·저장·지도까지 전부 됩니다.** AI 품질만 떨어집니다.

### 발표 전 점검

- [ ] 배포 서버를 쓴다면 `curl https://<주소>/health` 로 깨워두기 (무료 플랜은 첫 응답에 약 1분)
- [ ] 로컬 서버를 쓴다면 `ipconfig getifaddr en0`로 현장 IP 확인 → `.env` 갱신 → Expo 재시작
- [ ] `EXPO_PUBLIC_PLANNER_API_TOKEN`·네이버 지도 키가 `.env`(APK는 EAS 값)에 들어 있는지 확인
- [ ] 맥 절전 해제 (로컬 서버가 잠들면 앱이 폴백으로 떨어집니다)

### 명소 스냅샷 (콜드 스타트 대비)

비짓제주에서 명소 3,000곳을 모으는 데 약 30초가 걸립니다. 서버가 재시작되면
메모리 캐시가 비어 첫 요청이 이 시간을 그대로 기다리게 되는데, 무료 호스팅은
유휴 시 잠들었다 깨므로 이 일이 자주 생깁니다.

그래서 `server/data/spots-snapshot.json.gz`(약 270KB)를 저장소에 담아 두고,
서버는 이걸로 **즉시 응답**한 뒤 최신 데이터를 뒤에서 받아 교체합니다.

```
재시작 직후 첫 요청:  0.05초 · 2,946곳   (스냅샷)
약 10초 뒤:           0.01초 · 3,066곳   (갱신 완료)
```

명소가 크게 바뀌었을 때만 다시 만들면 됩니다.

```bash
cd server && npm run build:snapshot
```

### 배포용 포크 (kimtaekyum/gyeoldaero)

원본 저장소 `jun17177/gyeoldaero`는 개인 소유라 **주인이 아니면 Render 같은
외부 앱을 연결할 수 없습니다**(협업자는 푸시만 가능). 그래서 배포는 포크에서 합니다.

```bash
git remote -v
# origin  https://github.com/jun17177/gyeoldaero.git   ← 팀 공유용
# fork    https://github.com/kimtaekyum/gyeoldaero.git ← Render 배포용 (직접 추가한 사람만)
```

Render는 포크의 **`태겸_네이버` 브랜치**를 보고 재배포하도록 설정돼 있었습니다
(`render.yaml` 주석 기준). 2026-10-15 확인 결과 포크에는 `main`(옛 카카오 버전, `27bb0cd`)과
`태겸_네이버`(`fabe96e`)가 있고, 배포 서버는 정상 응답합니다. 실제로 어느 브랜치를 감시하는지는
Render 대시보드에서 확인하세요.
서버 코드를 고쳐 배포에 반영하려면 두 곳 모두에 푸시해야 합니다.

```bash
git push origin main                 # 팀에 공유
git push fork main:태겸_네이버        # Render가 보는 브랜치명에 맞춰 조정
```

앱 코드만 고쳤다면 `origin`만으로 충분합니다.

### 배포하기 (Render 기준)

LAN IP 의존을 없애려면 서버를 외부에 올리면 됩니다. 저장소 루트의 `render.yaml`이
준비돼 있어 저장소만 연결하면 됩니다.

1. [Render](https://render.com) 가입 → **New → Blueprint** → 배포용 포크 저장소 선택
2. 브랜치를 지정하면 루트의 `render.yaml`을 읽어 `gyeoldaero-server` 서비스가 만들어집니다
3. 대시보드에서 아래 환경변수를 직접 입력합니다 (저장소에 키를 두지 않기 위해
   `sync: false`로 비워 둔 값들입니다)

   | 변수 | 설명 |
   |---|---|
   | `ANTHROPIC_API_KEY` | console.anthropic.com에서 발급 |
   | `VISITJEJU_API_KEY` | 비짓제주 오픈API |
   | `PLANNER_TOKEN` | 아무 긴 문자열. 앱과 **같은 값**을 써야 합니다 |
   | `ALLOWED_ORIGINS` | 웹에서 안 쓰면 비워도 됩니다 |

4. 배포되면 주소(`https://....onrender.com`)를 앱 `.env`에 넣습니다

   ```
   EXPO_PUBLIC_SERVER_URL=https://gyeoldaero-server.onrender.com
   EXPO_PUBLIC_PLANNER_API_TOKEN=<PLANNER_TOKEN과 같은 값>
   ```

5. Expo를 재시작합니다 (환경변수는 번들에 인라인되므로 새로고침만으로는 반영 안 됨)

배포 후 확인:

```bash
curl https://<주소>/health                      # {"ok":true,...}
curl https://<주소>/api/visitjeju/spots -o /dev/null -w "%{time_total}s\n"
```

**무료 플랜은 15분 무활동 시 잠들고 깨는 데 약 1분 걸립니다.** 발표 직전에
한 번 호출해 깨워두세요. 콜드 스타트가 곤란하면 Fly.io·Northflank 같은
콜드 스타트 없는 곳을 쓰면 됩니다 (`render.yaml` 대신 각 플랫폼 설정 필요).

### 배포 시 반드시 설정할 것

- `PLANNER_TOKEN` — 주소만 아는 외부인이 Anthropic 크레딧을 쓰는 것을 막습니다.
  앱 `.env`의 `EXPO_PUBLIC_PLANNER_API_TOKEN`에 같은 값을 넣어야 합니다.
  **둘 중 하나만 넣으면 AI 기능이 401로 막힙니다.**
- `ALLOWED_ORIGINS` — 브라우저에서 호출할 출처를 쉼표로 나열합니다.
  비워두면 모두 허용합니다(로컬 개발 기본값). Expo 네이티브 앱 요청에는
  Origin 헤더가 없어 이 설정과 무관하게 동작합니다.

---

## 자주 묻는 질문

**Q. `npm install` 후 오류가 나요**  
A. Node.js 버전을 확인해주세요. `node -v`가 18 이상이어야 합니다(20 권장).

**Q. QR 스캔해도 앱이 안 열려요**  
A. `npx expo start --tunnel`로 실행했는지 확인하세요.

**Q. 코드 수정했는데 앱에 반영이 안 돼요**  
A. Expo Go 앱을 흔들면 나오는 메뉴에서 **Reload** 탭하세요.

**Q. 타입 에러가 뜨는데 어디서 타입을 확인하나요?**  
A. `src/types/index.ts`에 모든 타입이 정의되어 있습니다.

**Q. 브랜치를 바꿨더니 `.env`나 문서가 사라졌어요**  
A. `.env`는 git이 추적하지 않아 그대로 남습니다. 다만 `src/constants/apiKeys.ts`처럼 추적 파일은
브랜치에 따라 덮어써집니다. 키는 파일에 직접 적지 말고 `.env`에만 두세요.
