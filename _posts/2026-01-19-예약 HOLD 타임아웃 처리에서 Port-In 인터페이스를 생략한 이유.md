---
title: "예약 HOLD 타임아웃 처리에서 Port-In 인터페이스를 생략한 이유"
date: 2026-01-19
categories: [Architecture, Design]
tags: [Hexagonal Architecture, Port-In, UseCase, Scheduler, Design Decision]
---

## 들어가며

예약 시스템을 구현하면서 대부분의 유스케이스는  
다음과 같은 구조로 작성해왔다.

- `MakeReservationUseCase`
- `ConfirmReservationUseCase`
- `DeductPointUseCase`

즉,

> **Port-In 인터페이스 → Application Service 구현**

이 구조는  
외부 요청(API, 메시지, 배치 등)의 진입 계약을 명확히 하고,  
애플리케이션 계층의 **의도를 드러내는 데 매우 효과적**이었다.

하지만 좌석 HOLD 타임아웃을 해제하는 기능,  
`ExpireReservationUseCase`를 설계하면서는  
**의도적으로 Port-In 인터페이스를 두지 않았다.**

이 글은 그 이유를 정리한 것이다.

---

## 모든 UseCase가 Port-In을 가져야 할까?

헥사고날 아키텍처에서 Port-In은 보통 다음 목적을 가진다.

- 외부 진입점의 **계약 정의**
- 유스케이스 단위의 **책임 명확화**
- 테스트 시 **대체 구현 가능성**

그래서 일반적인 호출 구조는 다음과 같다.

Controller / Scheduler
↓
UseCase (Port-In)
↓
Application Service

이 패턴은  
**외부에서 호출되는 유스케이스**에 매우 적합하다.

---

## 예약 만료 처리 유스케이스의 성격

좌석 HOLD 타임아웃 해제 로직의 실제 호출 흐름은 다음과 같다.

ReservationExpirationScheduler
↓
ExpireReservationService
↓
ReservationRepository

이 유스케이스의 특징은 명확했다.

- 외부 API로 노출되지 않는다
- 사용자 요청 기반이 아니다
- **오직 스케줄러에 의해서만 호출된다**
- 시스템 내부 상태를 정리하는 역할이다

즉,

> 사용자 행위에 대응하는 기능이 아니라  
> **시스템이 스스로 수행하는 운영 로직**에 가깝다.

---

## Port-In 인터페이스를 생략한 이유

### 1️⃣ 진입점이 단 하나였다

`ExpireReservation` 로직의 호출자는 스케줄러뿐이다.

- Controller ❌  
- Message Consumer ❌  
- 외부 API ❌  

다른 진입 가능성이 없는 상황에서  
Port-In 인터페이스는 **실질적인 가치를 제공하지 못했다.**

---

### 2️⃣ 계약으로서의 의미가 약했다

Port-In 인터페이스는 보통 다음 의미를 가진다.

> “이 기능은 **외부에서 사용할 수 있는 유스케이스**다”

하지만 예약 만료 처리는

- 사용자 관점의 기능이 아니라
- 내부 상태 정리를 위한 **메커니즘**이다

외부 계약으로 분리할 필요성이 낮았고,  
오히려 구조만 복잡해질 가능성이 컸다.

---

### 3️⃣ 테스트 전략상 인터페이스가 필요하지 않았다

이 로직은 보통 다음 방식으로 검증된다.

- 스케줄러 실행
- 실제 DB 상태 변화 확인
- 트랜잭션 / 락 동작 검증

Mocking을 통한 대체 구현보다는  
**통합 테스트가 더 의미 있는 영역**이었다.

따라서 Port-In을 통한 추상화보다  
Application Service를 직접 테스트하는 편이 적합했다.

---

## 최종 구조

결과적으로 구조는 다음과 같이 정리되었다.

Scheduler
↓
ExpireReservationService
↓
ReservationRepository

- 불필요한 추상화를 제거하고
- 이 로직은 **내부에서만 사용된다**는 의도를
- 구조 자체로 표현했다

---

## Port-In을 두는 것이 더 나았을 상황

물론 다음과 같은 요구가 생긴다면 판단은 달라질 수 있다.

- 관리자 API에서 수동 실행
- 배치 / 스케줄러 / 메시지 큐에서 공통 사용
- 운영 도구에서 트리거 가능성

이 경우에는

> **Port-In 인터페이스가 명확한 가치를 가진다.**

---

## 정리

- 모든 UseCase가 Port-In 인터페이스를 가져야 하는 것은 아니다
- `ExpireReservationUseCase`는  
  외부 계약이 아니라 **내부 운영 메커니즘**에 가까웠다
- 그래서 Port-In을 생략하고  
  Application Service로 직접 구현했다

---

## 한 줄 요약

> **추상화는 언제나 비용이다.  
> 확장 가능성이 없을 때는 과감히 생략하는 것도 설계다.**
