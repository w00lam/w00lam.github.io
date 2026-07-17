---
title: "Spring Boot 도전 기능 구현 과정에서 고민한 설계 포인트"
date: 2026-06-19
categories: [Backend, Spring]
tags: [Spring Boot, JPA, QueryDSL, AOP, Transaction, WebSocket, STOMP, Retrospective]
permalink: /posts/spring-challenge-feature-design-retrospective/
---

> 기능을 추가하는 것보다 더 오래 고민한 부분은 각 기능의 목적과 책임을 어디까지 분리할지 결정하는 일이었습니다.

이번 Spring Boot Todo 과제에서는 검색, 매니저 등록 요청 로그, 실시간 채팅을 도전 기능으로 구현했습니다. 겉으로 보면 서로 다른 기능이지만 구현 과정에서 반복해서 마주한 질문은 비슷했습니다.

“기존 구조를 재사용하는 편이 나을까?”, “이 데이터는 어떤 생명주기를 가져야 할까?”, “현재 단계의 단순함과 이후 확장 가능성 사이에서 어디까지 준비해야 할까?”

이 글에서는 구현 코드 자체보다 이러한 질문에 어떤 기준으로 답했는지를 정리했습니다.

## 1. 검색 조건과 응답 DTO를 분리한 이유

기존 일정 목록 조회와 도전 기능의 검색은 모두 Todo를 조회하지만 목적이 달랐습니다. 기존 조회 조건은 날씨와 수정일을 기준으로 목록을 필터링하는 데 사용했습니다. 반면 새 검색 기능은 제목, 생성일, 담당자 닉네임으로 원하는 Todo를 찾는 기능이었습니다.

처음에는 기존 조건 DTO에 검색 필드를 추가해 재사용하는 방법도 생각했습니다. DTO 하나를 공유하면 클래스 수는 줄어듭니다. 하지만 날씨와 수정일을 위한 필드, 제목과 담당자 검색을 위한 필드가 한 객체에 섞이면 각 필드가 언제 유효한지 한눈에 파악하기 어려워집니다. 한 기능의 요구사항이 바뀔 때 다른 조회 기능까지 영향을 받는 구조가 될 수도 있었습니다.

그래서 기존 목록 조회에는 `TodoGetCondition`, QueryDSL 검색에는 `TodoSearchCondition`을 사용하도록 분리했습니다. 두 객체가 모두 조회 조건을 담더라도 서로 다른 유스케이스의 입력이라는 점을 타입으로 드러내는 편이 더 명확하다고 판단했습니다.

응답도 같은 기준으로 나눴습니다. 기존 `TodoResponse`에는 상세 조회나 목록 조회에 필요한 정보가 포함되어 있었지만 도전 기능의 검색 결과에는 제목, 담당자 수, 댓글 수만 필요했습니다. 사용하지 않는 필드를 채우거나 의미 없는 `null`을 반환하기보다 `TodoSearchResponse`를 별도로 두는 편이 API가 제공하는 정보의 범위를 명확히 보여주었습니다.

DTO를 재사용하면 코드 수는 줄일 수 있지만 서로 다른 목적의 필드가 하나의 객체에 섞이면 의미가 흐려질 수 있습니다. 이번에는 클래스 수를 줄이는 것보다 조회 목적과 응답 범위를 명확하게 유지하는 편이 가독성과 유지보수성에 더 유리하다고 판단했습니다.

## 2. 닉네임 검색에서 대소문자를 무시한 이유

담당자 닉네임 검색에는 부분 일치 조건을 적용했습니다. 사용자가 닉네임 전체를 정확히 기억하지 못하더라도 일부 문자열만으로 원하는 Todo를 찾을 수 있어야 한다고 생각했기 때문입니다.

여기에 영어 닉네임의 대소문자도 구분하지 않도록 했습니다. 예를 들어 저장된 닉네임이 `WooLam`일 때 `woolam`이나 `WOOLAM`으로 검색했다는 이유만으로 결과가 나오지 않는다면, 기능은 요구사항을 충족하더라도 사용자에게는 자연스럽지 않을 수 있습니다.

그래서 QueryDSL 조건에 `containsIgnoreCase`를 사용했습니다. 검색은 정확한 값을 검증하는 기능이라기보다 사용자가 기억하는 일부 정보를 단서로 원하는 결과를 찾도록 돕는 기능에 가깝다고 보았습니다. 부분 일치와 대소문자 무시는 이런 검색 경험을 만들기 위한 선택이었습니다.

## 3. 매니저 등록 요청 로그를 감사 로그로 설계한 이유

매니저 등록 요청 로그는 단순히 데이터가 저장됐는지 확인하는 용도가 아니었습니다. 나중에 문제가 생겼을 때 어떤 사용자가 어떤 Todo에 누구를 매니저로 등록하려 했고, 그 결과가 성공이었는지 실패였는지를 추적하기 위한 감사 로그에 가까웠습니다.

이 목적을 기준으로 생각하니 생성 시간만으로는 충분하지 않았습니다. 요청자와 등록 대상자를 식별할 정보, 등록 결과를 나타내는 `status`, 실패 원인을 확인할 수 있는 `errorMessage`가 함께 필요했습니다.

사용자를 어떤 값으로 남길지도 고민했습니다. 이름이나 이메일처럼 사람이 바로 알아볼 수 있는 정보만 저장하면 로그의 가독성은 좋아집니다. 그러나 이름은 중복될 수 있고 이름이나 이메일은 변경될 수도 있어 과거의 사용자를 정확하게 추적하는 식별자로는 부족했습니다.

반대로 사용자 `id`만 저장하면 DB를 기준으로 정확하게 추적할 수 있지만 로그 테이블을 직접 살펴볼 때 어떤 사용자의 요청인지 바로 이해하기 어렵습니다. 매번 사용자 테이블을 함께 조회해야 한다면 장애 상황에서 로그를 빠르게 읽는 데 불편함이 생깁니다.

최종적으로 요청자와 등록 대상자 모두 `id`와 `email`을 함께 저장하기로 했습니다. `id`는 변경되지 않는 식별자로서 정확한 추적을 담당하고 `email`은 현재 프로젝트에서 사용자를 이해하기 쉬운 표시 정보로서 로그의 가독성을 보완합니다.

여기에 `status`와 `errorMessage`를 함께 두어 요청의 존재뿐 아니라 결과와 실패 맥락까지 확인할 수 있도록 설계했습니다. 중복된 정보를 일부 저장하는 비용은 있지만 감사 로그의 목적이 정규화 자체보다 추적 가능성과 장애 분석에 있다는 점을 더 중요하게 보았습니다.

## 4. 로그 저장에 `REQUIRES_NEW`를 사용한 이유

`@Transactional`의 `propagation`은 이미 트랜잭션이 존재하는 상황에서 다른 트랜잭션 메서드가 호출됐을 때 어떻게 동작할지를 결정하는 옵션입니다. 기존 트랜잭션에 참여할지, 별도의 트랜잭션을 만들지와 같은 경계를 정합니다.

기본값인 `Propagation.REQUIRED`는 기존 트랜잭션이 있으면 그 트랜잭션에 참여하고, 없으면 새로운 트랜잭션을 시작합니다. 하나의 비즈니스 작업을 함께 커밋하거나 롤백해야 하는 일반적인 서비스 로직에는 이 동작이 자연스럽습니다.

하지만 이번 로그의 생명주기는 매니저 등록 데이터와 달랐습니다. 매니저 등록은 검증 실패나 예외로 롤백될 수 있지만, “등록 요청이 있었다”는 사실은 매니저 등록 결과와 관계없이 남아야 했습니다.

로그 저장이 `REQUIRED`로 동작하면 매니저 등록 트랜잭션에 참여하게 됩니다. 이 경우 등록 로직에서 예외가 발생했을 때 로그도 함께 롤백되어, 정작 실패한 요청을 추적할 수 없게 됩니다.

그래서 로그 저장 메서드에는 `Propagation.REQUIRES_NEW`를 사용했습니다. `REQUIRES_NEW`는 기존 트랜잭션을 잠시 중단하고 별도의 트랜잭션을 시작하므로 로그 저장을 메인 로직과 독립적으로 커밋할 수 있습니다.

![REQUIRES_NEW를 사용한 감사 로그 트랜잭션 분리 흐름](/assets/images/2026-06-19-spring-challenge-feature-design-retrospective/manager-log-requires-new-flow.png)

이 선택에는 분명한 트레이드오프가 있습니다. 메인 로직이 실패해도 로그가 남기 때문에, 비즈니스 데이터와 항상 같은 상태를 가져야 하는 정합성 데이터에는 적합하지 않습니다. 반면 감사 로그, 이력, 요청 추적 데이터처럼 메인 트랜잭션의 결과와 독립적으로 보존되어야 하는 데이터에는 잘 맞습니다.

이번 로그는 매니저 등록 데이터의 일부가 아니라 요청 흐름을 추적하기 위한 감사 로그였습니다. 따라서 메인 트랜잭션의 성공 여부에 종속되기보다 독립적으로 커밋되는 편이 목적에 더 적합하다고 판단했습니다.

## 5. AOP에서 `JoinPoint`로 메서드 인자를 가져온 경험

매니저 등록 요청을 의미 있게 기록하려면 `ManagerService.saveManager()` 호출에 전달된 요청자, Todo, 등록 대상자 정보가 필요했습니다. 구체적으로 `AuthUser`, `todoId`, `ManagerSaveRequest`를 로그 데이터로 변환해야 했습니다.

AOP는 대상 메서드의 실행 시점을 가로채 공통 관심사를 분리하는 데 사용할 수 있습니다. 이번 구현에서는 여기에 더해 `JoinPoint` 또는 `ProceedingJoinPoint`를 통해 실제 호출 인자도 확인할 수 있다는 점을 활용했습니다.

예시로 단순화하면 다음과 같습니다.

```java
Object[] args = joinPoint.getArgs();

AuthUser authUser = (AuthUser) args[0];
Long todoId = (Long) args[1];
ManagerSaveRequest managerSaveRequest = (ManagerSaveRequest) args[2];
```

`joinPoint.getArgs()`는 가로챈 메서드 호출에 전달된 인자들을 배열로 반환합니다. `saveManager(authUser, todoId, managerSaveRequest)` 호출이라면 다음과 같이 매핑됩니다.

```text
args[0] -> AuthUser
args[1] -> todoId
args[2] -> ManagerSaveRequest
```

이렇게 AOP에서 실제 요청 정보를 이용해 감사 로그에 필요한 데이터를 구성할 수 있었습니다. 다만 이 방식은 배열 순서와 타입 캐스팅에 의존합니다. 대상 메서드의 파라미터 순서나 시그니처가 바뀌면 AOP 코드도 함께 수정해야 하므로 편리함과 결합도 사이의 주의점이 있다고 느꼈습니다.

## 6. 일정 관리 서비스에서 실시간 채팅 기능을 고민한 이유

도전 기능 중에는 실시간 채팅도 있었습니다. 구현에 들어가기 전, 일정 관리 서비스에 채팅이 왜 필요한지부터 정리해 보았습니다.

현재 서비스의 Todo에는 담당자를 등록할 수 있습니다. 따라서 Todo는 개인이 혼자 처리하는 메모라기보다 여러 사용자가 함께 수행할 수 있는 작업 단위로 볼 수 있습니다.

기존 댓글 기능은 Todo에 의견이나 기록을 남기는 비동기 소통에 적합했습니다. 시간이 지난 뒤에도 내용을 확인할 수 있고 결정 사항을 남기기에도 좋습니다. 하지만 일정 변경, 역할 조율, 진행 상황 공유처럼 즉시 답변이 필요한 상황에서는 댓글만으로 소통하기에 한계가 있었습니다.

그래서 실시간 채팅을 별개의 부가 기능이 아니라 Todo 수행 과정에서 발생하는 즉시 소통을 보완하는 협업 기능으로 정의했습니다. 댓글이 기록 중심의 소통을 담당한다면, 채팅은 참여자들이 빠르게 상황을 공유하고 조율하는 역할을 맡는다고 보았습니다.

## 7. WebSocket, STOMP, Simple Broker의 역할

실시간 채팅을 구현하면서 WebSocket, STOMP, Simple Broker의 역할을 구분해 이해할 필요가 있었습니다.

WebSocket은 클라이언트와 서버 사이에 지속적인 연결을 만드는 통신 방식입니다. 일반적인 HTTP 요청과 응답만으로는 서버가 원하는 시점에 클라이언트로 메시지를 즉시 보내기 어렵지만, WebSocket 연결이 유지되면 양쪽이 필요할 때 메시지를 보낼 수 있습니다.

STOMP는 WebSocket 연결 위에서 메시지를 어떤 형식으로, 어느 destination에 보낼지 정하는 메시징 프로토콜입니다. STOMP를 사용하면 클라이언트가 특정 destination으로 메시지를 발행하고 다른 클라이언트가 원하는 destination을 구독하는 publish/subscribe 구조를 사용할 수 있습니다.

Simple Broker는 Spring 애플리케이션 내부에서 구독 destination을 기준으로 메시지를 구독자에게 전달하는 간단한 메시지 브로커입니다.

![WebSocket과 STOMP, Simple Broker의 메시지 전달 흐름](/assets/images/2026-06-19-spring-challenge-feature-design-retrospective/websocket-stomp-simple-broker-flow.png)

세 요소의 역할을 나눠 보면 WebSocket은 지속 연결을 담당하고 STOMP는 그 연결 위에서 메시지를 주고받는 규칙을 제공하며 Simple Broker는 구독자에게 메시지를 전달합니다.

구현 후에는 Chrome DevTools Console에서 WebSocket 객체를 생성하고 STOMP 프레임을 직접 보내며 연결과 메시지 전달 흐름을 검증했습니다. 라이브러리 뒤에 숨은 흐름을 직접 확인해 보니 각 계층의 역할을 구분하는 데 도움이 됐습니다.

## 8. `@SendTo`와 `SimpMessagingTemplate` 중 `@SendTo`를 선택한 이유

STOMP 메시지를 구독자에게 전달하는 방법으로는 `@SendTo`와 `SimpMessagingTemplate`을 고려했습니다.

`@SendTo`는 `@MessageMapping` 메서드의 반환값을 지정된 destination으로 자동 발행합니다.

간단한 예시는 다음과 같습니다.

```java
@MessageMapping("/todos/{todoId}/chat")
@SendTo("/topic/todos/{todoId}/chat")
public ChatMessageResponse sendMessage(...) {
    return chatService.createMessage(...);
}
```

현재 구조에서는 특정 Todo의 메시지 요청이 들어오면 같은 `todoId`의 구독 destination으로 결과를 전달하면 됐습니다. 요청과 구독 경로가 `todoId` 기준으로 단순하게 1:1 대응하므로 메서드의 반환값을 바로 발행하는 `@SendTo`가 가장 간결했습니다.

반면 `SimpMessagingTemplate`은 서버 코드에서 destination을 직접 지정해 메시지를 발행합니다.

이 경우는 다음과 같습니다.

```java
messagingTemplate.convertAndSend(
    "/topic/todos/" + todoId + "/chat",
    response
);
```

이 방식은 여러 destination으로 메시지를 보내거나 조건에 따라 다른 topic을 선택해야 할 때 유연합니다. WebSocket Controller가 아닌 서비스, 이벤트 리스너, Redis Subscriber 등에서 메시지를 발행해야 하는 경우에도 자연스럽게 사용할 수 있습니다.

![SendTo와 SimpMessagingTemplate 메시지 발행 방식 비교](/assets/images/2026-06-19-spring-challenge-feature-design-retrospective/sendto-vs-simpmessagingtemplate.png)

초기 구현은 Redis 없이 Simple Broker만 사용했고 메시지의 입력과 출력 경로도 단순했기 때문에 `@SendTo`를 선택했습니다. 아직 필요하지 않은 유연성을 위해 발행 로직을 직접 제어하기보다 현재 요구사항을 가장 명확하게 표현하는 방법을 택했습니다.

다만 Redis Pub/Sub로 확장한다면 상황이 달라집니다. Redis Subscriber가 메시지를 받은 뒤 WebSocket 구독자에게 다시 발행해야 하므로, 메시지 발행 위치가 Controller 밖으로 이동합니다. 그 단계에서는 `SimpMessagingTemplate`을 사용하는 구조가 더 자연스럽다고 판단했습니다.

## 마무리

이번 도전 기능 구현에서 내린 선택들은 서로 다른 기술을 다루지만 공통된 기준을 가지고 있었습니다.

- 조건 DTO와 응답 DTO는 기능의 목적과 반환 범위를 명확히 하기 위해 분리했습니다.
- 닉네임 검색에는 사용자가 기억하는 일부 정보로도 결과를 찾을 수 있도록 부분 일치와 대소문자 무시 조건을 적용했습니다.
- 매니저 등록 로그는 단순 기록이 아니라 요청 추적과 장애 분석을 위한 감사 로그로 설계했습니다.
- `REQUIRES_NEW`는 감사 로그를 메인 트랜잭션의 성공 여부와 분리하기 위해 사용했습니다.
- AOP에서는 가로챈 메서드의 인자를 활용해 요청 로그에 필요한 데이터를 구성했습니다.
- 실시간 채팅은 Todo 참여자들의 즉시 소통을 보완하는 협업 기능으로 정의했습니다.
- 현재 구조에는 `@SendTo`가 단순하고 적합하지만 Redis Pub/Sub로 확장하면 `SimpMessagingTemplate`이 더 유연할 수 있다고 판단했습니다.

기능을 구현할 때 기존 코드를 최대한 재사용하거나 미래의 확장을 미리 준비하는 것이 항상 정답은 아니었습니다. 중요한 것은 현재 기능의 목적을 분명히 하고 데이터의 생명주기와 변경 가능성을 기준으로 책임의 경계를 정하는 일이었습니다.

## 한 줄 정리

> 좋은 설계는 더 많은 기술을 사용하는 것이 아니라, 현재 요구사항의 목적과 트레이드오프를 코드의 경계에 명확히 드러내는 일이라고 느꼈습니다.

## References

- [Spring Framework Documentation - Transaction Propagation](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html)
- [Spring Framework Documentation - STOMP Message Flow](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/message-flow.html)
- [QueryDSL Reference Documentation](http://querydsl.com/static/querydsl/latest/reference/html/)
- [이전 포스트: Spring Boot Todo 과제 필수 기능 구현 중 고민한 부분](/posts/spring-todo-retrospective/)
- [이전 포스트: WebSocket, STOMP, 그리고 인증](/posts/websocket-stomp-authentication/)
