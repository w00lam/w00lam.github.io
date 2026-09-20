---
title: "Spring IoC와 DI — 객체를 누가 만들고 연결하는가"
date: 2026-09-19
categories: [TIL, Spring, Backend]
tags: [Spring, IoC, DI, Bean, Singleton, Thread, TIL]
permalink: /posts/spring-ioc-di/
---

JVM과 Thread를 공부한 뒤 [JVM 메모리 영역](/posts/java-jvm-memory-lifecycle/)과 [Java Thread와 동시성](/posts/java-thread-concurrency-shared-state/)에서 정리한 내용을 떠올리며 Spring 코드를 다시 읽었다. 그중에서도 생성자에 필요한 객체를 적어 두는 이유가 궁금했다. 처음에는 Spring이 객체만 대신 만들어 주는 줄 알았다가, 어제 IoC와 DI를 공부하고 Container가 의존 관계와 생명주기까지 관리한다는 점을 알게 됐다.

## 구현체를 직접 만드는 코드에서 시작했다

일반적인 Java 코드에서는 필요한 객체를 직접 만들 수 있다.

~~~java
public class OrderService {

    private final OrderRepository orderRepository =
            new JdbcOrderRepository();
}
~~~

`new`를 썼다는 사실이 문제는 아니다. `OrderService`가 주문 처리와 함께 저장소 구현을 고르고 생성하는 책임까지 맡은 점이 문제다. 저장소를 교체하면 서비스 코드도 손봐야 하고, 테스트에서 대체 구현체를 연결할 때도 구조를 바꿔야 한다.

필드 초기화로 보이던 코드 안에 객체 선택과 생성 책임이 함께 있었다. 주문 처리와 저장소 구성을 분리해야 하는 이유가 여기서 드러났다.

## IoC는 객체를 누가 관리하는지 바뀌는 일

처음에는 IoC를 Spring이 객체를 대신 생성해 주는 것으로 이해했다. 살펴보니 생성은 그중 한 부분이었다. 객체 생성과 구현체 선택, 관계 연결, Bean 생명주기 관리를 애플리케이션 코드 대신 Spring IoC Container가 맡는다.

제어의 역전은 객체를 만들고 연결하는 주체가 애플리케이션 코드에서 Container로 옮겨가는 변화다. 그렇다고 `new`를 전부 없애야 하는 것은 아니다. Spring이 관리할 필요가 없는 값과 일반 객체는 직접 만들어도 된다.

## DI는 필요한 의존성을 바깥에서 받는 방식

DI는 객체가 의존 대상을 직접 만들지 않고 바깥에서 전달받는 방식이다. `OrderService`에서 저장소 구현체를 고르는 코드를 덜어내면 다음처럼 필요한 역할만 드러난다.

~~~java
public class OrderService {

    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
}
~~~

이제 서비스는 `OrderRepository`가 필요하다는 점만 드러내며, `JdbcOrderRepository`를 직접 생성하지 않는다. 어떤 구현체를 연결할지는 바깥에서 정한다. IoC는 객체 관리의 제어권을 넘기는 더 큰 개념이고, DI는 의존성을 외부에서 전달하는 대표적인 방법이다. 두 용어는 이어져 있지만 같은 뜻은 아니다.

![직접 생성 방식과 Spring IoC·DI에서 객체 생성 및 의존 관계 연결 주체를 비교한 구조도](/assets/images/2026-09-19-spring-ioc-di/ioc-di-object-wiring.svg)

## Container가 관리하는 객체가 Bean이다

Spring IoC Container가 앞서 말한 관리 주체다. Container가 생성하고 관리하는 객체를 Bean이라 부른다. `@Repository`와 `@Service`가 붙은 클래스는 Component Scan 같은 설정을 거쳐 Bean으로 등록되며, Container가 객체를 만들고 의존성을 연결해 생명주기를 관리한다.

~~~java
public interface OrderRepository {
    void save(Order order);
}

@Repository
public class JdbcOrderRepository implements OrderRepository {
    // 저장 구현
}

@Service
public class OrderService {

    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
}
~~~

Container는 `OrderService`의 생성자 매개변수를 보고 필요한 `OrderRepository` Bean을 찾는다. 이 예제처럼 알맞은 구현체가 하나 등록되어 있으면 `JdbcOrderRepository`를 전달한다. 객체를 만든 뒤 직접 연결하던 코드가 Container 설정과 Bean 관리로 옮겨간다.

## 생성자 주입과 Interface가 변경 범위를 줄인다

생성자 매개변수는 객체가 동작하는 데 필요한 의존성을 코드에 드러낸다. 필요한 값이 없으면 생성할 수 없으니 불완전한 객체가 만들어질 가능성도 낮아진다. 의존 필드를 `final`로 선언하면 생성 후 참조가 바뀌지 않는다는 점도 확인하기 쉽다.

서비스가 `JdbcOrderRepository`가 아니라 `OrderRepository`에 의존하면 구현의 세부사항과 서비스 로직이 분리된다. 저장 방식을 바꾸거나 테스트용 구현체를 넣어도 영향을 받는 코드가 줄어든다. Interface가 언제나 좋은 선택인 것은 아니지만, 구현을 교체하거나 경계를 분리할 이유가 있는 의존 관계에서 도움이 된다.

실제 백엔드에서도 Controller가 Service를 생성하고, Service가 Repository를 생성하는 대신 필요한 타입을 생성자에 선언한다.

~~~java
@RestController
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }
}

@Service
public class OrderService {

    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
}
~~~

Controller → Service → Repository로 이어지는 각 객체의 역할은 유지된다. 다만 관계를 만드는 책임은 객체 내부의 `new`가 아니라 Spring Container에 있다. Spring 프로젝트에서 늘 보던 생성자 코드가 IoC와 DI가 실제로 적용된 모습이라는 점이 이제야 연결됐다.

## Singleton Bean은 여러 요청이 함께 쓸 수 있다

Spring Bean도 JVM Heap에서 관리되는 Java 객체다. 기본 Singleton Scope는 하나의 Container가 Bean 정의마다 공유 인스턴스 하나를 관리한다. 클래스 로더마다 인스턴스 하나를 강제하는 GoF Singleton 패턴과 범위가 다르다.

그래서 `@Service`로 등록한 객체를 여러 요청이 함께 사용할 수 있다. 웹 요청을 처리하는 Thread들이 같은 Bean 인스턴스에 접근하는 동안, 요청마다 달라지는 값을 인스턴스 필드에 저장하면 문제가 생긴다.

~~~java
@Service
public class UserService {

    private Long currentUserId;

    public User process(Long userId) {
        currentUserId = userId;
        return loadUser(currentUserId);
    }
}
~~~

요청 두 개가 동시에 `process`를 실행하면 `currentUserId`가 두 요청 사이에서 덮어써질 수 있다. 첫 요청이 값을 기록한 뒤 읽기 전에 다음 요청이 다른 값을 넣는 상황이다. 여러 Thread가 한 Heap 객체의 변경 가능한 상태를 공유해 생기는 경쟁 상태다.

~~~text
Singleton Bean
    → 여러 요청 Thread가 같은 Heap 객체를 사용
    → mutable field를 공유
    → 실행 순서에 따라 값이 덮일 수 있음
~~~

Singleton은 인스턴스 범위를 말하고 Thread Safety는 공유 상태를 어떻게 다루는지에 관한 별도 문제다. 객체 하나를 공유한다고 해서 내부 상태까지 안전해지는 것은 아니다. 요청마다 달라지는 값은 인스턴스 필드에 두지 말고 메서드 인자나 지역 변수로 처리하는 stateless 구조를 먼저 생각해야 한다.

## 객체 생성에서 객체 사이의 관계로

처음에는 IoC가 Spring의 객체 생성 기능이라고만 생각했다. 지금은 객체 생성뿐 아니라 의존 관계 구성과 생명주기 관리까지 Container에 맡기는 구조로 이해한다. DI는 그 구조 안에서 객체가 필요한 의존성을 바깥에서 받는 방식이다.

이제 생성자 주입이 필요한 이유와 Interface 의존이 구현 교체, 테스트에 주는 이점을 설명할 수 있다. Container가 관리해도 Bean은 Heap의 Java 객체이며, Singleton Bean을 여러 Thread가 함께 쓰면 상태가 섞일 수 있다. 객체를 누가 만드는지와 함께 의존 관계를 누가 연결하는지, 요청 사이에 어떤 상태가 공유되는지도 확인해야겠다.

### 참고 자료 (Sources)

* **Spring Framework:** [Introduction to the Spring IoC Container and Beans](https://docs.spring.io/spring-framework/reference/core/beans/introduction.html)
* **Spring Framework:** [Bean Scopes](https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html)










<!-- HUMANIZE-SUMMARY
초안/윤문본 글자수: 5694자 / 5330자
변경률: 약 21.9% (문자 편집 거리 기준; 초안→최종)
탐지/개선: A-10 2→2, E-2 5→0, C-11 0→0, D-1 0→0, H-1 0→0, J-3 0→0 (본문)
자체검증: 6/6 통과 — 기술 사실·코드·날짜·문서 링크 보존, 장르·문체 일관성, 잔존 S1 없음
등급: A — S1 잔존 0건, 확인된 S2 2건 이하, 변경률 10~25% 범위.
주요 변경 하이라이트:
1. 객체 생성 문제를 단순한 new 사용이 아니라 구현체 선택 책임의 결합으로 풀어 설명
2. IoC의 제어 주체 이동과 DI의 의존성 전달을 분리해 서술
3. Container, Bean, 생성자 주입, Interface의 흐름을 실제 코드와 연결
4. Singleton 범위와 Thread Safety를 구분하고 공유 mutable state의 위험을 설명
5. 직접 생성과 Container의 의존 관계 구성을 한 장의 SVG로 비교
-->
