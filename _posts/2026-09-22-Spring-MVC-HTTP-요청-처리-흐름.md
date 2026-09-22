---
title: "Spring MVC HTTP 요청 처리 흐름 — DispatcherServlet부터 Jackson까지"
date: 2026-09-22
categories: [TIL, Spring, Backend]
tags: [Spring MVC, DispatcherServlet, HandlerMapping, HandlerAdapter, ArgumentResolver, HttpMessageConverter, Jackson, HTTP, TIL]
permalink: /posts/spring-mvc-http-request-flow/
---

Spring에서 Controller를 작성할 때는 다음 코드만으로도 요청을 받을 수 있다.

```java
@PostMapping("/users")
public UserResponse create(
        @RequestBody CreateUserRequest request
) {
    return userService.create(request);
}
```

처음에는 Spring이 `@PostMapping`과 `@RequestBody`를 보고 Controller를 바로 실행한다고 생각했다. 하지만 HTTP Request는 Controller 메서드에 곧장 전달되지 않는다. Servlet Container와 `DispatcherServlet`을 거친 뒤 여러 구성 요소가 역할을 나눠 요청을 처리한다.

이번에는 다음 질문을 따라가며 흐름을 정리했다.

> HTTP Request가 들어오면 Spring은 실행할 Controller와 메서드를 어떻게 찾고 매개변수는 어떻게 준비할까?

`HandlerMapping`, `HandlerAdapter`, `ArgumentResolver`, `HttpMessageConverter`, Jackson의 역할이 한 흐름 안에서 섞여 있었는데, 각 구성 요소가 맡은 책임을 분리하면서 전체 구조를 다시 연결해 보았다.

## 먼저 전체 흐름을 그려 보았다

큰 흐름은 다음과 같다.

```text
Client
    ↓
Servlet Container
    ↓
DispatcherServlet
    ↓
HandlerMapping
    ↓
HandlerAdapter
    ↓
ArgumentResolver
    ↓
HttpMessageConverter
    ↓
Jackson
    ↓
Controller
    ↓
Jackson
    ↓
HttpMessageConverter
    ↓
HTTP Response
```

다만 이 그림을 모든 요청이 반드시 통과하는 고정된 호출 순서로 보면 안 된다. `@RequestParam`이나 `@PathVariable`처럼 URL과 요청 파라미터에서 값을 얻는 경우에는 JSON Body 변환이 필요하지 않다. `HttpMessageConverter`와 Jackson은 HTTP Body를 읽거나 쓸 때, 그중에서도 JSON을 사용하는 예시에서 등장한다.

![JSON 요청과 응답을 예시로 본 Spring MVC HTTP 요청 처리 흐름](/assets/images/2026-09-22-spring-mvc-http-request-flow/spring-mvc-http-request-flow.svg)

## Servlet Container와 DispatcherServlet

클라이언트가 HTTP Request를 보내면 먼저 Servlet Container가 요청을 받는다. Spring MVC에서는 `DispatcherServlet`이 이 요청을 처리하는 Front Controller 역할을 맡는다.

처음에는 `DispatcherServlet`이 적절한 Controller를 찾아 바로 호출한다고 이해했다. 실제로는 여러 작업을 직접 수행하기보다 필요한 구성 요소에 일을 나눠 준다.

- 요청에 맞는 Handler를 찾는다.
- 찾은 Handler를 호출한다.
- Controller 메서드의 매개변수를 준비한다.
- HTTP Body를 Java 객체로 읽는다.
- Controller의 반환값을 HTTP Response Body로 쓴다.

그래서 `DispatcherServlet`은 단순히 Controller를 찾는 객체가 아니다. Spring MVC 요청 처리의 중심에서 전체 흐름을 조정하는 조정자에 가깝다.

## HandlerMapping은 Handler를 찾는다

`POST /users` 요청과 다음 Controller 메서드가 있다고 하자.

```java
@PostMapping("/users")
public UserResponse create(...) {
    return userService.create(...);
}
```

`HandlerMapping`은 요청 경로와 HTTP Method 같은 정보를 기준으로 이 요청을 처리할 Handler를 찾는다. 애노테이션 기반 Controller라면 `@RequestMapping` 계열 애노테이션이 매핑 정보를 만드는 데 사용된다.

여기서 중요한 점은 `HandlerMapping`이 Controller 메서드를 실행하지 않는다는 것이다. 이 구성 요소의 책임은 **요청을 처리할 Handler를 탐색하는 것**이다.

처음에는 HandlerMapping이 요청을 Controller까지 전달한다고 뭉뚱그려 생각했다. 이제는 “누가 실행할지 찾는 단계”와 “찾은 대상을 실행하는 단계”를 나눠서 본다.

## HandlerAdapter는 Handler 실행을 돕는다

HandlerMapping이 Handler를 찾았다고 해서 `DispatcherServlet`이 그 Handler를 직접 호출하는 것은 아니다. `HandlerAdapter`가 `DispatcherServlet`이 Handler를 실행할 수 있도록 돕는다.

```text
HandlerMapping
→ 요청을 처리할 Handler 탐색

HandlerAdapter
→ 찾아낸 Handler를 호출할 수 있도록 지원
```

Handler의 종류와 호출 방식이 하나뿐이라면 `DispatcherServlet`이 모든 호출 방법을 알고 있어도 될 것 같다. 하지만 애노테이션 기반 Controller와 다른 방식의 Handler가 함께 존재할 수 있다. `HandlerAdapter`라는 추상화를 두면 `DispatcherServlet`은 Handler의 세부 호출 방식을 직접 알 필요가 없다.

오늘은 `HandlerAdapter` 구현체 내부를 파고들기보다, **Handler를 찾는 책임과 실행을 지원하는 책임이 다르다**는 점을 기준으로 정리했다.

## ArgumentResolver는 메서드 매개변수를 준비한다

Handler를 찾고 실행할 방법을 정해도 Controller 메서드에 넘길 값이 없으면 호출할 수 없다.

```java
@GetMapping("/users/{id}")
public UserResponse getUser(
        @PathVariable Long id,
        @RequestParam boolean detail
) {
    return userService.getUser(id, detail);
}
```

이 메서드를 실행하려면 `id`와 `detail`을 먼저 준비해야 한다. 이때 `HandlerMethodArgumentResolver`가 매개변수의 애노테이션과 타입을 보고 적절한 값을 해석한다.

```text
ArgumentResolver
→ Controller 메서드에 필요한 매개변수 준비
```

`@PathVariable`은 URI 경로에서 값을 찾고 `@RequestParam`은 요청 파라미터에서 값을 찾는다. 단순 타입으로 변환해야 한다면 Spring의 타입 변환 과정도 함께 거친다.

처음에는 ArgumentResolver가 요청의 모든 값을 해석하고 JSON 변환까지 직접 담당한다고 생각했다. 하지만 핵심 역할은 JSON 자체를 읽는 것이 아니라 **Controller 메서드를 호출할 때 필요한 인자를 준비하는 것**이다.

## ArgumentResolver와 HttpMessageConverter는 같은 역할이 아니다

둘 다 Controller 매개변수와 관련되어 보이지만 책임의 층위가 다르다.

```text
ArgumentResolver
→ 어떤 방식으로 Controller 매개변수를 준비할지 결정

HttpMessageConverter
→ HTTP Body와 Java 객체 사이를 변환
```

`@RequestBody`를 예로 들면 `ArgumentResolver`가 메서드 매개변수에 `@RequestBody`가 붙어 있다는 사실을 보고 Body를 읽어야 한다고 판단한다. 실제 Body를 `CreateUserRequest`로 변환하는 작업은 `HttpMessageConverter`에 맡긴다.

이 때문에 두 구성 요소를 완전히 독립적인 일렬 단계로 이해하면 흐름이 어긋난다. `@RequestBody`를 처리하는 Resolver가 Converter를 사용해 매개변수를 준비한다고 보는 편이 정확하다.

## HttpMessageConverter와 Jackson을 나눠서 본다

`HttpMessageConverter`는 Spring MVC가 HTTP Request와 Response Body를 읽고 쓰기 위해 제공하는 추상화다.

```text
HttpMessageConverter
→ HTTP Body 변환을 담당하는 Spring의 추상화
```

JSON 요청이라면 JSON을 다룰 수 있는 Converter가 선택된다. 그 Converter가 JSON 데이터를 Java 객체로 매핑할 때 Jackson을 사용할 수 있다.

```text
HTTP JSON Body
    ↓
HttpMessageConverter
    ↓
Jackson 역직렬화
    ↓
CreateUserRequest
```

예를 들어 다음 요청 Body가 들어온다고 하자.

```json
{
  "name": "wooram"
}
```

```java
public record CreateUserRequest(String name) {
}
```

Controller가 JSON 문자열을 직접 읽는 것이 아니다. Spring MVC가 `@RequestBody`를 처리하는 과정에서 Converter를 선택하고 JSON과 Java 객체 사이의 실제 매핑은 Jackson이 수행한다.

그래서 다음 두 표현은 서로 다른 수준의 설명이다.

> `HttpMessageConverter`가 HTTP Body 변환을 담당한다.
>
> Jackson이 JSON과 Java 객체 사이를 직렬화·역직렬화한다.

둘 중 하나만 맞는 것이 아니라 Spring의 추상화와 그 안에서 사용되는 JSON 라이브러리를 구분한 표현이다. 물론 JSON이 아닌 형식이나 Body가 없는 요청에서는 Jackson이 등장하지 않을 수 있다.

## 요청에서는 역직렬화, 응답에서는 직렬화

`@RequestBody`가 있는 요청은 다음 방향으로 흐른다.

```text
HTTP Request Body
→ Java Object
```

외부 표현인 JSON을 Java 객체로 바꾸므로 역직렬화다. 반대로 Controller가 `UserResponse`를 반환하면 응답 Body를 만들기 위해 다음 방향으로 변환한다.

```text
Java Object
→ HTTP Response Body
```

이때는 직렬화다. JSON 응답이라면 Jackson이 Java 객체를 JSON으로 바꾸고 `HttpMessageConverter`가 그 결과를 Response Body에 쓴다.

이전 Java I/O 학습에서는 객체를 외부에서 전달할 수 있는 데이터 표현으로 바꾸는 과정을 직렬화라고 정리했다. Spring MVC를 공부하면서 이 개념이 실제 HTTP 요청과 응답의 어느 지점에서 사용되는지 연결할 수 있었다.

## Annotation과 Reflection도 같은 흐름에 있다

Controller에는 다음과 같은 애노테이션이 붙는다.

```java
@RestController
@RequestMapping
@GetMapping
@PostMapping
@RequestBody
@RequestParam
@PathVariable
```

이 애노테이션은 단순한 주석이 아니라 Spring이 런타임에 해석할 수 있는 메타데이터다. 앞서 배운 흐름을 Spring MVC에 연결하면 다음과 같다.

```text
애노테이션으로 메타데이터 작성
→ Spring이 런타임 정보와 매핑 규칙 확인
→ HandlerMapping과 ArgumentResolver 등이 의미 해석
→ 요청에 맞는 기능 수행
```

이 과정에서 Reflection은 클래스와 메서드에 어떤 애노테이션과 타입 정보가 있는지 확인하는 방법 중 하나다. 그렇다고 Spring MVC가 Reflection 하나만으로 동작하는 것은 아니다. Spring은 여러 메타데이터 처리와 호출 전략을 함께 사용하며 이번 학습에서는 애노테이션이 요청 처리 규칙으로 연결된다는 점만 확인했다.

## 전체 요청 흐름을 다시 따라가 보기

다음 Controller를 기준으로 요청부터 응답까지 연결해 보자.

```java
@PostMapping("/users")
public UserResponse create(
        @RequestBody CreateUserRequest request
) {
    return userService.create(request);
}
```

```text
1. Client가 POST /users HTTP Request를 전송한다.

2. Servlet Container가 요청을 받아 DispatcherServlet으로 전달한다.

3. DispatcherServlet이 HandlerMapping에 요청을 처리할 Handler 탐색을 요청한다.

4. HandlerMapping이 적절한 Controller 메서드를 찾는다.

5. DispatcherServlet이 HandlerAdapter를 통해 Handler 실행을 진행한다.

6. @RequestBody를 처리하는 ArgumentResolver가 매개변수를 준비한다.

7. HttpMessageConverter가 HTTP Body를 읽는다.

8. JSON 요청이라면 Jackson이 JSON을 CreateUserRequest로 역직렬화한다.

9. 준비된 request를 전달해 Controller 메서드를 실행한다.

10. Controller가 UserResponse를 반환한다.

11. 응답 Body를 작성할 때 HttpMessageConverter가 반환값을 변환한다.

12. JSON 응답이라면 Jackson이 UserResponse를 JSON으로 직렬화한다.

13. 완성된 HTTP Response가 Client로 돌아간다.
```

이 순서에서 `ArgumentResolver`와 `HttpMessageConverter`가 나란히 독립된 필터처럼 실행된다고 이해하면 안 된다. `@RequestBody`를 처리하는 Resolver가 Converter를 이용해 매개변수를 만들고 응답을 쓸 때도 HandlerAdapter와 메시지 변환 과정이 연결된다.

## 처음에 섞어 이해했던 부분을 다시 나눠 보면

처음에는 다음과 같은 흐름으로 생각했다.

```text
Servlet Container
→ DispatcherServlet
→ HandlerMapping / HandlerAdapter
→ ArgumentResolver가 요청 내용을 해석
→ HttpMessageConverter가 Java 타입으로 변환
→ Jackson
→ Controller
```

여기에는 몇 가지 역할이 섞여 있었다. `ArgumentResolver가 요청 내용을 해석한다`는 말은 너무 넓다. Resolver는 Controller 메서드의 매개변수를 준비하고 HTTP Body를 실제 객체로 바꾸는 일은 Converter가 담당한다. JSON의 구체적인 매핑은 Jackson이 수행한다.

최종적으로는 다음처럼 나눠 이해했다.

```text
DispatcherServlet
→ 전체 요청 처리 흐름 조정

HandlerMapping
→ 요청을 처리할 Handler 탐색

HandlerAdapter
→ Handler 실행 지원

ArgumentResolver
→ Controller 매개변수 준비

HttpMessageConverter
→ HTTP Body와 Java Object 변환

Jackson
→ JSON과 Java Object의 직렬화·역직렬화
```

이 구분이 생기니 문제가 생겼을 때 확인할 위치도 조금 더 분명해진다.

- 요청 경로가 Controller와 매핑되지 않으면 HandlerMapping을 먼저 본다.
- `@PathVariable`이나 `@RequestParam`이 예상과 다르면 매개변수 해석 과정을 본다.
- JSON 요청 Body가 DTO로 만들어지지 않으면 `HttpMessageConverter`와 Jackson 설정을 확인한다.
- 반환 객체가 JSON 응답으로 나오지 않으면 응답 메시지 변환 과정을 확인한다.

## 오늘 이해한 내용

Spring MVC 요청 흐름을 공부하기 전에는 `Request → DispatcherServlet → Controller → Response` 정도로만 알고 있었다. 이제는 `DispatcherServlet`이 모든 일을 직접 처리하는 것이 아니라 여러 구성 요소에 책임을 나눠 준다는 점을 설명할 수 있다.

```text
HandlerMapping
= Handler 탐색

HandlerAdapter
= Handler 실행 지원

ArgumentResolver
= Controller 매개변수 준비

HttpMessageConverter
= HTTP Body와 Java 객체 사이의 변환

Jackson
= JSON과 Java 객체 사이의 실제 직렬화·역직렬화
```

한 문장으로 말하면 다음과 같다.

> Spring MVC는 `DispatcherServlet`을 중심으로 요청 처리 책임을 나누고 Handler 탐색과 실행 지원, 매개변수 준비, HTTP Body 변환을 거쳐 Controller를 실행한다.

Annotation과 Reflection은 요청 처리에 필요한 메타데이터를 읽는 흐름으로 이어졌고 Java I/O에서 배운 직렬화·역직렬화는 HTTP Body와 Java 객체가 오가는 과정에서 다시 등장했다. 각각 외워 둔 개념이 하나의 요청 흐름 안에서 연결된 셈이다.

### 참고 자료

* **Spring Framework:** [Processing](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/sequence.html)
* **Spring Framework:** [Special Bean Types](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/special-bean-types.html)
* **Spring Framework:** [Method Arguments](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/arguments.html)
* **Spring Framework:** [`@RequestBody`](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/requestbody.html)
* **Spring Framework:** [HTTP Message Conversion](https://docs.spring.io/spring-framework/reference/web/webmvc/message-converters.html)
