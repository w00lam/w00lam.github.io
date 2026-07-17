---
title: JPA 동시성 테스트에서 TransactionRequiredException을 만난 이유
date: 2026-01-18 17:00:00 +0900
categories: [Spring, JPA]
tags: [Spring, JPA, Transaction, Concurrency, Testing, PessimisticLock]
permalink: /posts/jpa-concurrency-transaction/
---

좌석 예약 시스템의 동시성 이슈를 검증하려고 Pessimistic Lock 기반의 임시 배정(TEMP_HOLD) 로직을 구현하고, 이를 멀티 스레드 통합 테스트로 확인하던 중에 예외를 만났다.

```text
No EntityManager with actual transaction available for current thread
cannot reliably process 'flush' call
jakarta.persistence.TransactionRequiredException
```

처음엔 테스트 설정이나 Gradle 문제를 의심했다. 하지만 진짜 원인은 트랜잭션 전파 전략과 JPA `flush`의 특성에 있었다.

이 글에서는 에러가 왜 났는지, 동시성 테스트에서 자주 저지르는 실수는 무엇인지, 그리고 락 경쟁을 제대로 검증하려면 테스트 구조를 어떻게 잡아야 하는지를 차례로 짚는다.

## 테스트 시나리오 개요

검증하고 싶었던 시나리오는 단순하다.

> 동일 좌석에 여러 사용자가 동시에 예약 요청을 보내더라도
> 임시 배정(TEMP_HOLD)은 단 1건만 성공해야 한다

그래서 테스트를 이렇게 구성했다.

- 3명의 사용자
- 동일한 Seat ID
- `ExecutorService` + `CountDownLatch`
- 최종적으로 `TEMP_HOLD` 상태의 Reservation이 1건인지 검증

관건은 각 스레드가 서로 다른 트랜잭션에서 경쟁하도록 만드는 것이었다.

## 테스트 클래스 설정

테스트 클래스에는 이런 설정을 줬다.

```java
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class SeatTempHoldConcurrencyTest {
    ...
}
```

이 설정에서 테스트 메서드 자체는 트랜잭션을 쓰지 않는다. 대신 각 스레드가 호출하는 서비스 로직마다 Spring이 새 트랜잭션을 열어 준다.

## 예외는 준비 단계에서 터졌다

동시성 로직에는 손도 대기 전에, 테스트 데이터를 준비하는 단계에서 에러가 났다.

```java
protected User createUser() {
    User saved = userRepository.save(user);
    em.flush(); // 💥 여기서 예외 발생
    return saved;
}
```
스택 트레이스를 따라가면 원인이 분명하다.

```text
TransactionRequiredException
 → EntityManager.flush()
 → createUser()
```

정리하면 이렇다. 테스트 클래스 전체가 NOT_SUPPORTED라 지금 스레드에는 활성 트랜잭션이 없는데, 그 상태로 EntityManager.flush()를 불렀으니 JPA 규칙을 어긴 셈이다.

## flush는 트랜잭션 안에서만 동작한다

JPA에서 어떤 동작이 트랜잭션을 요구하는지부터 보자.

|작업|	트랜잭션 필요 여부|
|---|---|
|`save` / `persist`|	❌ 없어도 가능
|`flush`|	✅ 반드시 필요

flush는 영속성 컨텍스트의 변경 내용을 그 자리에서 DB에 반영하는 작업이다. 그래서 트랜잭션 컨텍스트가 없으면 아예 동작하지 못한다.

## flush를 넣은 이유

동시성 테스트에서 `flush`는 빼놓을 수 없다. 데이터가 DB에 실제로 INSERT 되어야, 다른 스레드가 같은 Seat를 조회하며 경쟁에 뛰어들 수 있기 때문이다.

flush를 빼면 어떻게 될까. 테스트야 통과하겠지만, 실제로는 같은 트랜잭션 안에서만 돌기 때문에 거짓 양성(false positive)에 지나지 않는다. 락 경쟁 자체가 일어나지 않는 것이다.

## 해법: 테스트는 트랜잭션 밖에서, 준비는 트랜잭션 안에서

해결책은 생각보다 간단하다.

> 동시성 테스트 메서드는 트랜잭션을 걸지 않고,
> 테스트 데이터 준비 메서드만 트랜잭션으로 감싼다

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

## 이 구조가 가지는 의미

이렇게 잡으면 테스트 메서드에는 트랜잭션이 걸리지 않고, 각 스레드는 독립된 트랜잭션에서 경쟁한다. 준비 데이터는 안전하게 커밋되며, 흐름도 실제 운영 환경과 같아진다. 그제야 락을 검증할 수 있는 진짜 동시성 테스트가 된다.

## 흔히 하는 잘못된 해결 방법들
##### 테스트 클래스에 다시 @Transactional 붙이기

모든 스레드가 같은 트랜잭션을 공유하게 되니 락이 걸릴 이유가 사라진다. 이건 동시성 테스트라고 부르기 어렵다.

##### flush 제거

변경이 DB에 반영되지 않아 경쟁 자체가 생기지 않는다. 테스트에 초록불이 들어와도 믿을 수 없는 결과다.

## 마무리

> "동시성 테스트는 테스트 코드 설계 자체가 설계다."
