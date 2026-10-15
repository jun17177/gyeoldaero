# AI 기능 선택 병합

원본: `jun17177/gyeoldaero`, `태겸_카카오맵` 브랜치의 `8e2343af613fbc50ab1fc05009ed9245dbf9d54a`.
이 병합은 현재 `main`(구 `태겸_네이버`)에 포함돼 있다.

- 홈의 자동 설정에서 자연어를 여행 조건으로 변환하고 확인 또는 수정합니다.
- 명소 선택 후 일정 생성 시 AI가 날짜별 방문 순서와 기간을 정합니다.
- 서버에서 시간 한도, 명소 누락 및 중복을 검증하고 필요하면 재시도합니다.
- 실패 시 기존 일정 알고리즘으로 대체합니다. 결과 화면에서 AI 동선인지 기본 동선인지 표시합니다.
- 기존 지도, 직접 입력 숙소, 일정 저장, 명소 추천, 수동 순서 편집과 Expo SDK 57 설정은 유지합니다.

## 실행

백엔드는 이 저장소의 `server/` 폴더에 있습니다. (병합 당시에는 형제 폴더 `../gyeoldaero-server`였으나
커밋 `4bdb01b`에서 `server/` 한 곳으로 일원화했습니다.)

1. `server/.env`에 `ANTHROPIC_API_KEY`를 설정합니다. 새 두 API(`/api/trip-settings`, `/api/route-plan`)는 Claude를 사용합니다.
2. `cd server && npm install && npm run dev`
3. 앱의 `EXPO_PUBLIC_SERVER_URL`을 휴대폰에서 접근 가능한 백엔드 주소로 설정합니다. 배포된 서버(Render)를 쓰면 이 단계는 기본값 그대로 됩니다.
4. 앱에서 `npx expo start --tunnel --port 8082`를 실행합니다.

별도 AI 서버를 사용하려면 `EXPO_PUBLIC_PLANNER_API_URL`로 주소를 지정할 수 있습니다.
`PLANNER_TOKEN`을 설정했다면 앱의 `EXPO_PUBLIC_PLANNER_API_TOKEN`도 같은 값으로 맞춥니다.
Expo 터널은 Metro 연결만 제공하므로 로컬 백엔드를 사용할 때 휴대폰과 컴퓨터는 같은 네트워크여야 합니다.

## 검증

- 앱: `npm test -- --runInBand`, `npx tsc --noEmit`
- 백엔드: `cd server && npm install && npm run typecheck && npx tsx --test tests/*.test.ts`
- 실제 AI 응답 검증은 서버의 API 키 설정이 필요합니다.
