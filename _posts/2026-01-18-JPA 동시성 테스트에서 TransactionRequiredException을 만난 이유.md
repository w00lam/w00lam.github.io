---
title: JPA 동시성 테스트에서 TransactionRequiredException을 만난 이유
date: 2026-01-18 17:00:00 +0900
categories: [Spring, JPA]
tags: [Spring, JPA, Transaction, Concurrency, Testing, PessimisticLock]
---

동시성 이슈를 검증하기 위해  
좌석 예약 시스템에 **Pessimistic Lock 기반의 임시 배정(TEMP_HOLD)** 로직을 구현하고,  
이를 **멀티 스레드 통합 테스트**로 검증하던 중 다음과 같은 예외를 마주했다.

```text
No EntityManager with actual transaction available for current thread
cannot reliably process 'flush' call
jakarta.persistence.TransactionRequiredException
```

처음에는 테스트 설정이나 Gradle 문제를 의심했지만,  
실제 원인은 **트랜잭션 전파 전략과 JPA `flush`의 특성**에 있었다.

이 글에서는 다음 내용을 정리한다.

- 왜 이 에러가 발생했는지
- 동시성 테스트에서 흔히 저지르는 실수는 무엇인지
- 실제로 의미 있는 동시성 테스트를 만들기 위한 올바른 구조는 무엇인지

---

## 테스트 시나리오 개요

검증하고 싶었던 시나리오는 단순하다.

> 동일 좌석에 대해 여러 사용자가 동시에 예약 요청을 보낼 경우  
> **임시 배정(TEMP_HOLD)은 단 1건만 성공해야 한다**

이를 위해 다음과 같은 테스트를 구성했다.

- 3명의 사용자
- 동일한 Seat ID
- `ExecutorService` + `CountDownLatch`
- 최종적으로 `TEMP_HOLD` 상태의 Reservation이 **1건인지 검증**

핵심 포인트는  
**각 스레드가 서로 다른 트랜잭션에서 경쟁하도록 만드는 것**이었다.

---

## 테스트 클래스 설정

이를 위해 테스트 클래스에 다음과 같은 설정을 적용했다.

```java
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class SeatTempHoldConcurrencyTest {
    ...
}
```

이 설정의 의미는 다음과 같다.

- 테스트 메서드 자체는 트랜잭션을 사용하지 않는다
- 각 스레드에서 호출되는 서비스 로직은  
  → Spring이 **새 트랜잭션을 생성**한다

---

## 그런데 왜 예외가 발생했을까?

에러는 **동시성 로직이 아니라 테스트 준비 단계**에서 발생했다.

```java
protected User createUser() {
    User saved = userRepository.save(user);
    em.flush(); // 💥 여기서 예외 발생
    return saved;
}
```
스택 트레이스를 보면 원인은 명확하다.

```text
TransactionRequiredException
 → EntityManager.flush()
 → createUser()
```

즉, 상황을 정리하면 다음과 같다.

- 테스트 클래스 전체가 NOT_SUPPORTED

- 현재 스레드에 활성 트랜잭션이 없음

- 그런데 EntityManager.flush() 호출

- → JPA 규칙 위반

---

## 핵심 원인: JPA에서 flush는 트랜잭션이 필요하다

JPA에서 주요 동작의 트랜잭션 요구 사항은 다음과 같다.

|작업|	트랜잭션 필요 여부|
|---|---|
|`save` / `persist`|	❌ 없어도 가능
|`flush`|	✅ 반드시 필요

flush는 영속성 컨텍스트의 변경 내용을
**즉시 DB에 반영하는 작업**이다.

따라서 **트랜잭션 컨텍스트 없이는 동작할 수 없다.**

---

## 그런데 flush는 왜 필요했을까?

동시성 테스트에서는 `flush`가 **선택이 아니라 필수**다.

- 데이터가 DB에 실제로 INSERT 되어야

- 다른 스레드가 같은 Seat를 조회하고 경쟁할 수 있다

만약 flush를 제거하면 어떻게 될까?

- 테스트는 통과할 수 있다

- 하지만 실제로는 같은 트랜잭션 안에서만 동작

- → **거짓 양성(false positive)** 테스트

즉, **락 경쟁 자체가 발생하지 않는다.**

---

## 정답 구조: 테스트는 트랜잭션 없이, 준비는 트랜잭션으로

해결 방법은 단순하면서도 명확하다.

> **동시성 테스트 메서드는 트랜잭션을 사용하지 않고,**
> **테스트 데이터 준비 메서드만 트랜잭션으로 감싼다**

##### 최종 구조
```java
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class SeatTempHoldConcurrencyTest {
    ...
}

@Transactional
protected User createUser() {
    userRepository.save(user);
    em.flush();
    return user;
}
```

또는 더 명확하게 의도를 드러내고 싶다면:

```java
@Transactional(propagation = Propagation.REQUIRES_NEW)
```

---

## 이 구조가 가지는 의미

- ✅ 테스트 메서드: 트랜잭션 없음

- ✅ 각 스레드: 독립 트랜잭션에서 경쟁

- ✅ 준비 데이터: 안전하게 커밋

- ✅ 실제 운영 환경과 동일한 흐름

👉 **락 검증이 가능한 진짜 동시성 테스트**

---

## 흔히 하는 잘못된 해결 방법들
##### ❌ 테스트 클래스에 다시 @Transactional 붙이기

- 모든 스레드가 같은 트랜잭션을 공유

- 락이 의미 없어짐

- 동시성 테스트가 아님

##### ❌ flush 제거

- DB에 반영되지 않음

- 경쟁 자체가 발생하지 않음

- 테스트는 통과하지만 신뢰 불가

---

## 마무리

> **“동시성 테스트는 테스트 코드 설계 자체가 설계다.”**
