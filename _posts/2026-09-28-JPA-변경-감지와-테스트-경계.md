---
title: "JPA 변경 감지와 테스트 경계 - `save()` 없이 DB 반영을 확인하기"
date: 2026-09-28
categories: [TIL, JPA, Backend]
tags: [JPA, Spring Data JPA, Hibernate, EntityManager, Dirty Checking, Testing, TIL]
permalink: /posts/jpa-dirty-checking-test-boundary/
---

이전 학습에서 JPA의 영속성 컨텍스트와 플러시, 커밋을 공부했다. 오늘은 그 개념을 외운 문장으로만 설명하지 않고 `UserRepository`와 `UserService.changeName()`이 실제로 동작하는 흐름에 붙여 보려고 했다.

처음에는 `JpaRepository`가 구현체를 런타임에 제공한다는 점은 알고 있었다. 하지만 그 아래에서 `EntityManager`, Hibernate, JDBC가 각각 어떤 일을 하는지 한 문장으로 설명하려니 막혔다. 조회한 엔티티의 값을 바꾼 뒤 `save()`를 다시 호출하지 않아도 되는 이유도 같은 문제와 이어져 있었다.

그래서 오늘은 하나의 질문에서 출발해 세 단계로 확인했다.

> `User`의 이름을 바꾸는 작은 기능에서 Repository, JPA, Hibernate, 영속성 컨텍스트는 어떤 순서로 연결될까? 그리고 실제 DB에 변경이 확정됐다고 말하려면 어떤 테스트가 필요할까?

## `JpaRepository` 아래에서 누가 일하는가

처음에는 JDBC, ORM, JPA, Hibernate, Spring Data JPA가 비슷한 층위의 기술 목록처럼 머릿속에 놓여 있었다. 다시 나눠 보니 각 단어는 서로 다른 위치를 가리켰다.

| 구분 | 오늘의 역할 |
| --- | --- |
| JDBC | Java 애플리케이션과 데이터베이스가 통신하기 위한 API |
| ORM | 객체와 관계형 데이터베이스의 데이터를 연결하는 접근 방식 |
| JPA | Java에서 ORM을 사용하기 위한 표준 명세와 API |
| Hibernate | JPA API를 구현하고 엔티티 상태와 SQL 변환을 처리하는 대표 구현체 |
| Spring Data JPA | JPA 기반 데이터 접근 코드의 반복을 줄이는 Repository 추상화 |
| `JpaRepository` | CRUD와 조회 메서드 형태를 제공하는 Spring Data JPA Repository 인터페이스 |
| `EntityManager` | 엔티티를 영속화하고 조회·병합·삭제·플러시하는 JPA 인터페이스 |
| 영속성 컨텍스트 | JPA가 영속 엔티티를 관리하고 상태 변화를 추적하는 환경 |

이 표를 순서도로 바꾸면 대략 다음과 같다.

```text
UserRepository / JpaRepository
            ↓
Spring Data JPA Repository 구현
            ↓
EntityManager
            ↓
Hibernate 같은 JPA 구현체
            ↓
JDBC API와 데이터베이스 드라이버
            ↓
Database
```

다만 이 흐름을 모든 Repository 호출이 똑같은 SQL과 똑같은 내부 순서로 이어지는 고정된 파이프라인으로 받아들이면 안 된다. `findById()`가 어떤 조회 API와 쿼리로 처리되는지, `save()`가 새 엔티티를 저장하는지 기존 엔티티를 병합하는지, 어떤 SQL이 실행되는지는 메서드와 엔티티 상태, 매핑, JPA 구현체와 설정에 따라 달라진다.

### Repository와 EntityManager를 구분하기

개발자가 서비스에서 직접 사용하는 것은 보통 `UserRepository`다.

```java
public interface UserRepository extends JpaRepository<User, Long> {
}
```

`UserRepository`의 구현체를 직접 작성하지 않아도 되는 이유는 Spring Data JPA가 Repository 인터페이스를 바탕으로 런타임 구현을 제공하기 때문이다. `findById()`나 `save()`를 호출하면 개발자가 데이터 접근 코드를 직접 작성하지 않아도 된다.

그렇다고 `JpaRepository`가 JPA의 영속성 작업 자체를 모두 수행하는 객체라는 뜻은 아니다. Spring Data JPA의 Repository 추상화 아래에는 JPA의 영속성 API가 있고 그 대표적인 인터페이스가 `EntityManager`다. `EntityManager`는 `find`, `persist`, `merge`, `remove`, `flush` 같은 작업을 통해 엔티티의 상태를 영속성 컨텍스트와 연결한다.

예를 들어 `findById()`를 호출하면 애플리케이션은 Repository 메서드만 사용하지만 그 아래에서는 JPA의 조회 작업과 구현체의 엔티티 관리가 이어진다. Hibernate는 이 JPA API를 구현하면서 영속성 컨텍스트를 관리하고 필요한 SQL을 만들며, JDBC와 드라이버가 데이터베이스와 실제로 통신한다. 어느 단계에서 어떤 SQL이 실행되는지는 호출 종류와 설정에 따라 달라질 수 있다.([Spring Data JPA - Persisting Entities](https://docs.spring.io/spring-data/jpa/reference/jpa/entity-persistence.html))

여기서 `EntityManager`와 영속성 컨텍스트를 같은 객체라고 표현하면 안 된다. `EntityManager`는 영속성 작업을 요청하는 JPA 인터페이스이고, 영속성 컨텍스트는 그 작업의 대상이 되는 엔티티를 관리하는 환경이다. `EntityManager`가 영속성 컨텍스트에 접근하는 창구라면 영속성 컨텍스트는 조회된 엔티티와 상태를 보관하고 추적하는 관리 범위에 가깝다.

## `changeName()` 뒤에 `save()`가 없는 이유

서비스 코드는 다음처럼 작성할 수 있다.

```java
@Transactional
public void changeName(Long userId, String newName) {
    User user = userRepository.findById(userId)
            .orElseThrow(/* 예외 처리 */);

    user.changeName(newName);
}
```

처음에는 여기서 `save(user)`를 호출하지 않으면 DB에 반영되지 않을 것이라고 생각했다. Repository 메서드를 호출해 값을 바꾸지 않았으니 저장 명령도 하나 더 필요하다고 본 것이다.

하지만 이 코드에서 `findById()`로 조회한 `user`가 현재 트랜잭션의 영속성 컨텍스트가 관리하는 영속 엔티티라면 상황이 다르다. 엔티티의 필드를 바꾸는 순간 SQL이 바로 실행되는 것은 아니지만 Hibernate가 관리 중인 상태의 변화를 추적할 수 있다. 플러시할 때 조회 당시 상태와 현재 상태를 비교해 변경이 있으면 필요한 `UPDATE` SQL을 준비한다. Hibernate 문서도 관리 중인 엔티티의 변경은 영속성 컨텍스트가 플러시될 때 자동으로 감지되고 반영되므로 특정 저장 메서드를 다시 호출할 필요가 없다고 설명한다.([Hibernate ORM User Guide - Modifying managed state](https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html))

### 트랜잭션 시작과 영속 상태는 다르다

오늘 처음에는 `@Transactional`이 시작되면 그 안에서 만들어지는 모든 객체가 영속화된다고 연결하기 쉬웠다. 하지만 트랜잭션은 여러 작업을 하나의 커밋 또는 롤백 단위로 묶는 경계이고, 임의의 Java 객체를 자동으로 영속성 컨텍스트가 관리하게 만드는 기능은 아니다.

`findById()`로 JPA를 통해 엔티티를 조회하면 해당 엔티티가 현재 영속성 컨텍스트의 관리 대상이 된다. 그 뒤 `user.changeName(newName)`으로 상태를 바꾸면 Hibernate가 관리하는 엔티티의 변경으로 다룰 수 있다. 반대로 영속성 컨텍스트가 관리하지 않는 준영속 객체를 수정했다고 해서 같은 방식의 변경 감지를 기대할 수는 없다. 준영속 엔티티의 변경을 다시 반영하려면 상황에 따라 `merge()` 같은 별도 상태 전이가 필요하다.

### 플러시는 커밋과 다르다

플러시는 영속성 컨텍스트의 변경 내용을 데이터베이스와 동기화하는 과정이다. 이 과정에서 `UPDATE` SQL이 실행될 수 있지만 플러시와 커밋은 같은 말이 아니다.

```text
메모리의 엔티티 변경
        ↓
플러시
        ↓
UPDATE SQL 실행 및 DB 상태 동기화
        ↓
커밋
        ↓
트랜잭션의 변경 확정
```

플러시 뒤에도 트랜잭션이 실패하면 롤백될 수 있다. 또 플러시는 커밋 직전에만 일어나는 것이 아니다. 설정과 실행된 쿼리 상황에 따라 커밋 전에 플러시가 일어날 수 있으므로 “메서드가 끝나는 순간에만 플러시된다”라고 단정하면 안 된다. Hibernate는 영속성 컨텍스트를 쓰기 지연 방식으로 다루고 플러시 시점에 엔티티 변경을 `INSERT`, `UPDATE`, `DELETE`로 변환한다.([Hibernate ORM User Guide - Flushing](https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html))

### `save()`와 Dirty Checking은 같은 동작이 아니다

Spring Data JPA의 `save()`는 전달된 엔티티가 새 엔티티인지 판단해 새 엔티티에는 `EntityManager.persist()`를 사용하고 기존 엔티티에는 `EntityManager.merge()`를 사용한다. 이는 Repository에 엔티티를 저장하거나 병합하라는 명시적인 호출이다.([Spring Data JPA - Persisting Entities](https://docs.spring.io/spring-data/jpa/reference/jpa/entity-persistence.html))

반면 오늘의 `changeName()` 사례는 이미 조회되어 현재 영속성 컨텍스트가 관리하는 엔티티의 상태를 바꾸는 상황이다. 서비스 트랜잭션 안에서 변경 감지가 작동할 조건을 만족한다면 `save()`를 다시 호출하지 않아도 플러시 과정에서 변경이 반영된다. `save()`와 Dirty Checking을 같은 동작으로 설명하면 “엔티티를 바꿀 때마다 반드시 `save()`가 필요하다”는 잘못된 결론으로 이어진다.

`User`에 `changeName()`을 두는 이유도 이 동작을 위해 특별한 메서드가 필요해서가 아니다.

```java
public void changeName(String newName) {
    // 이름 변경 규칙이 있다면 이곳에서 확인한다.
    this.name = newName;
}
```

`changeName()`은 “이 객체의 이름을 변경한다”는 의도를 드러낸다. 나중에 빈 문자열을 거부하거나 이름 변경 이력을 남기는 정책이 생기면 메서드 안에서 함께 관리할 수 있다. 이 설계 선택이 Dirty Checking의 필수 조건인 것은 아니다. Hibernate가 추적하는 것은 엔티티의 상태 변화이며, 상태를 바꾸는 문법이 setter인지 도메인 메서드인지가 변경 감지를 켜고 끄는 기준은 아니다.

![서비스 트랜잭션에서 User 변경이 플러시와 커밋을 거쳐 별도 트랜잭션 조회로 확인되는 흐름](/assets/images/2026-09-28-jpa-dirty-checking/jpa-dirty-checking-flow.svg)

## 변경을 확인한다는 말의 범위

변경 감지를 이해하고 나니 다음 질문이 남았다.

> `user.changeName(newName)`을 호출한 뒤 값이 바뀌었다고 말하려면 어디까지 확인해야 할까?

메모리에서 객체의 필드가 바뀐 것과 실제 HTTP 요청이 올바르게 처리된 것, 커밋된 DB에서 다시 조회되는 것은 서로 다른 검증 대상이다. 그래서 같은 이름 변경 기능도 어떤 질문을 증명하려는지에 따라 테스트 경계가 달라진다.

## 단위 테스트는 정책과 분기를 확인한다

단위 테스트가 답하는 질문은 다음과 같다.

> 이름 변경 정책과 서비스의 분기가 의도대로 동작하는가?

Spring 전체 컨텍스트나 실제 DB를 띄우지 않고 Repository를 목으로 대체하면 빠르게 확인할 수 있다. 사용자를 찾지 못했을 때 예외를 던지는지, 잘못된 이름을 거부하는지, 필요한 Repository 메서드를 호출하는지와 같은 서비스 로직이 대상이다.

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void changeName_changes_the_in_memory_entity_without_save() {
        User user = new User("before");
        given(userRepository.findById(1L)).willReturn(Optional.of(user));

        userService.changeName(1L, "after");

        assertThat(user.getName()).isEqualTo("after");
        verify(userRepository).findById(1L);
        verify(userRepository, never()).save(any());
    }
}
```

이 테스트로 목 Repository가 돌려준 엔티티의 메모리 상태가 바뀌었고 서비스가 `save()`를 호출하지 않았다는 사실은 확인할 수 있다. 하지만 목 객체가 반환한 `User`는 JPA가 관리하는 엔티티가 아니다. 따라서 이 결과만으로 Hibernate의 Dirty Checking이나 실제 DB 저장을 검증했다고 말할 수는 없다. 단위 테스트에서 `@Transactional`이 실제로 동작한다고 기대해서도 안 된다.

## `@WebMvcTest`는 HTTP 경계를 확인한다

웹 계층 테스트가 답하는 질문은 조금 다르다.

> HTTP 요청이 올바르게 해석되고 Controller가 서비스에 적절한 값을 전달하며 예상한 응답을 반환하는가?

`@WebMvcTest`는 MVC 인프라를 구성하고 보통 하나의 Controller와 목 서비스로 요청과 응답을 확인한다. `MockMvc`로 이름 변경 요청을 보내고 서비스에 `userId`, `newName`이 제대로 전달됐는지 `verify()`로 확인할 수 있다. Spring Boot 문서도 `@WebMvcTest`가 MVC 관련 Bean을 대상으로 하며 필요한 협력 객체를 목으로 제공하는 방식으로 사용된다고 설명한다.([Spring Boot - Testing Spring Boot Applications](https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html))

이 테스트는 요청 처리와 서비스 호출을 확인하는 범위다. 실제 서비스의 트랜잭션, Repository, 영속성 컨텍스트, Hibernate의 Dirty Checking, DB의 커밋 결과까지 검증한 것은 아니다. Spring Security가 함께 있다면 보안 설정이 웹 테스트에 영향을 줄 수 있으므로 필요한 테스트 설정을 명시해야 하지만 오늘의 핵심을 벗어나 긴 보안 설정까지 확장하지는 않았다.

## 통합 테스트는 커밋된 DB 결과를 확인한다

통합 테스트가 답하는 질문은 다음과 같다.

> 실제 서비스 트랜잭션 안에서 영속 엔티티가 변경되고 최종 결과가 DB에 남는가?

이 질문에는 Spring이 관리하는 실제 `UserService`와 실제 `UserRepository`가 필요하다. 목 Repository는 서비스가 어떤 메서드를 호출했는지는 알려 주지만 영속성 컨텍스트의 관리와 Dirty Checking, 실제 SQL 실행, 커밋 결과까지 대신 증명해 주지 않는다.

```java
@SpringBootTest
class UserServiceIntegrationTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void changeName_is_read_back_after_the_service_transaction_commits() {
        User user = userRepository.save(new User("before"));

        // 테스트 메서드에는 @Transactional을 붙이지 않는다.
        userService.changeName(user.getId(), "after");

        // 서비스 트랜잭션이 끝난 뒤 Repository의 별도 조회 트랜잭션에서 읽는다.
        User changed = userRepository.findById(user.getId()).orElseThrow();

        assertThat(changed.getName()).isEqualTo("after");
    }
}
```

이 예제는 테스트 메서드가 트랜잭션을 직접 소유하지 않는다. `userService.changeName()`의 `@Transactional`이 실제 서비스 Bean을 통해 적용되고 메서드가 정상 종료되면 서비스 트랜잭션이 커밋된다. 그 뒤 `userRepository.findById()`를 호출해 새 조회 범위에서 값을 읽으므로 커밋된 DB 결과를 확인하는 구조다.

반대로 테스트 메서드나 테스트 클래스에 `@Transactional`을 붙이면 이야기가 달라진다. Spring의 테스트 트랜잭션은 기본적으로 테스트가 끝난 뒤 롤백될 수 있다. 같은 영속성 컨텍스트에서 곧바로 조회한 값은 이미 메모리에 바뀐 엔티티일 수 있고, 플러시 후 조회한 값은 SQL이 실행된 상태를 보여 줄 수 있지만 커밋이 확정됐다는 뜻은 아니다. 커밋 후 새 트랜잭션에서 조회하려면 테스트 트랜잭션을 실제로 종료하고 커밋하도록 구성하거나, 위처럼 서비스 트랜잭션과 조회 트랜잭션을 테스트 메서드의 바깥 경계로 분리해야 한다.([Spring Framework - TestContext Transaction Management](https://docs.spring.io/spring-framework/reference/testing/testcontext-framework/tx.html))

확인 범위를 나누면 다음과 같다.

| 확인 방식 | 확인할 수 있는 것 | 커밋된 DB 결과를 증명하는가 |
| --- | --- | --- |
| 메모리의 엔티티 값 확인 | Java 객체의 현재 상태와 서비스 로직 | 아니다 |
| `flush()` 후 조회 | 변경 감지와 SQL 동기화가 진행된 상태 | 트랜잭션 롤백 가능성을 남긴다 |
| 영속성 컨텍스트 초기화 후 조회 | 같은 트랜잭션에서 DB를 다시 읽는 흐름 | 최종 커밋과는 구분해야 한다 |
| 커밋 후 새 트랜잭션 조회 | 서비스 트랜잭션이 끝난 뒤 남은 DB 상태 | 목표에 맞는 확인 방식 |

Repository 메서드 자체의 쿼리나 반환 형태를 확인하려면 Repository 범위의 테스트가 충분할 수 있다. 서비스의 트랜잭션과 Dirty Checking까지 확인하려면 실제 서비스와 Repository를 사용하는 통합 테스트가 필요하다. 둘을 언제나 같은 종류의 테스트로 처리할 이유는 없다.

## 세 테스트의 경계를 한 번에 비교하기

이름 변경 기능을 기준으로 각 테스트가 확인하는 범위를 놓으면 선택 기준이 더 분명해진다.

| 테스트 | 핵심 질문 | 주로 확인하는 대상 | 확인하지 않는 것 |
| --- | --- | --- | --- |
| 단위 테스트 | 정책과 서비스 분기가 맞는가? | 목 Repository, 도메인 상태 변경, 예외와 호출 | JPA Dirty Checking, 실제 DB 반영 |
| `@WebMvcTest` | HTTP 요청과 Controller 전달이 맞는가? | `MockMvc`, 요청 바인딩, 응답, 서비스 인자 | 실제 서비스 트랜잭션과 DB 결과 |
| 통합 테스트 | 서비스 트랜잭션 후 DB에 남는가? | 실제 Bean, 영속성 컨텍스트, 플러시, 커밋 후 재조회 | 불필요한 외부 시스템까지의 전체 동작 |

처음에는 “JPA가 제대로 동작하는지 보려면 무조건 통합 테스트를 해야 하는가?”라고 생각했다. 지금은 질문을 먼저 나눈다. 정책과 비즈니스 로직을 빠르고 분명하게 확인하려면 단위 테스트를 선택한다. 요청과 응답, Controller가 서비스에 전달하는 값을 확인하려면 웹 계층 테스트를 선택한다. `UserService.changeName()`의 실제 트랜잭션과 Dirty Checking, 커밋된 DB 결과를 확인하려면 그 범위에 맞는 통합 테스트를 선택한다.

테스트 이름이나 어노테이션보다 먼저 정해야 하는 것은 “무엇을 증명하려는가?”다.

## 처음에 섞어 이해했던 부분을 다시 나눠 보면

첫째, JDBC, ORM, JPA, Hibernate, Spring Data JPA를 모두 같은 종류의 기술로 생각했다. JDBC는 DB 통신 API이고 ORM은 객체와 관계형 데이터의 매핑 방식이다. JPA는 표준 API이며 Hibernate는 그 구현체다. Spring Data JPA는 그 위에서 Repository 사용을 간단하게 만드는 추상화다.

둘째, `EntityManager`와 영속성 컨텍스트를 같은 객체라고 생각했다. `EntityManager`는 영속성 작업을 요청하는 인터페이스이고 영속성 컨텍스트는 엔티티를 관리하고 변경을 추적하는 환경이다.

셋째, 트랜잭션이 시작되면 모든 Java 객체가 영속화된다고 생각했다. 실제로는 JPA를 통해 조회되거나 저장되어 영속성 컨텍스트가 관리하는 엔티티인지가 중요하다.

넷째, 플러시와 커밋을 같은 단계로 생각했다. 플러시는 변경된 상태를 SQL로 DB와 동기화하는 과정이고 커밋은 트랜잭션의 변경을 확정하는 단계다. 플러시 뒤에도 롤백될 수 있다.

다섯째, `save()`를 호출하지 않으면 관리 중인 엔티티의 변경도 저장되지 않는다고 생각했다. 영속 엔티티의 상태 변경은 Dirty Checking으로 감지될 수 있고 `save()`는 새 엔티티의 `persist`나 기존 엔티티의 `merge`를 위한 별도 Repository 동작이다.

여섯째, 단위 테스트에서 객체의 이름이 바뀌면 DB에도 저장됐다고 생각했다. 메모리 상태, HTTP 처리, 실제 DB의 커밋된 상태는 서로 다른 검증 결과다.

## 실제 Backend 코드와 연결하기

사용자 이름 변경 기능을 실제 백엔드 흐름으로 놓으면 다음과 같다.

```text
HTTP 요청
    ↓
Controller가 userId와 newName을 받음
    ↓
UserService.changeName()이 트랜잭션 시작
    ↓
UserRepository.findById()로 User 조회
    ↓
영속성 컨텍스트가 User를 관리
    ↓
user.changeName(newName)으로 의도와 정책을 표현
    ↓
플러시 과정에서 변경 감지 및 UPDATE SQL
    ↓
커밋으로 트랜잭션 결과 확정
    ↓
필요하면 새 트랜잭션에서 변경 결과 재조회
```

Controller는 요청을 서비스에 전달하고 서비스는 사용자를 조회한 뒤 변경을 수행하는 트랜잭션 경계가 된다. 엔티티의 `changeName()`은 이름 변경의 의도를 드러내고 필요한 정책을 한곳에서 확인하게 한다. 웹 테스트는 요청이 서비스에 정확히 전달되는지 확인하고 통합 테스트는 영속 엔티티의 변경 결과가 DB에 반영되는지 확인한다.

오늘의 결론은 “테스트는 무조건 통합 테스트로 해야 한다”가 아니다. JPA의 동작을 정확히 구분하고 나니 메모리의 상태 변경, Controller의 요청 처리, 커밋된 DB의 결과 중 무엇을 확인하려는지에 따라 테스트 경계를 선택할 수 있게 됐다.

### 참고 자료

* **Hibernate ORM:** [Modifying managed state](https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html)
* **Hibernate ORM:** [Flushing](https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html)
* **Spring Data JPA:** [Persisting Entities](https://docs.spring.io/spring-data/jpa/reference/jpa/entity-persistence.html)
* **Spring Boot:** [Testing Spring Boot Applications](https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html)
* **Spring Framework:** [TestContext Transaction Management](https://docs.spring.io/spring-framework/reference/testing/testcontext-framework/tx.html)

<!-- HUMANIZE-SUMMARY
원본 글자수: 사용자 제공 학습 메모 및 작성 지침 기반의 새 글
윤문본 글자수: 13,450자
변경률: 새 글 작성 후 문장 단위 윤문을 적용해 초안-최종 편집 거리 산출 대상 아님
탐지/개선: A-1 0→0, A-2 2→1, C-7 2→1, C-11 0→0, D-1 1→0, H-1 2→0, J-3 3→3
자체검증: 6/6 통과 — 날짜·고유명사·코드·URL 보존, TIL 장르와 격식 유지, S1 잔존 없음, 과윤문 없음, 새 비유 미추가
등급: A — S1 잔존 0건, S2 잔존 2건 이하, 자체검증 6/6.
주요 변경 하이라이트:
1. Repository, EntityManager, 영속성 컨텍스트를 실제 이름 변경 호출 흐름 안에서 분리
2. `save()`와 Dirty Checking을 새 엔티티 저장·기존 엔티티 병합과 관리 엔티티 변경 감지로 구분
3. 플러시와 커밋을 분리하고 커밋 후 새 트랜잭션 조회를 통합 테스트 코드로 명시
4. 단위 테스트, `@WebMvcTest`, 통합 테스트가 각각 무엇을 증명하는지 비교
5. 반복 연결어와 교과서식 정의 나열을 줄이고 학습 중 이해가 수정된 흐름을 유지
-->
