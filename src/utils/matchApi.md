## 7. matchApi.ts 수정 (src/utils/matchApi.ts)

### DTO 파싱 함수 수정

- slots 필드 파싱 추가
- maxPlayerCount/currentPlayerCount 관련 코드 제거

### 신규 함수

- applyToMatch(matchId: number, position: Position): Promise<void> → POST /api/applications/{matchId} body: { position }