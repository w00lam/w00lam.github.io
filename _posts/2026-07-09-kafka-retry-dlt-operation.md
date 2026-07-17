---
title: "Kafka 재처리와 DLT는 예외 처리가 아니라 운영 설계다"
date: 2026-07-09
categories: [Backend, Kafka]
tags: [Kafka, MessageQueue, EventDriven, Retry, DLT, Idempotency, TIL]
permalink: /posts/kafka-retry-dlt-operation/
---

## 들어가며

Kafka를 처음 보면 Producer가 메시지를 보내고 Consumer가 메시지를 처리하는 구조가 먼저 보인다. 나도 처음에는 "주문 서비스가 이벤트를 발행하고, 결제나 포인트 서비스가 구독해서 처리하면 되겠구나" 정도로 이해했다.

하지만 공부할수록 더 중요한 질문은 메시지를 보내는 방법이 아니었다. Consumer가 처리하다 실패하면 어떻게 할 것인가, 같은 메시지가 다시 들어오면 어떻게 막을 것인가, 끝내 처리하지 못한 메시지는 누가 확인하고 어떻게 복구할 것인가가 더 중요했다.

이전에 [락, 캐시, 메시지 큐, 비동기 처리 언제 써야 할까?](/posts/lock-cache-mq-async/)를 정리하면서 메시지 큐와 비동기 처리는 서비스 간 결합을 줄이고 트래픽을 완충하는 도구라고 봤다. 또 [PortOne 결제 연동에서 배운 보상 트랜잭션 설계](/posts/payment-architecture-retrospective/)에서는 결제 성공 이후의 후처리와 보상 흐름이 얼마나 중요한지 돌아봤다. 이번에는 그 흐름을 Kafka 관점에서 이어서, 토픽 설계와 재처리, DLT 운영 전략을 정리해보려 한다.

핵심 결론은 하나다.

> 재처리와 DLT는 예외 처리가 아니라 운영 설계다.

---

# Kafka 재처리와 DLT는 예외 처리가 아니라 운영 설계다

## 1. Kafka를 사용할 때 진짜 고민해야 하는 부분

Kafka는 메시지를 비동기로 전달한다. 주문이 생성되면 `order-created` 이벤트를 발행하고, 결제가 완료되면 `payment-completed` 이벤트를 발행한다. 그러면 포인트 서비스, 재고 서비스, 알림 서비스 같은 Consumer가 자신에게 필요한 이벤트를 받아 처리할 수 있다.

처음에는 이 구조가 꽤 단순해 보였다.

```text
Producer
  -> Kafka Topic
  -> Consumer
```

하지만 메시지를 보냈다고 모든 처리가 끝나는 것은 아니다. 실제 운영 관점에서는 다음 상황을 계속 생각해야 한다.

| 상황 | 고민해야 할 점 |
| --- | --- |
| Consumer 처리 실패 | 다시 시도할 것인가, 격리할 것인가 |
| 같은 메시지 재처리 | 중복 적립, 중복 차감 같은 부작용을 막을 수 있는가 |
| retry topic 이동 | 원래 처리 순서에서 벗어나도 안전한가 |
| DLT 적재 | 누가 확인하고 어떻게 복구할 것인가 |

예를 들어 `payment-completed` 이벤트를 받은 포인트 서비스가 포인트 적립 중 DB timeout을 만날 수 있다. 이때 단순히 예외를 던지고 끝내면 사용자는 결제를 했지만 포인트를 받지 못한다. 반대로 무작정 재시도만 반복하면 Consumer lag가 쌓이고 DB나 외부 API에 더 큰 부하를 줄 수도 있다.

나는 처음에는 try-catch와 retry 정도로 단순하게 생각했다. 하지만 Kafka를 실제 서비스에 적용한다고 생각해보니, 토픽을 어떻게 나눌지, 실패를 어떻게 분류할지, 재처리 횟수와 간격을 어떻게 둘지, DLT에 쌓인 메시지를 어떻게 운영할지까지 함께 설계해야 했다.

동기 API에서는 트랜잭션과 락으로 흐름을 제어했다면, Kafka 기반 비동기 처리에서는 재시도, 멱등성, DLT 운영이 그 역할을 일부 대신한다. 결국 핵심은 장애 상황에서 데이터 정합성을 어떻게 지킬 것인가였다.

## 2. 토픽은 이벤트 기준으로 나누되, 운영 비용을 고려해야 한다

처음에는 이벤트마다 토픽을 나누는 방식이 가장 명확해 보였다. 커머스 서비스라면 다음처럼 토픽을 나눌 수 있다.

| 이벤트 토픽 | 의미 |
| --- | --- |
| `order-created` | 주문이 생성됨 |
| `payment-completed` | 결제가 완료됨 |
| `payment-failed` | 결제가 실패함 |
| `stock-decreased` | 재고가 차감됨 |
| `point-earned` | 포인트가 적립됨 |
| `payment-refunded` | 결제가 환불됨 |
| `point-revoked` | 포인트가 회수됨 |

이 방식은 장점이 분명하다. 토픽 이름만 봐도 어떤 사건이 발생했는지 알 수 있다. `payment-completed`는 "결제가 완료되었다"는 사건을 명확히 표현하고, `payment-failed`는 결제 실패 후 주문 취소, 재고 복구, 실패 알림 같은 후속 처리를 분리해서 생각하게 해준다.

이벤트 중심으로 토픽을 나누면 Consumer도 자신에게 필요한 사건만 구독할 수 있다.

```text
payment-completed
  -> Order Service: 주문 확정
  -> Point Service: 포인트 적립
  -> Notification Service: 결제 완료 알림
  -> Settlement Service: 정산 데이터 생성
```

하지만 이벤트마다 토픽을 나누면 운영 대상도 함께 늘어난다. 특히 재처리 전략까지 붙이면 토픽 수는 더 빠르게 증가한다.

```text
payment-completed
payment-completed.retry.1m
payment-completed.retry.5m
payment-completed.retry.30m
payment-completed.DLT
```

이 구조가 `payment-failed`, `order-created`, `stock-decreased`, `point-earned`, `payment-refunded`, `point-revoked`에도 붙는다고 생각하면 모니터링 대상, 알림 정책, 보관 기간, 재처리 도구가 모두 늘어난다. 토픽을 많이 나누는 것이 항상 좋은 설계는 아니다.

그래서 토픽은 단순히 이벤트가 존재한다는 이유로 나누기보다 다음 기준으로 나누는 편이 더 현실적이었다.

| 기준 | 질문 |
| --- | --- |
| 소비자 관심사 | 소비자가 다르게 반응해야 하는가 |
| 메시지 구조 | 메시지 스키마가 달라지는가 |
| 운영 정책 | 보관 기간이나 파티션 전략이 달라지는가 |
| 실패 처리 | 실패했을 때 재처리 방식이 달라지는가 |
| 장애 격리 | 장애가 다른 이벤트 처리에 영향을 주면 안 되는가 |

토픽 설계는 이벤트 이름을 나열하는 작업이 아니라 소비자 관심사와 운영 정책을 나누는 작업에 가깝다.

![Kafka 이벤트 토픽 분리 구조](/assets/images/2026-07-09-kafka-retry-dlt-operation/kafka-event-topic-separation.png)

## 3. Consumer 에러는 실패 원인에 따라 다르게 처리해야 한다

Consumer에서 에러가 발생했을 때 가장 먼저 떠올릴 수 있는 방식은 즉시 재시도다. 실제로 짧은 순간의 장애라면 즉시 재시도가 효과적일 수 있다.

| 재시도가 효과적인 실패 | 이유 |
| --- | --- |
| DB timeout | 순간적인 연결 지연일 수 있음 |
| Redis timeout | 일시적인 네트워크 문제일 수 있음 |
| 외부 API 503 | 외부 시스템이 잠시 불안정할 수 있음 |
| 네트워크 지연 | 짧은 시간 뒤 회복될 수 있음 |
| 락 획득 실패 | 잠시 뒤 락이 해제될 수 있음 |
| 트랜잭션 충돌 | 재시도 시 성공할 수 있음 |

예를 들어 다음 흐름은 즉시 재시도로 복구될 가능성이 있다.

```text
payment-completed 이벤트 수신
  -> 포인트 적립 처리
  -> DB connection timeout 발생
  -> 1초 후 재시도
  -> 성공
```

하지만 모든 실패가 재시도로 해결되는 것은 아니다.

| 재시도로 해결되기 어려운 실패 | 이유 |
| --- | --- |
| 필수 필드 누락 | 메시지 자체가 잘못됨 |
| 존재하지 않는 `memberId` | 참조 데이터가 없음 |
| 이미 취소된 주문 | 현재 도메인 상태와 맞지 않음 |
| 잘못된 메시지 스키마 | Consumer가 해석할 수 없음 |
| 비즈니스 정책상 처리 불가능한 상태 | 재시도해도 조건이 바뀌지 않을 수 있음 |
| 코드 버그 | 배포 전까지 계속 실패할 가능성이 큼 |

이런 메시지를 계속 재시도하면 같은 실패가 반복된다. 그 사이 Consumer lag는 증가하고, 외부 API를 과호출하거나 DB 부하를 키울 수도 있다.

따라서 재처리 로직은 단순히 "실패하면 다시 시도한다"가 아니어야 한다. 적어도 다음 기준이 필요하다.

- 재시도 가능한 오류인지 판단한다.
- 재시도 횟수를 제한한다.
- 재시도 간격을 둔다.
- 계속 실패하면 retry topic 또는 DLT로 보낸다.
- 재처리를 고려해 Consumer 로직은 멱등성을 가져야 한다.

이 기준이 없으면 재시도는 복구 전략이 아니라 장애를 반복 생산하는 장치가 될 수 있다.

## 4. 즉시 재시도 이후에는 지연 재시도 토픽을 둘 수 있다

즉시 재시도는 아주 짧은 순간 장애를 흡수하는 데 적합하다. 하지만 장애가 몇 초 안에 회복되지 않더라도 몇 분 뒤에는 정상화될 수 있다. 이때 바로 DLT로 보내기보다 지연 재시도 토픽을 둘 수 있다.

예를 들어 `payment-completed` 이벤트는 다음 흐름으로 처리할 수 있다.

```text
payment-completed
  -> payment-completed.retry.1m
  -> payment-completed.retry.5m
  -> payment-completed.retry.30m
  -> payment-completed.DLT
```

각 단계의 의미는 다음과 같다.

| 단계 | 의미 |
| --- | --- |
| 원본 토픽 처리 실패 | Consumer가 최초 처리에 실패 |
| Consumer 내부 즉시 재시도 3회 | 짧은 순간 장애를 흡수 |
| `retry.1m` 이동 | 1분 뒤 다시 처리 |
| `retry.5m` 이동 | 5분 뒤 다시 처리 |
| `retry.30m` 이동 | 30분 뒤 다시 처리 |
| DLT 이동 | 그래도 실패하면 운영 확인 대상으로 격리 |

지연 재시도 토픽은 일시 장애를 자동으로 흡수하는 완충 구간에 가깝다. 예를 들어 포인트 서비스가 잠시 DB 장애를 겪거나, 외부 정산 API가 몇 분 동안 불안정할 때 유용하다.

다만 모든 이벤트에 복잡한 retry 단계를 붙이는 것은 부담스럽다. 토픽 수, 모니터링 대상, 알림 정책, 재처리 도구가 모두 늘어나기 때문이다.

지연 재시도를 우선 적용할 만한 이벤트는 도메인 정합성에 영향을 주는 이벤트다.

| 우선 적용할 만한 이벤트 | 이유 |
| --- | --- |
| 결제 완료 후 주문 확정 | 사용자 주문 상태와 직접 연결됨 |
| 결제 완료 후 포인트 적립 | 사용자 보상과 직접 연결됨 |
| 결제 실패 후 재고 복구 | 판매 가능 재고와 연결됨 |
| 환불 완료 후 포인트 회수 | 금전성 데이터 정합성과 연결됨 |
| 정산 데이터 생성 | 운영/회계 데이터와 연결됨 |

반대로 상대적으로 단순하게 처리해도 되는 이벤트도 있다.

| 단순 처리 가능한 이벤트 | 판단 |
| --- | --- |
| 푸시 알림 발송 | 일부 실패를 별도 알림 재발송 정책으로 처리할 수 있음 |
| 마케팅 로그 적재 | 정합성보다 수집률이 더 중요할 수 있음 |
| 조회수 증가 이벤트 | 일부 유실을 허용할 수 있음 |
| 비핵심 분석 이벤트 | 운영 비용 대비 복구 가치가 낮을 수 있음 |

지연 재시도는 모든 이벤트에 붙이는 기본 장식이 아니라 도메인 정합성에 영향을 주는 이벤트에 우선 적용하는 운영 전략에 가깝다.

![Kafka 재처리 흐름](/assets/images/2026-07-09-kafka-retry-dlt-operation/kafka-retry-flow.png)

## 5. DLT는 실패 메시지 저장소가 아니라 운영 프로세스의 시작점이다

DLT에 메시지가 들어왔다는 것은 여러 번의 재시도에도 처리가 실패했다는 의미다. 그래서 DLT를 단순히 실패 메시지를 쌓아두는 토픽으로만 보면 위험하다.

예를 들어 다음 상황을 생각해볼 수 있다.

```text
payment-completed.DLT에 메시지 적재
  -> 포인트 적립 실패
  -> 운영자 미확인
  -> 사용자는 결제했지만 포인트를 못 받음
  -> CS 발생
```

이 경우 DLT에 메시지가 있다는 사실 자체가 사용자 문제로 이어질 수 있다. 특히 결제, 주문, 포인트, 재고처럼 사용자 정합성에 영향을 주는 이벤트는 DLT 적재 자체를 운영 알림으로 봐야 한다.

DLT 운영 흐름은 다음처럼 잡을 수 있다.

1. DLT 적재
2. Slack 또는 모니터링 알림 발송
3. 운영자 또는 개발자가 원인 확인
4. 데이터 문제면 데이터 보정
5. 코드 문제면 수정 후 배포
6. 외부 시스템 문제면 복구 확인
7. 수동 재처리
8. 재처리 결과 기록

이때 DLT 메시지에는 payload만 저장하면 부족하다. 왜 실패했는지, 어디에서 실패했는지, 몇 번 재시도했는지, 어떤 Consumer Group에서 실패했는지까지 남겨야 추적과 복구가 가능하다.

DLT에 함께 남기면 좋은 정보는 다음과 같다.

| 필드 | 목적 |
| --- | --- |
| `originalTopic` | 원본 토픽 확인 |
| `originalPartition` | 원본 파티션 확인 |
| `originalOffset` | 원본 offset 확인 |
| `consumerGroup` | 실패한 Consumer Group 확인 |
| `eventId` | 이벤트 단위 추적 |
| `eventType` | 이벤트 유형 확인 |
| `payload` | 재처리에 필요한 원본 데이터 |
| `failedAt` | 실패 시각 |
| `exceptionType` | 예외 유형 |
| `exceptionMessage` | 실패 원인 메시지 |
| `retryCount` | 재시도 횟수 |
| `traceId` 또는 `correlationId` | 요청 흐름 추적 |

예를 들어 `payment-completed` 이벤트가 `point-service`에서 처리 실패했다면 다음처럼 기록할 수 있다.

```json
{
  "originalTopic": "payment-completed",
  "originalPartition": 2,
  "originalOffset": 15392,
  "consumerGroup": "point-service",
  "eventId": "evt-20260709-001",
  "eventType": "PAYMENT_COMPLETED",
  "payload": {
    "paymentId": 1001,
    "orderId": 5001,
    "memberId": 77,
    "paidAmount": 30000
  },
  "failedAt": "2026-07-09T19:30:00+09:00",
  "exceptionType": "DataIntegrityViolationException",
  "exceptionMessage": "Duplicate point history for paymentId=1001",
  "retryCount": 5,
  "traceId": "9f2a..."
}
```

이 정보를 남겨야 운영자가 "어떤 데이터를 기준으로, 어떤 원인 때문에, 어디서 실패했는지"를 빠르게 확인할 수 있다. DLT는 실패 메시지 저장소가 아니라 운영 프로세스의 시작점이다.

![Kafka DLT 운영 프로세스](/assets/images/2026-07-09-kafka-retry-dlt-operation/kafka-dlt-operation.png)

## 6. 재처리를 고려하면 멱등성과 순서도 함께 설계해야 한다

Kafka에서는 같은 메시지가 여러 번 처리될 수 있다. 예를 들어 Consumer가 처리 자체는 성공했지만 offset commit 전에 장애가 발생하면 같은 메시지가 다시 들어올 수 있다.

```text
payment-completed 이벤트 수신
  -> 포인트 100 적립
  -> offset commit 전에 Consumer 장애
  -> 같은 메시지 재처리
  -> 포인트 100이 다시 적립될 위험
```

이 문제를 막으려면 Consumer 로직이 멱등성을 가져야 한다. 포인트 적립이라면 `paymentId` 기준으로 이미 적립 이력이 있는지 확인해야 한다.

```text
paymentId 기준 point_history 존재 여부 확인
  -> 이미 처리된 paymentId라면 다시 적립하지 않고 성공 처리
  -> 신규 paymentId라면 포인트 적립 후 처리 이력 저장
```

멱등성은 재처리 전략의 전제 조건에 가깝다. 같은 메시지를 다시 처리할 수 없다면 retry topic이나 DLT replay도 위험해진다.

순서 보장도 함께 고민해야 한다. Kafka의 순서 보장은 토픽 전체가 아니라 파티션 내부에서만 가능하다. 같은 주문 상태 변경 이벤트는 `orderId`를 key로 발행해 같은 파티션에 들어가도록 해야 한다.

| 도메인 | Kafka key 후보 |
| --- | --- |
| 주문 상태 변경 | `orderId` |
| 결제 상태 변경 | `paymentId` 또는 `orderId` |
| 재고 차감/복구 | `productId` |
| 포인트 적립/사용/회수 | `memberId` |
| 알림 발송 | `memberId` 또는 `eventId` |

다만 key만 믿으면 안 된다. retry topic으로 이동하면 원본 토픽의 순서에서 벗어날 수 있기 때문이다. 예를 들어 `payment-completed` 처리가 retry topic으로 밀려 있는 동안 `payment-refunded`가 먼저 처리될 수 있다.

그래서 Consumer에서도 현재 상태를 조회하고 처리 가능한 상태인지 검증해야 한다.

```text
payment-completed 이벤트 수신
  -> 현재 주문 상태 조회
  -> CREATED 상태일 때만 CONFIRMED 처리
  -> 이미 CANCELED라면 무시하거나 보정 대상으로 분류
```

Kafka 기반 설계에서는 Producer가 올바른 key를 선택하는 일과 Consumer가 현재 상태를 검증하는 일이 함께 필요하다. 파티션 순서는 중요한 힌트지만 도메인 상태 검증을 대체하지는 못한다.

![Kafka 파티션 key와 순서 보장](/assets/images/2026-07-09-kafka-retry-dlt-operation/kafka-partition-ordering.png)

## 7. 정리

Kafka를 처음 보면 토픽, Producer, Consumer 구조가 먼저 보인다. 메시지를 발행하고, 구독하고, 처리하는 흐름이 핵심처럼 느껴진다.

하지만 실제 운영 관점에서는 메시지 처리 실패를 어떻게 다룰지가 더 중요했다. Consumer는 실패할 수 있고, 같은 메시지는 다시 처리될 수 있으며, retry topic을 거치면서 순서가 달라질 수도 있다. DLT에 들어간 메시지는 그냥 쌓아두면 안 되고, 운영자가 확인하고 복구할 수 있는 흐름으로 이어져야 한다.

재처리와 DLT는 단순 예외 처리가 아니다. 실패 메시지를 다시 처리할지, 기다렸다가 처리할지, 격리할지, 운영자가 확인할지, 재처리 이력을 남길지까지 포함하는 운영 설계다.

Kafka 기반 이벤트 처리는 메시지를 보내는 것보다 실패했을 때 안전하게 복구할 수 있는 흐름을 설계하는 것이 더 중요하다고 느꼈다.

---

## 시각자료 생성 프롬프트

### 시각자료 1. Kafka 이벤트 토픽 분리 구조

- 삽입 위치: `2. 토픽은 이벤트 기준으로 나누되, 운영 비용을 고려해야 한다` 섹션 뒤
- 이미지 목적: 커머스 서비스에서 이벤트마다 토픽을 분리했을 때 Producer와 여러 Consumer가 어떻게 연결되는지 보여준다.
- 권장 파일명: `kafka-event-topic-separation.png`
- 마크다운 이미지 태그 예시:

```markdown
![Kafka 이벤트 토픽 분리 구조](/assets/images/2026-07-09-kafka-retry-dlt-operation/kafka-event-topic-separation.png)
```

이미지 생성 프롬프트:

```text
Clean technical architecture diagram for a blog post. White background, minimal lines, flat design. Show an e-commerce backend as Producer on the left, publishing events to separate Kafka topics in the center: order-created, payment-completed, payment-failed, stock-decreased, point-earned. On the right, show Consumers: Order Service, Point Service, Stock Service, Notification Service, Settlement Service. Use simple boxes and arrows. No 3D, no decorative icons, readable short English labels only, professional engineering blog style.
```

### 시각자료 2. Kafka 재처리 흐름

- 삽입 위치: `4. 즉시 재시도 이후에는 지연 재시도 토픽을 둘 수 있다` 섹션 뒤
- 이미지 목적: 원본 토픽에서 처리 실패 후 즉시 재시도, retry topic, DLT로 이어지는 흐름을 한눈에 보여준다.
- 권장 파일명: `kafka-retry-flow.png`
- 마크다운 이미지 태그 예시:

```markdown
![Kafka 재처리 흐름](/assets/images/2026-07-09-kafka-retry-dlt-operation/kafka-retry-flow.png)
```

이미지 생성 프롬프트:

```text
Minimal flow diagram for Kafka retry strategy. White background, clean DevOps style. Flow from Original Topic to Consumer Processing. On failure, show Immediate Retry x3, then Retry Topic 1m, Retry Topic 5m, Retry Topic 30m, and finally DLT. Use arrows, rounded rectangles, and small warning markers. Keep text short in English: Original Topic, Consumer, Immediate Retry, Retry 1m, Retry 5m, Retry 30m, DLT. No complex background, no 3D, suitable for a technical blog.
```

### 시각자료 3. DLT 운영 프로세스

- 삽입 위치: `5. DLT는 실패 메시지 저장소가 아니라 운영 프로세스의 시작점이다` 섹션 뒤
- 이미지 목적: DLT가 단순 저장소가 아니라 알림, 원인 분석, 보정, 수동 재처리, 이력 기록으로 이어지는 운영 프로세스임을 보여준다.
- 권장 파일명: `kafka-dlt-operation.png`
- 마크다운 이미지 태그 예시:

```markdown
![Kafka DLT 운영 프로세스](/assets/images/2026-07-09-kafka-retry-dlt-operation/kafka-dlt-operation.png)
```

이미지 생성 프롬프트:

```text
Clean operational workflow diagram for Dead Letter Topic management. White background, minimal professional style. Show DLT in the center-left, then arrows to Alert, Investigation, Data Fix or Code Fix, Manual Replay, Result Tracking. Add a small Metadata box containing original topic, offset, payload, exception, retry count, trace id. Use short English labels only. Simple boxes, clear arrows, no 3D, no illustration-heavy design, engineering operations style.
```

### 시각자료 4. 파티션 key와 순서 보장

- 삽입 위치: `6. 재처리를 고려하면 멱등성과 순서도 함께 설계해야 한다` 섹션 뒤
- 이미지 목적: Kafka 순서 보장이 토픽 전체가 아니라 같은 파티션 내부에서 이뤄지고, 같은 key를 쓰면 같은 파티션으로 들어간다는 점을 보여준다.
- 권장 파일명: `kafka-partition-ordering.png`
- 마크다운 이미지 태그 예시:

```markdown
![Kafka 파티션 key와 순서 보장](/assets/images/2026-07-09-kafka-retry-dlt-operation/kafka-partition-ordering.png)
```

이미지 생성 프롬프트:

```text
Technical diagram explaining Kafka partition ordering. White background, simple flat design. Show a Kafka topic with three partitions: Partition 0, Partition 1, Partition 2. Show multiple messages with the same key orderId=100 going into Partition 1 in order: order-created, payment-completed, payment-canceled. Show different keys going to other partitions. Add a small note box: ordering is guaranteed within a partition. Use short English labels, clean arrows, minimal colors, professional backend engineering blog style.
```

## 참고 자료

- [Apache Kafka Introduction](https://kafka.apache.org/intro/): Kafka는 이벤트 스트림을 발행/구독하고, 내구성 있게 저장하며, 실시간 또는 사후에 처리할 수 있는 이벤트 스트리밍 플랫폼이다.
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/): Topic, Partition, Consumer, Producer, Offset 같은 Kafka 핵심 개념과 운영 문서를 확인할 수 있다.
