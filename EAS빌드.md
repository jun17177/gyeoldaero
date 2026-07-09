# EAS 빌드 가이드 — 결대로

> Expo Go 없이 설치되는 "진짜 앱"을 만드는 절차. **앱 아이콘·스플래시는 이 빌드에서만 보입니다.**
> 설정(`eas.json`, 번들 ID)은 준비 완료 — 아래 명령만 순서대로 실행하면 됩니다.

## 사전 준비 (1회)
1. **Expo 계정** — https://expo.dev 무료 가입
2. 로그인:
   ```bash
   cd gyeoldaero-main
   npx eas-cli login
   ```
3. 프로젝트 연결 (app.json에 projectId 자동 추가됨):
   ```bash
   npx eas-cli init
   ```

## 빌드 명령

### ① iOS 시뮬레이터용 (가장 쉬움 — Apple 계정 불필요) ⭐추천
```bash
npx eas-cli build --platform ios --profile preview
```
- 클라우드에서 빌드 (~10-20분) → 완료되면 링크로 `.tar.gz` 다운로드
- 압축 풀고 `.app`을 시뮬레이터 창에 **드래그**하면 설치
- **홈 화면에서 결대로 아이콘 + 스플래시 확인 가능**

### ② Android APK (실기기 설치 — Play 계정 불필요) ⭐추천
```bash
npx eas-cli build --platform android --profile preview
```
- 완료 후 QR/링크로 폰에서 APK 직접 다운로드·설치
- 팀원 폰에 바로 배포 가능 (데모용 최적)

### ③ iOS 실기기 (Apple Developer 계정 $99/년 필요)
```bash
npx eas-cli build --platform ios --profile development
```
- 무료 Apple ID로는 제한적(7일 만료) — 데모는 ①②로 충분

## 참고
- 진행 상황: https://expo.dev 대시보드에서 실시간 확인
- 무료 플랜: 월 30회 빌드 (iOS 15/Android 15) — 캡스톤엔 충분
- `.env`의 `EXPO_PUBLIC_*` 값은 **빌드 시점에 번들에 박제**됨 — 서버 주소가 LAN IP면 그 네트워크에서만 AI 동작. 데모 전 IP 확인!
- 빌드 실패 시 로그 링크가 터미널에 출력됨 — 에러 메시지 공유하면 해결 도와드림

## 준비된 설정
| 파일 | 내용 |
|---|---|
| `eas.json` | development / preview(시뮬레이터·APK) / production 프로필 |
| `app.json` | 번들 ID `com.gyeoldaero.app` (iOS/Android), 아이콘·스플래시 |
