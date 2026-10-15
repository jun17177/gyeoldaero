# 결대로 — 할 일 체크리스트

> 마지막 갱신: 2026-10-15 (네이버 버전을 `main`으로 확정한 시점 기준)

## ✅ 완료

### 기본 구조
- [x] 화면 12개 구현·연결 (Splash, SavedList, SavedDetail, Home, AutoSetup, TravelStyle, DetailCondition, SpotSelect, Timeline, RouteMap, Weather, BusinessHours)
- [x] 핵심 알고리즘 (haversine, nearestNeighbor, timeBudget, travelTime, generateTimeline, aiTimeline, planTrip)
- [x] AsyncStorage 일정 저장/불러오기, 명소 사진 캐시
- [x] Expo SDK 57 / React Native 0.86 / TypeScript 6 / React Navigation 7
- [x] 테스트 26 suites / 140 tests (앱), 서버 테스트(보안·플래너·스냅샷·비짓제주)

### 데이터·API
- [x] 명소: 비짓제주 API(서버 경유) + 엄선 시드 59곳 병합, 실사진 표시
- [x] 서버 스냅샷으로 콜드 스타트 제거 (`server/data/spots-snapshot.json.gz`)
- [x] 날씨: 기상청 → **Open-Meteo로 교체** (키 불필요, 10일 예보)
- [x] 지도·검색: 카카오 → **네이버 지도** (지오코딩·길찾기·실도로 경로, 숙소 주소 검색)
- [x] 한국관광공사 TourAPI는 2차 폴백으로 유지 (서버 주소가 설정돼 있으면 쓰지 않음)
- [x] 키 관리: `.env` 일원화 (`EXPO_PUBLIC_*`), `API_설정_가이드.md`는 저장소 밖 + `.gitignore` 방어

### AI·기능
- [x] 자동 설정: 자연어 → 여행 조건 변환 (AutoSetupScreen)
- [x] AI 동선 설계: 날짜별 명소 배정 + 서버 검증·재시도, 실패 시 알고리즘 폴백
- [x] AI 명소 추천·일정 코멘트
- [x] 고른 출발일 구간에 비·눈이 있으면 저장 시 일정을 다시 설계해 그날 실내 명소 위주로 재배정 (예보 조회 실패 시에는 건너뜀)
- [x] 도착·출발 시각 24시간 선택
- [x] 일정 저장 전 날씨·출발일 선택 (WeatherScreen), 저장 상세·텍스트 공유
- [x] 타임라인 명소 편집(↑↓✕), 맛집 선택, 지도 동선
- [x] 저장된 일정 편집 후 재저장 시 이름 재입력 제거 + 저장 목록 카드에서 이름 수정 (2026-10-15)
- [x] 저장·삭제·홈의 "저장된 일정 보기" 후 저장 목록 화면이 한 겹 더 쌓이던 문제 수정 (`navigate` → `popTo`)

### 배포
- [x] 백엔드 Render 배포 (`render.yaml`, `PLANNER_TOKEN` 인증, CORS 출처 제한)
- [x] EAS 빌드 설정 — 발표용 Android APK (`eas.json` preview 프로필)
- [x] 웹 빌드 대비 (`npm run build:web`, 키 노출 방지를 위해 결과물 커밋 금지)
- [x] 공모전 1차 심사 제출 (2026-09-21 마감)
- [x] 브랜치 정리: 네이버 버전을 `main`으로 확정, 이전 카카오 `main`은 `현준`·`main-kakao-archive`에 보존

---

## 🔧 진행 예정

### 검증 (최대 병목)
- [ ] `PLANNER_TOKEN`·네이버 지도 키 확보 → AI 동선·실도로 경로 end-to-end 검증
- [ ] 실제 기기에서 직접입력 숙소 + 길찾기 응답 확인
- [ ] `Maximum update depth exceeded` 네이티브 재현 여부 확인 (웹 전용 현상으로 추정, 명소 2,946개 리스트)

### 정리
- [ ] 로컬·원격 브랜치 정리 (`main-naver`, `fix/trip-days-label-and-docs`, `backup/local-main-f4d95fa` 등) — **`태겸_네이버`(로컬·`origin`·포크)는 건드리지 않는다** (2026-10-15 지시)
- [x] axios 1.15.2 → 1.20.0, 서버 의존성 취약점 0건, 서버 토큰 비교를 timing-safe로 변경 (2026-10-15)
- [ ] 앱 `npm audit`에 남은 HIGH(Expo CLI·Metro·Jest 등 개발 도구 전이 의존성)는 Expo/React Native 업그레이드 때 함께 처리 — `npm audit fix --force`는 expo를 옛 버전(44)으로 내리라고 하므로 쓰지 않는다
- [ ] Render에 `PLANNER_TOKEN`·`ALLOWED_ORIGINS`가 실제로 설정돼 있는지 대시보드에서 확인 (비어 있으면 서버가 시작 시 경고를 로그에 남김)
- [x] 숙소 좌표·라벨·선택지를 `src/constants/accommodations.ts` 한 곳으로 통합 (회귀 테스트 추가)
- [x] 이전 카카오 `main`의 수정 3건 점검 (2026-10-15): 숙소별 동선(좌표 키 누락)·여행 기간 표기(`N-1박 N일`)·식당 재선택(`selectedOption`)은 네이버 버전에 이미 반영돼 있음. 저장 목록은 날짜 범위 대신 "저장일 · 출발일 뱃지" 방식(디자인 차이라 그대로 둠)
- [ ] 명소 상세 화면(영업시간·전화번호)이 네이버 버전에 없음 — 대체 기능 여부 확인
- [ ] Render 대시보드에서 감시 브랜치 확인 (포크 `kimtaekyum/gyeoldaero`의 `태겸_네이버`는 `fabe96e`로 서버 코드가 `main`과 같고 `/health` 정상 응답은 확인함, 대시보드 설정 자체는 미확인)

---

## 💡 추후 고려

- [ ] 서버 경유 기상청 예보 병행 (Open-Meteo 실패 시 폴백, 한국 국지 정확도) — 앱에 키를 넣지 않고 서버에서만 호출
- [ ] 일정 이미지 공유 (view-shot)
- [ ] 컴포넌트·통합 테스트 확대 (화면 렌더 테스트는 BusinessHours 위주)
- [ ] 푸시 알림 (여행 전날 일정 알림)
- [ ] 스토어 등록 (공모전 이후 졸업 프로젝트 목표 기준으로 재검토)
