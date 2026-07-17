---
title: "PortOne 결제 연동에서 배운 보상 트랜잭션 설계"
date: 2026-06-10
categories: [Project, Payment]
tags: [Spring Boot 4.x, PortOne, Payment, Transaction, Compensation, TIL]
permalink: /posts/payment-architecture-retrospective/
---

## 들어가며

최근 **'Commerce Payment System'**이라는 결제 시스템 프로젝트를 마무리했습니다. 일반적인 상품 주문부터 외부 PG(PortOne) 연동, 포인트 복합 결제, 부분 환불, 정기 구독, 그리고 웹훅 처리까지, 결제 도메인에서 마주하는 온갖 요구사항을 하나의 시스템에 녹여내는 과정이었습니다.

시니어 개발자로서 시스템을 설계할 때 가장 고민했던 지점은 **'복잡한 도메인 간의 결합을 어떻게 깔끔하게 조율할 것인가'**였습니다. 초기 설계 단계에서 저는 **Facade 패턴**을 선택했습니다. 여러 도메인 서비스의 기능을 조합해 하나의 비즈니스 흐름을 만들기에 이보다 직관적이고 빠른 방법은 없다고 판단했기 때문입니다.

하지만 프로젝트가 진행되고 요구사항이 구체화될수록 제가 설계한 Facade 계층이 조금씩 무거워지는 것을 느꼈습니다. 특히 '성공 시나리오'를 넘어 '실패와 보상'이라는 현실적인 문제에 부딪히자 현재 아키텍처의 한계가 뚜렷하게 드러나기 시작했습니다. 오늘은 이번 프로젝트의 구조를 돌아보며, 제가 다음 프로젝트에서는 왜 **유스케이스(UseCase) 중심 설계**를 도입하고 싶은지 그 고민의 흔적을 정리해 보려 합니다.

## 1. 프로젝트 소개: Commerce Payment System

이번 프로젝트는 커머스 환경에서 발생하는 모든 결제 관련 액션을 안정적으로 처리하는 것을 목표로 했습니다. 단순히 "결제가 된다"를 넘어, 결제와 얽힌 수많은 부가 로직을 정교하게 관리해야 했습니다.

*   **핵심 기능**:
    *   주문 생성 및 결제 승인 프로세스 분리
    *   PortOne(포트원) REST API 연동 및 검증
    *   포인트 전액 결제 및 PG 복합 결제 지원
    *   부분 환불 및 전체 환불 로직 (재고 복구, 포인트 회수 포함)
    *   빌링키 기반 정기 구독 결제 및 스케줄링
    *   멱등성이 보장된 웹훅(Webhook) 후처리
*   **기술 스택**: Java 21, Spring Boot 4.x, Spring Data JPA, MySQL, Flyway, PortOne SDK
*   **도메인 구성**: `auth`, `order`, `payment`, `refund`, `point`, `membership`, `subscription`, `webhook` 등 10여 개의 도메인으로 분리

아키텍처는 전형적인 **Layered Architecture**를 기반으로 하되, 컨트롤러와 서비스 사이에 **Facade 계층**을 두어 도메인 간의 오케스트레이션을 담당하게 했습니다.

## 2. 프로젝트를 진행하며 느낀 설계적 아쉬움

설계 당시 저는 '성공 케이스'에 집중했습니다. "결제가 성공하면 주문을 확정하고, 포인트를 적립하고, 장바구니를 비운다"는 흐름은 매우 명확했습니다. 하지만 실제 운영 환경과 유사한 테스트 케이스를 작성하기 시작하면서, 제가 **실패 케이스와 보상 로직을 처음부터 충분히 고려하지 못했다**는 사실을 깨달았습니다.

예를 들어, 다음과 같은 상황들이 발생했을 때 시스템은 어떻게 반응해야 할까요?

1.  외부 PG 승인은 성공했는데, 우리 서버에서 **주문 상태를 변경하다가 DB 오류**가 발생한다면?
2.  결제 후처리 과정에서 **포인트 적립 서비스만 일시적으로 장애**가 발생한다면?
3.  부분 환불 요청 시, **PG 취소는 성공했는데 내부 재고 복구 로직에서 예외**가 발생한다면?

이런 '실패 시나리오'들은 성공 시나리오보다 훨씬 더 많은 설계적 결정을 요구합니다. 단순히 `@Transactional`로 묶어서 해결될 문제가 아니기 때문입니다. 외부 시스템(PG)의 상태는 이미 변했는데 내부 DB만 롤백된다면, 곧바로 [결제 상태 동기화 문제](/posts/payment-state-synchronization/)로 이어집니다. 결제 시스템에서는 실패 그 자체보다 **'실패 이후 시스템 상태를 어떻게 안전하게 복구하거나 일관성을 맞출 것인가'**가 더 중요하다는 점을 뼈저리게 느꼈습니다.

![결제 실패 시 보상 트랜잭션 흐름](/assets/images/2026-06-10-payment-architecture-retrospective/payment-compensation-flow.png)

## 3. 왜 이런 문제가 발생했을까: Facade 중심 설계의 한계

![Facade vs UseCase 아키텍처 비교](/assets/images/2026-06-10-payment-architecture-retrospective/facade-vs-usecase.png)

현재 프로젝트의 구조를 간략히 요약하면 다음과 같습니다.

```text
Controller
  ↓
PaymentConfirmFacade (Orchestrator)
  ↓
PaymentService (결제 승인)
PaymentPostProcessService (후처리 조율)
  ↓
OrderPort, PointPort, CartPort, MembershipPort (도메인 연동)
```

이 구조를 선택한 이유는 명확했습니다. **빠르게 개발할 수 있고, 여러 도메인을 조합하기 쉬우며, 팀 프로젝트에서 각자 도메인을 맡아 개발한 뒤 합치기에 유리**했기 때문입니다. `PaymentConfirmFacade`는 그저 `PaymentService`를 호출해 승인을 받고, `PaymentPostProcessService`를 호출해 후처리를 맡기면 끝이었습니다.

하지만 시간이 지나며 성공 흐름, 실패 흐름, 그리고 보상 처리 로직이 여러 서비스와 파사드에 파편화되어 흩어지기 시작했습니다. `PaymentConfirmFacade`는 결제 확정이라는 하나의 비즈니스 시나리오를 담당하지만, 그 안의 세부 로직(재고 차감, 포인트 처리 등)은 각각의 도메인 서비스가 들고 있었습니다. 그래서 **"이 결제 시나리오에서 실패 시 어떤 보상 로직이 돌아가는가?"**를 확인하려면 여러 클래스를 넘나들며 코드를 추적해야 했습니다.

## 4. Facade를 사용하며 느낀 장점과 한계

Facade 패턴은 이번 프로젝트에서 제 역할을 톡톡히 해냈습니다.

*   **장점**:
    *   **컨트롤러의 단순화**: 복잡한 비즈니스 로직이 컨트롤러에 노출되지 않습니다.
    *   **도메인 조합의 용이성**: 여러 도메인 서비스를 주입받아 순차적으로 실행하기 편리합니다.
    *   **빠른 구현 속도**: 초기 요구사항을 코드로 옮기는 속도가 매우 빠릅니다.
*   **한계**:
    *   **책임의 비대화**: `confirm`, `cancel`, `refund` 등 다양한 흐름이 하나의 Facade나 서비스에 모이면서 클래스가 너무 커졌습니다.
    *   **기술적 구조 중심**: 비즈니스 시나리오(유스케이스)가 코드 전면에 드러나기보다, "어떤 서비스를 호출하는가"라는 기술적 호출 순서가 중심이 되는 느낌을 받았습니다.

물론 현재 프로젝트 규모에서 Facade는 충분히 합리적인 선택이었습니다. 하지만 결제처럼 **실패 시나리오가 비즈니스의 절반 이상을 차지하는 도메인**에서는 단순한 오케스트레이션 이상의 구조가 필요하다는 확신이 들었습니다.

## 5. 다음 프로젝트: 유스케이스(UseCase) 중심 설계로의 확장

다음 프로젝트에서는 비즈니스 행위 그 자체를 클래스로 정의하는 **유스케이스 중심 설계**를 적극적으로 도입해보고 싶습니다.

기존의 `PaymentConfirmFacade` 대신, `ConfirmPaymentUseCase`, `RefundPaymentUseCase`처럼 구체적인 비즈니스 목적을 가진 클래스를 최상단에 두는 방식입니다. 그리고 각 유스케이스 클래스 안에서 **성공 시나리오, 실패 시나리오, 보상 로직을 한눈에 보이도록 정의**하는 것이 핵심입니다.

**예시: ConfirmPaymentUseCase의 구조**

*   **성공 시나리오**:
    1. 주문 조회 및 검증
    2. PG 결제 승인 요청
    3. 재고 차감
    4. 포인트 적립
    5. 주문 상태 '확정' 변경
*   **실패 시나리오**:
    *   주문이 존재하지 않음 → 에러 응답
    *   이미 처리된 결제임 → 멱등성 처리
    *   PG 승인 실패 → 결제 실패 기록 및 사용자 알림
    *   재고 부족 → 결제 승인 전이라면 중단, 승인 후라면 보상 로직 가동
*   **보상 로직 (Compensation)**:
    *   PG 결제 취소 (승인 후 내부 로직 실패 시)
    *   차감된 재고 복구
    *   적립된 포인트 롤백

이렇게 유스케이스 단위로 설계를 먼저 정의하면, 개발자는 코드를 작성하기 전부터 **"어디서 실패할 수 있는가?"**와 **"실패하면 어떻게 되돌릴 것인가?"**를 강제로 고민하게 됩니다. 그리고 그 고민이 곧 시스템의 안정성으로 이어집니다.

## 6. 유스케이스와 Facade의 관계: 경쟁이 아닌 상호 보완

여기서 중요한 점은 유스케이스가 Facade를 대체하는 '정답'은 아니라는 것입니다. 둘은 서로 다른 목적을 가집니다.

*   **Facade**: 복잡한 하위 시스템(여러 도메인 서비스)을 단순한 인터페이스로 감추는 데 집중합니다.
*   **UseCase**: 사용자가 시스템을 통해 달성하려는 **비즈니스 목표(시나리오)**를 표현하는 데 집중합니다.

실제로 다음과 같이 두 패턴을 함께 쓸 수도 있습니다.

```text
Controller
  ↓
ConfirmPaymentUseCase (비즈니스 시나리오 및 보상 로직 정의)
  ↓
PaymentFacade (결제 도메인 내부의 복잡한 호출 조율)
  ↓
Domain Services (개별 도메인 로직)
```

이번 프로젝트에서 Facade로 도메인을 조율해본 경험이 있었기에, 자연스럽게 그 상위 계층인 유스케이스의 필요성을 절감할 수 있었습니다. 기술적인 구조를 먼저 잡기보다 **비즈니스 시나리오를 먼저 정의하고 그에 맞는 구조를 끼워 맞추는 방식**이 결제 시스템에는 더 적합하다는 결론을 내렸습니다.

![아키텍처의 진화: 기술 중심에서 비즈니스 중심](/assets/images/2026-06-10-payment-architecture-retrospective/architecture-evolution.png)

## 7. 문제 인식: 결제 성공 후 발생하는 데이터 불일치

결제 시스템을 개발하다 보면, PG(Payment Gateway)로부터 결제 성공 응답을 받는 순간이 가장 기쁩니다. 하지만 이 기쁨도 잠시, 실제 비즈니스 로직을 처리하는 과정에서 예상치 못한 문제에 부딪히곤 합니다.

예를 들어, 사용자가 상품을 구매하고 결제에 성공했다고 가정해 봅시다. 우리 시스템에서는 다음과 같은 후처리 로직이 필요합니다.

1.  **주문 상태 변경**: `결제 대기` → `결제 완료`
2.  **재고 차감**: 구매한 상품의 재고 수량 감소
3.  **포인트 적립**: 구매 금액에 따른 포인트 적립
4.  **장바구니 비우기**: 결제된 상품을 장바구니에서 제거

이 모든 과정이 하나의 트랜잭션으로 완벽하게 묶여 처리되면 좋겠지만, 현실은 그렇지 않습니다. 특히 PG와의 통신은 외부 시스템과의 상호작용이므로, 우리 시스템의 단일 트랜잭션으로 묶을 수 없습니다. PG에서 결제가 성공했더라도 우리 서버에서 위 후처리 로직 중 하나라도 실패하면 어떻게 될까요?

*   PG: 결제 성공 (사용자 돈은 이미 빠져나감)
*   우리 서버: 주문 상태 `결제 대기`, 재고는 그대로, 포인트 미적립, 장바구니 그대로...

이런 상황은 곧 **데이터 불일치**로 이어집니다. 사용자는 돈을 냈는데 상품을 받지 못하거나, 포인트가 적립되지 않는 등 심각한 문제가 생깁니다. 반대로 재고가 차감되지 않아 품절된 상품이 계속 판매되는 상황도 벌어질 수 있습니다.

**PG 승인 후 내부 검증 실패: 간과하기 쉬운 치명적인 문제**

정상적인 결제 확정 흐름은 PG 승인 후 우리 서버의 후처리 로직이 성공적으로 완료되는 것을 전제로 합니다. 하지만 PG에서 결제가 성공했더라도, 우리 서버의 검증 단계에서 금액 불일치, 주문 상태 불일치, 결제 상태 불일치, 소유권 검증 실패 등이 발생할 수 있습니다. 이때는 단순히 예외를 던지는 것만으로 부족합니다. 이미 PortOne에서 결제가 승인된 상태라면, 우리 서버는 반드시 보상 처리 흐름을 명확히 가져가야 합니다. 정상 흐름만 설계하면 운영 안정성이 부족하며, 외부 PG 연동에서는 "승인 성공 후 내부 검증 실패" 케이스를 반드시 고려해야 합니다.

**보상 처리 흐름 예시:**

1.  PortOne 결제 승인 성공
2.  서버에서 주문 금액과 실제 결제 금액 검증
3.  금액 불일치 또는 상태 검증 실패 감지
4.  PortOne 결제 취소 API 호출
5.  Payment 상태를 FAILED 또는 CANCELED로 변경
6.  Order 상태를 CANCELED로 변경
7.  이미 재고가 차감된 경우 재고 복구
8.  실패 원인과 보상 처리 결과를 로그 또는 이력 테이블에 저장
9.  서비스 테스트에서 해당 실패 케이스 검증

이 경우 핵심은 환불이 아니라 **"보상 트랜잭션"**입니다. 서비스 레이어에서 실패 케이스를 명시적으로 드러내고, 테스트 코드로 검증해야 합니다. 결제 시스템은 성공 케이스보다 실패 케이스 설계가 더 중요합니다.

![분산 시스템 데이터 불일치](/assets/images/2026-06-10-payment-compensation/distributed-inconsistency.png)

## 8. 왜 트랜잭션 하나로 묶으면 안 되는가: 분산 트랜잭션의 어려움

많은 개발자들이 이런 문제를 해결하려고 모든 로직을 하나의 거대한 트랜잭션으로 묶으려 합니다. 하지만 분산 환경, 특히 외부 시스템(PG)과의 연동에서는 이게 거의 불가능합니다. `PaymentConfirmFacade`의 `confirm` 메서드를 다시 살펴보겠습니다.

```java
@Transactional
public PaymentConfirmResult confirm(PaymentConfirmCommand command) {
    Payment payment = paymentService.confirmPayment(command);
    paymentPostProcessService.process(payment);
    return PaymentConfirmResult.from(payment);
}
```

여기서 `paymentService.confirmPayment(command)`는 PG와의 통신으로 결제를 확정하고, `paymentPostProcessService.process(payment)`는 주문 확정, 포인트 처리, 장바구니 정리를 수행합니다. 이 두 메서드는 `@Transactional`로 묶여 있지만 `paymentService.confirmPayment` 내부에서 호출하는 PG API는 이 트랜잭션의 범위 밖에 있습니다. PG에서 결제가 성공했더라도 `paymentPostProcessService.process`에서 예외가 발생하면, 우리 서버의 `Payment` 상태는 롤백되지만 PG의 결제 상태는 그대로 성공으로 남아버립니다.

이것이 바로 **분산 트랜잭션(Distributed Transaction)**의 문제입니다. 여러 개의 독립적인 시스템(우리 서버 DB, PG, 외부 포인트 시스템 등)에 걸쳐 작업을 원자적으로(All or Nothing) 처리하기란 매우 복잡하며, 성능 저하와 시스템 결합도 증가를 부릅니다. 그래서 마이크로서비스 아키텍처에서는 보통 **결과적 일관성(Eventual Consistency)**을 추구하며, 이를 위해 **보상 트랜잭션** 같은 패턴을 활용합니다.

## 9. 보상 트랜잭션: 실패를 되돌리는 전략

보상 트랜잭션은 분산 트랜잭션의 한계를 극복하기 위한 패턴 중 하나입니다. 어떤 작업이 실패했을 때, 이미 성공한 이전 작업들을 취소(Rollback)하는 대신 그 효과를 **상쇄(Compensate)**하는 새로운 작업을 수행해 전체 시스템의 일관성을 맞추는 방식입니다.

예를 들어 결제 후 재고 차감에 실패했다면, 재고 차감을 롤백하는 대신 이미 차감된 재고를 다시 복구하는 보상 트랜잭션을 실행하는 식입니다. 회계 장부에서 잘못 기입된 내용을 지우는 대신 반대 항목으로 다시 기입해 잔액을 맞추는 것과 비슷합니다.

## 10. Webhook과 Transactional Outbox Pattern: 견고한 후처리를 위한 기반

지난 [PG는 최종 진실: 결제 상태 동기화, 왜 웹훅만으로는 부족할까?](/posts/payment-concurrency-strategy/) 포스팅에서 웹훅(Webhook)의 중요성을 강조했습니다. 웹훅은 PG로부터 결제 상태 변경을 비동기적으로 통보받는 강력한 메커니즘입니다. 하지만 웹훅 수신 자체만으로는 완벽한 후처리를 보장하지 못합니다.

우리 프로젝트의 `WebhookProcessor`를 보면, 웹훅 수신 기록과 실제 후처리를 분리된 트랜잭션에서 처리하고 있습니다.

```java
@Transactional(propagation = Propagation.REQUIRES_NEW)
public WebhookStatus process(String eventId, WebhookCommand command) {
    // ... 웹훅 이벤트 조회 및 중복 처리 방지 로직 ...

    switch (command.eventType()) {
        case PAYMENT_PAID -> processPaid(event, command.paymentId());
        case PAYMENT_CANCELLED, PAYMENT_PARTIAL_CANCELLED -> processRefund(event, command.paymentId());
        default -> event.ignore("Unsupported webhook event.");
    }

    return event.getStatus();
}

private void processPaid(WebhookEvent event, String paymentId) {
    PaymentConfirmation confirmation = paymentService.confirmPaymentFromWebhook(paymentId);
    if (!confirmation.confirmedNow()) {
        event.ignore("Payment is already confirmed.");
        return;
    }
    // 이 부분이 핵심: paymentPostProcessService.process()가 실패하면?
    paymentPostProcessService.process(confirmation.payment());
    event.complete("Payment webhook processing completed.");
}
```

`processPaid` 메서드 내에서 `paymentPostProcessService.process(confirmation.payment())`가 호출됩니다. 만약 이 후처리 과정에서 예외가 발생하면, `WebhookProcessor`의 트랜잭션은 롤백되지 않고 `WebhookEvent`는 `FAILED` 상태로 기록됩니다. 실패를 **추적 가능**하게 만들어 주지만, **자동으로 보상하거나 재시도하지는 않습니다.** 결국 누군가 `FAILED` 상태의 웹훅 이벤트를 모니터링하고 수동으로 개입하거나, 별도의 재시도 메커니즘을 구축해야 합니다.

이러한 한계를 넘어서기 위해 **트랜잭셔널 아웃박스 패턴(Transactional Outbox Pattern)**을 고려할 수 있습니다. 아웃박스 패턴은 비동기 메시지 발행의 신뢰성을 보장하는 패턴입니다. 핵심은 다음과 같습니다.

1.  **DB 트랜잭션과 함께 메시지 저장**: 비즈니스 로직(예: 결제 상태 변경)과 함께 발행할 메시지(예: 재고 차감 요청, 포인트 적립 요청)를 동일한 DB 트랜잭션 내에서 `Outbox` 테이블에 저장합니다.
2.  **메시지 발행**: 별도의 `Message Relayer` 프로세스가 `Outbox` 테이블을 주기적으로 스캔해 메시지를 읽고 메시지 브로커(Kafka, RabbitMQ 등)로 발행합니다.
3.  **메시지 처리**: 메시지 브로커를 구독하는 컨슈머(예: 재고 서비스, 포인트 서비스)가 메시지를 받아 해당 비즈니스 로직을 처리합니다.

이 패턴을 적용하면 `paymentPostProcessService.process`에서 직접 다른 도메인 서비스를 호출하는 대신, `Outbox`에 메시지를 저장하는 방식으로 바꿀 수 있습니다. 그러면 결제 후처리 로직의 실패가 전체 트랜잭션을 롤백시키지 않으면서도, 메시지 발행의 신뢰성을 보장해 결과적 일관성을 달성할 수 있습니다.

![트랜잭셔널 아웃박스 패턴](/assets/images/2026-06-10-payment-compensation/transactional-outbox-pattern.png)

## 11. 왜 재고/포인트는 Best-Effort가 될 수 없는가?

우리 프로젝트의 `CartService`의 `clearCartItems` 메서드를 보면 흥미로운 주석을 발견할 수 있습니다.

```java
@Transactional
public void clearCartItems(List<Long> orderedItemIds, Long memberId) {
    int deleted = cartItemRepository.deleteAllByIdInAndMemberId(orderedItemIds, memberId);
    if (deleted != orderedItemIds.size()) {
        log.warn(
            "결제 후 장바구니 정리 일부 실패: memberId={}, requested={}, deleted={}",
            memberId,
            orderedItemIds.size(),
            deleted
        );
    }
}
```

"이미 지워진 항목이 존재하더라도 비즈니스 롤백을 막기 위해 경고 로그로 남기고 성공 처리합니다." 이 주석은 장바구니 정리 로직이 **Best-Effort**로 처리됨을 명확히 보여줍니다. 장바구니는 사용자의 편의를 위한 도메인이므로, 일부 항목이 정리되지 않아도 전체 결제 흐름을 롤백할 만큼 치명적인 문제는 아닙니다. 사용자가 직접 다시 비우거나, 일정 시간 후 자동으로 정리되는 정책을 적용하면 됩니다.

하지만 **재고(Inventory)**나 **포인트(Point)** 같은 도메인은 다릅니다. 재고가 정확히 차감되지 않으면 품절된 상품이 계속 판매되어 고객 불만과 손실로 이어지고, 포인트가 정확히 적립·차감되지 않으면 금전적 손실이나 법적 문제까지 발생할 수 있습니다. 이런 도메인들은 **높은 수준의 일관성**이 요구되며, Best-Effort 처리만으로는 부족합니다.

우리 프로젝트의 `RefundPostProcessService`를 보면, 환불 시에는 포인트와 재고에 대한 명시적인 보상 로직이 구현되어 있습니다.

```java
public class RefundPostProcessService {
    // ...
    public void process(Payment payment, Long orderId, Refund refund, boolean isFullRefund) {
        // 재고 복구
        refundOrderPort.restoreProductStock(orderId, refund.getRefundItems());

        // 포인트 복구 또는 회수
        if (refund.getPointRefundAmount() > 0) {
            pointPort.restorePoint(payment.getMemberId(), refund.getPointRefundAmount(), refund.getId());
        } else if (refund.getRevokeEarnedPointAmount() > 0) {
            pointPort.revokeEarnedPoint(payment.getMemberId(), refund.getRevokeEarnedPointAmount(), refund.getId());
        }

        // 멤버십 누적 결제액 차감
        membershipPort.applyRefund(payment.getMemberId(), refund.getRefundAmount());

        // 전체 환불 시 주문 취소
        if (isFullRefund) {
            refundOrderPort.cancelOrder(orderId);
        }
    }
    // ...
}
```

이처럼 환불 과정에서는 재고, 포인트, 멤버십, 주문 상태까지 명시적으로 보상(복구·회수·취소)하는 흐름이 존재합니다. 환불이라는 비즈니스 특성상 데이터 불일치가 생겼을 때의 파급 효과가 크기 때문에, 견고한 보상 로직이 필수라는 뜻입니다.

결론적으로, 모든 도메인에 동일한 수준의 일관성과 보상 로직을 적용할 필요는 없습니다. 하지만 재고, 포인트, 금액처럼 **비즈니스 핵심 가치와 직결되는 도메인**에서는 Best-Effort를 넘어선 **견고한 보상 트랜잭션 설계**가 반드시 필요합니다.

## 12. 개선 방안: 트랜잭셔널 아웃박스 패턴과 Saga 패턴

현재 `PaymentPostProcessService`에서 여러 도메인 서비스를 직접 호출하는 구조는 단일 트랜잭션으로 묶여 있어, 한 서비스의 실패가 전체를 롤백시키고 PG와의 상태 불일치를 부를 수 있습니다. 이를 개선하려면 다음과 같은 접근을 고려할 수 있습니다.

1.  **트랜잭셔널 아웃박스 패턴 도입**: `PaymentPostProcessService`가 직접 다른 도메인 서비스를 호출하는 대신, `Outbox` 테이블에 메시지를 저장합니다. 이 메시지는 `Message Relayer`가 메시지 브로커로 발행하고, 각 도메인 서비스(주문, 재고, 포인트 등)는 해당 메시지를 구독해 자신의 로직을 처리합니다. 그러면 `PaymentPostProcessService`의 트랜잭션은 오직 `Payment` 상태 변경과 `Outbox` 메시지 저장에만 집중할 수 있습니다.

2.  **Saga 패턴 적용**: 더 복잡한 분산 트랜잭션이라면 **Saga 패턴**을 적용해 일련의 로컬 트랜잭션들을 조율하고, 각 로컬 트랜잭션이 실패할 때 보상 트랜잭션을 실행해 전체 일관성을 유지할 수 있습니다. Saga는 오케스트레이션(Orchestration) 방식과 코레오그래피(Choreography) 방식으로 나뉩니다. 결제 시스템의 복잡한 후처리 흐름에는 오케스트레이션 Saga가 적합할 수 있습니다.

    *   **오케스트레이션 Saga**: 중앙의 오케스트레이터가 각 서비스에 명령을 보내고 응답을 받아 다음 단계를 결정합니다. 실패 시 오케스트레이터가 보상 트랜잭션을 지시합니다.
    *   **코레오그래피 Saga**: 각 서비스가 이벤트를 발행하고, 다른 서비스가 이 이벤트를 구독해 다음 작업을 수행합니다. 실패 시 각 서비스가 스스로 보상 이벤트를 발행합니다.

이러한 패턴으로 결제 시스템의 후처리 로직을 한층 견고하고 확장 가능하게 만들 수 있습니다. 특히 `WebhookProcessor`에서 `FAILED` 상태로만 남겨두었던 웹훅 이벤트들을 아웃박스 패턴과 Saga 패턴으로 자동 재시도하고 보상하는 메커니즘을 구축할 수 있습니다.

![Saga 패턴 (오케스트레이션 방식)](/assets/images/2026-06-10-payment-compensation/saga-orchestration-pattern.png)

## 13. 느리게 가는 것이 가장 빠르게 가는 길: 문서화의 가치

이번 회고에서 얻은 가장 큰 교훈은 **문서화의 중요성**입니다. 다음 프로젝트에서는 구현에 들어가기 전에 반드시 **유스케이스 문서**를 먼저 작성하려 합니다.

단순히 API 스펙을 적는 게 아니라, 앞서 언급한 성공·실패·보상 시나리오를 팀원들과 공유하고 검증하는 과정을 먼저 거치는 것입니다. 개발 속도를 늦추는 불필요한 작업이 아닙니다. 오히려 **설계 품질을 높이고, 팀원 간의 커뮤니케이션 비용을 줄이며, 구현 방향을 하나로 통일**하는 가장 효율적인 방법입니다. [SDD(Spec Driven Development)](/posts/ai-sdd-llm-collaboration/) 포스팅에서 다뤘듯, 명확한 명세는 AI 에이전트와 협업할 때도 가장 강력한 무기가 됩니다.

## 마무리하며

이번 결제 시스템 프로젝트를 거치며 저는 한 단계 더 성장할 수 있었습니다. **"성공 케이스를 구현하는 것보다, 실패 케이스를 설계하는 것이 훨씬 더 어렵고 중요하다"**는 사실을 몸소 체험했기 때문입니다.

Facade 기반 설계는 프로젝트를 빠르게 궤도에 올리는 데 큰 도움을 주었습니다. 하지만 여러 도메인이 얽히고설킨 복잡한 비즈니스 로직에서는, 시나리오 중심의 유스케이스 설계가 시스템의 복잡도를 제어하는 데 더 유리할 수 있다는 귀중한 인사이트를 얻었습니다.

다음 프로젝트에서는 무작정 키보드를 잡기보다, 우리가 해결해야 할 비즈니스 유스케이스를 먼저 정의하고 실패에 대비하는 설계부터 시작해 보려 합니다. 결국 좋은 아키텍처란 특정 패턴을 맹목적으로 따르는 것이 아니라, **우리가 마주한 문제의 본질을 가장 잘 해결할 수 있는 구조를 고민하는 과정** 그 자체에 있기 때문입니다.

---

## Learned (배운 점)

*   결제 시스템에서 성공 로직보다 실패 시나리오와 보상 로직 설계가 훨씬 더 많은 리소스와 의사결정을 요구한다는 점을 깨달았다.
*   Facade 패턴의 실무적 장점(빠른 조율)과 한계(비즈니스 시나리오의 파편화)를 명확히 이해하게 되었다.
*   Application Layer에서 유스케이스(UseCase)를 명시적으로 정의하는 것이 복잡한 비즈니스 흐름을 관리하는 데 얼마나 효과적인지 학습했다.
*   구현 전 시나리오 문서화가 단순한 기록을 넘어 설계 품질을 결정짓는 핵심 프로세스임을 인지했다.
*   기술 중심 설계에서 비즈니스 시나리오 중심 설계로 사고의 지평을 넓히는 계기가 되었다.
*   분산 시스템에서 데이터 불일치 문제를 해결하기 위한 보상 트랜잭션의 중요성을 이해했다.
*   트랜잭셔널 아웃박스 패턴과 Saga 패턴이 견고한 비동기 후처리 및 분산 트랜잭션 관리에 효과적임을 학습했다.
*   재고, 포인트와 같이 비즈니스 핵심 가치와 직결되는 도메인에서는 Best-Effort를 넘어선 견고한 보상 로직이 필수적임을 깨달았다.

## 한 줄 정리

> 결제 시스템에서 성공 시나리오만큼 중요한 것은 실패 시나리오와 그에 대한 견고한 보상 로직 설계이며, 이를 위해 유스케이스 중심 설계와 분산 트랜잭션 패턴(아웃박스, Saga)을 적극적으로 고려해야 한다.

## References

*   [PG는 최종 진실: 결제 상태 동기화, 왜 웹훅만으로는 부족할까?](/posts/payment-concurrency-strategy/)
*   [SDD(Spec Driven Development) 포스팅](/posts/ai-sdd-llm-collaboration/)
*   [결제 상태 동기화 문제](/posts/payment-state-synchronization/)
*   [마이크로서비스 아키텍처에서 데이터 일관성 유지하기 (Transactional Outbox Pattern)](https://docs.microsoft.com/ko-kr/azure/architecture/patterns/transactional-outbox)
*   [Saga 패턴으로 분산 트랜잭션 관리하기](https://docs.microsoft.com/ko-kr/azure/architecture/patterns/saga)
