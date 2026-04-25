## 2. MatchCreateForm 수정 (src/pages/MatchCreateForm.tsx)

### 제거

- 총 인원 수 입력 필드 (maxPlayerCount, currentPlayerCount)

### 추가: 포지션 슬롯 빌더

- 포지션 선택 드롭다운 (Position enum 목록)
- 해당 포지션 모집 인원 입력 (숫자, 1 이상)
- "포지션 추가" 버튼 → 슬롯 목록에 추가
- 추가된 슬롯 목록을 태그/카드 형태로 표시 (삭제 버튼 포함)
- 같은 포지션 중복 추가 방지 (프론트 단 유효성)
- 최소 1개 슬롯 필수

### Zod 스키마 수정

`const positionSlotSchema = z.object({
  position: z.enum(['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST']),
  required: z.number().min(1)
});

const matchSchema = z.object({
  // 기존 필드 유지
  title: ...,
  slots: z.array(positionSlotSchema).min(1, '포지션을 1개 이상 추가하세요')
});`

### API 요청 body 변경

- 기존: { ..., maxPlayerCount, currentPlayerCount }
- 변경: { ..., slots: [{ position, required }, ...] }