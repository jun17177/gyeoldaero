# 결대로 — 트러블슈팅 기록

---

## [2026-09-09] 명소 상세 페이지 신규 구현 (영업시간·전화번호) — 리뷰는 TourAPI 범위 밖

### 배경
TODO에 "명소 상세 페이지(영업시간, 전화번호, 리뷰)"가 있었는데, 확인해보니 **리뷰는 TourAPI가 애초에 제공하지 않는 데이터**임 (순수 관광정보 API라 평점·후기 필드가 없음). 카카오 로컬 API도 마찬가지로 리뷰 데이터는 없음(앞서 카페 검색 검토 때 확인한 것과 동일한 한계).

### 결정
- 영업시간·전화번호·홈페이지·소개는 TourAPI `detailCommon2`/`detailIntro2`로 조회해 화면에 표시
- 리뷰는 카카오맵 검색 링크로 대체 — "카카오맵에서 후기·상세 보기" 버튼으로 외부 앱/브라우저에서 확인하도록 안내 (BusinessHoursScreen에서 이미 쓰던 `map.kakao.com/link/search/` 패턴 재사용)
- TourAPI가 아닌 출처(시드 데이터, 카카오 카페)의 spot은 `contentId`가 유효하지 않아 상세 조회가 빈 값으로 돌아오는데, 이 경우 "등록된 상세 정보가 없어요" 안내 + 카카오맵 링크만 노출하도록 폴백 처리

### 변경 내용

#### `Spot`에 `contentTypeId` 추가, `tourApi.ts`에 `fetchSpotDetail` 신규
**파일:** `src/types/index.ts`, `src/api/tourApi.ts`
- `detailIntro2`는 영업시간에 해당하는 필드명이 `contenttypeid`별로 다름(관광지=`usetime`, 음식점=`opentimefood`, 숙박=`checkintime` 등) → `Spot.contentTypeId`를 새로 저장해두고 조회 시 필드명 매핑에 사용
- 기존에 있었지만 어디서도 호출되지 않던 죽은 함수 `fetchSpotHomepage`를 제거하고, `overview`·`tel`·`homepage`·`businessHours`를 한 번에 반환하는 `fetchSpotDetail(contentId, contentTypeId)`로 통합

```ts
const BUSINESS_HOURS_FIELD: Record<string, string> = {
  '12': 'usetime', '14': 'usetime', '15': 'playtime',
  '28': 'usetimeleports', '32': 'checkintime', '38': 'opentime', '39': 'opentimefood',
};
```

#### `src/screens/SpotDetailScreen.tsx` 신규
- 히어로 이미지, 이름·카테고리·소요시간, 태그, 소개, 영업시간, 전화 걸기(`tel:` 링크), 홈페이지, 카카오맵 후기 링크로 구성
- `App.tsx`에 라우트 등록, `SpotSelectScreen`(카드 위 ⓘ 아이콘)과 `TimelineScreen`(명소 항목 탭)에서 진입 가능하도록 연결

### 검증
```
별도봉 -> businessHours: "상시 개방"
하영 흑돼지구이집 -> businessHours: "10:00~22:00 (마지막 주문 21:00)"
시드 데이터 id(hallasan), 카카오 카페 id(kakao-12345) -> 에러 없이 빈 값 반환 (폴백 UI로 정상 처리됨)
```

### 수정 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `src/types/index.ts` | `Spot.contentTypeId` 추가, `RootStackParamList`에 `SpotDetail` 라우트 추가 |
| `src/api/tourApi.ts` | 죽은 함수 `fetchSpotHomepage` 제거 → `fetchSpotDetail`로 통합 |
| `src/screens/SpotDetailScreen.tsx` | 신규 — 명소 상세 화면 |
| `App.tsx` | `SpotDetail` 라우트 등록 |
| `src/screens/SpotSelectScreen.tsx` | 카드에 ⓘ 아이콘 추가, 상세 화면 진입 |
| `src/screens/TimelineScreen.tsx` | 명소 항목 탭 시 상세 화면 진입 |

---

## [2026-09-09] TimelineScreen "수정" 버튼 실제 동작 연결

### 배경
`TimelineScreen.tsx`의 각 일정 항목마다 "수정" 버튼이 있었지만 `onPress={() => {}}`로 아무 동작도 하지 않았음. 타입(명소/식사/이동/숙소) 구분 없이 모든 행에 버튼이 노출되는 것도 UX상 어색했음.

### 결정
- **명소(spot)**: 삭제만 지원. 순서 변경이나 다른 명소로 교체는 동선 재계산이 얽혀 있어 범위를 좁힘 — 삭제하면 남은 명소로 타임라인을 자동 재생성
- **식사(meal)**: 이미 추천된 옵션(카카오 API 결과 또는 직접 고른 식당) 중에서 다시 고르는 것만 지원 — 목록이 1개뿐이면(사용자가 직접 고른 식당인 경우) 수정 버튼 자체를 숨김
- **이동/숙소**: 편집할 내용이 없으므로 수정 버튼 미노출

### 변경 내용

#### `route.params.schedule`을 로컬 편집 상태로 전환
**파일:** `src/screens/TimelineScreen.tsx`
```ts
const { schedule: initialSchedule } = route.params;
const [schedule, setSchedule] = useState<TripSchedule>(initialSchedule);
```
- 이후 코드에서 쓰이는 `schedule.*` 참조는 그대로 두고 변수만 state로 승격 — 최소 변경으로 편집 가능하게 전환

#### 명소 삭제 → 자동 재생성
```ts
const handleDeleteSpot = () => {
  if (!deleteTarget) return;
  setSchedule(prev => ({
    ...prev,
    spots: prev.spots.filter(s => s.id !== deleteTarget.id),
    dayPlans: undefined, // 캐시된 dayPlans를 지워야 useEffect가 재생성 분기를 탐
  }));
  setDeleteTarget(null);
};
```
- `dayPlans: undefined`로 같이 지워주지 않으면, `useEffect`가 "이미 dayPlans 있음" 분기로 빠져서 옛 타임라인을 그대로 유지해버리는 문제가 있어 함께 초기화

#### 식사 옵션 재선택 → 로컬 state만 갱신 (재생성 없음)
```ts
const handleSelectMealOption = (chosen: string) => {
  if (!mealEditTarget) return;
  const { day, itemIdx } = mealEditTarget;
  setDayPlans(prev => prev.map(dp =>
    dp.day !== day ? dp : {
      ...dp,
      items: dp.items.map((it, i) => i === itemIdx ? { ...it, options: [chosen] } : it),
    }
  ));
  setMealEditTarget(null);
};
```
- 명소 삭제와 달리 동선에 영향이 없으므로 `generateTimeline` 재호출 없이 `dayPlans`만 직접 수정 — API 재호출 없어 즉시 반영됨

### 검증
```
삭제 전 명소 항목: [ '만장굴', '성산일출봉', '섭지코지' ]
삭제 후 명소 항목: [ '만장굴', '성산일출봉' ]  // 섭지코지 삭제 후 나머지 동선으로 재생성됨
```

### 수정 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `src/screens/TimelineScreen.tsx` | `schedule`을 로컬 state로 전환, 명소 삭제 모달·식사 옵션 선택 모달 추가, 타입별 수정 버튼 노출 조건 추가 |

---

## [2026-09-09] 날씨 자동 반영 — 일수는 늘어나는데 타임라인 내용은 그대로였던 불일치 수정

### 배경
`WeatherScreen.tsx`는 사용자가 여행 시작일을 고르면 그 구간 예보를 확인해서, 비·눈처럼 나쁜 날씨가 끼어 있으면 `calcTripDays`를 다시 돌려 여행 일수(`adjustedDays`)를 늘려주는 로직이 이미 있었음.  
그런데 저장(`handleSave`) 시 `days: adjustedDays`(늘어난 일수)만 반영하고, 실제 하루하루 일정 내용인 `dayPlans`는 원래(날씨 보정 전) 것을 그대로 저장하고 있었음 — 예: "4박 5일로 늘었어요"라고 표시는 되는데 저장된 타임라인은 여전히 3박 4일치 명소 배치 그대로인 상태.

### 변경 내용

#### `generateTimeline.ts` — `weatherFactor` 파라미터 추가
```ts
// weatherFactor: 여행 구간 날씨가 나쁠 때(비·눈) WeatherScreen에서 계산해 넘겨주는 보정값. 기본 1.0
export async function generateTimeline(schedule: TripSchedule, weatherFactor = 1.0): Promise<DayPlan[]> {
  ...
  const totalDays = calcTripDays({ ...,  weatherFactor });
```
- 기존 호출부(`TimelineScreen.tsx`, `BusinessHoursScreen.tsx`)는 인자를 넘기지 않아 기본값 1.0 그대로 — 영향 없음

#### `WeatherScreen.tsx` — 날씨 보정값을 별도로 추출하고, 저장 시 타임라인 재생성
- 기존엔 `worstFactor`가 `adjustedDays` 계산 안에서만 쓰이고 버려졌는데, `useMemo`로 분리해 `handleSave`에서도 재사용
- "이 날짜로 저장하기"(`withDate=true`)를 눌렀을 때 `worstFactor > 1.0`이면 `generateTimeline(schedule, worstFactor)`로 **타임라인을 다시 생성**해서 저장하고, `days`도 그 결과(`dayPlans.length`)를 기준으로 맞춤
- "날짜 없이 저장"(`withDate=false`)을 눌렀을 때는 날씨 보정을 아예 적용하지 않도록 정리 — 이전엔 날짜를 한 번 골랐다가 스킵해도 `adjustedDays`가 남아있어 `days`만 슬쩍 바뀌는 미묘한 버그가 있었음

### 검증
```
calcTripDays 단독 테스트로 weatherFactor 경계값 확인:
  weatherFactor=1.20 -> 2일
  weatherFactor=1.25 -> 3일   (여기서 날짜 경계를 넘음)
  weatherFactor=1.30 -> 3일
generateTimeline(schedule, weatherFactor)도 동일한 경계에서 day plan 개수가 함께 늘어남을 확인
```

### 수정 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `src/algorithms/generateTimeline.ts` | `weatherFactor` 파라미터 추가, `calcTripDays` 호출에 전달 |
| `src/screens/WeatherScreen.tsx` | `worstFactor` 재사용 가능하도록 분리, 저장 시 날씨 보정 반영한 `dayPlans` 재생성, "날짜 없이 저장" 시 보정 미적용으로 정리 |

---

## [2026-09-09] 명소 간 이동시간 — 고정 20분 대신 거리 기반 추정으로 교체

### 배경
`generateTimeline.ts`가 명소 간 이동시간을 항상 `moveCost = 20`(분) 고정값으로 계산해서, 바로 옆 명소든 제주 반대편 명소든 이동시간이 똑같이 처리되는 문제가 있었음.

### 검토 — 실시간 교통 반영이 가능한가?
- 실시간 교통정보를 반영한 길찾기는 **카카오모빌리티 길찾기 API**라는 별도 상품이고, 사업자 제휴/심사가 필요해 지금 쓰는 개인용 REST API 키로는 접근 불가
- 날씨에 따른 이동 지연도 별도 데이터 소스가 없어 정확한 반영은 어려움
- → 이번 범위는 **정적 거리 기반 추정**으로 한정: 실시간 교통/날씨 지연은 반영하지 않음

### 변경 내용

#### `src/algorithms/travelTime.ts` 신규
기존 `haversine.ts`(직선거리)에 도로 굴곡 보정계수와 이동수단별 평균 속도를 적용해 이동시간(분)을 추정.
```ts
const ROAD_DETOUR_FACTOR = 1.3; // 제주 도로는 해안선·중산간 지형 탓에 직선거리보다 굴곡짐
const AVG_SPEED_KMH: Record<'car' | 'transit', number> = { car: 40, transit: 25 };
const BOARDING_OVERHEAD_MIN = 5; // 주차·승하차 등 고정 오버헤드
const MIN_TRAVEL_MIN = 10;

export function estimateTravelMinutes(lat1, lon1, lat2, lon2, mode = 'car'): number {
  const roadDistanceKm = haversineDistance(lat1, lon1, lat2, lon2) * ROAD_DETOUR_FACTOR;
  const minutes = (roadDistanceKm / AVG_SPEED_KMH[mode]) * 60 + BOARDING_OVERHEAD_MIN;
  return Math.max(MIN_TRAVEL_MIN, Math.round(minutes));
}
```
- 이동수단은 기존 `getTransportMode(luggage)`(짐 가벼움→대중교통, 무거움→자동차) 결과를 그대로 사용

#### `src/algorithms/generateTimeline.ts`
- `moveCost = 20` 고정값 제거 → `estimateTravelMinutes(lastLat, lastLon, spot.lat, spot.lon, transportMode)`로 매 구간마다 실제 거리 기반 계산

#### `src/algorithms/timeBudget.ts`
- `calcTripDays`의 전체 여행일수 산정에서도 "명소당 20분"으로 뭉뚱그리던 이동시간을 동선 순서(`orderedSpots`) 기준 구간별 실제 거리 합산으로 교체 — 총 소요시간 추정치가 더 정확해져 여행 기간 산출 자체도 개선됨

### 검증
```
제주시청 → 성산일출봉 (약 45km): 80분 추정 (기존엔 무조건 20분)
제주시청 → 1km 이내 근접 지점: 10분 추정 (최소값 적용)
타임라인 실제 생성 결과: 이동 구간이 35분/60분 등 거리별로 다르게 산출됨
```

### 수정 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `src/algorithms/travelTime.ts` | 신규 — 거리+이동수단 기반 이동시간 추정 함수 |
| `src/algorithms/generateTimeline.ts` | 고정 `moveCost=20` → `estimateTravelMinutes` 호출로 교체 |
| `src/algorithms/timeBudget.ts` | `calcTripDays`의 이동시간 추정도 동일 함수로 교체 |

---

## [2026-09-09] TourAPI 명소 보완 — 카카오 로컬 API로 카페 데이터 추가

### 배경
"미식" 테마의 명소 카드가 전부 한국관광공사 TourAPI(`contenttypeid=39`) 기반이라, 체인점·소규모·신생 카페처럼 관광공사 DB에 잘 등록되지 않는 곳들이 누락되는 문제가 있었음.  
카카오 로컬 API로 이런 곳까지 보완할 수 있는지, 그리고 쿼터·비용 부담이 있는지 검토 필요.

### 검토 — 비용·쿼터
[카카오 개발자 문서](https://developers.kakao.com/docs/ko/getting-started/quota) 기준:
- 카테고리·키워드 검색 REST API: **일 10만 건 무료**
- 초과분은 차단이 아니라 **과금**(장소 검색 기준 건당 2원 수준) — 프로젝트 규모 트래픽에서는 무료 쿼터 안에서 여유
- 단, 카카오 로컬 API는 순수 위치 검색 API라 **평점·리뷰 수 등 "인기도" 데이터는 제공하지 않음** → "SNS 인기 카페"를 정렬해서 보여주는 것은 불가능, "TourAPI에 없는 카페까지 검색 범위 확장" 정도로 범위를 한정

### 변경 내용

#### `src/api/kakaoApi.ts` — `fetchJejuCafes()` 신규
- 카카오 로컬 API는 좌표 중심 반경 검색만 지원(전국/전지역 단위 조회 불가)이라, 제주 전역을 커버하도록 4개 권역 중심점(제주시·서귀포·성산·한림)에서 각각 반경 20km(API 최대치)로 카테고리 검색(`CE7`=카페) 후 병합
- 결과는 카카오 문서 `id` 기준으로 중복 제거해 `Spot[]`으로 변환 (`foodType: 'cafe'`로 태깅 — [[kakao-local-api-integration]] 참고)

```ts
const JEJU_HUBS = [
  { lat: 33.4996, lon: 126.5312 }, // 제주시
  { lat: 33.2541, lon: 126.5600 }, // 서귀포
  { lat: 33.4390, lon: 126.9229 }, // 성산(동쪽)
  { lat: 33.3925, lon: 126.2376 }, // 한림(서쪽)
];
```

#### `src/screens/SpotSelectScreen.tsx`
- `loadSpots()`에서 "미식" 테마가 선택된 경우(`allowedCategories.includes('food')`)에만 `fetchJejuCafes()`를 호출해 TourAPI 결과와 합침 — 다른 테마 선택 시 불필요한 API 호출 없음

### 검증
```
fetchJejuCafes() 결과: 60곳 (160ms)
예) 스타벅스 제주시청점, 레드버튼 제주시청점, 앨리스 시청본점, 라토커피 제주 …
→ TourAPI 단독 조회로는 나오지 않던 체인·소규모 카페 다수 포함 확인
```

### 수정 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `src/api/kakaoApi.ts` | `fetchJejuCafes()` 추가 — 4개 권역 카테고리(CE7) 검색 + 중복 제거 |
| `src/screens/SpotSelectScreen.tsx` | 미식 테마 선택 시 카카오 카페 결과를 TourAPI 결과에 병합 |

---

## [2026-09-09] 미식 테마 — 카페/식당 구분과 식당의 점심·저녁 슬롯 자동 배정

### 배경
"미식" 테마를 고르면 SpotSelectScreen(S4)에서 TourAPI 음식점(contenttypeid 39) 목록이 명소 카드로 노출되는데, 여기엔 카페와 정찬 식당이 구분 없이 섞여 있었음.  
카페는 잠깐 들르는 "명소"에 가깝지만, 식당은 실제 점심·저녁 한 끼를 해결하는 곳이므로 타임라인에서 다르게 취급해야 함:
- **카페** → 그냥 동선상의 명소로 배치
- **식당** → 동선을 고려해 점심 또는 저녁 슬롯에 배정하고, 비어있는 슬롯은 카카오 API 자동 추천으로 채움
- **식당을 2곳 이상 고른 경우** → 점심·저녁 슬롯은 각 1곳씩만 채우고, 나머지는 추가 추천 없이 동선상 일반 명소로 정리

### 변경 내용

#### `Spot`에 `foodType` 필드 추가
**파일:** `src/types/index.ts`
```ts
// category === 'food'일 때만 의미 있음. 'restaurant'는 동선상 점심/저녁 슬롯에 배정,
// 'cafe'·미지정은 일반 명소로 취급
foodType?: 'cafe' | 'restaurant';
```

#### TourAPI 응답에서 카페/식당 분류
**파일:** `src/api/tourApi.ts`
- cat3 코드 `A05020900`(카페/전통찻집) 또는 상호명에 "카페/커피/베이커리/디저트" 등이 포함되면 `cafe`, 그 외엔 `restaurant`로 분류
- 제주 명소 시드 데이터(`jejuSpots.ts`)의 음식점 항목(흑돼지거리, 동문시장 등)은 특정 식당이 아닌 거리·시장이라 `foodType` 미지정 → 기존처럼 일반 명소로 처리됨

#### `generateTimeline.ts` — 식당 spot을 점심/저녁 슬롯에 배정
- 동선(`nearestNeighbor` 결과) 순회 중 `foodType === 'restaurant'`인 spot을 만나면, 비어있는 슬롯 중 현재 위치상 더 가까운 시간대(점심 12:00 / 저녁 18:00)에 배정
- 두 슬롯이 이미 다른 식당으로 채워져 있으면 더 이상 특별 취급하지 않고 일반 `spot` 아이템으로 동선에 편입
- 슬롯이 식당으로 채워지면 해당 슬롯의 카카오 API 자동 추천(`fetchNearbyRestaurants`)은 자연스럽게 스킵됨 (addedLunch/addedDinner 플래그 공유)

### 발견한 버그 — `mealBudget` 고정 예약으로 식사 이후 명소가 통째로 누락됨
**파일:** `src/algorithms/generateTimeline.ts`

식당 3곳을 고른 케이스로 검증하던 중, 점심·저녁이 이미 다 채워졌는데도 세 번째 식당이 타임라인에서 완전히 사라지는 현상 발견.

```ts
// 수정 전 (버그): 식사 완료 여부와 무관하게 항상 120분(점심+저녁) 예약
const mealBudget = 120;
...
if (cursor + needed + mealBudget > dayEnd) break;
```

- 점심·저녁이 이미 채워진 뒤에도 "다음 식사를 위한 여유 시간" 120분을 계속 예약해서, 실제로는 하루 안에 들어갈 수 있는 명소도 `dayEnd` 초과로 오판되어 루프가 조기 종료됨
- 결과적으로 세 번째 식당(또는 그 이후 명소)이 어느 날짜에도 배치되지 못하고 조용히 누락됨

```ts
// 수정 후: 아직 채우지 못한 식사만큼만 여유 시간 예약
const remainingMealBudget = (addedLunch ? 0 : 60) + (addedDinner ? 0 : 60);
if (cursor + needed + remainingMealBudget > dayEnd) break;
```

### 검증
```
[식당 1곳] 점심 자동 배정, 저녁은 카카오 API 추천으로 채움
[카페 1곳] 식사가 아닌 일반 명소로 동선에 편입
[식당 3곳] 동선상 먼저 만나는 2곳만 점심/저녁 배정, 3번째는 일반 명소로 정상 편입 (버그 수정 후 확인)
```

### 수정 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `src/types/index.ts` | `Spot.foodType?: 'cafe' \| 'restaurant'` 추가 |
| `src/api/tourApi.ts` | cat3/상호명 기반 카페·식당 분류 로직 추가 |
| `src/algorithms/generateTimeline.ts` | 식당 spot → 점심/저녁 슬롯 자동 배정, `mealBudget` 고정 예약 버그 수정 |

---

## [2026-09-09] 카카오 Local API 연동 — 하드코딩된 식사 옵션을 실제 맛집 검색으로 교체

### 배경
`generateTimeline.ts`가 타임라인에 점심·저녁 식사 슬롯을 넣을 때, 지역·동선과 무관하게 고정된 3개 메뉴(`흑돼지 두루치기`, `갈치조림 정식`, `한치물회` 등)를 항상 보여주는 구조였음.  
실제 동선 좌표 기준으로 근처 음식점을 추천하도록 개선 필요.

### 결정
카카오 로컬 API(카테고리 검색, `FD6`=음식점)를 REST 방식으로 연동. 지도 SDK 대신 REST API 키를 사용해 Expo Go 워크플로우(네이티브 빌드 없이 개발)를 그대로 유지.

### 변경 내용

#### 카카오 개발자 앱 생성 및 REST API 키 발급
- [developers.kakao.com](https://developers.kakao.com) 에서 앱 생성 (앱 이름/회사명: 결대로, 카테고리: 여행/지역 정보)
- 지도 SDK용 **JavaScript 키**가 아닌 **REST API 키**를 사용 — 앱에 지도 화면이 없고 서버/클라이언트에서 HTTP로 직접 호출하는 구조이기 때문
- 앱 대표 도메인은 카카오 로그인 리다이렉트나 JS 키 사용 시에만 필요 — REST API 키로 로컬 API를 호출하는 용도에서는 불필요해 비워둠
- 발급받은 키는 `src/constants/apiKeys.ts`의 `KAKAO_API_KEY`로 관리 (Git 추적 제외, 팀원 간 `API_설정_가이드.md`로 공유)

#### `src/api/kakaoApi.ts` 신규 구현
```ts
// 좌표 기준 반경 내 음식점 검색 — generateTimeline의 식사 옵션으로 사용
export async function fetchNearbyRestaurants(
  lat: number,
  lon: number,
  meal: 'lunch' | 'dinner',
  radiusMeters = 1500,
  limit = 3,
): Promise<string[]> {
  if (!KAKAO_API_KEY) return FALLBACK_OPTIONS[meal];
  try {
    const res = await axios.get(CATEGORY_SEARCH_URL, {
      headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
      params: {
        category_group_code: 'FD6',
        x: lon.toString(), y: lat.toString(),
        radius: radiusMeters, sort: 'distance', size: limit,
      },
    });
    const documents = res.data?.documents ?? [];
    return documents.length ? documents.map(d => d.place_name) : FALLBACK_OPTIONS[meal];
  } catch {
    return FALLBACK_OPTIONS[meal];
  }
}
```
- 카카오 로컬 API는 인증을 쿼리 파라미터가 아닌 `Authorization: KakaoAK {REST_API_KEY}` 헤더로 받는 점이 TourAPI·기상청 API(둘 다 `serviceKey` 쿼리 파라미터 방식)와 다름
- API 키 미설정, 응답 없음, 요청 실패(타임아웃 등) 시 모두 기존 하드코딩 메뉴로 fallback

#### `generateTimeline.ts` — 동기 함수를 비동기로 전환
- 식사 슬롯을 만들 때마다 카카오 API를 호출해야 해서 함수 시그니처를 `DayPlan[]` → `Promise<DayPlan[]>`로 변경
- 마지막으로 방문한 명소(또는 첫 식사 전엔 숙소) 좌표를 `lastLat`/`lastLon`으로 추적해, "지금 동선상 위치에서 가까운" 음식점을 검색하도록 구현
- 호출부(`TimelineScreen.tsx`, `BusinessHoursScreen.tsx`)를 `useMemo` 동기 계산 → `useEffect` + `useState`(`dayPlans`, `loading`) 비동기 로딩 구조로 변경, 로딩 중 `ActivityIndicator` 표시

### 수정 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `src/api/kakaoApi.ts` | 신규 생성 — 카카오 로컬 API 카테고리(FD6) 검색, fallback 처리 |
| `src/algorithms/generateTimeline.ts` | 동기 → 비동기 전환, 좌표 기반 `fetchNearbyRestaurants` 호출로 `MEAL_OPTIONS` 하드코딩 제거 |
| `src/screens/TimelineScreen.tsx` | `useMemo` → `useEffect`/`useState` 비동기 로딩, 로딩 인디케이터 추가 |
| `src/screens/BusinessHoursScreen.tsx` | 동일하게 비동기 로딩 구조로 전환 |
| `src/constants/apiKeys.ts` | `KAKAO_API_KEY` 추가 |
| `API_설정_가이드.md` | 팀 공유용 키 목록에 `KAKAO_API_KEY` 추가 |

### 참고 — 카카오 로컬 API 카테고리 검색 요약
- 엔드포인트: `GET https://dapi.kakao.com/v2/local/search/category.php`
- 인증: `Authorization: KakaoAK {REST API 키}` (헤더)
- 주요 파라미터: `category_group_code`(FD6=음식점), `x`(경도), `y`(위도), `radius`(미터, 최대 20000), `sort`(distance/accuracy)

---

## [2026-05-22] 날씨 기능 구조 개편 — TravelStyleScreen 날씨 선택 제거

### 배경
초기 구현에서는 `TravelStyleScreen(S3a)`에서 날씨(맑음·흐림·비·눈)를 사용자가 **직접 수동 선택**하도록 설계되어 있었음.  
이 방식은 여행 기간에 맞는 실제 날씨 예보를 반영하지 못해, 날씨 조건 기반 일정 최적화가 사실상 무의미함.

### 결정
날씨 선택을 TravelStyleScreen에서 완전히 제거하고, 일정 생성 이후 **기상청 API 기반 WeatherScreen(날짜 선택 화면)** 을 신설하는 방향으로 설계 변경.

### 변경 내용

#### TravelStyleScreen — 날씨 선택 UI 제거
**파일:** `src/screens/TravelStyleScreen.tsx`  
**커밋:** `44e4c04`

```ts
// 수정 전: 수동 선택 UI 존재
const WEATHERS = [
  { id: 'sunny',  label: '맑음', emoji: '☀' },
  { id: 'cloudy', label: '흐림', emoji: '☁' },
  { id: 'rainy',  label: '비',   emoji: '🌧' },
  { id: 'snowy',  label: '눈',   emoji: '❄' },
];
const [weather, setWeather] = useState<TripSettings['weather']>('sunny');

// → handleNext에서 사용자가 선택한 weather 값을 전달하던 구조
navigation.navigate('DetailCondition', { settings: { themes, weather, season } });
```

```ts
// 수정 후: 날씨 선택 UI 전체 제거, 임시로 'sunny' 고정
navigation.navigate('DetailCondition', {
  settings: { themes, weather: 'sunny', season },
});
```

- WEATHERS 상수, weather state, 날씨 선택 UI 블록 전부 삭제
- 기상청 API 연동 완료 전까지 `weather: 'sunny'`를 임시 기본값으로 고정

#### WeatherScreen 신설
**파일:** `src/screens/WeatherScreen.tsx`, `src/api/weatherApi.ts`

- 타임라인(S5) 다음 화면으로 **날짜 선택 + 날씨 캘린더** 화면 추가
- 기상청 단기예보(D+0~2) + 중기예보(D+3~9) 를 합쳐 **10일치 날씨** 표시
- 여행 일수에 맞는 날짜 구간을 탭으로 선택 → 선택한 날짜를 일정에 저장

### 개편 전·후 화면 흐름 비교

| | 개편 전 | 개편 후 |
|---|---|---|
| 날씨 입력 위치 | TravelStyleScreen (수동 선택) | WeatherScreen (기상청 API 자동) |
| 화면 흐름 | S3a → S3b → S4 → S5 → S0 | S3a → S3b → S4 → S5 → **Weather** → S0 |
| 날씨 정확도 | 사용자 추측 | 기상청 실제 10일 예보 |

### 수정 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `src/screens/TravelStyleScreen.tsx` | 날씨 선택 UI·상태·상수 제거, `weather: 'sunny'` 임시 고정 |
| `src/screens/WeatherScreen.tsx` | 신규 생성 — 10일 날씨 캘린더 + 날짜 구간 선택 |
| `src/api/weatherApi.ts` | 신규 생성 — 단기/중기예보 API 호출 로직 |
| `TODO.md` | 날씨 기능 개편 계획 항목 추가 |

---

## [2026-05-29] 날씨 API — 아이폰 기본 날씨 앱과 결과 불일치

### 증상
앱의 날씨 화면(WeatherScreen)에 표시되는 날씨 조건·기온이 아이폰 기본 날씨 앱과 다름.  
특히 날씨 조건이 대부분 "맑음"으로만 표시되는 현상 발생.

---

### 원인 분석 (4가지)

#### 1. 격자 좌표 오류 — 엉뚱한 지점 날씨 조회
**파일:** `src/api/weatherApi.ts`

```ts
// 수정 전 (오류)
const JEJU_NX = 52;
const JEJU_NY = 38;

// 수정 후
const JEJU_NX = 53; // 제주시 격자 좌표
const JEJU_NY = 38;
```

- KMA 단기예보 격자 좌표 기준으로 **제주시는 nx=53, ny=38**
- 기존 `nx=52, ny=38`은 제주시가 아닌 서귀포 남서쪽 외곽 지점을 가리킴
- 실제 위치와 다른 지점의 날씨를 가져오고 있었음

---

#### 2. 정오(12:00) 단일 시점만 샘플링 — 오전 비가 오후 맑음에 묻힘
**파일:** `src/api/weatherApi.ts`

```ts
// 수정 전 (오류): 정오 하나만 확인
if (item.category === 'SKY' && item.fcstTime === '1200') byDate[d].sky = item.fcstValue;
if (item.category === 'PTY' && item.fcstTime === '1200') byDate[d].pty = item.fcstValue;
```

- 기상청 단기예보는 1~3시간 간격으로 예보 데이터를 제공함
- 오전 6시에 비(PTY=1)가 왔다가 정오에 맑음(PTY=0, SKY=1)이 되면 → 앱은 "맑음"으로 표시
- 아이폰 날씨 앱은 하루 중 대표(주로 최악) 조건을 사용하므로 불일치 발생

```ts
// 수정 후: 6·9·12·15·18시 전체 시간대에서 하루 중 최악 조건 추출
const SAMPLE_TIMES = ['0600', '0900', '1200', '1500', '1800'];
const PTY_RANK: Record<string, number> = { '0': 0, '4': 1, '1': 2, '2': 3, '3': 3 };
const SKY_RANK: Record<string, number> = { '1': 0, '3': 1, '4': 2 };

// PTY(강수형태)와 SKY(하늘상태) 각각 최악 조건 선택
if (item.category === 'PTY' && SAMPLE_TIMES.includes(item.fcstTime)) {
  const cur = PTY_RANK[item.fcstValue] ?? 0;
  const prev = PTY_RANK[byDate[d].worstPty] ?? 0;
  if (cur > prev) byDate[d].worstPty = item.fcstValue;
}
```

PTY 우선순위: `없음(0) < 소나기(4) < 비(1) < 비+눈(2) = 눈(3)`  
SKY 우선순위: `맑음(1) < 구름많음(3) < 흐림(4)`

---

#### 3. 기본값이 '맑음'으로 강제 설정 — 데이터 누락 시 오류 발생
**파일:** `src/api/weatherApi.ts`

```ts
// 수정 전 (오류): sky 데이터가 없으면 '1'(맑음) 기본값으로 강제
condition: toCondition(v.sky ?? '1', v.pty ?? '0'),
```

- 12시 데이터가 없거나 API 응답에 SKY 항목이 누락되면 기본값 `'1'`(맑음)이 사용됨
- 실제로 비/흐림이어도 맑음으로 표시되는 원인

```ts
// 수정 후: 실제 데이터 존재 여부를 판별하여 fallback 처리
if (v && (v.worstPty !== '0' || v.worstSky !== '1' || v.tMin !== undefined)) {
  return {
    date: dateStr,
    condition: toCondition(v.worstSky, v.worstPty),
    ...
  };
}
// 실제 데이터가 없을 때만 mock으로 fallback
```

---

#### 4. numOfRows 부족 — 응답 데이터 잘림
**파일:** `src/api/weatherApi.ts`

```ts
// 수정 전
numOfRows: 1000,

// 수정 후
numOfRows: 1500,
```

- 기상청 단기예보는 3일치 × 약 14개 카테고리 × 시간대별 데이터 = 약 1000~1400행
- 기존 1000행 제한으로 D+2(3일째) 데이터가 잘릴 수 있었음
- 특히 12시 데이터가 페이지 밖으로 밀려 누락되면 해당 날짜가 "맑음" 기본값으로 표시됨

---

### 수정 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `src/api/weatherApi.ts` | 격자 좌표 nx=52 → nx=53 |
| `src/api/weatherApi.ts` | 12시 단일 샘플 → 06·09·12·15·18시 최악 조건 추출 |
| `src/api/weatherApi.ts` | 기본값 `'1'`(맑음) 강제 → 실제 데이터 유무 판별 후 fallback |
| `src/api/weatherApi.ts` | numOfRows 1000 → 1500 |

---

### 참고 — 기상청 단기예보 주요 코드값

**SKY (하늘상태)**
| 값 | 의미 |
|----|------|
| 1 | 맑음 |
| 3 | 구름많음 |
| 4 | 흐림 |

**PTY (강수형태)**
| 값 | 의미 |
|----|------|
| 0 | 없음 |
| 1 | 비 |
| 2 | 비/눈 |
| 3 | 눈 |
| 4 | 소나기 |

**제주도 격자 좌표**
| 지점 | nx | ny |
|------|----|----|
| 제주시 | 53 | 38 |
| 서귀포시 | 52 | 33 |

**단기예보 발표 시각:** 02, 05, 08, 11, 14, 17, 20, 23시 (매 3시간, 발표 후 10분 뒤 조회 가능)  
**중기예보 발표 시각:** 06, 18시 (하루 2회)  
**제주도 중기예보 지역코드:** `11H20201`
