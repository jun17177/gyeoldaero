# 결대로 (Gyeoldaero)

> 당신의 결(취향)을 따라, 여행의 결(흐름)을 설계합니다  
> 제주 여행 AI 동선 플래너

---

## 팀원

| 이름 | 역할 |
|------|------|
| 주해든 | - |
| 김태겸 | - |
| 조현준 | - |

---

## 시작하기 (처음 세팅)

### 1. 필수 설치 목록

아래 항목이 없으면 먼저 설치해주세요.

| 도구 | 확인 방법 | 설치 링크 |
|------|-----------|-----------|
| Node.js (v18 이상) | `node -v` | https://nodejs.org |
| Git | `git --version` | https://git-scm.com |
| Expo Go 앱 | 앱스토어 검색 | iOS / Android |

---

### 2. 프로젝트 받기

```bash
git clone https://github.com/jun17177/gyeoldaero.git
cd gyeoldaero
```

---

### 3. 패키지 설치

```bash
npm install
```

> `node_modules` 폴더가 자동 생성됩니다. 시간이 1~2분 걸릴 수 있습니다.

---

### 4. 앱 실행

```bash
npx expo start --tunnel
```

터미널에 QR 코드가 뜨면, **Expo Go 앱**으로 스캔하면 됩니다.

> `--tunnel` 옵션은 같은 와이파이가 아니어도 연결되게 해줍니다.  
> 처음 실행 시 ngrok 설치 여부를 묻는데 **Y** 입력하면 됩니다.

---

## 폴더 구조

```
gyeoldaero/
├── App.tsx                  # 앱 진입점, 네비게이션 설정
├── src/
│   ├── screens/             # 화면 컴포넌트 (8개)
│   │   ├── SplashScreen.tsx         # S1  로딩 스플래시
│   │   ├── SavedListScreen.tsx      # S0  저장된 일정 목록
│   │   ├── HomeScreen.tsx           # S2  홈 (직접/자동 선택)
│   │   ├── TravelStyleScreen.tsx    # S3a 여행 스타일 선택
│   │   ├── DetailConditionScreen.tsx# S3b 세부 조건 설정
│   │   ├── SpotSelectScreen.tsx     # S4  명소 선택
│   │   ├── TimelineScreen.tsx       # S5  결과 타임라인
│   │   └── BusinessHoursScreen.tsx  # S5-1 영업시간 바로가기
│   │
│   ├── components/          # 재사용 컴포넌트
│   │   ├── WaveLogo.tsx             # 결대로 로고 (SVG)
│   │   └── RangeSlider.tsx          # 시간대 슬라이더
│   │
│   ├── algorithms/          # 핵심 알고리즘
│   │   ├── haversine.ts             # GPS 거리 계산
│   │   ├── nearestNeighbor.ts       # 최적 경로 (TSP)
│   │   ├── timeBudget.ts            # 여행 일수 자동 산출
│   │   └── generateTimeline.ts      # 타임라인 자동 생성
│   │
│   ├── data/
│   │   └── jejuSpots.ts             # 제주 명소 시드 데이터 (28개)
│   │
│   ├── storage/
│   │   └── scheduleStorage.ts       # AsyncStorage 저장/불러오기
│   │
│   ├── types/
│   │   └── index.ts                 # TypeScript 타입 정의
│   │
│   └── constants/
│       └── theme.ts                 # 컬러, 간격, 그림자 등 디자인 상수
│
└── app_des/                 # 디자인 시안 PNG 파일들
```

---

## 화면 흐름

```
[S1 스플래시] → [S0 저장목록]
                    │
                    └─ 새로운 여행 시작하기
                            │
                        [S2 홈]
                            │
                    직접 설정 / 자동 설정
                            │
                    [S3a 여행 스타일]
                            │
                    [S3b 세부 조건]
                            │
                    [S4 명소 선택]
                            │
                    [S5 타임라인]
                        │       │
                   일정저장   영업시간확인
                        │       │
                   [S0 목록] [S5-1 바로가기]
```

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | React Native + Expo SDK 54 |
| 언어 | TypeScript |
| 네비게이션 | React Navigation v6 (Stack) |
| 로컬 저장 | AsyncStorage |
| SVG | react-native-svg |
| HTTP | axios |

---

## 개발 협업 방법

### 코드 받아오기 (매일 작업 시작 전)

```bash
git pull origin main
```

### 작업 후 올리기

```bash
git add .
git commit -m "feat: 수정한 내용 간단히 설명"
git push origin main
```

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
npm test                          # 전체
npx jest --selectProjects logic   # 알고리즘·유틸만 (빠름)
npx jest --selectProjects ui      # 화면·컴포넌트 렌더
cd server && npx tsx --test tests/*.test.ts   # 백엔드
```

파일명으로 나뉩니다 — 순수 로직은 `*.test.ts`(Node 환경), 화면 렌더는
`*.test.tsx`(Expo 환경)입니다. 새 테스트를 만들 때 확장자를 맞춰주세요.

---

## 백엔드 서버 (server/)

AI 동선 설계·명소 추천·비짓제주 명소 목록을 담당합니다. Claude API 키를 앱 번들에
넣지 않기 위해 앱이 이 서버를 거쳐 갑니다.

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

### 서버 없이도 동작합니다 (제한적으로)

서버에 연결되지 않으면 앱은 이렇게 동작합니다.

| 기능 | 서버 있을 때 | 서버 없을 때 |
|---|---|---|
| 명소 목록 | 약 3,000곳 | 시드 59곳 (사진 포함) |
| 명소 사진 | 비짓제주 실사진 | 시드에 내장된 실사진 |
| AI 동선 설계 | Claude가 날짜별 배정 | 최근접 이웃 알고리즘 |
| AI 명소 추천 | 취향 맞춤 추천 | 테마·계절 점수 정렬 |
| 자동 설정(자연어) | 동작 | 버튼 비활성 |
| 날씨 | Open-Meteo (키 불필요) | 조회 실패 시 안내 표시 |

시드 59곳은 사진 URL이 데이터에 들어 있어 서버가 없어도 카드가 비지 않습니다.
즉 **서버가 죽어도 일정 설계·저장·지도까지 전부 됩니다.** AI 품질만 떨어집니다.

### 발표 전 점검

- [ ] `ipconfig getifaddr en0`로 현장 IP 확인 → `.env` 갱신 → Expo 재시작
- [ ] `curl http://<IP>:3001/health` 로 서버 응답 확인
- [ ] 서버 첫 요청은 비짓제주 수집에 약 9초 걸립니다. 발표 전에 한 번 호출해
      캐시를 채워두세요 (`curl http://<IP>:3001/api/visitjeju/spots -o /dev/null`)
- [ ] 맥 절전 해제 (서버가 잠들면 앱이 폴백으로 떨어집니다)

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
# fork    https://github.com/kimtaekyum/gyeoldaero.git ← Render 배포용
```

**서버 코드를 고쳐 배포에 반영하려면 두 곳 모두에 푸시해야 합니다.**

```bash
git push origin 태겸:태겸_네이버   # 팀에 공유
git push fork   태겸:태겸_네이버   # Render가 이걸 보고 재배포
```

앱 코드만 고쳤다면 `origin`만으로 충분합니다. Render는 `fork`의
`태겸_네이버` 브랜치가 바뀔 때 자동으로 다시 배포합니다.

### 배포하기 (Render 기준)

LAN IP 의존을 없애려면 서버를 외부에 올리면 됩니다. `server/render.yaml`이
준비돼 있어 저장소만 연결하면 됩니다.

1. [Render](https://render.com) 가입 → **New → Blueprint** → 이 저장소 선택
2. 브랜치를 `태겸_네이버`로 지정하면 루트의 `render.yaml`을 읽어
   `gyeoldaero-server` 서비스가 만들어집니다
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
A. Node.js 버전을 확인해주세요. `node -v`가 18 이상이어야 합니다.

**Q. QR 스캔해도 앱이 안 열려요**  
A. `npx expo start --tunnel`로 실행했는지 확인하세요.

**Q. 코드 수정했는데 앱에 반영이 안 돼요**  
A. Expo Go 앱을 흔들면 나오는 메뉴에서 **Reload** 탭하세요.

**Q. 타입 에러가 뜨는데 어디서 타입을 확인하나요?**  
A. `src/types/index.ts`에 모든 타입이 정의되어 있습니다.
