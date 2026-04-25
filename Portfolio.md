# 용병 매칭 플랫폼 — Mercenary

> 스포츠 경기에 인원이 부족할 때, 근처의 용병(대리 참가자)을 모집하고 참가 신청할 수 있는 위치 기반 매칭 서비스

---

## Overview

동네 풋살·농구·야구 등을 즐기다 보면 인원이 부족해 경기가 무산되는 일이 잦습니다.  
**Mercenary**는 경기 주최자가 매치를 등록하고, 주변의 용병을 모집할 수 있도록 연결해 주는 플랫폼입니다.

- 카카오 지도 기반으로 **내 주변 매치**를 실시간 탐색
- 주최자는 신청자를 **승인 / 거절** 하여 팀을 구성
- 동시에 수백 명이 신청해도 **정원 초과 없이** 처리

> 📸 **이미지 권장**: 서비스 메인 화면 캡처 (지도 + 매치 목록), 매치 상세 / 신청 흐름 스크린샷

---

## Tech Stack

### Backend
| 분류 | 기술 |
|---|---|
| Language / Framework | Java 17, Spring Boot 3.2.5 |
| Database | MySQL 8.0, Spring Data JPA |
| Cache / 위치검색 | Redis (Spring Cache, GEO) |
| 분산 락 | Redisson 3.27.0 |
| 인증 | Kakao OAuth 2.0, JWT (jjwt 0.11) |
| 외부 통신 | Spring WebFlux (WebClient) |
| 문서화 | SpringDoc OpenAPI (Swagger UI) |
| 테스트 | JUnit 5, Spring Security Test, H2 |
| 인프라 | Docker Compose, AWS EC2, GitHub Actions CI/CD |

### Frontend
| 분류 | 기술 |
|---|---|
| Language / Framework | TypeScript, React 19, Vite |
| 라우팅 | React Router v7 |
| 폼 / 유효성 검사 | React Hook Form, Zod |
| 지도 | Kakao Maps SDK |
| HTTP | Custom fetch wrapper (apiFetch) |

---

## Participants

| 역할 | 담당 |
|---|---|
| Backend | [본인 이름] |
| Frontend | [팀원 이름] |

> ※ 백엔드 전 영역(인증, 매치, 신청, 캐시, 분산 락, CI/CD)을 직접 설계·구현하였습니다.

---

## Key Features

### 1. 카카오 소셜 로그인 + JWT 인증
- Kakao OAuth 2.0 인가 코드를 백엔드에서 수신 → Kakao 서버와 토큰 교환 → 자체 JWT 발급
- `JwtAuthenticationFilter`가 모든 요청의 Bearer 토큰을 검증하여 `SecurityContext`에 사용자 정보 주입
- 신규 회원은 최초 로그인 시 자동 가입 처리

> 📸 **이미지 권장**: 로그인 화면 + 카카오 OAuth 인가 흐름 다이어그램

### 2. 위치 기반 매치 검색 (Redis GEO)
- 매치 등록 시 위도·경도를 **Redis GEO** 자료구조(`GEOADD`)에 저장
- 사용자가 반경 N km를 지정하면 `GEORADIUS` 명령 한 번으로 주변 매치 ID와 거리를 즉시 반환
- 거리순 정렬 후 프론트엔드 카카오 지도에 핀으로 표시

```
Redis GEO: matches:geo
  GEOADD matches:geo {longitude} {latitude} {matchId}
  GEORADIUS → [ (matchId, distanceKm), ... ]
```

> 📸 **이미지 권장**: 카카오 지도에 매치 핀이 표시된 화면

### 3. 매치 신청 / 승인 / 거절
- 용병은 원하는 매치에 참가 신청 → 상태: `READY → APPROVED / REJECTED / CANCELLED`
- 주최자 전용 신청 목록 조회, 개별 승인·거절 처리
- 정원 마감 시 `MatchStatus`가 자동으로 `CLOSED`로 전환

### 4. 동시성 제어 — Redisson 분산 락
- 인기 매치에 수백 명이 동시에 신청해도 정원 초과가 발생하지 않도록 **Redisson 분산 락** 적용
- 락 키: `match:{matchId}:lock`, 대기 5 초 / 점유 3 초

```
[Thread 1~100] ──┐
                  ├─→ tryLock("match:42:lock") ─→ 1명만 진입 ─→ DB 저장 ─→ unlock
[Thread 2~100] ──┘   (나머지 99명은 대기 또는 ConflictException)
```

### 5. Redis 캐싱
- 매치 목록(`GET /api/matches`) 및 매치 상세(`GET /api/matches/{id}`)에 `@Cacheable` 적용
- 매치 생성·수정·삭제 시 `@CacheEvict`로 즉시 무효화 → 조회 성능과 데이터 정합성 동시 확보

### 6. 만료 매치 자동 정리
- `ExpiredMatchCleanupScheduler`가 설정된 cron 주기마다 경기 일시가 지난 매치를 일괄 삭제
- Redis GEO 데이터도 함께 제거하여 위치 데이터 누적 방지

---

## Problem Solving

### 문제 1. 동시 신청으로 인한 정원 초과

**상황**  
100명이 동시에 9자리 남은 매치에 신청하면, DB `currentPlayerCount`를 읽고 검사한 뒤 저장하는 사이 Race Condition이 발생해 10명 이상 신청이 승인될 수 있습니다.

**시도 1 — DB 낙관적 락 (포기)**  
JPA `@Version`으로 시도했으나 충돌 시 예외가 빈번하게 발생하고, 재시도 로직이 복잡해져 UX가 저하됩니다.

**선택 — Redisson 분산 락**  
트랜잭션 시작 전에 락을 획득하도록 설계하여, 한 번에 한 스레드만 신청 로직을 실행하도록 보장했습니다.

```java
// ApplicationService.applyMatch()
public void applyMatch(Long matchId, Long userId) {
    executeWithMatchLock(matchId,
        () -> transactionTemplate.executeWithoutResult(
            status -> processApplication(matchId, userId)));
}
```

**검증 — 동시성 테스트**  
`ExecutorService` 스레드 풀 32개로 100개 스레드를 동시에 실행하여, 9자리 매치에 정확히 9명만 성공하는 것을 확인했습니다.

```java
// 100명 동시 신청 → 9명 성공, 91명 실패 검증
assertThat(successCount.get()).isEqualTo(9);
assertThat(applicationRepository.count()).isEqualTo(9);
assertThat(updatedMatch.getCurrentPlayerCount()).isEqualTo(10);
```

> 📸 **이미지 권장**: 동시성 테스트 결과 콘솔 / 테스트 통과 화면

---

### 문제 2. 위치 기반 검색 성능

**상황**  
매치를 DB에서 전체 조회 후 애플리케이션 레이어에서 거리 계산을 하면, 매치 수가 증가할수록 O(N) 연산이 병목이 됩니다.

**선택 — Redis GEO**  
Redis의 `GEORADIUS` 명령은 내부적으로 Geohash를 사용하여 O(N+log M) 복잡도로 특정 반경 내 항목만 빠르게 반환합니다.  
매치 ID 목록을 얻은 뒤 DB에 `findAllById`로 배치 조회하여 불필요한 전체 스캔을 제거했습니다.

---

### 문제 3. 테스트에서 시간 의존성 제거

**상황**  
`LocalDateTime.now()`를 서비스 내부에서 직접 호출하면, 만료 매치 필터링 로직을 테스트할 때 시스템 시각에 종속되어 결과가 불안정합니다.

**선택 — Clock Bean 주입**  
`TimeConfig`에서 `Clock` 빈을 등록하고 서비스에 주입했습니다. 테스트에서는 고정된 `Clock`을 `@MockBean`으로 대체하여 원하는 시각을 자유롭게 제어합니다.

```java
// 서비스
private LocalDateTime currentDateTime() {
    return LocalDateTime.now(appClock);  // Clock 주입
}

// 테스트
Clock fixedClock = Clock.fixed(Instant.parse("2025-06-01T10:00:00Z"), ZoneId.of("Asia/Seoul"));
```

---

## 추가 권장 섹션

> 아래 항목을 추가하면 포트폴리오 완성도가 높아집니다.

### Architecture Diagram
전체 서비스 흐름을 한 장으로 보여주면 좋습니다.

```
[React Frontend]
     │  Kakao OAuth code
     ▼
[Spring Boot API]  ─── JWT ──→  [JwtAuthenticationFilter]
     │                               │
     ├── MatchService ──→ MySQL      │
     ├── MatchLocationService ──→ Redis GEO
     ├── ApplicationService ──→ Redisson Lock ──→ MySQL
     └── ExpiredMatchCleanupScheduler (cron)
```

> 📸 **이미지 권장**: draw.io / Excalidraw 등으로 그린 아키텍처 다이어그램

### ERD
`members`, `matches`, `applications` 세 테이블의 관계도를 첨부하면 데이터 설계를 한눈에 보여줄 수 있습니다.

> 📸 **이미지 권장**: ERD 다이어그램 (MySQL Workbench, dbdiagram.io 등)

### API 명세
Swagger UI 화면 캡처 또는 주요 엔드포인트 테이블을 첨부하세요.

> 📸 **이미지 권장**: `/swagger-ui/index.html` 화면 캡처

### 성능 테스트 결과 (k6)
`k6/` 폴더가 이미 존재합니다. 부하 테스트 결과(TPS, P99 지연시간)를 그래프로 첨부하면 강점이 됩니다.

> 📸 **이미지 권장**: k6 결과 그래프 (http_req_duration, vus 추이)

---

## 개선 방향 / 추가 기능 제안

| 분류 | 아이디어 | 이유 |
|---|---|---|
| 기능 | **카카오 알림톡** — 신청 승인·거절 시 즉시 알림 발송 | `chatCount`, `viewCount` 필드가 이미 엔티티에 있어 확장 여지가 있음 |
| 기능 | **실시간 채팅** — 매치 참가자 간 채널 (WebSocket / STOMP) | 경기 당일 집결 장소 조율 등 실사용 니즈 |
| 기능 | **리뷰 / 매너 평점** — 경기 종료 후 상호 평가 | 용병 신뢰도 확보 |
| 성능 | **커서 기반 페이지네이션** — 매치 목록 무한스크롤 | 현재 오프셋 페이지네이션은 데이터 증가 시 성능 저하 가능 |
| 성능 | **Redis Cache TTL 정책 세분화** — 상세/목록 TTL 분리 | 현재 캐시 만료 전략이 CacheEvict 이벤트에만 의존 |
| 운영 | **Spring Actuator + Prometheus + Grafana** 모니터링 대시보드 구축 | Actuator 의존성은 이미 추가되어 있음 |
| 보안 | **Refresh Token** 도입 — Redis에 저장, Access Token 만료 시 재발급 | 현재 Access Token 단일 발급 구조 |
