# 결대로 — 트러블슈팅 기록

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
