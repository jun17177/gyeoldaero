# 결대로 — Claude Code 초기 프롬프트

아래 프롬프트를 Claude Code에 그대로 복붙해서 시작하세요.

---

## 🚀 초기 세팅 프롬프트 (처음 한 번만)

```
CLAUDE.md 파일을 읽고 프로젝트 전체 구조를 파악해줘.

결대로(Gyeoldaero) 앱을 개발할 거야. React Native + Expo + TypeScript 기반이야.

다음 순서로 진행해줘:

1. Expo 프로젝트 초기 세팅
   - `npx create-expo-app gyeoldaero --template expo-template-blank-typescript`
   - 필요한 패키지 설치: @react-navigation/native, @react-navigation/stack, @react-navigation/bottom-tabs, react-native-safe-area-context, react-native-screens, @react-native-async-storage/async-storage, axios

2. 폴더 구조 생성 (CLAUDE.md의 폴더 구조 참고)

3. 타입 정의 파일 생성 (src/types/index.ts) — CLAUDE.md의 데이터 타입 모두 포함

4. 테마 상수 파일 생성 (src/constants/theme.ts) — CLAUDE.md의 컬러 시스템 그대로 사용

5. 핵심 알고리즘 3개 구현 (src/algorithms/) — CLAUDE.md 코드 그대로

6. 제주 명소 시드 데이터 생성 (src/data/jejuSpots.ts) — 실제 제주 명소 20개 이상 (위도/경도 포함)

완료되면 각 파일 목록과 내용 요약해줘.
```

---

## 📱 화면별 구현 프롬프트

### S0 저장된 일정 화면
```
S0 SavedListScreen을 구현해줘.

디자인 스펙:
- 배경색: #F7F8FA
- 상단 타이틀: "저장된 일정" (Noto Serif KR Bold 26px, #1C2B38)
- 좌우 패딩: 24px

[일정 있는 상태]
- 리스트 카드 (각 카드):
  - 흰 배경, 테두리 #DDE4EB, 모서리 16px
  - 왼쪽: 이모지 썸네일 (58x58px, 모서리 12px) + 기간 뱃지 (우하단, #3D5A73 배경)
  - 오른쪽: 제목(Bold 14px) + 저장일·명소수(9.5px #7A8A96) + 태그칩(#EEF2F6 배경)
  - 맨 우측: › 화살표 (#DDE4EB)
- 하단 고정: "새로운 여행 시작하기" 버튼 (#3D5A73, 높이 56px, 모서리 14px)

[빈 상태]
- 화면 중앙: 결대로 로고 SVG + "아직 저장된 일정이 없어요" + "당신의 결대로 여행의 한 페이지를 채워주세요"
- 하단 고정: 동일 버튼

AsyncStorage에서 저장된 일정 불러오기 구현 포함.
버튼 누르면 HomeScreen으로 이동.
```

### S2 홈 화면
```
S2 HomeScreen을 구현해줘.

디자인 스펙:
- 배경색: #F7F8FA
- 상단 좌측: 결대로 로고 (물결SVG + 텍스트, #3D5A73)
- 중앙: "어떤 여행을 떠나시나요?" (Noto Serif KR Bold 36px) + "취향대로, 결대로" (14px #7A8A96)
- 하단 버튼 두 개:
  - "🗺 직접 설정 — 명소 먼저 담기" (#3D5A73 배경, 흰 텍스트, 높이 56px, 모서리 14px)
  - "또는" 텍스트 (13px #7A8A96 가운데)
  - "✨ 자동 설정 — 취향대로 추천받기" (흰 배경, #3D5A73 테두리 2px)
  - 하단: "저장된 일정 보기" (밑줄 링크, #7A8A96) → SavedListScreen으로 이동

두 버튼 모두 TravelStyleScreen으로 이동.
```

### S3a 여행 스타일 화면
```
S3a TravelStyleScreen을 구현해줘.

디자인 스펙:
- 배경색: #F7F8FA
- 상단: "여행 스타일" 타이틀 + 우측 진행 점 2개 (첫 번째 활성 #3D5A73)

테마 카드 그리드 (2열):
- 힐링(🌿), 액티비티(🏄), 미식(🍜), 문화탐방(🏛): 2x2 그리드
- 사진·감성(📸), 야경·야간(🌙): 가로 풀폭 카드
- 선택 시: 배경 #3D5A73, 텍스트 흰색
- 미선택: 배경 #EEF2F6, 텍스트 #3D5A73
- 다중 선택 가능

날씨 세그먼트 (4개): ☀️맑음 / ☁️흐림 / 🌧비 / ❄️눈
계절 세그먼트 (4개): 🌸봄 / ☀️여름 / 🍂가을 / ❄️겨울

하단: "다음 →" 버튼 → DetailConditionScreen으로 이동 (선택값 전달)
```

### S3b 세부 조건 화면
```
S3b DetailConditionScreen을 구현해줘.

디자인 스펙:
- 배경색: #F7F8FA
- 상단: "세부 조건" 타이틀 + 진행 점 2개 (두 번째 활성)

섹션들:
1. 활동 시간대: 듀얼 슬라이더 (00~24시), 현재 선택값 뱃지 (#3D5A73)
2. 첫날 도착 시간 + 마지막날 출발 시간: 나란히 2열 카드 (선택 안 함 기본값)
3. 힌트 박스: "⏱ 첫날 가용시간 N시간" (#EEF2F6 배경)
4. 인원 (− N명 +) / 예산 (− N만원 +): 2열
5. 짐 무게 4개 카드: 🎒가벼움(백팩) / 🧳보통(작은캐리어) / 🛄무거움(큰캐리어) / 📦매우무거움

하단: "명소 선택하기 →" + "기본값으로 건너뛰기" 링크 → SpotSelectScreen으로 이동
```

### S4 명소 선택 화면
```
S4 SpotSelectScreen을 구현해줘.

디자인 스펙:
- 상단: 검색창 (🔍 명소 이름 검색)
- 필터 칩: 전체 / 🌿자연 / 🏛문화 / 🍜미식 (가로 스크롤)
- 명소 카드 2열 그리드:
  - 이모지 썸네일 (80px 높이)
  - 명소 이름 (Bold 12px) + 카테고리·소요시간
  - 선택 시: 테두리 #3D5A73, 배경 #EEF2F6, 우상단 체크 뱃지

카트 패널 (하단 고정):
- #3D5A73 배경, 기간 자동 표시 ("N박 N일")
- CLAUDE.md의 calcTripDays 알고리즘으로 실시간 계산
- nearestNeighbor 알고리즘으로 최적 경로 계산

숙소 위치 칩: ✈️공항주변 / 🏙제주시 / 🌊서귀포 / 🌅동쪽 / 🌅서쪽

하단: "일정 최적화하기 →" → TimelineScreen으로 이동
```

### S5 결과 타임라인 화면
```
S5 TimelineScreen을 구현해줘.

디자인 스펙:
히어로 섹션 (#3D5A73 배경):
- 큰 숫자로 "N박 N일" (Noto Serif KR Bold 48px 흰색)
- "AI 추천 여행 기간" 서브텍스트
- 태그 칩들 (테마, 날씨, 명소 수, 숙소 위치)

타임라인:
- DAY N 섹션 헤더
- 각 행: 컬러 점(10px) + 수직 연결선(#DDE4EB) + 장소명 + 시간/소요
  - 명소: #3D5A73 점
  - 식사: #D97706 점 (점심/저녁 3개 선택지 카드로 표시)
  - 숙소: #0A7B7B 점

하단 버튼:
- "💾 일정 저장" → 이름 입력 모달 → AsyncStorage 저장 → SavedListScreen
- "← 다시 선택" → SpotSelectScreen
```

---

## 🔧 기능별 구현 프롬프트

### AsyncStorage 저장/불러오기
```
scheduleStorage.ts를 구현해줘.

기능:
- saveSchedule(schedule: TripSchedule): Promise<void>
- loadAllSchedules(): Promise<TripSchedule[]>
- deleteSchedule(id: string): Promise<void>
- loadScheduleById(id: string): Promise<TripSchedule | null>

AsyncStorage 키: 'gyeoldaero_schedules'
저장 형식: JSON 배열
```

### 제주 명소 시드 데이터
```
src/data/jejuSpots.ts에 실제 제주 명소 시드 데이터를 만들어줘.

포함할 명소 (최소 25개):
자연: 한라산, 성산일출봉, 협재해수욕장, 비자림, 천지연폭포, 정방폭포, 만장굴, 산방산, 용머리해안, 섭지코지
문화: 국립제주박물관, 제주민속촌, 테디베어뮤지엄, 넥슨컴퓨터박물관
음식: 흑돼지거리, 동문시장, 서귀포매일올레시장, 성산어시장
사진/감성: 카멜리아힐, 오설록티뮤지엄, 에코랜드, 사려니숲길
야경: 한라산야경, 우도 야경

각 명소마다 정확한 위도/경도, 카테고리, 소요시간(분), 이모지, 태그 포함.
```

### 타임라인 자동 생성
```
일정 자동 생성 로직을 구현해줘 (src/algorithms/generateTimeline.ts).

입력: TripSchedule (선택한 명소, 설정값)
출력: DayPlan[]

로직:
1. nearestNeighbor로 명소 순서 최적화
2. calcTripDays로 총 일수 계산
3. 하루 가용 시간 내에 명소 배분
4. 점심(12시경) / 저녁(18시경) 식사 슬롯 자동 삽입
5. 숙소 출발(첫 번째) / 복귀(마지막) 자동 추가
6. 각 명소별 예상 도착 시각 계산
```

---

## 📝 개발 시작 순서 요약

```
1단계: npx create-expo-app + 패키지 설치
2단계: CLAUDE.md 읽고 types, theme, algorithms 생성
3단계: 시드 데이터 생성 (jejuSpots.ts)
4단계: 네비게이션 세팅 (Stack Navigator)
5단계: 화면 순서대로 구현 (S0 → S2 → S3a → S3b → S4 → S5)
6단계: AsyncStorage 연동
7단계: 외부 API 연동 (선택)
8단계: Expo Go로 테스트
```
