---
title: "Spring Boot 실행 흐름과 Spring Security 요청 인증·인가 연결하기"
date: 2026-09-23
categories: [TIL, Spring, Backend]
tags: [Spring Boot, Spring Security, ApplicationContext, Auto Configuration, JWT, SecurityContext, Authentication, Authorization, TIL]
permalink: /posts/spring-boot-security-request-flow/
---

Spring Framework에서 IoC/DI와 MVC를 제공한다는 내용을 배웠다. 그렇다면 Spring Boot는 왜 따로 필요할까? Framework만으로도 애플리케이션을 만들 수 있는데 Boot라는 계층이 시작 과정에 어떤 도움을 주는지 궁금했다.

오늘은 이 질문을 따라가며 Spring Boot가 애플리케이션을 준비하는 흐름과 Spring Security가 HTTP 요청을 검사하는 위치를 한 흐름으로 연결해 보았다. 마지막에는 JWT로 확인한 사용자 정보가 `Authentication`과 `SecurityContext`를 거쳐 인가에 사용되는 과정까지 살펴보았다.

## Spring Framework가 있는데 Spring Boot가 필요한 이유

Spring Framework는 애플리케이션을 구성하는 핵심 기능을 제공한다. IoC/DI와 Spring MVC를 사용할 때 필요한 의존성과 설정은 애플리케이션이 준비해야 한다. 작은 예제에서는 괜찮지만 웹 애플리케이션이 커질수록 시작 단계에서 챙길 항목도 늘어난다.

Spring Boot는 이 시작 단계를 줄여 준다. 자주 함께 사용하는 라이브러리는 `Starter`로 묶고, 현재 클래스패스와 설정값, 이미 등록된 Bean을 살펴 필요한 자동 설정을 적용한다.

처음에는 `Starter`가 의존성 주입까지 담당한다고 생각하기 쉬웠다. 지금은 두 역할을 분리해서 본다.

> `Starter`는 필요한 라이브러리 의존성 묶음을 제공한다.
>
> 객체를 생성하고 의존성을 주입하는 일은 Spring Container가 담당한다.

Spring Boot는 Spring Framework를 대신하는 기술이 아니다. Spring 애플리케이션을 구성하고 실행하는 진입점을 간단하게 만들어 주는 도구에 가깝다.

## `@SpringBootApplication`에서 실행이 시작된다

가장 작은 Spring Boot 애플리케이션은 다음처럼 시작한다.

```java
@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

처음에는 `@SpringBootApplication`을 애플리케이션 실행을 표시하는 어노테이션 정도로 생각했다. 확인해 보니 설정, 자동 설정, 컴포넌트 탐색이라는 세 출발점이 하나로 묶여 있었다.

- `@SpringBootConfiguration`: 애플리케이션의 설정 클래스임을 나타낸다.
- `@EnableAutoConfiguration`: 현재 애플리케이션 조건에 맞는 자동 설정을 활성화한다.
- `@ComponentScan`: 애플리케이션 패키지를 기준으로 컴포넌트를 탐색한다.

그래서 `@SpringBootApplication`을 실행 버튼 하나를 추가하는 표식으로만 보면 부족하다. Spring Boot 애플리케이션을 구성할 기준을 한 곳에 모아 둔 조합이다. 세 기능을 따로 써도 되지만 일반적인 애플리케이션에서는 이 어노테이션을 그대로 사용한다. ([Spring Boot — Using the `@SpringBootApplication` Annotation](https://docs.spring.io/spring-boot/3.4/reference/using/using-the-springbootapplication-annotation.html))

## `SpringApplication.run()`은 부트스트랩 과정이다

처음에는 `main()` 메서드가 서버를 바로 실행한다고 단순하게 생각했다. `main()`에서 호출하는 `SpringApplication.run()`이 애플리케이션을 시작하는 부트스트랩 진입점이라는 사실을 확인했다.

내부 호출을 전부 외우기보다 애플리케이션이 준비되는 큰 순서를 아래처럼 잡았다.

```text
main()
    ↓
SpringApplication.run()
    ↓
ApplicationContext 생성
    ↓
Component Scan
    ↓
Auto Configuration
    ↓
Bean 생성 및 의존성 주입
    ↓
웹 애플리케이션 인프라 준비
    ↓
내장 Servlet Container 실행
```

`ApplicationContext`는 앞서 배운 Spring Container다. Bean을 찾고 생성하며 의존성을 연결하는 중심 객체이기도 하다. 웹 애플리케이션이라면 Spring MVC가 요청을 받을 구성과 내장 Servlet Container도 이 시작 과정에서 준비된다.

## Component Scan과 Auto Configuration을 구분하기

두 개념은 모두 시작 과정에 등장하지만 찾는 대상이 다르다.

### Component Scan

Component Scan은 개발자가 작성한 컴포넌트를 찾는 과정이다. `@Component`, `@Service`, `@Repository`, `@Controller`, `@RestController`가 붙은 클래스를 탐색해 Spring Bean으로 등록할 후보를 만든다.

### Auto Configuration

Auto Configuration은 Spring Boot가 제공하는 자동 설정 후보 중 현재 조건에 맞는 항목을 적용한다. 클래스패스에 어떤 클래스가 있는지, 설정값이 있는지, 같은 역할의 Bean을 개발자가 이미 등록했는지를 확인한다.

처음에는 Auto Configuration이 기본 설정을 전부 등록한다고 생각했다. 조건을 따져 필요한 설정만 적용하고 이미 개발자가 정의한 구성이 있으면 자동 설정이 물러난다. `@ConditionalOnClass`와 `@ConditionalOnMissingBean`은 이런 조건부 동작을 보여 주는 대표적인 예시다. ([Spring Boot — `@EnableAutoConfiguration` API](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/autoconfigure/EnableAutoConfiguration.html))

두 개념을 실행 순서에 놓으면 다음과 같다.

```text
@SpringBootApplication
        ↓
SpringApplication.run()
        ↓
ApplicationContext 생성
        ↓
Component Scan
        ↓
개발자가 작성한 Bean 등록
        ↓
클래스패스·설정값·기존 Bean 확인
        ↓
조건에 맞는 Auto Configuration 적용
        ↓
Bean 생성 및 DI
        ↓
Spring MVC 인프라 초기화
        ↓
내장 Servlet Container 실행
```

이 도식은 Spring Boot 내부의 모든 이벤트와 호출 스택을 그대로 옮긴 것이 아니다. 각 구성 요소의 책임이 어떻게 이어지는지 보기 위한 구조다.

![Spring Boot 애플리케이션이 시작되며 Spring Container와 웹 인프라를 준비하는 흐름](/assets/images/2026-09-23-spring-boot-security/spring-boot-startup-flow.svg)

## 애플리케이션이 실행된 뒤 요청은 어디로 들어오는가

애플리케이션이 실행된 뒤에도 HTTP 요청은 여러 단계를 지나 Controller에 도착한다. 전날 Spring MVC에서 정리한 흐름을 먼저 놓아 보면 다음과 같다.

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
ArgumentResolver / HttpMessageConverter
  ↓
Controller
```

Spring Security를 따라가면서 `DispatcherServlet`보다 앞에서 요청을 확인하는 계층이 있다는 것을 연결했다. Servlet 기반 Spring Security는 이 위치에서 Filter를 사용한다.

```text
Client
  ↓
Servlet Container
  ↓
Security Filter Chain
  ↓
DispatcherServlet
  ↓
Spring MVC
  ↓
Controller
```

Filter는 다음 Filter나 Servlet이 실행되기 전에 요청을 확인한다. 보안 조건에 맞지 않는 요청은 여기서 흐름을 멈추고 응답을 직접 만든다. 인증이나 인가에 실패한 요청이 Controller까지 오지 않는 이유다. ([Spring Security — Architecture](https://docs.spring.io/spring-security/reference/servlet/architecture.html))

## 인증과 인가는 다른 질문이다

두 단어가 비슷하게 느껴졌지만 확인하는 내용은 다르다.

인증(Authentication)은 요청을 보낸 사용자가 누구인지 확인하는 일이다. 인가(Authorization)는 인증된 사용자가 요청한 기능을 사용할 권한이 있는지 확인하는 일이다.

JWT 요청을 예로 들면 두 과정은 다음처럼 이어진다.

```text
JWT 검증
    ↓
사용자 인증 정보 생성
    ↓
SecurityContext에 저장
    ↓
권한 확인
    ↓
요청 허용 또는 거부
```

JWT에 사용자 정보가 들어 있다는 이유만으로 인증된 상태가 되는 것은 아니다. 요청을 받은 쪽에서 토큰의 서명과 만료를 먼저 검증해야 한다. 오늘 모의면접에서 이 단계를 처음 설명에서 빠뜨렸고, JWT를 읽는 일과 신뢰할 수 있는 인증 정보로 사용하는 일을 나눠 다시 정리했다.

## `Authentication`, `SecurityContext`, `SecurityContextHolder`

처음에는 세 객체를 모두 인증 정보를 담는 객체라고 생각했다. 살펴보니 맡은 자리가 달랐다.

```text
SecurityContextHolder
        ↓
SecurityContext
        ↓
Authentication
        ├─ principal
        ├─ credentials
        └─ authorities
```

`Authentication`은 현재 인증된 사용자를 표현하는 객체다. 대표적으로 사용자를 식별하는 `principal`, 인증에 사용된 `credentials`, 사용자에게 부여된 `authorities`를 담는다.

`SecurityContext`는 현재 보안 컨텍스트이며 그 안에 `Authentication`을 둔다. `SecurityContextHolder`는 현재 실행 흐름에서 이 `SecurityContext`에 접근하게 하는 보관 역할을 한다. 기본 전략을 사용하면 같은 Thread에서 현재 인증 정보를 꺼내 쓸 수 있다.

Spring Security 공식 문서의 관계는 `SecurityContextHolder → SecurityContext → Authentication` 순서다. JWT 자체가 `SecurityContext`에 들어가는 구조는 아니다. 검증된 JWT에서 필요한 정보를 꺼내 `Authentication`을 만들고, 그 객체를 `SecurityContext`에 넣는다. ([Spring Security — Servlet Authentication Architecture](https://docs.spring.io/spring-security/reference/servlet/authentication/architecture.html))

## JWT와 SecurityContext는 같은 것이 아니다

JWT와 `SecurityContext`를 한 문장으로 묶으면 헷갈리기 쉽다. 역할을 나누면 다음과 같다.

- JWT: 클라이언트와 서버 사이에서 인증에 필요한 정보를 전달하는 토큰
- `SecurityContext`: 서버 내부에서 현재 요청의 인증 상태를 Spring Security가 사용하도록 관리하는 컨텍스트

JWT 기반 요청은 아래 순서로 흐른다.

```text
Client
  ↓
JWT 포함 요청
  ↓
Security Filter
  ↓
JWT 서명 및 만료 검증
  ↓
사용자 정보 확인
  ↓
Authentication 생성
  ↓
SecurityContext에 Authentication 저장
  ↓
인가 처리
```

여기서 설명하는 것은 JWT를 저장하는 위치가 아니다. 요청과 함께 온 토큰을 검증한 뒤 Spring Security가 사용할 서버 내부 인증 객체로 바꾸는 과정이다.

## 인증된 정보로 인가는 어떻게 수행되는가

`Authentication`의 `authorities`는 인가 판단에 쓰인다. 관리자 권한이 필요한 API라면 현재 `Authentication`의 권한과 API가 요구하는 권한을 비교한다.

```text
Authentication
    ↓
authorities 확인
    ↓
요청에 필요한 권한과 비교
    ↓
허용 / 거부
```

Spring Security에서 `GrantedAuthority`는 사용자에게 부여된 권한을 나타낸다. 역할이나 Scope 같은 값이 여기에 해당한다. 인가 구성 요소는 이 권한을 읽어 허용 여부를 결정한다. ([Spring Security — Authorization Architecture](https://docs.spring.io/spring-security/reference/servlet/authorization/architecture.html))

인가 검사는 한 위치에서만 일어나지 않는다. Filter 기반 보안은 요청이 `DispatcherServlet`으로 넘어가기 전에 동작한다. `@PreAuthorize` 같은 메서드 보안은 Controller나 Service 메서드가 실행되기 직전에 권한을 확인한다.

```text
HTTP Request
    ↓
Security Filter Chain
    ↓
DispatcherServlet
    ↓
Controller / Service
    ↓
@PreAuthorize가 적용된 메서드 실행 전 권한 검사
```

둘 다 보안 검사지만 실행 위치와 책임은 다르다. Spring AOP 내부 구현까지 들어가기보다 요청 수준의 Filter 검사와 메서드 실행 직전의 권한 검사를 나눠 보는 데 집중했다.

## 비밀번호는 복호화해서 비교하지 않는다

모의면접에서 비밀번호 검증 설명도 다시 확인했다. 저장된 비밀번호를 복호화해 입력값과 비교하는 방식이 아니다.

`PasswordEncoder`는 비밀번호를 안전하게 저장하기 위한 단방향 변환을 제공한다. 인증할 때는 입력받은 평문 비밀번호를 비교 메커니즘으로 확인해 저장된 인코딩 값과 일치하는지 판단한다. 원래 값을 복호화해 꺼내는 방식이 아니다. ([Spring Security — Password Storage](https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html))

## 오늘 학습을 하나의 요청 흐름으로 연결하기

애플리케이션 시작과 클라이언트 요청을 하나의 구조로 놓으면 다음과 같다.

애플리케이션 시작:

```text
@SpringBootApplication
        ↓
SpringApplication.run()
        ↓
ApplicationContext 생성
        ↓
Component Scan + Auto Configuration
        ↓
Bean 생성 / DI
        ↓
Servlet Container 실행
```

클라이언트 요청:

```text
Client
        ↓
Servlet Container
        ↓
Security Filter Chain
        ↓
JWT 서명 / 만료 검증
        ↓
Authentication 생성
        ↓
SecurityContext 저장
        ↓
Authorization
        ↓
DispatcherServlet
        ↓
HandlerMapping
        ↓
HandlerAdapter
        ↓
ArgumentResolver / HttpMessageConverter
        ↓
Controller
```

![Spring Security 인증 정보가 Spring MVC 요청 처리로 이어지는 전체 흐름](/assets/images/2026-09-23-spring-boot-security/security-mvc-request-flow.svg)

전에는 Spring Boot와 Spring Security를 서로 다른 기능 목록처럼 봤다. 애플리케이션 시작 시 Spring Container와 웹 인프라가 준비되고, 요청이 들어오면 Security Filter가 인증과 인가에 필요한 정보를 확인한 뒤 Spring MVC로 넘긴다는 한 흐름으로 보게 됐다.

## 헷갈렸던 부분을 다시 보면

첫째, `Starter`가 의존성 주입까지 담당한다고 생각했다. `Starter`는 라이브러리 의존성을 묶어 제공하고 Bean 생성과 의존성 주입은 Spring Container가 담당한다.

둘째, Auto Configuration이 기본 설정을 전부 등록한다고 생각했다. 클래스패스와 설정값, 기존 Bean 같은 조건을 확인해 조건을 만족하는 자동 설정만 적용한다.

셋째, JWT 자체가 서버의 인증 상태라고 생각했다. JWT는 요청과 함께 전달되는 토큰이다. 서버 내부에서는 검증된 정보를 바탕으로 `Authentication`을 만들고, 그 뒤 `SecurityContext`가 현재 요청의 인증 상태로 관리한다.

넷째, 토큰에서 사용자 정보를 읽으면 바로 인증된다고 생각했다. 서명과 만료 같은 검증을 먼저 통과해야 신뢰할 수 있는 인증 정보로 사용한다.

다섯째, Security Filter와 Spring MVC가 같은 계층이라고 생각했다. Servlet Filter 기반의 Spring Security가 요청을 먼저 처리한 뒤 `DispatcherServlet`을 통해 Spring MVC 흐름으로 들어간다.

## 실제 Backend 코드와 연결하기

Spring Boot와 JWT를 사용하는 백엔드에서는 오늘 배운 흐름을 다음처럼 볼 수 있다.

```text
로그인
→ 비밀번호 검증
→ JWT 발급

이후 요청
→ Authorization Header에 JWT 전달
→ Security Filter에서 JWT 검증
→ Authentication 구성
→ SecurityContext 저장
→ 권한 검사
→ Controller 진입
```

오늘 JWT 라이브러리 사용법이나 토큰 생성 알고리즘을 구현한 것은 아니다. Spring Boot가 애플리케이션을 준비하고 Spring Security가 요청 앞단에서 인증 정보를 구성하는 과정을 하나의 백엔드 흐름으로 이해하는 것이 목표였다.

최근 며칠 동안 따로 공부했던 Spring Container, Spring MVC, Annotation과 Reflection이 오늘 `ApplicationContext`, Filter Chain, `SecurityContext`로 이어졌다. 개별 개념을 외우기보다 애플리케이션이 시작되고 요청이 Controller에 도착하기까지의 순서로 묶어 보니 각 구성 요소가 필요한 이유가 조금 더 분명해졌다.

### 참고 자료

* **Spring Boot:** [`@SpringBootApplication` Annotation](https://docs.spring.io/spring-boot/3.4/reference/using/using-the-springbootapplication-annotation.html)
* **Spring Boot:** [`@EnableAutoConfiguration` API](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/autoconfigure/EnableAutoConfiguration.html)
* **Spring Boot:** [`SpringApplication`](https://docs.spring.io/spring-boot/reference/features/spring-application.html)
* **Spring Security:** [Architecture](https://docs.spring.io/spring-security/reference/servlet/architecture.html)
* **Spring Security:** [Servlet Authentication Architecture](https://docs.spring.io/spring-security/reference/servlet/authentication/architecture.html)
* **Spring Security:** [Authorization Architecture](https://docs.spring.io/spring-security/reference/servlet/authorization/architecture.html)
* **Spring Security:** [Password Storage](https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html)


<!-- HUMANIZE-SUMMARY
원본 글자수: 11,059자
윤문본 글자수: 10,939자
변경률: 약 18% (문장 단위 편집 기준)
탐지/개선: A-7 1→0, A-10 3→2, C-7 3→1, D-1 1→0, H-1 1→0, I-1 0→0, J-3 4→2
자체검증: 6/6 통과 — 고유명사·수치·날짜·코드·URL 보존, TIL 장르와 격식 유지, S1 잔존 없음, 과윤문 없음, 새 비유 미추가
등급: A — S1 잔존 0건, S2 잔존 2건 이하, 자체검증 6/6.
주요 변경 하이라이트:
1. Spring Framework와 Spring Boot의 책임을 의존성 묶음과 Container 관리로 분리
2. Component Scan과 조건부 Auto Configuration의 대상을 자연스러운 문장으로 재배치
3. JWT를 검증한 뒤 Authentication을 만들고 SecurityContext에 넣는 과정을 명확히 구분
4. Filter 수준 인가와 @PreAuthorize 메서드 보안의 실행 위치를 대비
5. 반복 접속어와 "할 수 있다" 표현을 줄이고 학습 기록의 문장 리듬을 조정
-->
