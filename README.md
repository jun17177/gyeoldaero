## 프로젝트 소개

제주도 여행 일정을 사용자가 원하는 순서로 직접 구성하면, AI가 각 장소 간 이동 시간을 계산해 최적 동선을 짜주는 여행 플래너입니다.

- 명소를 선택하면 최근접 이웃 알고리즘(TSP)으로 동선을 자동 최적화
- 여행 일수에 맞춰 시간 배분을 자동 산출
- 날씨 조건에 따라 야외 명소를 자동 필터링


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

## 자주 묻는 질문

**Q. `npm install` 후 오류가 나요**  
A. Node.js 버전을 확인해주세요. `node -v`가 18 이상이어야 합니다.

**Q. QR 스캔해도 앱이 안 열려요**  
A. `npx expo start --tunnel`로 실행했는지 확인하세요.

**Q. 코드 수정했는데 앱에 반영이 안 돼요**  
A. Expo Go 앱을 흔들면 나오는 메뉴에서 **Reload** 탭하세요.

**Q. 타입 에러가 뜨는데 어디서 타입을 확인하나요?**  
A. `src/types/index.ts`에 모든 타입이 정의되어 있습니다.
