---
title: "Spring Bean Lifecycle과 Scope — Annotation은 어떻게 동작할까"
date: 2026-09-21
categories: [TIL, Spring, Backend]
tags: [Spring, Bean, Scope, Lifecycle, Annotation, Reflection, TIL]
permalink: /posts/spring-bean-lifecycle-scope-annotation-reflection/
---

지난 글에서 IoC와 DI를 배우며 객체 생성과 의존 관계 구성을 Spring Container에 맡긴다는 내용을 정리했다. 여기까지는 알겠는데 Container는 객체를 만든 다음 어디까지 관리할까? 익숙하게 붙이던 `@Service`는 또 어떻게 Bean 등록으로 이어질까? Bean의 생명주기와 Scope에서 출발해 Annotation과 Reflection으로 이어지는 과정을 따라가 봤다.

## Spring Bean은 생성된 뒤에도 관리된다

Spring Container가 Bean을 관리한다는 말은 객체를 대신 만드는 데서 끝나지 않는다. 생성한 객체에 의존성을 연결하고 초기화한 뒤 애플리케이션에 넘긴다. Container가 닫힐 때는 필요한 자원을 정리하는 단계도 있다.

```text
Bean 생성
   ↓
의존성 주입
   ↓
초기화 Callback
   ↓
애플리케이션에서 사용
   ↓
소멸 Callback
```

생성자는 객체에 필요한 값과 의존성을 받아 유효한 상태를 만든다. 초기화 Callback은 의존성 주입을 마친 뒤 필요한 작업을 맡는다. Bean을 다 쓰고 나면 소멸 Callback에서 외부 연결이나 자원을 정리한다.

처음에는 생성자에서 초기화까지 처리하면 된다고 생각했다. 그런데 필드나 Setter 주입에서는 객체를 만든 다음 의존성을 채우고 생성 직후에는 필요한 값이 아직 비어 있기도 한다. 꼭 필요한 값은 생성자로 받고 모든 의존성이 들어온 뒤 할 일은 초기화 단계에 두는 편이 맞겠다고 이해했다.

## 초기화와 소멸 시점을 지정하는 방법

Java 설정의 `@Bean`에서는 초기화 메서드와 소멸 메서드 이름을 지정한다. 아래 Bean은 의존성 주입이 끝나면 `init`을 실행한다. 기본 Singleton Scope의 `close`는 Container가 종료될 때 호출된다.

~~~java
@Configuration
public class AppConfig {

    @Bean(initMethod = "init", destroyMethod = "close")
    public Client client() {
        return new Client();
    }
}

public class Client {

    public void init() {
        // 초기화 작업
    }

    public void close() {
        // 자원 정리
    }
}
~~~

Spring은 `@PostConstruct`와 `@PreDestroy`로도 Callback을 지원한다. `InitializingBean`이나 `DisposableBean`을 구현하는 방법도 있지만 Spring 인터페이스에 코드가 직접 묶인다. 오늘은 어떤 API를 외우기보다 생성, 초기화, 정리 시점을 나눠 생각하는 게 먼저였다. ([Spring Bean Lifecycle Callbacks](https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html), [`@Bean`과 Callback](https://docs.spring.io/spring-framework/reference/core/beans/java/bean-annotation.html))

## Scope가 정하는 인스턴스의 범위

생명주기를 보다가 Scope까지 연결됐다. 기본값인 Singleton은 Spring IoC Container 하나에서 Bean 정의마다 인스턴스 하나를 공유한다. ClassLoader마다 하나만 허용하는 GoF Singleton 패턴과는 범위가 다르다.

같은 Service Bean의 변경 가능한 필드에 요청별 값을 보관하면 여러 Thread가 그 상태를 공유한다. 요청이 겹치면 실행 순서에 따라 한 요청이 기록한 값을 다른 요청이 덮어쓰는 경쟁 상태로 이어진다. Singleton이라는 말은 인스턴스 범위만 가리키며 Thread Safety까지 보장하지는 않는다.

동시성을 공부하며 본 공유 상태 문제가 여기서도 생긴다. 요청 정보는 필드가 아니라 메서드 인자나 지역 변수로 다루는 편이 안전하다.

Request Scope는 HTTP 요청 하나가 끝날 때까지 해당 요청의 Bean 인스턴스를 사용한다. 요청별 `userId`나 `traceId`처럼 그 요청 안에서만 쓰는 정보를 담는다.

이 Scope는 웹 환경에서 동작한다. Prototype은 Bean을 요청할 때마다 새 인스턴스를 만든다.

```text
getBean() → Prototype Bean #1
getBean() → Prototype Bean #2
```

Prototype은 생성과 의존성 주입, 초기화까지 Spring이 처리한 뒤 호출자에게 건넨다. 그 뒤의 생명주기는 Container가 끝까지 관리하지 않아 설정한 소멸 Callback도 자동 실행되지 않는다. 외부 자원을 여는 Prototype이라면 누가 닫을지 따로 정해야 한다. ([Spring Bean Scopes](https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html))

## Singleton 안에 Prototype을 주입하면

Singleton Bean에 Prototype을 주입하면 메서드를 부를 때마다 새 객체가 나올까? 일반 생성자 주입에서는 Singleton을 만들 때 의존성을 한 번 해결한다. 그때 만들어진 Prototype 하나가 주입되고 Singleton은 계속 그 참조를 쓴다.

```text
Singleton 생성
      ↓
Prototype 생성 및 주입
      ↓
Singleton이 같은 참조를 계속 사용
```

호출할 때마다 새 Prototype이 필요하다면 메서드가 실행되는 시점에 새 인스턴스를 요청하는 구조를 따로 마련해야 한다. Prototype이라는 이름만 보고 매번 새로 주입될 거라 생각했는데, 실제 생성 시점은 의존성을 해석하는 때였다.

## Annotation은 코드에 붙이는 메타데이터

`@Service`가 붙은 클래스는 Spring이 어떻게 Bean 후보로 찾을까? 처음에는 Annotation이 기능을 직접 실행한다고 여겼다. 지금은 코드에 역할이나 설정을 표시하는 정보라고 이해한다. 그 정보를 읽고 해석하는 쪽은 Framework다.

`@Target`은 Annotation을 클래스나 메서드, 필드 가운데 어디에 붙일지 정한다. `@Retention`은 정보를 언제까지 남길지 정한다.

```text
SOURCE  컴파일 뒤 버린다
CLASS   .class 파일에 남지만 런타임 보존은 보장하지 않는다
RUNTIME 실행 중에도 유지되어 Reflection에서 조회된다
```

Java SE 21의 `RetentionPolicy.RUNTIME`은 VM이 실행되는 동안 Annotation 정보를 보존한다. 그래서 Java Reflection API에서 조회된다. `Class.getAnnotation()`은 특정 클래스에 지정한 Annotation이 있는지 확인하는 메서드다. ([Java SE 21 `RetentionPolicy`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/annotation/RetentionPolicy.html), [Java SE 21 `Class`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Class.html))

~~~java
Class<UserService> type = UserService.class;
Service service = type.getAnnotation(Service.class);
~~~

Java Reflection은 실행 중 Class, Method, Field, Constructor 같은 타입 정보를 조회하는 기능이다. 그렇다고 Spring이 모든 일을 Reflection 하나로 처리하는 건 아니다. Component Scan, BeanDefinition 처리, BeanPostProcessor 같은 메커니즘이 함께 움직이며 Reflection은 그중 런타임 정보를 읽는 방법이다.

## Annotation에서 Spring Bean으로 이어지는 과정

`@Service`에는 `@Component`가 메타 어노테이션으로 붙어 있다. Component Scan은 `@Component`가 직접 붙은 클래스와 이를 포함하는 Annotation이 붙은 클래스를 Bean 후보로 찾는다.

Spring은 클래스 정보를 BeanDefinition으로 등록한 뒤 Container에서 객체를 만들고 의존성을 연결한다. `@Service`가 객체를 만드는 게 아니라 Spring이 메타데이터를 읽고 규칙에 따라 Bean을 구성한다. ([Spring Classpath Scanning](https://docs.spring.io/spring-framework/reference/core/beans/classpath-scanning.html))

![Annotation 메타데이터를 Spring이 해석해 Bean을 등록하고 생명주기를 관리하는 흐름](/assets/images/2026-09-21-spring-bean-lifecycle/spring-annotation-to-bean-lifecycle.svg)

실제 Backend 코드에선 `UserService`가 이런 과정을 거친다.

~~~java
@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow();
    }
}
~~~

`@Service`가 클래스의 역할을 표시하면 Component Scan이 Bean 후보를 찾는다. Container는 `UserRepository`를 생성자로 전달하고 초기화가 끝난 `UserService`를 Scope에 맞춰 관리한다. 기본 Singleton이라 여러 요청이 같은 객체를 쓰므로 `userId`는 필드가 아니라 메서드 매개변수로 받는다.

전에는 Bean, Scope, Annotation, Reflection을 각자 외울 개념으로 봤다. 이제 코드의 메타데이터를 Spring이 해석해 BeanDefinition으로 바꾸고 객체 생성과 의존성 주입, 초기화를 이어가는 흐름으로 읽힌다. Spring 프로젝트에서 자주 보던 `@Service` 뒤에 Container의 Bean 관리가 이어진다는 점이 연결됐다.

### 참고 자료 (Sources)

* **Spring Framework:** [Customizing the Nature of a Bean](https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html)
* **Spring Framework:** [Using the `@Bean` Annotation](https://docs.spring.io/spring-framework/reference/core/beans/java/bean-annotation.html)
* **Spring Framework:** [Bean Scopes](https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html)
* **Spring Framework:** [Classpath Scanning and Managed Components](https://docs.spring.io/spring-framework/reference/core/beans/classpath-scanning.html)
* **Java SE 21:** [`RetentionPolicy`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/annotation/RetentionPolicy.html) · [`Class`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Class.html)
