---
title: "포인트 결제 동시성은 어디서 막아야 할까: 조건부 UPDATE부터 Redis 분산 락까지"
date: 2026-07-15
categories: [TIL, Backend, Database]
tags: [Spring Boot, Transaction, Concurrency, Redis, Distributed Lock, Database, Idempotency, Backend, TIL]
permalink: /posts/point-payment-concurrency-design/
---

Coffee Order Service의 포인트 결제를 설계하면서 처음 떠올린 해법은 Redis 분산 락이었다. 결제처럼 정합성이 중요한 기능에 동시 요청이 들어온다면, 같은 사용자의 요청을 한 줄로 세워야 안전하다고 생각했다.

그런데 설계를 따라가다 보니 질문이 달라졌다.

> **정말 Redis가 있어야 포인트 잔액을 지킬 수 있을까? DB가 이미 원자적으로 처리할 수 있는 일까지 애플리케이션에서 잠가야 할까?**

이번 글에서는 포인트 10,000원을 가진 사용자가 7,000원 결제를 동시에 두 번 요청하는 상황부터 출발한다. 조건부 UPDATE, DB 트랜잭션, Redis 분산 락, 멱등성 키가 각각 어떤 실패를 막는지 나눠 보고, 현재 Coffee Order Service에는 어디까지 적용할지 정리해 본다.

## 1. 두 결제 요청이 같은 10,000원을 읽었다

단순하게 구현하면 포인트 결제는 다음 순서가 된다.

```text
포인트 조회
→ 잔액이 충분한지 확인
→ 애플리케이션에서 차감 후 잔액 계산
→ 변경된 잔액 저장
```

한 요청만 실행될 때는 문제가 없다. 초기 잔액이 10,000원이고 결제 금액이 7,000원이면 3,000원을 저장하면 된다.

문제는 요청 A와 B가 거의 동시에 들어올 때 생긴다.

```text
요청 A: 10,000원 조회 → 7,000원 차감 계산 → 3,000원 저장
요청 B: 10,000원 조회 → 7,000원 차감 계산 → 3,000원 저장
```

두 요청은 각각 결제에 성공했다고 판단한다. 실제 사용 금액은 14,000원인데 DB에는 최종 잔액 3,000원이 남는다. 한 트랜잭션의 변경이 다른 트랜잭션의 저장으로 덮였다. 이것이 Lost Update, 즉 갱신 손실이다.

![두 결제 요청이 같은 잔액을 읽고 각각 3,000원을 저장해 갱신 손실이 발생하는 과정](/assets/images/2026-07-15-point-payment-concurrency/point-payment-lost-update.png)

_두 요청 모두 같은 10,000원을 기준으로 판단했기 때문에 실제 사용 금액과 DB 잔액이 맞지 않게 된다._

## 2. 서버가 한 대여도 동시성 문제는 생긴다

분산 락이라는 이름 때문에 동시성 문제를 다중 서버의 문제로만 생각하기 쉽다. 하지만 서버 수는 문제의 출발점이 아니다.

Spring Boot 서버 한 대도 여러 요청을 여러 스레드에서 처리한다. 요청마다 별도 트랜잭션이 열리고, 같은 포인트 행을 비슷한 시점에 읽을 수 있다. 여러 서버는 경쟁에 참여하는 프로세스를 늘릴 뿐이다. 하나의 서버에서도 두 트랜잭션이 같은 상태를 읽고 나중에 저장하면 갱신 손실이 발생한다.

문제의 조건은 다음 두 가지면 충분하다.

- 여러 실행 흐름이 같은 자원에 접근한다.
- 읽은 값을 애플리케이션에서 계산한 뒤 다시 저장한다.

그래서 `synchronized`로 메서드를 감싸는 방식도 현재 JVM 안의 스레드만 제어한다. 인스턴스가 여러 대가 되면 다른 JVM의 요청까지 막지 못한다. 반대로 DB가 연산을 원자적으로 처리한다면 애플리케이션 인스턴스가 여러 대여도 잔액 자체는 지킬 수 있다.

## 3. `@Transactional`만 붙이면 해결될까

`@Transactional`은 메서드를 혼자 실행하게 만드는 잠금 장치가 아니다. 여러 DB 작업을 하나의 커밋 또는 롤백 단위로 묶는 기능에 가깝다.

예를 들어 두 트랜잭션이 각각 포인트를 조회하고 엔티티 값을 3,000원으로 바꾼다고 해 보자. 일반적인 격리 수준에서는 두 트랜잭션이 같은 10,000원을 읽을 수 있다. 각 트랜잭션 내부의 작업은 원자적으로 끝나더라도, 서로 같은 값을 읽었다는 사실까지 사라지지는 않는다.

```text
트랜잭션 A: 10,000원 조회 ---------------- 3,000원 저장
트랜잭션 B:       10,000원 조회 ---------------- 3,000원 저장
```

트랜잭션이 보장하는 원자성과 여러 트랜잭션 사이의 동시성 제어는 구분해야 한다. 비관적 락, 낙관적 락, 조건부 UPDATE 같은 별도 전략 없이 `@Transactional`만 추가했다고 Lost Update가 자동으로 막히지는 않는다.

## 4. 단순 차감은 조건부 UPDATE 하나로 막을 수 있다

포인트 결제에서 필요한 판단이 “현재 잔액이 결제 금액 이상인가?”뿐이라면 조회와 차감을 나누지 않아도 된다.

```sql
UPDATE point
SET balance = balance - :amount
WHERE user_id = :userId
  AND balance >= :amount;
```

이 SQL은 잔액 조건 검사와 차감을 하나의 DB 연산으로 처리한다. 같은 행을 갱신하는 요청이 겹치면 DB가 UPDATE를 조정하고, 각 요청의 조건은 실제 갱신 시점의 행을 기준으로 평가된다. 첫 요청이 10,000원에서 3,000원으로 차감한 뒤 두 번째 요청이 조건을 확인하면 `balance >= 7000`을 만족하지 못한다.

애플리케이션은 수정된 행 수만 확인하면 된다.

- 수정 행이 `1`이면 차감 성공
- 수정 행이 `0`이면 잔액 부족 또는 사용자 없음

![조건 검사와 차감을 하나의 DB 연산으로 처리하고 수정 행 수로 결과를 판단하는 흐름](/assets/images/2026-07-15-point-payment-concurrency/point-conditional-update.png)

_조건부 UPDATE는 잔액 확인과 차감 사이에 다른 요청이 끼어들 틈을 없앤다._

수정 행 `0`만으로 실패 원인을 바로 구분하기 어렵다는 한계는 남는다. 사용자 존재 여부와 잔액 부족을 다른 응답으로 보여줘야 한다면 실패한 경우에만 추가 조회를 하거나, 인증 단계에서 이미 확인한 사용자 정보를 활용한다. 성공 요청까지 항상 조회한 뒤 UPDATE할 필요는 없다.

이 방식의 장점은 분명하다. 별도 Redis 없이 DB만으로 잔액이 음수가 되는 상황을 막는다. 락 키, 만료 시간, Redis 장애 정책도 필요 없다. 단순 차감이라면 먼저 검토할 만한 출발점이다.

다만 이 판단은 실제 사용하는 DB 엔진, 격리 수준, 인덱스, UPDATE 실행 계획을 확인한다는 전제가 붙는다. `user_id`가 적절히 인덱싱되지 않으면 잠금 범위와 처리 비용이 예상보다 커질 수 있다.

## 5. 포인트 차감과 주문 저장은 같은 트랜잭션이어야 한다

조건부 UPDATE가 포인트 잔액을 지켜 주더라도 주문 전체가 안전해지는 것은 아니다.

```text
포인트 조건부 차감 성공
→ 주문 저장 실패
```

이 상태로 요청이 끝나면 포인트는 줄었지만 주문은 없다. 포인트와 주문이 같은 DB에 있다면 다음 작업을 하나의 트랜잭션으로 묶는 편이 맞다.

```text
포인트 조건부 차감
→ 주문 저장
→ 주문 상세 저장
→ 모두 성공하면 커밋
→ 하나라도 실패하면 전체 롤백
```

여기서 역할이 나뉜다. 조건부 UPDATE는 잔액 부족 차감을 막고, DB 트랜잭션은 차감과 주문 저장 사이의 부분 성공을 막는다.

```java
@Service
@RequiredArgsConstructor
public class OrderTransactionService {

    private final PointRepository pointRepository;
    private final OrderRepository orderRepository;

    @Transactional
    public OrderResult createOrder(OrderCommand command) {
        int updatedRows = pointRepository.deductIfEnough(
            command.userId(),
            command.totalAmount()
        );

        if (updatedRows == 0) {
            throw new InsufficientPointException();
        }

        Order order = orderRepository.save(
            Order.create(command.userId(), command.totalAmount())
        );

        return OrderResult.from(order);
    }
}
```

이 설명은 포인트와 주문이 같은 트랜잭션 자원에 있을 때 성립한다. DB가 나뉘거나 외부 결제 API가 포함되면 로컬 `@Transactional` 하나로 모두 롤백할 수 없다. 그때는 보상 처리, Outbox, 재시도 같은 별도 설계가 필요하다. Redis 분산 락을 추가해도 외부 시스템까지 원자적으로 묶이는 것은 아니다.

## 6. 조건부 UPDATE와 Redis 분산 락 중 무엇을 먼저 고를까

처음에는 “분산 환경이니 분산 락”이라고 연결했다. 지금은 다음 순서로 판단한다.

```text
DB의 원자적 연산으로 해결할 수 있는가?
→ 조건부 UPDATE나 DB 락으로 해결할 수 있는가?
→ 그래도 보호되지 않는 임계 구역이 남는가?
→ 남는다면 Redis 분산 락을 검토한다.
```

포인트가 단일 DB에 있고 필요한 작업이 잔액 차감뿐이라면 조건부 UPDATE가 더 작고 명확하다. Redis 왕복과 락 대기가 없고, 장애 지점과 운영 설정도 늘지 않는다.

분산 락은 DB의 한 문장으로 표현하기 어려운 실행 구간에서 가치가 커진다.

- 여러 서버가 같은 비즈니스 자원을 동시에 변경한다.
- 여러 테이블이나 저장소를 정해진 순서로 변경한다.
- DB 작업과 외부 API 호출 또는 메시지 발행을 포함한 긴 흐름의 동시 진입을 줄여야 한다.
- 쿠폰 발급, 한정 수량 주문, 좌석 선점처럼 한 자원을 두고 경쟁한다.

여기서도 분산 락은 동시 진입을 조정할 뿐이다. 여러 저장소의 원자성을 보장하거나 실패한 외부 호출을 되돌려 주지는 않는다. “서버가 여러 대다”보다 “DB 연산만으로 보호할 수 없는 임계 구역이 있는가”가 더 정확한 선택 기준이다.

## 7. 락 키는 보호할 자원의 크기와 맞춘다

같은 사용자의 포인트 결제만 직렬화하려면 사용자 식별자를 락 키에 포함한다.

```text
lock:point:{userId}
```

사용자 42의 결제끼리는 같은 락을 두고 경쟁하지만 사용자 43의 결제는 동시에 처리된다. 반면 `lock:point`처럼 전역 키 하나를 사용하면 모든 사용자의 결제가 한 줄로 선다. 정합성은 지킬 수 있어도 처리량을 불필요하게 낮춘다.

> **락의 범위는 보호하려는 비즈니스 자원의 식별자와 일치해야 한다.**

여러 자원을 한 번에 잠가야 한다면 이야기가 복잡해진다. 락 획득 순서가 달라지면 교착 상태와 긴 대기가 생길 수 있다. 가능하면 임계 구역과 락 개수를 줄이고, 여러 락이 꼭 필요하다면 획득 순서를 고정해야 한다.

## 8. 대기 시간과 유지 시간도 비즈니스 정책이다

분산 락 코드는 `lock()`과 `unlock()`으로 끝나지 않는다. 적어도 다음 질문에 답해야 한다.

- 락 획득을 몇 초 동안 기다릴 것인가?
- 기다려도 얻지 못하면 재시도 가능한 충돌로 볼 것인가, 서비스 장애로 볼 것인가?
- 락은 얼마 동안 유지할 것인가?
- 작업 시간이 예상보다 길어지면 어떻게 연장할 것인가?
- 서버가 중단되면 락은 언제 풀릴 것인가?

만료 시간이 없으면 락 소유 서버가 비정상 종료됐을 때 락이 남을 수 있다. 반대로 고정 lease time이 실제 작업보다 짧으면 더 위험하다. 첫 요청이 아직 주문을 저장하는 중인데 락이 만료되고, 두 번째 요청이 같은 임계 구역에 들어올 수 있기 때문이다.

작업 시간이 비교적 일정하면 최대 실행 시간과 여유 시간을 근거로 lease time을 정한다. 시간이 들쭉날쭉하다면 Redisson Watchdog처럼 락을 보유한 클라이언트가 살아 있는 동안 TTL을 연장하는 방식을 검토한다.

고정 lease time과 Watchdog은 구분해야 한다. 아래 코드의 `tryLock(3, 5, TimeUnit.SECONDS)`는 최대 3초를 기다리고, 획득한 락을 5초 뒤 자동 해제하는 명시적 lease time 방식이다. 작업이 5초를 넘을 수 있다면 이 값을 그대로 사용하면 안 된다. Watchdog을 사용할 때는 자동 연장이 적용되는 API 형태와 `lockWatchdogTimeout` 설정을 Redisson 버전에 맞춰 확인해야 한다.

Watchdog도 모든 멈춤을 해결하지 못한다. 긴 GC pause, 네트워크 단절, Redis 장애로 갱신이 늦어지면 락 소유권을 잃을 수 있다. 그래서 포인트 잔액의 최종 방어를 Redis에만 맡기지 않는다.

락 획득 실패 응답도 한 종류로 뭉개지 않는 편이 낫다. 정상적인 자원 경합이면 짧은 재시도를 안내할 수 있고, Redis 연결 장애라면 의존성 장애로 다뤄야 한다. 어떤 HTTP 상태와 재시도 정책을 쓸지는 서비스 계약으로 정하고 모니터링 지표에도 두 원인을 나눠 기록해야 한다.

## 9. 락을 잡고, 트랜잭션을 끝낸 뒤, 락을 푼다

Redis 락과 DB 트랜잭션을 함께 사용한다면 기대하는 순서는 다음과 같다.

```text
Redis 락 획득
→ DB 트랜잭션 시작
→ 포인트 차감
→ 주문 저장
→ DB 커밋
→ Redis 락 해제
```

중요한 경계는 커밋이다. 트랜잭션 메서드의 본문이 끝났다고 커밋까지 끝난 것은 아니다. Spring의 트랜잭션 프록시는 메서드가 반환된 뒤 커밋을 처리한다. 같은 메서드 안에서 락을 먼저 해제하면, 아직 커밋되지 않은 상태에서 다른 요청이 들어올 여지가 생긴다.

![Redis 락을 먼저 획득하고 DB 커밋이 끝난 뒤 해제하는 정상 흐름과 조기 해제 흐름 비교](/assets/images/2026-07-15-point-payment-concurrency/point-lock-transaction-flow.png)

_락이 트랜잭션 경계 바깥을 감싸야 DB 커밋이 완료될 때까지 같은 자원의 다음 요청을 기다리게 한다._

락 담당 서비스와 트랜잭션 담당 서비스를 나누면 이 순서가 코드에도 드러난다.

```java
@Component
@RequiredArgsConstructor
public class PointLockService {

    private final RedissonClient redissonClient;
    private final OrderTransactionService orderTransactionService;

    public OrderResult createOrderWithLock(OrderCommand command) {
        RLock lock = redissonClient.getLock(
            "lock:point:" + command.userId()
        );

        boolean acquired = false;

        try {
            acquired = lock.tryLock(3, 5, TimeUnit.SECONDS);

            if (!acquired) {
                throw new LockAcquisitionException();
            }

            return orderTransactionService.createOrder(command);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new LockAcquisitionException(e);
        } finally {
            if (acquired && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }
}
```

`orderTransactionService.createOrder()`가 프록시를 거쳐 반환되는 시점에는 트랜잭션 커밋이 끝난다. 그다음 `finally`에서 락을 해제한다. 반대로 한 클래스 내부에서 `this.createOrder()`처럼 호출하면 프록시를 우회할 수 있으므로 서비스 분리는 실행 순서를 명확하게 만드는 데도 도움이 된다.

예시는 구조를 보여주기 위해 단순화했다. 실제 적용 전에는 lease time, Watchdog 사용 여부, 예외 변환, 관측 지표, Redis 장애 시 fail-open 또는 fail-closed 정책을 따로 정해야 한다.

## 10. Redis 락을 써도 조건부 UPDATE는 남긴다

분산 락을 도입하면 모든 포인트 차감 경로가 락을 거친다고 믿고 싶어진다. 하지만 운영 중에는 전제가 쉽게 깨진다.

- lease time이 작업보다 먼저 끝난다.
- 네트워크 지연이나 Redis 장애가 발생한다.
- 락 키의 자원 범위를 잘못 정한다.
- 배치나 관리자 기능이 락을 거치지 않는다.
- 새 API를 추가하면서 락 적용을 빠뜨린다.

Redisson의 일반적인 분산 락은 참여한 클라이언트가 같은 락 규칙을 지킬 때 효과가 있는 협력적 제어 장치다. DB는 락을 모르는 경로에서도 마지막 UPDATE 조건을 검사한다.

```sql
UPDATE point
SET balance = balance - :amount
WHERE user_id = :userId
  AND balance >= :amount;
```

그래서 Redis 락을 쓰더라도 조건부 UPDATE를 제거하지 않는 편이 안전하다. 락은 동일 자원의 동시 실행을 줄이고, DB는 잔액 부족 차감을 최종 차단한다.

## 11. 락과 멱등성은 막는 요청이 다르다

같은 주문 요청이 네트워크 재시도로 두 번 도착했다고 가정해 보자.

```text
첫 요청: 락 획득 → 주문 생성 → 커밋 → 락 해제
재시도: 락 획득 → 같은 주문 다시 생성
```

두 요청이 동시에 실행되지 않았으므로 분산 락은 정상 동작했다. 그런데 중복 주문은 생겼다. 락은 같은 시점의 실행을 조정할 뿐, 시간이 지난 뒤 돌아온 동일 요청을 기억하지 않기 때문이다.

중복 실행은 `idempotencyKey`와 DB 고유 제약으로 별도 방어해야 한다.

```sql
ALTER TABLE orders
ADD CONSTRAINT uk_orders_idempotency_key
UNIQUE (idempotency_key);
```

서버는 같은 키로 완료된 주문이 있다면 저장된 결과를 반환한다. 같은 멱등성 키인데 사용자, 상품, 금액 같은 요청 내용이 다르면 새 주문으로 처리하기보다 충돌로 거절하는 편이 안전하다. 이를 위해 키와 함께 요청 본문의 해시를 저장하는 방식도 고려 대상이다.

역할을 짧게 나누면 이렇다.

```text
Redis 분산 락       → 동일 자원에 대한 동시 실행 제어
DB 조건부 UPDATE    → 잔액 부족 상태의 차감을 최종 차단
DB 트랜잭션         → 포인트 차감과 주문 저장의 원자성 보장
멱등성 키           → 동일 요청의 중복 실행 방지
```

## 12. Coffee Order Service에는 어디까지 적용할까

현재 학습 단계의 Coffee Order Service를 다음 조건으로 가정했다.

- 포인트와 주문은 같은 관계형 DB에 저장한다.
- 포인트 결제의 핵심 판단은 잔액이 주문 금액 이상인지다.
- 한 주문 요청 안에서 포인트 차감과 주문 저장이 함께 성공해야 한다.
- 동일 요청의 네트워크 재시도가 발생할 수 있다.

이 조건에서는 Redis 분산 락을 기본 해법으로 두지 않기로 했다.

```text
1. DB 조건부 UPDATE로 잔액 부족 차감을 차단한다.
2. 포인트 차감과 주문 저장을 하나의 DB 트랜잭션으로 묶는다.
3. 주문 멱등성 키에 고유 제약을 둔다.
4. 동시성 테스트로 10,000원에 7,000원 요청 두 개를 실행한다.
5. 임계 구역이 여러 저장소나 외부 작업으로 커질 때 Redis 락을 다시 검토한다.
```

Redis 락을 보류한다고 동시성 제어를 포기한 것은 아니다. 문제를 가장 가까운 저장소에서, 더 적은 구성 요소로 해결하는 선택이다.

향후 쿠폰 차감이나 한정 수량 원두 주문처럼 여러 자원을 한 흐름에서 다루게 되거나, DB 밖의 작업까지 같은 사용자 단위로 직렬화할 필요가 생긴다면 `lock:point:{userId}` 형태의 락을 추가로 검토한다. 그때도 조건부 UPDATE, DB 트랜잭션, 멱등성 키는 유지한다.

![Redis 분산 락, DB 조건부 UPDATE, DB 트랜잭션, 멱등성 키가 서로 다른 실패를 막는 구조](/assets/images/2026-07-15-point-payment-concurrency/point-consistency-layers.png)

_하나의 기술이 결제 정합성을 전부 맡는 것이 아니라, 각 계층이 서로 다른 실패를 방어한다._

## 13. 학습 후 바뀐 생각

처음에는 포인트 결제의 동시성 문제라면 Redis 분산 락이 필요하다고 생각했다. 지금은 자원의 저장 위치와 변경 방식을 먼저 본다. 포인트가 단일 DB에 있고 잔액 확인과 차감을 조건부 UPDATE 하나로 표현한다면, Redis 없이도 잔액 정합성을 지킨다.

분산 환경이라는 말은 분산 락을 선택할 충분한 이유가 아니었다. 보호할 자원이 어디에 있는지, 트랜잭션은 어디까지 묶이는지, 동시에 실행되면 안 되는 구간이 실제로 어디인지가 먼저다.

Redis 분산 락이 필요한 상황에서도 DB 방어선을 없애서는 안 된다. 락은 동시 실행을 줄이고, 조건부 UPDATE는 잘못된 차감을 막는다. DB 트랜잭션은 주문과 포인트의 부분 성공을 막고, 멱등성 키는 재시도로 들어온 같은 요청을 알아본다.

이번 학습에서 얻은 결론은 특정 기술의 우열이 아니다.

> **하나의 기술로 모든 실패를 막으려 하지 말고, 각 기술이 보장하는 범위를 구분해야 한다.**

## 핵심 요약

- 서버가 한 대여도 여러 스레드와 트랜잭션이 같은 값을 읽으면 Lost Update가 발생한다.
- 단순 포인트 차감은 조건부 UPDATE로 잔액 확인과 차감을 원자적으로 처리한다.
- `@Transactional`은 동시 실행 자체가 아니라 포인트 차감과 주문 저장의 커밋·롤백 단위를 보장한다.
- Redis 분산 락은 DB 한 번의 연산으로 보호하기 어려운 임계 구역이 남을 때 검토하며, 락 키는 비즈니스 자원의 식별자와 맞춘다.
- Redis 락을 쓰더라도 DB 조건부 UPDATE를 최종 정합성 방어선으로 유지한다.
- 락은 동시 실행을 제어하고, 멱등성 키는 시간 차이를 두고 들어온 동일 요청의 중복 처리를 막는다.

## 함께 읽으면 좋은 글

- [동시성 문제를 이해하면서 정리한 생각 — 왜 락이 필요할까](/posts/concurrency-control-strategy/)
  - 원자적 쿼리, 낙관적 락, 비관적 락, 분산 락을 더 넓은 범위에서 비교한 글이다. 이번 글에서는 그중 원자적 쿼리와 분산 락의 선택을 포인트 결제에 좁혀 판단했다.
- [락과 트랜잭션 경계 분리: 좌석 예약을 구현하며 배운 실무 패턴](/posts/lock-transaction-boundary/)
  - 락이 트랜잭션 바깥을 감싸고 커밋 뒤에 해제되어야 하는 이유를 좌석 예약 사례로 정리한 글이다.
- [PortOne 결제 연동에서 배운 보상 트랜잭션 설계](/posts/payment-architecture-retrospective/)
  - 같은 DB 트랜잭션으로 묶을 수 없는 외부 PG와 내부 주문 처리 사이의 실패를 어떻게 바라볼지 연결해서 읽을 수 있다.

## 참고 자료

- [Redisson 공식 문서: Locks and synchronizers](https://redisson.pro/docs/data-and-services/locks-and-synchronizers/)
