# Mercenary Frontend

React + TypeScript + Vite 기반의 용병 매칭 프론트엔드입니다.

지도 기반으로 경기 모집글을 조회하고, 로그인 후 모집글 작성, 참가 신청, 신청자 관리, 마이페이지 기반 내 게시글 관리를 할 수 있습니다.

## 실행 방법

### 요구 사항

- Node.js 18 이상 권장
- npm 사용

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

기본 개발 주소:

```bash
http://localhost:5173
```

### 린트

```bash
npm run lint
```

### 타입 체크 + 빌드

```bash
npm run build
```

## 환경 및 연동 정보

프론트는 아래 백엔드 API를 기준으로 동작합니다.

- `POST /api/auth/kakao`
- `POST /api/auth/dev-login`
- `GET /api/matches/nearby`
- `POST /api/matches`
- `GET /api/matches/{matchId}`
- `POST /api/matches/{matchId}/apply`
- `GET /api/matches/{matchId}/application/me`
- `GET /api/matches/{matchId}/applications`
- `PATCH /api/matches/{matchId}/applications/{applicationId}`
- `GET /api/matches/my`

인증 응답 규약:

```json
{
  "code": "SUCCESS",
  "message": "로그인 성공",
  "data": {
    "accessToken": "jwt-token",
    "memberId": 1,
    "nickname": "mercenary-user"
  }
}
```

개발용 로그인 엔드포인트는 환경변수로 변경할 수 있습니다.

```bash
VITE_DEV_LOGIN_ENDPOINT=/api/auth/dev-login
```

## 주요 기능

### 메인 보드

- 현재 위치 또는 검색 지역 기준 주변 경기 조회
- 지도 마커 및 목록 형태로 모집글 확인
- 모집글 상세 모달 진입

관련 코드:

- [src/pages/MainBoard.tsx](./src/pages/MainBoard.tsx)
- [src/components/MatchDetailModal.tsx](./src/components/MatchDetailModal.tsx)

### 로그인

- 카카오 OAuth 로그인 콜백 처리
- 개발 환경용 테스트 로그인 지원
- 로그인 상태를 `localStorage` + auth change 이벤트로 동기화

관련 코드:

- [src/pages/Login.tsx](./src/pages/Login.tsx)
- [src/pages/LoginCallback.tsx](./src/pages/LoginCallback.tsx)
- [src/utils/auth.ts](./src/utils/auth.ts)

### 경기 작성

- 제목, 내용, 시간, 모집 인원 입력
- 카카오 지도/검색 기반 장소 선택

관련 코드:

- [src/pages/MatchCreateForm.tsx](./src/pages/MatchCreateForm.tsx)
- [src/components/MatchCreateForm.css](./src/components/MatchCreateForm.css)

### 신청 및 신청자 관리

- 로그인 사용자의 참가 신청
- 작성자의 신청자 목록 조회
- 승인/거절 처리

관련 코드:

- [src/components/MatchDetailModal.tsx](./src/components/MatchDetailModal.tsx)
- [src/utils/matchApi.ts](./src/utils/matchApi.ts)

### 마이페이지

- 로그인 사용자가 작성한 모집글 목록 조회
- 게시글별 신청자 목록 펼침
- 마이페이지 안에서 신청 승인/거절 처리

관련 코드:

- [src/pages/MyMatchesPage.tsx](./src/pages/MyMatchesPage.tsx)

## 폴더 구조

```text
src/
  components/
    MatchCreateForm.css
    MatchDetail.tsx
    MatchDetailModal.tsx
    MatchList.tsx
    MatchMap.tsx
  pages/
    Login.tsx
    LoginCallback.tsx
    MainBoard.tsx
    MatchCreateForm.tsx
    MyMatchesPage.tsx
  utils/
    auth.ts
    matchApi.ts
  App.tsx
  main.tsx
  index.css
```

## 개발 규칙

- API 응답의 `data` 필드를 우선 기준으로 파싱합니다.
- 인증 토큰 저장/삭제는 `src/utils/auth.ts`를 통해 처리합니다.
- 마이페이지는 `GET /api/matches/my`를 기준으로 동작합니다.
- 신청자 관련 포맷팅 및 응답 파싱은 `src/utils/matchApi.ts`를 재사용합니다.
- 대규모 포맷 변경보다 필요한 범위만 수정하는 방향을 우선합니다.

## 자주 발생하는 이슈와 해결법

### 1. `npm` 실행이 PowerShell에서 막히는 경우

PowerShell 실행 정책 때문에 `npm.ps1`이 막히면 아래처럼 `npm.cmd`를 사용합니다.

```bash
npm.cmd run lint
npx.cmd tsc -b
```

### 2. 로그인 후 다시 로그인 페이지로 이동하는 경우

- 브라우저 `localStorage`에 `accessToken` 저장 여부 확인
- `/api/auth/kakao`, `/api/auth/dev-login` 응답이 `data.accessToken` 형태인지 확인
- `/api/matches/my` 호출 시 `401/403/500` 상태코드 확인

### 3. 마이페이지에서 목록이 비어 보이는 경우

- 백엔드가 `GET /api/matches/my`에서 `200 + []`를 반환하는지 확인
- 작성자 기준 조회가 로그인 사용자 `memberId`와 정확히 매핑되는지 확인

### 4. 빌드 중 `spawn EPERM`이 발생하는 경우

- 로컬 환경 또는 보안 정책에서 Vite/rolldown의 프로세스 실행이 막힐 수 있습니다.
- 이 경우 먼저 아래 명령으로 타입 체크를 분리해서 확인합니다.

```bash
npx.cmd tsc -b
```

## 참고

현재 README는 실제 프로젝트 구조와 최근 추가된 마이페이지/인증 흐름을 기준으로 작성되었습니다.
