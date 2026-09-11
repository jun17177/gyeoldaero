# 결대로 — 할 일 체크리스트

## ✅ 완료

- [x] 전체 화면 8개 구현 (Splash, SavedList, Home, TravelStyle, DetailCondition, SpotSelect, Timeline, BusinessHours)
- [x] 핵심 알고리즘 4개 (haversine, nearestNeighbor, timeBudget, generateTimeline)
- [x] 제주 명소 시드 데이터 28개
- [x] AsyncStorage 저장/불러오기
- [x] WaveLogo SVG 컴포넌트
- [x] RangeSlider 컴포넌트
- [x] GitHub 연동 및 팀원 공유 가이드 (README.md, AGENTS.md)
- [x] 한국관광공사 TourAPI 연동 (KorService2, 명소 실사진 표시, 시드 데이터 fallback)
- [x] TravelStyleScreen 날씨 선택 항목 제거 (날씨 선택 → WeatherScreen으로 이전)
- [x] WeatherScreen 구현 (Timeline → Weather → SavedList 흐름)
  - [x] 기상청 단기(D+0~2) + 중기(D+3~9) 합산 10일 날씨 달력 표시
  - [x] 여행 일수에 맞는 날짜 구간 탭 선택 기능
  - [x] 선택한 날짜(startDate)를 일정에 저장
- [x] RootStackParamList 및 App.tsx에 WeatherScreen 등록
- [x] src/api/weatherApi.ts 구현 (단기/중기 혼합, mock fallback)
- [x] 제주도 격자 좌표 적용 (nx=53, ny=38 — 제주시 기준)
- [x] 날씨 아이콘 Ionicons 활용 (sunny/partly-sunny/rainy/snow)
- [x] 날씨 API 버그 수정 (12시 단일 샘플 → 6·9·12·15·18시 최악 조건, numOfRows 1500)
- [x] TROUBLESHOOTING.md 작성 (날씨 기능 개편 + API 버그 수정 기록)
- [x] data.go.kr에서 기상청 단기예보 서비스 신청 및 전용 API 키 발급
- [x] apiKeys.ts의 WEATHER_API_KEY를 발급받은 키로 교체

---

## 🔧 진행 예정

### 카카오 Local API 연동 (나중에)
- [x] 카카오 개발자 계정 REST API 키 발급 (지도 SDK 아닌 REST API 방식 — 앱에 지도 화면이 없고 Expo Go 워크플로우 유지 위함)
- [x] src/api/kakaoApi.ts 구현 — 좌표 기준 반경 내 음식점 카테고리(FD6) 검색
- [x] generateTimeline.ts의 하드코딩된 MEAL_OPTIONS를 카카오 로컬 API 실검색 결과로 교체 (동선 좌표 기반 맛집 추천)
- [x] 명소 간 실제 이동 시간 계산 (실시간 교통 API는 접근 불가 — 직선거리+도로 보정계수+이동수단별 평균속도로 정적 추정)

### Claude API 연동
- [x] 최소 백엔드(Node/Express, `server/`) 구축 — Claude API 키는 `server/.env`에만 보관, 앱은 서버 엔드포인트만 호출
- [x] AI 경로 최적화 + 기간 추천 (`POST /api/route-plan`) — Claude가 날짜별 배정·방문 순서·기간을 정하고 서버가 가용시간·누락을 검증(실패 시 1회 재시도), 앱은 서버가 없거나 실패하면 기존 알고리즘으로 대체
- [x] 날씨가 나쁠 때 재계획하면서 날짜별 예보를 AI에 전달 (비·눈 오는 날 실내 명소 우선)
- [x] 타임라인 배치 로직 정비 — 식사 끼워넣기가 오전을 통째로 비우던 문제, 긴 명소(한라산)와 그 뒤 명소가 누락되던 문제, 숙소 권역 좌표 불일치(애월·한림·중문·성산이 제주시로 계산됨) 수정
- [x] 응답 시간 단축 — 모델 `claude-sonnet-5` + effort low, 알고리즘 일정을 먼저 보여주고 AI 결과로 교체, 하루 한도를 미리 계산해 전달, 명소를 번호로 출력, 재시도 시간 제한, 날씨 화면에서 재계획을 미리 시작
- [x] 전사 검수 후 버그 수정 — 좌표 없는 명소가 일정을 망가뜨림, 서버가 엉뚱한 응답을 주면 화면이 AI 대기 상태에 갇힘, 식당 대기 시간 미반영으로 마감 초과, 명소 30곳 초과·장기 여행 요청 거부를 안내 없이 넘김, 계절 보정 누락·명소 선택 화면과 타임라인 기간 불일치, 가짜 예보가 실제처럼 표시되고 일정 조정에 쓰임
- [ ] 실제 API 키로 동선 품질·응답 시간 확인 — 부실하면 `PLANNER_EFFORT=medium`으로 비교 (서버 로그에 시도별 ms·토큰 출력)
- [ ] 서버 공개 배포 전 인증 추가 (현재는 IP별 요청 수 제한만 있음)
- [ ] "자동 설정" 플로우에 자유 텍스트 입력 → Structured Outputs로 TripSettings 구조화 변환 기능 연동

---

## 💡 추후 고려

- [x] 날짜 선택 기반 실제 날씨 예보 자동 반영 (일수 산출은 기존에 있었으나 dayPlans 재생성이 빠져있던 것을 연결)
- [x] 명소 상세 페이지 (영업시간, 전화번호) — 리뷰는 TourAPI에 없어 카카오맵 링크로 대체
- [x] 일정 수정 기능 (TimelineScreen 수정 버튼 실제 동작) — 명소 삭제(자동 재생성), 식사 옵션 재선택
- [ ] 푸시 알림 (여행 전날 일정 알림)
- [ ] "자동 설정" 모드 실제 동작 구현 — 지금은 TravelStyleScreen이 mode를 무시해 직접 설정과 똑같이 동작
- [x] 날씨 선택 제거 후 남은 `weather: 'sunny'` 고정값 정리 — TripSettings에서 weather 필드 제거, 타임라인의 "맑음" 태그 삭제 (실제 날씨는 WeatherScreen 예보로만 사용)
- [ ] 저장된 일정을 다시 저장할 때 이름 입력칸이 "제주 여행"으로 초기화되는 문제
