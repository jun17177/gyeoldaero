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

---

## 🔧 진행 예정

### 카카오 Local API 연동 (나중에)
- [ ] 카카오 개발자 계정 REST API 키 발급
- [ ] 타임라인 식사 슬롯에 주변 맛집 실제 데이터 연동
- [ ] 명소 간 실제 이동 시간 계산

### 기상청 API 키
- [ ] data.go.kr에서 기상청 단기예보 서비스 신청 및 전용 API 키 발급
- [ ] apiKeys.ts의 WEATHER_API_KEY를 발급받은 키로 교체

---

## 💡 추후 고려

- [ ] 날짜 선택 기반 실제 날씨 예보 자동 반영
- [ ] 명소 상세 페이지 (영업시간, 전화번호, 리뷰)
- [ ] 일정 수정 기능 (TimelineScreen 수정 버튼 실제 동작)
- [ ] 푸시 알림 (여행 전날 일정 알림)
