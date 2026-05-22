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
- [x] TravelStyleScreen 날씨 선택 항목 제거 (날씨 선택 → WeatherScreen으로 이전 예정)

---

## 🔧 진행 예정

### 날씨 기능 개편
- [ ] TravelStyleScreen에서 날씨 선택 항목 제거
- [ ] 기상청 단기예보 API 키 발급 (data.go.kr)
- [ ] WeatherScreen 새로 구현 (Timeline 다음 화면)
  - [ ] 앞으로 10일 날씨 달력 표시
  - [ ] 여행 일수에 맞는 날짜 구간 선택 기능
  - [ ] 선택한 날짜를 일정에 저장
- [ ] RootStackParamList 및 App.tsx에 WeatherScreen 등록

### 카카오 Local API 연동 (나중에)
- [ ] 카카오 개발자 계정 REST API 키 발급
- [ ] 타임라인 식사 슬롯에 주변 맛집 실제 데이터 연동
- [ ] 명소 간 실제 이동 시간 계산

### 기상청 API 연동
- [ ] src/api/weatherApi.ts 구현
- [ ] 제주도 격자 좌표 적용 (nx=52, ny=38)
- [ ] 날씨 아이콘 컴포넌트 제작 (맑음/흐림/비/눈)

---

## 💡 추후 고려

- [ ] 날짜 선택 기반 실제 날씨 예보 자동 반영
- [ ] 명소 상세 페이지 (영업시간, 전화번호, 리뷰)
- [ ] 일정 수정 기능 (TimelineScreen 수정 버튼 실제 동작)
- [ ] 푸시 알림 (여행 전날 일정 알림)
