# 결대로 API 키 설정 가이드

## 1. 파일 만들기

프로젝트 폴더에서 아래 경로에 파일을 새로 만드세요.

```
gyeoldaero/
└── src/
    └── constants/
        └── apiKeys.ts  ← 이 파일 새로 만들기
```

## 2. 내용 붙여넣기

`apiKeys.ts` 파일에 아래 내용을 그대로 복사해서 붙여넣으세요.

```typescript
export const TOUR_API_KEY = 'afab11578352eddddcb3ba080d6a97192ca45c5989a993aa57007e085209d334';

// 기상청 API 키 (data.go.kr에서 별도 발급 필요)
// 발급 전까지는 빈 문자열로 두면 앱이 자동으로 가짜 날씨 데이터를 사용합니다
export const WEATHER_API_KEY = '';
```

## 3. 확인

- 이 파일은 `.gitignore`에 등록되어 있어 **GitHub에는 올라가지 않습니다.**
- 파일을 만들고 나서 앱을 실행하면 명소 화면에서 실제 사진이 표시됩니다.
- `WEATHER_API_KEY`가 빈 문자열이면 날씨 화면은 **가짜 날씨(mock)** 로 동작합니다.  
  실제 기상청 데이터를 보려면 아래 "기상청 API 키 발급" 항목을 참고하세요.

---

## 기상청 API 키 발급 (선택 — 실제 날씨 표시 시 필요)

1. [data.go.kr](https://www.data.go.kr) 로그인
2. **기상청_단기예보** 검색 → "기상청 단기예보 조회서비스" 활용 신청
3. 마이페이지 → 일반 인증키(Decoding) 복사
4. `apiKeys.ts`의 `WEATHER_API_KEY`에 붙여넣기

```typescript
export const WEATHER_API_KEY = '여기에_발급받은_키_입력';
```

---

> ⚠️ 이 키는 외부에 공유하지 마세요.
