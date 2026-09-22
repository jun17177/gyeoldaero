# 결대로 — 트러블슈팅 기록

---

## [2026-09-21] 저장된 일정 카드 — "저장일시" 대신 "여행 날짜 범위" 표시

### 배경
S5(WeatherScreen)에서 일정을 저장할 때 사용자는 날씨를 보고 날짜를 선택해서 저장하거나(`handleSave(true)`), 날짜 선택 없이 저장할 수 있다(`handleSave(false)`). 후자의 경우 `TripSchedule.startDate`는 `undefined`로 저장된다.

그런데 S0(SavedListScreen)의 카드는 정작 사용자가 고른 여행 날짜(`startDate`)가 아니라 **저장한 시각**(`createdAt`)을 "YYYY.MM.DD 저장"으로 보여주고 있었다. 여행 목록에서 필요한 정보는 "언제 저장했나"가 아니라 "언제 떠나는 여행인가"이므로 불일치.

### 결정
- 카드에는 `createdAt` 대신 `startDate` + `days`로 계산한 여행 기간(예: `10.03~10.05`)을 표시
- `startDate`가 없는 경우(날짜 미선택 저장) "날짜 미정"으로 표시해 레이아웃 통일
- 저장 일시 자체는 목록에 더 이상 노출하지 않음 (데이터로는 `createdAt` 유지, 정렬 등 내부 용도로만 사용 가능)

### 변경 내용

#### `src/screens/SavedListScreen.tsx`
```tsx
function formatDateRange(startDate: string | undefined, days: number) {
  if (!startDate) return '날짜 미정';

  const year = Number(startDate.slice(0, 4));
  const month = Number(startDate.slice(4, 6));
  const day = Number(startDate.slice(6, 8));
  const start = new Date(year, month - 1, day);
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(days - 1, 0));

  const fmt = (d: Date) => `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`;
  return days <= 1 ? fmt(start) : `${fmt(start)}~${fmt(end)}`;
}
```
`renderCard`에서 `item.createdAt` 포맷 대신 `formatDateRange(item.startDate, item.days)`를 카드 메타 텍스트로 사용.

---

## [2026-09-15] 식당을 한 번 고르면 다시 바꿀 수 없던 문제 — "확정 = 후보 목록 삭제" 설계의 부작용

### 요약
타임라인(S5)에서 점심/저녁의 "수정" 버튼으로 식당을 한 번 고르면, 그 이후로는 **"수정" 버튼 자체가 사라져 다시 바꿀 수 없었다.** 선택을 확정할 때 후보 목록을 통째로 버리고 고른 식당 하나만 남기는 구조였기 때문.

### 원인
`handleSelectMealOption()`이 선택된 식당으로 `options` 배열을 덮어썼다.

```tsx
// 문제 코드 — 후보 5개가 선택 즉시 1개로 줄어듦
items: dp.items.map((it, i) => i === itemIdx ? { ...it, options: [chosen] } : it),
```

그런데 "수정" 버튼의 노출 조건은 후보가 2개 이상일 때였다.

```tsx
const canEdit = item.type === 'spot' || (item.type === 'meal' && (item.options?.length ?? 0) > 1);
```

즉 **선택하는 행위가 그 자체로 버튼의 노출 조건을 깨뜨리는** 구조였다. 한 번 고르면 `options.length === 1`이 되어 `canEdit`이 `false`로 떨어지고, 버튼이 사라져 재선택 경로가 완전히 막혔다.

근본 원인은 "어느 식당이 선택되었나"를 **별도 필드가 아니라 배열의 길이로 표현**한 것. 선택 상태와 후보 목록이라는 별개의 정보가 한 필드에 얹혀 있어 한쪽을 표현하면 다른 쪽이 파괴됐다.

### 결정
선택 상태를 `selectedOption` 필드로 분리하고, 후보 목록은 **항상 전부 보존**한다. 대신 고른 곳을 배열 맨 앞으로 옮기고 색을 달리해 눈에 띄게 한다.

- 후보가 남아 있으므로 "수정" 버튼도 계속 노출 → 몇 번이든 재선택 가능
- 사용자는 자신이 고른 곳과 나머지 후보를 한눈에 같이 볼 수 있음

### 변경 내용

#### `src/types/index.ts`
`TimelineItem`에 선택 상태 필드 추가 — 후보 목록(`options`)과 분리.
```ts
options?: string[];
selectedOption?: string;
```

#### `src/screens/TimelineScreen.tsx`
```tsx
// 선택지를 전부 남겨둬야 나중에 다시 바꿀 수 있다 — 고른 곳만 맨 앞으로 옮긴다
items: dp.items.map((it, i) => i === itemIdx ? {
  ...it,
  options: [chosen, ...(it.options ?? []).filter(o => o !== chosen)],
  selectedOption: chosen,
} : it),
```
- 후보 목록 렌더링: 기존에는 `options.join(' / ')`로 전부 같은 색이었으나, 항목별 `<Text>`로 쪼개 **선택된 곳만 주황(`colors.warning`) + Bold**, 나머지는 `colors.textMuted` 회색으로 표시
- 식당 선택 모달: 현재 선택된 항목에 배경 하이라이트(`primaryLight`) + 체크 아이콘 + primary 컬러 적용 — 다시 열었을 때 지금 무엇이 골라져 있는지 바로 보임

#### `src/screens/BusinessHoursScreen.tsx`
`options.length === 1`로 "확정 여부"를 판별하던 로직이 위 변경으로 깨지므로 함께 수정. (2026-09-10 항목에서 만든 조건)
```tsx
// 사용자가 고른 식당만 실제 장소로 취급 — 후보만 있고 선택 전이면 미확정 상태
const chosenRestaurant = item.type === 'meal' ? item.selectedOption ?? null : null;
```

#### `src/algorithms/generateTimeline.ts`
사용자가 직접 담은 미식 명소가 식사 슬롯이 되는 경우는 이미 확정된 식당이므로 `selectedOption`을 함께 넣어준다. (이게 없으면 위 `BusinessHoursScreen` 조건에서 미확정으로 취급되어 링크가 사라짐)
```ts
options: [spot.name],
selectedOption: spot.name,
```

### 검증 (Expo web + Playwright로 전체 플로우 재현)
S0 → 직접 설정 → 미식·힐링·가을 → 명소 4곳(산굼부리·섭지코지·천제연폭포·한림공원) → 제주시 숙소 → 일정 최적화까지 실제 API 호출로 진행 후:

| 확인 항목 | 결과 |
|---|---|
| 1차 선택 — 3번째 후보 선택 | 목록이 `민박사봉평막국수 / 솜리식당 / 꾼짬뽕 / 운암정 / 우동카덴`으로 재정렬 (선택한 곳 맨 앞) |
| 선택 항목 스타일 | `rgb(217, 119, 6)` = `colors.warning`, `font-weight: 700` (나머지는 회색) |
| 선택 후 "수정" 버튼 | 그대로 유지 (기존 버그에서는 사라졌음) |
| 2차 재선택 — 다시 열어 "운암정" 선택 | 정상 동작, `운암정`이 맨 앞으로 이동 |
| 모달 재진입 시 현재 선택 표시 | 체크 아이콘 + 하이라이트 정상 |
| "영업시간 확인" 화면 연동 | 확정 식당명 정상 표시 (회귀 없음) |

`tsc --noEmit` 통과, 콘솔 에러 0건.

### 교훈
**상태를 자료구조의 부수적 성질(배열 길이)로 표현하면, 그 성질에 의존하는 다른 로직이 조용히 깨진다.** 이번엔 같은 조건(`options.length === 1`)을 `TimelineScreen`과 `BusinessHoursScreen` 두 곳이 서로 다른 의미로 읽고 있었다. 의미가 있는 상태는 이름 있는 필드로 명시하는 편이 안전하다.

---

## [2026-09-11] 타임라인 헤더가 여행 기간을 하루 부풀려 표시 — 일수를 박수로 잘못 계산

### 요약
결과 타임라인 화면 상단이 **"2박 3일"**로 표시되는데 실제 렌더링된 일정은 **DAY 1~2**뿐이었다. `calcTripDays()`가 돌려주는 값은 **일수**인데 화면에서 이를 **박수**로 취급해 `+1`을 더한 것이 원인.

### 어떻게 발견했나
발표자료에 넣을 실제 동작 스크린샷을 찍으려고 웹(`npx expo start --web`)으로 전체 플로우를 돌리다 발견했다. 헤더 숫자와 실제 DAY 블록 수가 맞지 않았다.

| 표시 | 실제 |
|------|------|
| 2박 3일 | DAY 1, DAY 2 (= 1박 2일) |

### 원인
`calcTripDays()`는 **일수**를 반환한다 — 하루에 다 도는 일정이면 `1`.

```ts
// timeBudget.ts
if (total <= firstDay) return 1;          // 당일치기 = 1
return Math.ceil(remaining / dailyMinutes) + 2;
```

그런데 TimelineScreen만 이 값을 박수로 읽었다.

```ts
// TimelineScreen.tsx — 수정 전
const d = schedule.days;
if (d <= 1) return '당일치기';
return `${d}박 ${d + 1}일`;   // days=2 → "2박 3일" (실제는 1박 2일)
```

`generateTimeline()`은 같은 값을 **일수**로 써서 `totalDays`만큼 DayPlan을 만들기 때문에, 화면에 그려지는 일정과 헤더 문구가 어긋났다.

### 왜 이 화면만 틀렸나
다른 화면은 처음부터 일수로 옳게 다루고 있었다. **TimelineScreen만 규칙에서 벗어나 있었다.**

```ts
// SavedListScreen.tsx
return `${days - 1}박${days}일`;
// WeatherScreen.tsx
return `${days - 1}박 ${days}일`;
```

즉 같은 `schedule.days`를 두고 화면마다 해석이 달라, 저장 목록에서는 "1박2일"인 일정이 타임라인에서는 "2박 3일"로 보였다.

### 대응
TimelineScreen의 계산식을 나머지 화면과 동일한 규칙으로 맞췄다.

```ts
// TimelineScreen.tsx — 수정 후
const d = schedule.days;
if (d <= 1) return '당일치기';
return `${d - 1}박 ${d}일`;
```

검증: `npx tsc --noEmit` 통과, 동일 조건(명소 4곳·짐 보통·가을)으로 재실행해 헤더 **"1박 2일"** ↔ DAY 1~2 일치 확인.

### 배운 점
- **같은 값을 여러 화면이 각자 해석하면 언젠가 어긋난다.** `days`가 일수인지 박수인지는 타입(`number`)만으로는 드러나지 않는다.
- 재발 방지책으로는 표기 함수를 한 곳에 두고(예: `formatTripDays(days)`를 공용 유틸로 추출) 모든 화면이 그것만 쓰게 하는 편이 낫다. 지금은 세 화면에 같은 식이 흩어져 있다.
- UI 문구 버그는 타입 검사로 못 잡는다. **실제로 앱을 돌려 화면을 봐야** 드러난다.

---

## [2026-09-11] 남은 명소가 조용히 사라짐 — 일수 산출과 실제 배치 로직의 불일치 (미해결)

### 요약
명소 4곳을 고르면 헤더는 **"명소 4곳"**이라고 표시하지만, 타임라인에는 **3곳만** 배치되고 나머지는 아무 안내 없이 사라진다.

### 재현
- 조건: 테마 힐링·미식 / 계절 가을 / 짐 보통 / 숙소 제주시
- 선택: 협재해수욕장 · 섭지코지 · 산굼부리 · 천제연폭포 (4곳)
- 결과: 1박 2일 · DAY 1에 산굼부리, 섭지코지 / DAY 2에 천제연폭포 → **협재해수욕장 누락**

### 원인 (분석)
두 로직이 서로 다른 기준으로 계산한다.

| | 기준 |
|---|---|
| `calcTripDays()` | 전체 명소의 체류+이동+식사+여유를 **총합**해 하루 가용시간으로 나눔 |
| `generateTimeline()` | 하루씩 **순차로 채우다가** 남은 식사 예산까지 고려해 안 들어가면 `break` |

```ts
// generateTimeline.ts
const remainingMealBudget = (addedLunch ? 0 : 60) + (addedDinner ? 0 : 60);
if (cursor + needed + remainingMealBudget > dayEnd) break;   // 남은 명소는 다음 날로 미뤄짐
```

마지막 날에서 `break`가 걸리면 **남은 명소는 어디에도 배치되지 못하고 그대로 버려진다.** 그리디 배치가 하루 용량을 비효율적으로 쓰는 경우(DAY 2에 명소 1곳만 들어감)가 생기는데, 총합 기준인 `calcTripDays()`는 그 손실을 모른다.

### 영향
사용자가 담은 명소가 **말없이 빠진다.** 경고도, 대체 제안도 없어 사용자는 왜 빠졌는지 알 수 없다.

### 해결 방향 (미적용)
1. 배치 후 남은 명소가 있으면 `totalDays`를 1 늘려 재배치 (수렴할 때까지 반복)
2. 또는 배치되지 못한 명소를 반환해 화면에서 "N곳은 일정에 담지 못했습니다 — 기간을 늘릴까요?"로 안내
3. 근본적으로는 일수 산출과 배치를 **같은 함수**가 담당하도록 통합

발표 시연에서는 **명소 3곳 이하**를 고르면 이 문제가 드러나지 않는다.

---

## [2026-09-10] 공개 저장소 git 이력에 data.go.kr 인증키 유출 — 재발급 및 재발 방지

### 요약
공개 저장소(`github.com/jun17177/gyeoldaero`)의 **git 이력에 실제 data.go.kr 인증키가 남아 있던 것을 발견**하고, 키를 재발급해 교체한 뒤 재발 방지 장치를 추가함.

### 어떻게 발생했나
문제는 "파일에서 지우면 끝"이라고 생각한 데서 비롯됨. 관련 커밋 3개:

| 순서 | 커밋 | 내용 |
|------|------|------|
| 1 | `5557840` | `docs: API 설정 가이드를 저장소 내로 이동…` ← **여기서 실제 키가 커밋됨** |
| 2 | `583a12b` | `security: API 가이드에서 실제 키 값 제거` ← 값만 지움 |
| 3 | `9992735` | `chore: 저장소 내 API 가이드 파일 제거` ← 파일 자체 삭제 |

2·3단계로 **현재 파일 트리에서는 키가 보이지 않지만, git은 이력에 원본을 그대로 보존**한다. `5557840` 커밋은 계속 `origin/main`에서 도달 가능한 상태였고, 저장소가 public이라 `git clone` 한 번이면 누구나 열람 가능했음.

원인이 된 파일은 팀원 간 키 공유용 `API_설정_가이드.md`. 저장소 **밖**에 두고 쓰던 문서인데, 이걸 저장소 안으로 옮기면서 사고가 남. `.gitignore`에는 `src/constants/apiKeys.ts`만 등록돼 있어 이 문서는 걸러지지 않았음.

### 왜 앞선 점검에서 못 잡았나
직전 보안 점검에서 이력을 검사했으나 **검색 범위를 `*.ts`/`*.tsx`로 한정**해서 `.md` 문서를 놓쳤음. "이력은 깨끗하다"고 잘못 결론 내렸음.

```bash
# 놓친 검사 — 확장자를 한정하면 문서에 든 키를 못 본다
git grep -nE "(TOUR|KAKAO|WEATHER)_API_KEY *= *['\"][^'\"]{10,}" $(git rev-list --all) -- '*.ts' '*.tsx'

# 실제로 필요한 검사 — 확장자 제한 없이 키 '형태'를 훑는다
git rev-list --all | while read c; do
  git grep -IlE "[0-9a-f]{32}|[A-Za-z0-9+/]{40,}={0,2}|%2B|%2F" $c 2>/dev/null
done | sort -u
```
> `package-lock.json`은 integrity 해시 때문에 항상 걸리므로 오탐으로 제외할 것.

### 영향 범위
| 키 | 유출 | 비고 |
|----|------|------|
| data.go.kr 인증키 | **유출됨** | 유출 시점의 키 = 당시 서비스에 쓰던 키 (해시 대조로 확인) |
| 카카오 REST 키 | 유출 안 됨 | 이력 전체 검색 결과 없음 |

data.go.kr은 **계정당 일반 인증키가 1개**라 `TOUR_API_KEY`와 `WEATHER_API_KEY`가 같은 값을 공유한다. 즉 **키 하나 유출로 TourAPI와 기상청 API가 동시에 노출**됨.

### 대응
1. **data.go.kr 인증키 재발급** (마이페이지 → 개인 API 인증키 → 재발급) 후 `apiKeys.ts`의 `TOUR_API_KEY`·`WEATHER_API_KEY` 양쪽 교체
   - 공개된 키는 회수가 불가능하므로(이미 clone·포크·검색 캐시에 남았을 수 있음) **재발급만이 실질적 해결책**. 이력 정리는 위생 조치일 뿐 재발급을 대체하지 못함
2. **`.gitignore`에 가이드 문서 패턴 추가** — 다시 저장소로 옮겨져도 차단되도록
```gitignore
# 키 값이 적힌 설정 가이드 — 저장소 안으로 옮겨져 실제 키가 커밋된 적이 있어 차단
API_설정_가이드.md
API_*_가이드.md
```
차단 동작 확인: 문서를 저장소로 복사해도 `git check-ignore`가 잡고 `git status`에 뜨지 않음.

### 재발급 후 검증
키를 붙여넣을 때 **따옴표가 빠져** 컴파일이 깨져 있었음 (`export const TOUR_API_KEY = d36d…;`) → `tsc`가 `TS2304: Cannot find name` 로 검출. 문자열로 감싼 뒤 재검증:

| 항목 | 결과 |
|------|------|
| `tsc --noEmit` | 통과 |
| TourAPI (`areaBasedList2`) | `resultCode 0000 (OK)` — 제주 명소 실데이터 반환 |
| 기상청 (`getVilageFcst`) | `resultCode 00 (NORMAL_SERVICE)` — 실제 기온 예보 반환 |
| 앱 전체 플로우 | 명소 선택 → 타임라인 → 날씨 → 저장 완주, 콘솔 에러 0건 |
| 날씨 실데이터 여부 | 21~29° 실측 범위 — mock(14~24° 고정 패턴)이 아님을 확인 |

### 배운 것 / 재발 방지
- **git에서 파일을 지워도 이력에는 남는다.** 커밋된 시크릿은 "지우기"가 아니라 **"재발급"**이 정답
- 시크릿 스캔은 **확장자를 한정하지 말 것** — 코드가 아니라 문서·설정·스크립트에서 새는 경우가 많음
- 키를 문서로 공유하면 그 문서가 언젠가 저장소로 들어온다. 공유는 메신저 DM 등 저장소 밖 경로로

### 재발급으로 끝나지 않았던 문제 — 옛 키가 폐기되지 않음
재발급 후 **옛 키로 API를 호출해 실제로 무효화됐는지 검증**했더니 두 API 모두 정상 응답했음.

| 검증 | 결과 |
|------|------|
| 옛 키 → TourAPI | `resultCode 0000 (OK)` — **여전히 유효** |
| 옛 키 → 기상청 | `resultCode 00 (NORMAL_SERVICE)` — **여전히 유효** |

data.go.kr **마이페이지 → 인증키 발급현황**을 확인해보니 원인이 드러남 — 이 화면은 발급 **이력**을 보여줄 뿐이고, 개별 키를 폐기하는 기능이 없음. "일반 인증키 재발급하기" 버튼만 존재하며, **재발급을 해도 이전 키가 자동 무효화되지 않고 둘 다 유효한 상태로 남는다.**

```
2026/09/10  재발급    d36d…  ← 새 키 (앱에 적용)
2026/05/22  신규발급  afab…  ← 유출된 키, 폐기 불가
```

> **교훈: 키를 재발급했다고 끝이 아니다. 옛 키가 실제로 거부되는지 반드시 호출해서 확인할 것.**

키 폐기가 불가능하므로 **"키가 발견되지 않게 하는 것"이 유일한 실질적 방어**가 되었고, 미뤄뒀던 이력 정리가 위생 조치가 아닌 주 대응책으로 격상됨.

### git 이력 정리 (실행 완료)
`git-filter-repo` 설치가 막혀 git 내장 `filter-branch`로 처리. 작업 디렉터리를 보호하기 위해 **별도 클론에서 수행**하고, 사전에 미커밋 작업분까지 포함해 전체 백업.

```bash
git clone https://github.com/jun17177/gyeoldaero.git repo && cd repo
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch --index-filter \
  'git rm --cached --ignore-unmatch "API_설정_가이드.md"' \
  --prune-empty -- --all
```

**작업 중 발견 — 브랜치가 main만 있는 게 아니었음:**

| 브랜치 | 유출 키 | main 대비 고유 커밋 | 처리 |
|--------|---------|--------------------|------|
| `main` | 있음 | — | force push |
| `현준` | 있음 | 0개 (이미 main에 병합) | force push |
| `태겸` | **없음** | 5개 (고유 작업) | **건드리지 않음** |

`태겸` 브랜치는 유출 커밋 이전에 분기해 키가 없었으므로 그대로 두어 Leeseogmin의 고유 작업 5개를 보존함. main만 정리했다면 `현준` 브랜치에 키가 남을 뻔했음.

**검증 결과**

| 항목 | 결과 |
|------|------|
| 코드 트리 해시 (재작성 전/후) | `bc10ec3c…` 동일 — **재작성으로 코드 변경 0** |
| main 커밋 수 | 17 → 14 (가이드 문서만 건드린 빈 커밋 3개 정리) |
| 새로 clone 후 전체 이력 키 검색 | 발견되지 않음 |
| 로컬 저장소 동기화 | 트리가 동일해 `git reset --soft origin/main`으로 이력만 교체 — 미커밋 작업 12개 파일 그대로 보존 |
| `tsc --noEmit` | 통과 |

### ⚠️ force push로도 완전히 지워지지 않음 (확인됨)
정리 후 GitHub API로 옛 커밋 접근 여부를 확인한 결과:

```
GET /repos/jun17177/gyeoldaero/commits/5557840…  →  HTTP 200
```

**정상적인 clone·브라우징에서는 사라졌지만, SHA를 아는 사람은 여전히 열람 가능하다.** GitHub이 unreachable 객체를 즉시 삭제하지 않기 때문. 완전 제거하려면 GitHub Support에 캐시된 뷰/객체 정리를 요청해야 함.

### 남은 작업
- **GitHub Support에 옛 커밋 객체 정리 요청** — 옛 키를 data.go.kr에서 폐기할 수 없으므로 이 단계까지 해야 노출이 실질적으로 닫힘
- **data.go.kr 고객센터(1566-0025)에 옛 키 폐기 요청** — UI에는 없지만 운영자 처리가 가능한지 확인
- **호출량 모니터링** — 마이페이지에서 일일 호출량이 튀면 제3자 사용 신호. 1차 심사에서 인증키로 호출건수를 확인하므로 통계 오염 여부도 함께 확인할 것
- 앱 번들 내 키 평문 포함 문제는 여전히 남아 있음 → 백엔드 프록시 도입 시 해결
- **팀원 재동기화 공지** — 아래 참고

### 팀원 안내 필요
`main`과 `현준` 브랜치의 이력이 바뀌었으므로 팀원은 그냥 `git pull`하면 안 됨(옛 이력이 되살아날 수 있음).

```bash
# 미커밋 작업이 있으면 먼저 백업/스태시한 뒤
git fetch origin
git reset --hard origin/main
```
`태겸` 브랜치는 손대지 않았으므로 해당 브랜치의 작업은 안전함.

### 수정 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `src/constants/apiKeys.ts` | 재발급 키로 교체 (gitignore 대상, 커밋 안 됨) |
| `.gitignore` | 키가 적힌 가이드 문서 패턴 차단 규칙 추가 |

---

## [2026-09-10] 전체 보안·오류 점검 및 수정 (숙소 좌표 불일치 / 무한 스피너 / axios 취약점)

### 배경
공모전 1차 심사 제출을 앞두고 코드 전반을 점검하다 발견한 문제들을 한 번에 정리. 가장 큰 건 **숙소 선택지 6개 중 4개가 실제로 동작하지 않던 문제**로, 에러가 나지 않아 지금까지 드러나지 않았음.

---

### 1. 숙소 좌표 키 불일치 — 선택지 6개 중 4개 무효 (가장 영향 큼)

**증상:** 애월·한림·중문·성산을 숙소로 골라도 제주시를 고른 것과 **완전히 동일한 일정**이 생성됨.

**원인:** 숙소 좌표 테이블이 두 파일에 중복 정의돼 있었는데 한쪽만 갱신되어 드리프트가 발생.

| 위치 | 보유 키 |
|------|---------|
| `SpotSelectScreen.tsx` (최신) | jejucity, aewol, hallim, jungmun, seogwipo, seongsan, custom |
| `generateTimeline.ts` (구버전 잔존) | airport, jejucity, seogwipo, **east**, **west**, custom |

`generateTimeline`에는 `aewol`·`hallim`·`jungmun`·`seongsan` 키가 아예 없어서
`ACCOMMODATION_COORDS[accommodation]`이 `undefined` → `?? jejucity` 폴백으로 **조용히 제주시 좌표로 대체**됨.

`accomCoords`는 ①`nearestNeighbor`의 동선 시작점 ②첫 이동시간 계산 ③첫 끼 맛집 검색 좌표에 모두 쓰이므로, 숙소를 어디로 잡든 제주시 기준으로 일정이 짜이고 있었음.

**근본 원인:** 타입이 `Record<string, ...>`이라 키가 빠져도 `tsc`가 잡지 못함 + 테이블 중복.

**수정:** `src/constants/accommodations.ts`로 단일 출처 통합 + 유니온 타입으로 고정
```ts
type AccommodationId = TripSchedule['accommodation'];
// Record<AccommodationId, ...>로 고정 — 선택지가 바뀌면 tsc가 누락된 키를 잡아준다
export const ACCOMMODATION_COORDS: Record<AccommodationId, { lat: number; lon: number }> = { ... };
```
좌표·라벨·선택지 목록 3종을 이 파일로 모으고, `generateTimeline`/`SpotSelectScreen`/`TimelineScreen`이 모두 여기서 import하도록 변경.

**타입 가드 동작 확인** — `jungmun` 키를 일부러 지우고 `tsc` 실행:
```
error TS2741: Property 'jungmun' is missing in type '{...}'
  but required in type 'Record<"jejucity" | "aewol" | ... | "custom", {...}>'
```

**수정 후 검증** — 동일한 명소 4곳으로 숙소만 바꿔 비교:
```
숙소: 제주시  순서: 별도봉 → 성판악 → 사라오름 → 수월봉  이동: 56/13/133분
             점심 후보: 별도봉오리사냥 / 우당도서관 구내식당 / 일품순두부 화북점
숙소: 중문    순서: 사라오름 → 성판악 → 별도봉             이동: 74/13/108분
             점심 후보: 중문색달해변 / 카오카오베이커리 / 색달해녀의집
```
동선·이동시간·맛집 추천이 모두 숙소에 맞게 달라짐 (수정 전에는 두 결과가 동일했음).

---

### 2. 실패 시 빠져나갈 수 없는 무한 스피너 3건

`generateTimeline`/`saveSchedule` 호출부에 `catch`가 없어 실패 시 `loading`·`saving`이 `true`로 고정됨. 특히 로딩 화면에는 뒤로가기 버튼이 없어 **앱을 강제 종료하는 것 외에 방법이 없었음**.

| 파일 | 문제 | 수정 |
|------|------|------|
| `WeatherScreen.tsx` | `handleSave`에 try/catch 없음 — 저장 실패 시 스피너 고정 | `try/catch/finally` + 실패 시 Alert, `finally`에서 `setSaving(false)` |
| `TimelineScreen.tsx` | `.then()`만 있고 `.catch()` 없음 | `.catch()` 추가 — Alert 후 `navigation.goBack()` |
| `BusinessHoursScreen.tsx` | 위와 동일 | 위와 동일 |
| `SavedListScreen.tsx` | `loadAllSchedules().then()` 미처리 rejection | `.catch()`로 로깅 |

---

### 3. axios 취약점 (HIGH)

`axios@1.15.2`는 HIGH 등급 취약점 영향 범위(1.0.0~1.17.0)에 포함. **직접 의존성이라 앱 번들에 실제로 탑재**되므로 `axios@1.20.0`으로 업그레이드.

```
수정 전: critical 1, high 3, moderate 18
수정 후: critical 1, high 1, moderate 18
```
남은 `shell-quote`(critical)·`ws`(high)는 각각 `react-devtools-core`, Metro 개발 서버 경유 —
**개발 도구 전용이라 릴리스 빌드에는 포함되지 않음**. 조치 불필요.

---

### 4. 스토어 등록 블로커 (`app.json`)

`android.package`와 `ios.bundleIdentifier`가 없어 EAS 빌드·스토어 등록 자체가 불가능한 상태였음. 앱 표시 이름도 `"gyeol"`이라 기기에 영문으로 노출됐음.

```jsonc
"name": "결대로",                              // gyeol → 결대로
"ios":     { "bundleIdentifier": "com.gyeoldaero.app", "buildNumber": "1" },
"android": { "package": "com.gyeoldaero.app", "versionCode": 1 }
```
> ⚠️ 번들 ID/패키지명은 **스토어에 최초 배포하고 나면 변경 불가**. 첫 업로드 전에 팀에서 확정할 것.

---

### 아직 미조치 (별도 논의 필요)

| 항목 | 내용 |
|------|------|
| **API 키 번들 노출** | `src/constants/apiKeys.ts`의 키 3개가 평문으로 앱 번들에 포함됨. RN은 `src/` 전체가 번들에 들어가므로 배포 시 추출 가능. 백엔드 프록시 필요(Claude API 연동 시 어차피 필요한 그 백엔드). 임시 완화책은 data.go.kr·카카오 콘솔의 앱/도메인 제한 + 쿼터 알림 <br>※ 이 점검에서 "git 이력은 깨끗하다"고 기록했으나 **오판이었음** — 아래 [2026-09-10] 키 유출 항목 참고 |
| **기기 시간대 의존** | `weatherApi.ts`가 `new Date()` 로컬 시간으로 기상청 발표시각을 계산. 기상청은 KST 고정이라 기기 시간대가 다르면 잘못된 `base_time` 조회 후 조용히 mock 폴백 |
| **외부 URL 무검증 실행** | `SpotDetailScreen.tsx`가 TourAPI HTML에서 정규식으로 뽑은 href를 스킴 검증 없이 `Linking.openURL`에 전달 |

---

### 수정 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `src/constants/accommodations.ts` | **신규** — 숙소 좌표·라벨·선택지 단일 출처, 유니온 타입으로 누락 방지 |
| `src/algorithms/generateTimeline.ts` | 구버전 좌표 테이블 제거 → 공용 상수 import |
| `src/screens/SpotSelectScreen.tsx` | 중복 좌표·선택지 테이블 제거 → 공용 상수 import |
| `src/screens/TimelineScreen.tsx` | 중복 라벨 테이블 제거, 일정 생성 실패 `.catch()` 추가 |
| `src/screens/BusinessHoursScreen.tsx` | 일정 생성 실패 `.catch()` 추가 |
| `src/screens/WeatherScreen.tsx` | `handleSave`에 try/catch/finally + 실패 Alert |
| `src/screens/SavedListScreen.tsx` | 일정 불러오기 `.catch()` 추가 |
| `package.json` | `axios` 1.15.2 → 1.20.0 (HIGH 취약점 해소) |
| `app.json` | 앱 이름 한글화, 번들 ID·패키지명·버전코드 추가 |

---

## [2026-09-10] BusinessHoursScreen("바로가기") 링크 노출 조건 오류 + 식당 확정 시 반영 안 되는 문제

### 배경
Expo Go로 실기기 확인 중 발견. `BusinessHoursScreen.tsx`가 `dayPlans`의 모든 항목에 예외 없이 링크 버튼을 붙이고 있었음:
- "숙소 출발"·"숙소 복귀"·"공항 출발"(`accommodation`)과 "이동"(`move`)은 실제 장소명이 아니라 라벨일 뿐인데도 `SEARCH_URL(item.name)`으로 "숙소 출발 제주" 같은 의미 없는 카카오맵 검색 링크가 걸림
- `TimelineScreen`에서 사용자가 "수정" 버튼으로 점심/저녁 식당을 특정 식당 하나로 확정해도(`item.options`가 1개짜리 배열이 됨), `BusinessHoursScreen`은 그 사실을 전혀 반영하지 않고 계속 제목을 "점심 식사"/"저녁 식사"로만 표시 — 정작 확정된 식당 이름과 그 식당으로의 링크가 안 보임

원인은 `BusinessHoursScreen`이 `item.type`이나 `item.options` 상태를 구분하지 않고 모든 행을 똑같이 렌더링했기 때문. 참고로 확정된 식당 데이터 자체는 이미 `TimelineScreen`이 `navigation.navigate('BusinessHours', { schedule: { ...schedule, dayPlans } })`로 최신 `dayPlans`를 넘겨주고 있어 정상 전달되고 있었음 — 문제는 전적으로 표시 로직에 있었음.

### 결정
- 링크 버튼은 실제 장소를 가리킬 때만 노출: `spot` 타입, 그리고 `meal` 타입 중 `options.length === 1`(식당이 하나로 확정된 경우)만 표시. `move`·`accommodation`과 아직 후보가 여러 개인(미확정) `meal`은 링크 없음
- 식당이 확정된 `meal` 항목은 기존 제목("점심 식사"/"저녁 식사") 아래에 확정된 식당 이름을 별도 줄로 표시하고, 링크도 그 식당 이름으로 카카오맵 검색되도록 변경

### 변경 내용

#### `src/screens/BusinessHoursScreen.tsx`
```tsx
// 식당이 확정된 식사(옵션 1개)만 실제 장소로 취급 — 후보가 여러 개면 아직 미확정 상태
const chosenRestaurant = item.type === 'meal' && item.options?.length === 1 ? item.options[0] : null;
// '이동'·'숙소 출발/복귀' 등은 실제 장소가 아니라 검색 링크가 무의미하므로 표시하지 않음
const showLink = item.type === 'spot' || !!chosenRestaurant;
const url = item.linkUrl ?? SEARCH_URL(chosenRestaurant ?? item.name);
```
- 확정된 식당명은 `itemRestaurant` 스타일(주황, `colors.warning`)로 제목 아래에 표시 — `TimelineScreen`의 `itemMealOpts`와 동일한 색상 계열로 통일

### 검증 (Expo web + Playwright로 전체 플로우 재현)
- 픽스 전: "숙소 출발", "이동" 행에도 링크 버튼 노출 확인 (버그 재현)
- 명소(스팟) 행: 링크 버튼 정상 유지
- 미확정 식사(후보 3개, 예: "별도봉오리사냥 / 우당도서관 구내식당 / 일품순두부 화북점"): 링크 버튼 없음, 제목 "점심 식사"만 표시
- `TimelineScreen`에서 "별도봉오리사냥"으로 확정 후 "영업시간 확인" 재진입 → "점심 식사" 아래 "별도봉오리사냥" 표시 + 링크 버튼 정상 생성 확인
- `tsc --noEmit` 통과, 콘솔 에러 0건

### 수정 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `src/screens/BusinessHoursScreen.tsx` | 링크 노출 조건을 `spot`/확정된 `meal`로 제한, 확정 식당명 표시 및 해당 식당으로 링크 연결 |

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
