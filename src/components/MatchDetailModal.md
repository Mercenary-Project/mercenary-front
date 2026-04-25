## 3. MatchDetailModal 수정 (src/components/MatchDetailModal.tsx)

### 제거

- "현재 X명 / 최대 Y명" 텍스트

### 추가: 포지션 현황 시각화

각 슬롯을 카드로 나열:

- 포지션명 (한글)
- "2 / 3명" 형태로 filled/required 표시
- available > 0: 초록색 "모집중"
- available === 0: 회색 "마감"

예시 레이아웃:



## 4. 신청 흐름 수정 (MatchDetailModal 내 신청 버튼)

### 기존

버튼 클릭 → 바로 신청 API 호출

### 변경

1. 버튼 클릭 → 포지션 선택 모달/드롭다운 표시
    - 모집중(available > 0)인 포지션만 선택 가능
    - 마감된 포지션은 비활성화(disabled) 처리
2. 포지션 선택 후 → 신청 API 호출 (position 포함)

### API 요청 body 변경

- 기존: {} (body 없음 또는 matchId만)
- 변경: { position: 'GK' }