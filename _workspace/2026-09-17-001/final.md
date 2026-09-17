---
title: "Java I/O의 흐름 — Stream과 Buffer부터 Spring HTTP 요청·응답까지"
date: 2026-09-17
categories: [TIL, Java, Spring]
tags: [Java, I/O, Stream, Buffer, Serialization, Deserialization, JSON, Spring, HTTP, TIL]
permalink: /posts/java-io-stream-buffer-serialization-http-flow/
---

어제 Thread와 동시성을 공부하면서 서버에는 여러 요청이 동시에 들어오고, 각 요청은 Thread를 통해 처리된다는 흐름을 정리했다. 그러다 요청이 실제로 서버 안으로 들어오고 처리 결과가 다시 클라이언트로 나가는 과정이 궁금해졌다.

처음에는 I/O를 파일을 읽고 쓰는 기능 정도로 생각했다. 하지만 백엔드 서버에서 클라이언트의 요청을 받고, DB나 외부 API에서 데이터를 읽고, 처리 결과를 응답으로 보내는 과정도 모두 데이터를 외부와 주고받는 일이다.

오늘은 이 질문에서 출발해 Java I/O를 Stream과 Buffer로 이해하고, Java 객체를 외부에서 전달할 수 있는 형태로 바꾸는 직렬화와 역직렬화를 연결해 보았다. 마지막에는 Spring Controller의 HTTP 요청·응답이 이 흐름 안에서 어떻게 동작하는지 정리했다.

## 백엔드에서 I/O를 왜 알아야 했을까?

프로그램 안에만 존재하는 값은 다른 시스템이 바로 읽을 수 없다. 클라이언트가 서버로 요청을 보내면 데이터가 네트워크를 건너와 서버 프로세스에 들어온다. 서버가 DB에서 조회한 결과를 읽는 과정도 외부 저장소와 프로그램 사이의 데이터 이동이다. 처리한 결과를 HTTP Response로 돌려보내는 순간에는 반대로 프로그램의 데이터가 네트워크를 통해 밖으로 나간다.

이렇게 바라보니 I/O는 파일 API의 이름을 외우는 주제가 아니었다. **JVM 안에서 실행되는 프로그램과 외부 시스템 사이에서 데이터가 이동하는 과정**을 다루는 개념에 가까웠다.

백엔드에서 일어나는 데이터 이동을 단순화하면 다음과 같다.

~~~text
클라이언트의 HTTP 요청
        ↓
네트워크를 통한 입력
        ↓
서버의 객체 처리
        ↓
네트워크를 통한 출력
        ↓
클라이언트의 HTTP 응답
~~~

오늘은 HTTP/HTTPS 프로토콜의 상세 동작을 파고들기보다, 이 요청과 응답 안에서 Java I/O와 데이터 변환이 어떤 역할을 맡는지에 집중했다.

## Stream은 데이터가 흐르는 통로다

Java I/O에서 `InputStream`을 처음 봤을 때는 파일을 읽을 때 사용하는 클래스 중 하나라고 생각했다. 문서를 확인하면서 `InputStream`이 특정 파일에 종속된 도구가 아니라 byte 입력 스트림을 표현하는 추상 클래스라는 점을 알게 됐다. 반대 방향으로 데이터를 외부에 쓰는 쪽에는 `OutputStream`이 있고, 두 추상화는 데이터가 이동하는 방향을 기준으로 입력과 출력을 나눈다.

Stream을 이해할 때 중요한 것은 데이터를 반드시 한 번에 모두 메모리에 올려놓고 처리하지 않아도 된다는 점이다. 데이터가 흐르는 통로를 통해 필요한 만큼 순차적으로 읽고 처리할 수 있다.

예를 들어 대용량 파일이나 큰 요청 본문을 한 번에 배열이나 객체로 만들면 읽은 데이터가 Heap에 쌓인다. 데이터가 커질수록 Heap 사용량과 GC 부담이 늘어나고, 여러 요청이 동시에 들어오면 메모리 압박이 더 커진다. 상황에 따라 `OutOfMemoryError`로 이어질 위험도 있다.

그렇다고 Stream을 사용하면 메모리 문제가 자동으로 사라진다고 이해하면 안 된다. Stream을 사용하더라도 애플리케이션이 결국 모든 데이터를 한 번에 모으도록 작성하면 메모리 사용량은 다시 커진다. 핵심은 Stream이 **데이터를 필요한 단위로 읽고 처리할 수 있는 구조**를 제공한다는 데 있다.

즉 Stream은 “대용량 데이터를 무조건 안전하게 처리하는 기능”이 아니라, 데이터의 입력과 처리를 한 덩어리로 고정하지 않고 흐름으로 다룰 수 있게 하는 추상화다.

## Buffer는 왜 필요할까?

Stream을 이해한 다음에는 작은 단위의 I/O가 반복될 때 어떤 비용이 생기는지 생각해 보았다. 데이터를 아주 조금 읽을 때마다 외부 시스템에 직접 읽기 요청을 보내면, 실제 데이터 처리보다 I/O 작업을 요청하고 기다리는 일이 자주 반복될 수 있다.

처음에는 Buffer를 데이터를 잠시 저장해 두는 공간이라고만 생각했다. 하지만 목적은 저장 자체보다 **작은 I/O를 적절한 단위로 모아 I/O 횟수를 줄이는 것**에 있었다.

~~~text
버퍼가 없을 때
작은 데이터 읽기 → I/O → 작은 데이터 읽기 → I/O → 작은 데이터 읽기 → I/O

버퍼를 사용할 때
여러 데이터를 버퍼에 모으기 → 묶어서 I/O
~~~

읽을 때는 일정량의 데이터를 미리 받아 두고, 쓸 때는 데이터를 일정량 모은 뒤 한 번에 내보내는 식이다. 이렇게 하면 매번 작은 작업을 외부까지 전달하는 횟수를 줄일 수 있다.

다만 Buffer를 사용한다고 모든 상황에서 성능이 좋아지는 것은 아니다. 버퍼 크기가 지나치게 크면 메모리를 더 사용하고, 처리 방식에 따라 대기 시간이 달라질 수 있다. 결국 Buffer의 목적은 데이터를 무조건 많이 담는 것이 아니라, 처리 상황에 맞는 단위로 모아 I/O 비용과 메모리 사용 사이의 균형을 잡는 데 있다.

## 왜 Java 객체를 그대로 외부로 보낼 수 없을까?

여기서 I/O와 직렬화를 연결할 수 있었다. Java 객체는 JVM 안에서 사용하는 표현이다. 객체에는 필드와 타입 정보가 있고, 다른 객체를 가리키는 참조도 있다. 하지만 그 참조값은 현재 JVM 안에서만 의미가 있다.

서버의 객체 참조를 HTTP를 통해 다른 컴퓨터로 보낸다고 해도 상대 시스템은 그 참조가 가리키는 Heap을 알 수 없다. 클라이언트가 Java가 아니라 JavaScript나 Python으로 작성되었다면 Java 객체의 내부 표현을 그대로 해석할 수도 없다.

그래서 객체 자체가 아니라 서로 약속할 수 있는 데이터 표현으로 바꾸어 전달해야 한다.

~~~text
Java Object
    ↓
외부에서 저장·전달할 수 있는 데이터 표현
    ↓
JSON / Binary / 기타 데이터 형식
~~~

프로그램 내부의 객체를 저장하거나 전달할 수 있는 형태로 바꾸는 과정을 **직렬화(Serialization)** 라고 한다. 반대로 외부에서 받은 데이터 표현을 프로그램 내부에서 사용할 객체로 바꾸는 과정은 **역직렬화(Deserialization)** 다.

여기서 JSON은 직렬화 그 자체가 아니다. JSON은 객체를 표현하는 여러 형식 중 하나다. 직렬화의 본질은 Java 객체를 외부 시스템이 이해할 수 있거나 저장할 수 있는 형태로 변환하는 데 있다.

## Java 기본 직렬화와 JSON 직렬화는 다르다

오늘 가장 많이 헷갈렸던 부분은 `Serializable`과 JSON의 관계였다. 처음에는 Java 객체를 JSON으로 바꾸려면 `Serializable`을 구현해야 하는 줄 알았다. 하지만 둘은 서로 다른 직렬화 메커니즘이었다.

`java.io.Serializable`은 Java Object Serialization 프로토콜에 참여하는 클래스를 표시하는 인터페이스다. `ObjectOutputStream`과 `ObjectInputStream`을 사용하는 Java 기본 직렬화와 관련되어 있으며, Java 객체의 상태를 Java가 이해할 수 있는 직렬화된 스트림 형태로 저장하고 복원하는 데 사용된다.

흐름을 나누면 다음과 같다.

~~~text
Java 기본 직렬화
Java Object
    ↓
Serializable
    ↓
Java Object Serialization

JSON 직렬화
Java Object
    ↓
Jackson 등의 JSON Mapper
    ↓
JSON
~~~

따라서 `UserResponse`가 `Serializable`을 구현한다고 해서 JSON 직렬화가 이루어지는 것은 아니다. 이 선언은 Java 기본 직렬화 메커니즘의 참여 대상이라는 뜻이지, JSON으로 변환하라는 지시가 아니다. 반대로 일반적인 Spring REST API에서 응답 객체를 JSON으로 반환할 때도 반드시 `Serializable`을 구현해야 하는 것은 아니다.

이 둘을 분리해 기억해야 하는 이유는 “직렬화”라는 같은 단어가 서로 다른 상황에서 사용되기 때문이다.

> `Serializable`은 Java 기본 직렬화를 위한 것이고, Spring REST API의 JSON 직렬화는 Jackson 같은 JSON Mapper가 담당한다.

## Spring 백엔드 요청은 어떻게 연결될까?

앞에서 나눈 개념을 Spring Controller의 회원 생성 요청에 연결해 보았다.

~~~java
@PostMapping("/users")
public UserResponse createUser(
        @RequestBody CreateUserRequest request
) {
    return userService.create(request);
}
~~~

코드만 보면 `@RequestBody`가 붙은 객체를 받고 서비스의 결과를 반환하는 간단한 메서드다. 데이터 이동 관점에서 보면 Controller 메서드가 실행되기 전후에 여러 단계가 이미 연결되어 있다.

~~~text
Client
  │
  │ HTTP Request + JSON
  ▼
Network Input
  │
  ▼
JSON
  │
  │ Deserialization
  ▼
CreateUserRequest
  │
  ▼
Business Logic
  │
  ▼
UserResponse
  │
  │ Serialization
  ▼
JSON
  │
  ▼
Network Output
  │
  │ HTTP Response
  ▼
Client
~~~

![클라이언트의 JSON 요청이 Java 객체가 되고 비즈니스 로직을 거쳐 JSON 응답으로 돌아가는 Spring HTTP 흐름](/assets/images/2026-09-17-java-io-http-flow/spring-http-io-serialization-flow.svg)

클라이언트가 보낸 HTTP Request가 서버로 들어오는 것은 네트워크 I/O다. Request Body의 JSON을 `CreateUserRequest` 객체로 바꾸는 과정은 역직렬화다. 그 객체를 서비스에 전달해 비즈니스 로직을 수행하고, 결과로 나온 `UserResponse` 객체를 JSON으로 바꾸는 과정은 직렬화다. 변환된 JSON을 HTTP Response로 보내는 단계는 네트워크 출력이다.

처음에는 이 전체를 “직렬화해서 HTTP 통신한다”라고 한 덩어리로 생각했다. 지금은 두 책임을 나누어 본다.

> **I/O는 데이터를 주고받는 과정이고, 직렬화와 역직렬화는 그 과정에서 데이터의 표현을 바꾸는 작업이다.**

직렬화가 데이터를 JSON으로 바꾸더라도 네트워크를 통해 전송하지 않으면 HTTP 통신은 일어나지 않는다. 반대로 네트워크에서 JSON을 받았더라도 Java 객체로 해석하는 역직렬화가 있어야 애플리케이션의 비즈니스 로직에서 사용하게 된다.

## Spring에서는 누가 JSON 변환을 처리할까?

Controller 메서드 안에서 매번 JSON 문자열을 직접 읽고 객체로 변환하지 않아도 되는 이유도 이 흐름에서 이해할 수 있었다.

Spring MVC의 `HttpMessageConverter` 계층은 HTTP Request와 Response Body를 읽고 쓰는 역할을 맡는다. Spring 문서에서 설명하듯 이 계층은 `InputStream`과 `OutputStream`을 통해 HTTP 본문을 다루며, 서버의 REST Controller에서도 사용된다.

JSON을 사용하는 경우에는 Jackson 기반 Message Converter가 JSON과 Java 객체 사이의 변환을 담당한다. 그래서 `@RequestBody CreateUserRequest request`를 선언하면 Framework가 요청 본문의 JSON을 읽고 역직렬화한 뒤 메서드 인자로 전달한다. 메서드가 `UserResponse`를 반환하면 응답 본문에 맞는 JSON으로 직렬화해 클라이언트에 보낸다.

이 과정에서 Controller가 직접 JSON Parsing 코드를 작성하지 않아도 되는 것은 변환이 없어서가 아니다. Framework가 I/O와 Message Converter를 통해 그 과정을 대신 처리하고 있기 때문이다.

~~~text
네트워크 I/O
    ↓
HTTP Body의 데이터 표현
    ↓
역직렬화
    ↓
Java 객체
    ↓
비즈니스 로직
    ↓
Java 객체
    ↓
직렬화
    ↓
HTTP Body의 데이터 표현
    ↓
네트워크 I/O
~~~

오늘은 Jackson 내부 구현이나 `DispatcherServlet`이 요청을 분배하는 세부 과정까지 확장하지 않았다. `@RequestBody`와 반환 객체 뒤에 I/O, 데이터 표현, 역직렬화와 직렬화가 연결되어 있다는 구조를 이해하는 데 의미를 두었다.

## 오늘 최종적으로 정리한 흐름

처음에는 I/O를 파일 읽기와 쓰기로 좁게 생각했다. 하지만 백엔드 서버의 관점에서 보면 HTTP 요청과 응답, DB, 파일, 외부 API처럼 프로그램과 외부 시스템이 데이터를 주고받는 과정 전체가 I/O와 연결되어 있었다.

Stream은 데이터를 한 번에 모두 처리해야 한다는 전제에서 벗어나 필요한 단위로 순차 처리할 수 있는 통로를 제공한다. Buffer는 작은 단위의 I/O를 적절히 모아 반복 횟수를 줄인다. 두 개념 모두 데이터가 이동하는 비용을 다루지만, Stream을 사용한다고 메모리 문제가 자동으로 해결되거나 Buffer를 사용한다고 성능이 항상 좋아지는 것은 아니다.

서로 다른 시스템 사이에서는 JVM 안의 객체 참조를 그대로 전달할 수 없다. 그래서 객체를 JSON이나 Binary 같은 외부 표현으로 바꾸는 직렬화가 필요하고, 받은 표현을 다시 프로그램 내부 객체로 바꾸는 역직렬화가 필요하다.

Spring REST API의 요청과 응답을 한 줄로 묶으면 다음과 같다.

~~~text
HTTP Request
→ Network Input
→ JSON
→ Deserialization
→ Java Object
→ Business Logic
→ Java Object
→ Serialization
→ JSON
→ Network Output
→ HTTP Response
~~~

오늘 가장 중요하게 수정한 이해는 이것이다.

> `Serializable`을 구현해야 JSON 직렬화가 되는 것이 아니다. Java 기본 직렬화와 Jackson 기반 JSON 직렬화는 서로 다른 메커니즘이다.

이제 Controller에서 자연스럽게 사용하던 `@RequestBody`와 응답 객체를 볼 때도 그 뒤의 흐름을 함께 떠올릴 수 있을 것 같다. 요청 데이터는 네트워크 I/O를 통해 들어오고, Message Converter가 JSON을 Java 객체로 바꾼다. 비즈니스 로직이 끝나면 결과 객체는 다시 JSON으로 변환되고, 네트워크 I/O를 거쳐 클라이언트로 나간다.

### 참고 자료 (Sources)

* **Oracle:** [Java SE 21 `InputStream` API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/InputStream.html)
* **Oracle:** [Java Object Serialization Specification — Serializable Interface](https://docs.oracle.com/en/java/javase/21/docs/specs/serialization/serial-arch.html)
* **Spring Framework:** [HTTP Message Conversion](https://docs.spring.io/spring-framework/reference/web/webmvc/message-converters.html)

<!-- HUMANIZE-SUMMARY
원문/윤문본 글자수: 약 9,317자 / 7,752자
변경률: 약 16.8% (문장 단위 편집률 기준)
탐지/개선: A-2 3→0, A-10 9→1, C-7 2→0, C-11 4→0, D-1 3→1, H-1 2→2, I-3 3→0, J-3 1→0
자체검증: 6/6 통과 — 기술 용어·수치·날짜·코드·인용·내부 이미지 경로 보존, 장르·문체 일관성, S1 잔존 없음
등급: A — S1 잔존이 없고 S2 핵심 패턴을 허용 범위로 줄였으며, 질문에서 개념을 연결해 가는 기술 블로그 흐름을 유지했다.
주요 변경 하이라이트:
1. I/O를 파일 API가 아니라 JVM과 외부 시스템 사이의 데이터 이동으로 확장해 도입
2. Stream과 Buffer를 메모리 절약·성능 향상이라는 단정에서 벗어나 처리 단위와 I/O 횟수의 관점으로 정리
3. `Serializable`과 Jackson JSON 직렬화를 별도 흐름으로 분리해 잘못된 이해를 교정
4. Spring `HttpMessageConverter`를 통해 네트워크 I/O, 변환, 비즈니스 로직이 연결되는 순서를 하나의 흐름으로 통합
5. 장식용 이미지를 배제하고 요청·응답의 I/O 영역과 직렬화 영역을 구분한 가로형 SVG 다이어그램을 배치
-->
