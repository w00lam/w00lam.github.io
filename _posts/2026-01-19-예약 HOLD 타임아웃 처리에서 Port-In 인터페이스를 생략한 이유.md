---
title: "예약 HOLD 타임아웃 처리에서 Port-In 인터페이스를 생략한 이유"
date: 2026-01-19
categories: [Architecture, Design]
tags: [Hexagonal Architecture, Port-In, UseCase, Scheduler, Design Decision]
permalink: /posts/hold-timeout-port-in/
---

## 들어가며

예약 시스템을 만들면서 대부분의 유스케이스는 이런 구조로 작성해왔다.

- `MakeReservationUseCase`
- `ConfirmReservationUseCase`
- `DeductPointUseCase`

Port-In 인터페이스를 두고 Application Service가 이를 구현하는 식이다. 이 구조는 외부 요청(API, 메시지, 배치 등)의 진입 계약을 분명히 하고, 애플리케이션 계층이 무엇을 하려는지 드러내는 데 효과적이었다.

그런데 좌석 HOLD 타임아웃을 해제하는 기능, `ExpireReservationUseCase`를 설계할 때는 일부러 Port-In 인터페이스를 두지 않았다. 왜 그랬는지 짚어본다.

## 모든 UseCase가 Port-In을 가져야 할까?

헥사고날 아키텍처에서 Port-In은 보통 이런 목적으로 쓴다.

- 외부 진입점의 계약 정의
- 유스케이스 단위의 책임 구분
- 테스트 시 대체 구현 가능성

그래서 일반적인 호출 구조는 이렇게 흐른다.

Controller / Scheduler
↓
UseCase (Port-In)
↓
Application Service

외부에서 호출되는 유스케이스라면 이 패턴이 잘 맞는다.

## 예약 만료 처리 유스케이스의 성격

좌석 HOLD 타임아웃 해제 로직의 실제 호출 흐름은 이렇다.

ReservationExpirationScheduler
↓
ExpireReservationService
↓
ReservationRepository

이 유스케이스의 특징은 뚜렷했다.

- 외부 API로 노출되지 않는다
- 사용자 요청 기반이 아니다
- 오직 스케줄러만 호출한다
- 시스템 내부 상태를 정리하는 역할이다

사용자 행위에 대응하는 기능이 아니라, 시스템이 스스로 돌리는 운영 로직인 셈이다.

## Port-In 인터페이스를 생략한 이유

### 1. 진입점이 단 하나였다

`ExpireReservation` 로직을 부르는 건 스케줄러뿐이다. Controller도, Message Consumer도, 외부 API도 이 로직을 건드리지 않는다.

진입 경로가 하나로 정해져 있는데 Port-In 인터페이스를 둬봐야 얻는 게 없었다.

### 2. 계약으로서의 의미가 약했다

Port-In 인터페이스는 보통 "이 기능은 외부에서 쓸 수 있는 유스케이스다"라고 선언하는 의미를 갖는다. 하지만 예약 만료 처리는 사용자 관점의 기능이 아니라 내부 상태를 정리하는 메커니즘이다.

외부 계약으로 떼어낼 이유가 약했고, 오히려 구조만 복잡해질 판이었다.

### 3. 테스트 전략상 인터페이스가 필요하지 않았다

이 로직은 보통 이렇게 검증한다.

- 스케줄러 실행
- 실제 DB 상태 변화 확인
- 트랜잭션 / 락 동작 검증

Mocking으로 대체 구현을 끼우기보다 통합 테스트가 더 의미 있는 영역이었다. 그러니 Port-In으로 추상화하기보다 Application Service를 직접 테스트하는 편이 나았다.

## 최종 구조

그렇게 구조는 이렇게 남았다.

Scheduler
↓
ExpireReservationService
↓
ReservationRepository

불필요한 추상화를 걷어내고, 이 로직은 내부에서만 쓴다는 의도를 구조 자체로 드러냈다.

## Port-In을 두는 것이 더 나았을 상황

물론 이런 요구가 생긴다면 판단은 달라질 수 있다.

- 관리자 API에서 수동 실행
- 배치 / 스케줄러 / 메시지 큐에서 공통 사용
- 운영 도구에서 트리거 가능성

이럴 때라면 Port-In 인터페이스가 제값을 한다.

## 정리

- 모든 UseCase가 Port-In 인터페이스를 가져야 하는 건 아니다
- `ExpireReservationUseCase`는 외부 계약이라기보다 내부 운영 메커니즘이었다
- 그래서 Port-In을 생략하고 Application Service로 직접 구현했다

## 한 줄 요약

추상화에는 늘 비용이 따른다. 확장될 일이 없다면 과감히 생략하는 것도 설계다.
