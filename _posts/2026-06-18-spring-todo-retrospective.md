---
title: "Spring Boot Todo 과제 필수 기능 구현 중 고민한 부분"
date: 2026-06-18
categories: [Backend, Spring]
tags: [Spring Boot, JPA, Spring Security, Retrospective]
permalink: /posts/spring-todo-retrospective/
---

> 단순히 기능을 완성하는 것을 넘어, 왜 이 기술을 사용하고 어떤 원리로 동작하는지 고민하는 과정이 더 중요합니다.

이번 Spring Boot Todo 과제를 진행하며 필수 기능을 구현하는 과정에서 마주했던 기술적 고민들과 그에 따른 선택의 이유를 정리해 보았습니다. 단순히 API가 동작하게 만드는 데 그치지 않고, Spring 프레임워크와 JPA, Spring Security의 핵심 원리를 실제 코드에 어떻게 녹여낼지 고민했던 기록입니다.

## 들어가면서

처음 과제를 시작했을 때는 익숙한 기능들이라 금방 끝날 것이라 생각했습니다. 하지만 실제 구현에 들어가니 트랜잭션 설정의 우선순위, 엔티티 간 영속성 전파(Cascade), Spring Security의 인증 객체 관리처럼 깊게 들여다볼수록 고민할 지점이 많았습니다.

특히 이전에 Spring Boot의 핵심을 정리하며 가졌던 생각들을 실제 프로젝트에 어떻게 적용할지가 이번 과제의 핵심이었습니다.

## 1. 클래스 레벨 `@Transactional(readOnly = true)`와 메서드 레벨 `@Transactional`

서비스 레이어를 구현하면서 가장 먼저 고민한 부분은 트랜잭션 설정이었습니다. 클래스에 `@Transactional(readOnly = true)`가 선언되어 있고, 그 하위 메서드에 다시 `@Transactional`이 선언되어 있다면 어떤 설정이 적용될지 의문이 생겼습니다.

결론부터 말하면, **메서드 레벨의 설정이 클래스 레벨 설정보다 우선 적용됩니다.** Spring은 더 구체적인 범위에 선언된 트랜잭션 속성을 우선하기 때문입니다.

```java
@Service
@Transactional(readOnly = true) // 클래스 기본값: 읽기 전용
public class TodoService {

    @Transactional // 이 메서드에서는 readOnly = false로 재정의
    public TodoSaveResponse saveTodo(
        AuthUser authUser,
        TodoSaveRequest request
    ) {
        // 저장 로직 수행
    }

    public TodoResponse getTodo(Long todoId) {
        // 클래스 레벨의 readOnly = true 적용
        // 조회 로직 수행
    }
}
```

서비스 클래스 전체에는 조회용 기본값으로 `@Transactional(readOnly = true)`를 적용하고, 저장·수정·삭제가 발생하는 메서드에만 `@Transactional`을 별도로 선언했습니다.

여기서 주의할 점은 메서드마다 항상 새로운 트랜잭션이 만들어진다는 의미는 아니라는 것입니다. 기본 전파 속성인 `REQUIRED`에서는 기존 트랜잭션이 있으면 참여하고, 없으면 새 트랜잭션을 시작합니다. 핵심은 메서드 레벨 선언이 해당 메서드의 트랜잭션 속성을 더 구체적으로 정의한다는 점입니다.

## 2. Todo 생성 시 Manager가 함께 저장되지 않은 이유

Todo를 생성할 때 생성자 내부에서 담당자(`Manager`)를 함께 추가하도록 구현했습니다.

```java
this.managers.add(new Manager(user, this));
```

처음에는 리스트에 추가했으니 `todoRepository.save(todo)`를 호출하면 연관된 `Manager`도 함께 저장될 것이라 기대했습니다. 하지만 실제로는 Manager 정보가 DB에 저장되지 않았습니다.

원인은 명확했습니다. 새로 생성한 Manager는 아직 영속성 컨텍스트가 관리하지 않는 비영속 엔티티였고, Todo의 컬렉션에 추가하는 행위는 객체 그래프의 연관관계를 맺는 것일 뿐 DB 저장까지 자동으로 전파하지 않기 때문입니다.

연관된 엔티티의 저장을 부모 저장과 함께 처리하려면 직접 `managerRepository.save(...)`를 호출하거나, 연관관계에 적절한 Cascade 옵션을 설정해야 합니다.

## 3. Cascade와 `orphanRemoval` 적용 기준

Manager는 Todo 생성 시 함께 만들어지고 Todo에 종속되는 관계이므로 처음에는 `CascadeType.PERSIST`를 고려했습니다. 이후 Todo 삭제 시 담당자 정보도 함께 사라지는 것이 자연스럽고, Todo가 Manager의 생명주기를 전반적으로 관리한다고 판단하여 `CascadeType.ALL`과 `orphanRemoval = true` 조합을 선택했습니다.

![JPA Cascade와 orphanRemoval 개념](/assets/images/2026-06-18-spring-todo-retrospective/jpa-cascade-concept.png)

```java
@OneToMany(
    mappedBy = "todo",
    cascade = CascadeType.ALL,
    orphanRemoval = true
)
private List<Manager> managers = new ArrayList<>();
```

`CascadeType.ALL`은 `PERSIST`, `MERGE`, `REMOVE`, `REFRESH`, `DETACH`를 모두 포함합니다. 따라서 단순히 저장과 삭제만 필요하다면 필요한 타입만 명시하는 선택도 가능합니다. 이번에는 Manager의 생명주기가 Todo에 완전히 종속된다는 도메인 판단을 기준으로 `ALL`을 사용했습니다.

다만 모든 연관관계에 같은 설정을 적용하지는 않았습니다.

- **Manager**: Todo에 완전히 종속된 관계 엔티티이므로 `CascadeType.ALL`과 `orphanRemoval = true`를 적용해 부모가 자식의 생명주기를 관리합니다.
- **Comment**: 현재 요구사항에서는 별도의 댓글 제거 기능 없이 Todo 삭제 시 함께 삭제되면 충분하므로 `CascadeType.REMOVE`만 적용했습니다.

`orphanRemoval = true`와 `CascadeType.REMOVE`의 차이도 구분해야 합니다.

- `CascadeType.REMOVE`: 부모 엔티티를 삭제할 때 자식 엔티티 삭제를 전파합니다.
- `orphanRemoval = true`: 부모 컬렉션에서 제거되어 연관관계가 끊긴 자식 엔티티도 삭제합니다.

결국 설정을 결정하는 핵심 기준은 다음 질문이었습니다.

> 자식 엔티티의 생명주기를 부모가 어디까지 관리해야 하는가?

## 4. UserRole 권한 표현 방식: `hasRole`과 `hasAuthority`

Spring Security를 적용하면서 권한 검사 방식을 선택해야 했습니다. 현재 `UserRole` enum 값이 `ADMIN`, `USER`로 정의되어 있는 상황에서 저는 `hasAuthority("ADMIN")` 방식이 더 명확하다고 판단했습니다.

- `hasRole("ADMIN")`: 기본 설정에서는 내부적으로 `ROLE_` 접두사를 붙여 `ROLE_ADMIN` 권한을 검사합니다.
- `hasAuthority("ADMIN")`: 실제 권한 문자열 `ADMIN`을 그대로 비교합니다.

현재 프로젝트의 enum 값과 `GrantedAuthority`에 저장되는 문자열이 접두사 없는 `ADMIN`이므로 `hasAuthority` 방식이 더 직접적으로 대응됩니다.

핵심은 어떤 방식이 절대적으로 옳은지가 아니라, **인증 객체에 저장한 권한 문자열과 검사 방식의 규칙을 일관되게 유지하는 것**입니다.

## 5. `@Auth` 커스텀 ArgumentResolver 제거와 `@AuthenticationPrincipal` 도입

기존에는 로그인 사용자 정보를 컨트롤러에서 받기 위해 커스텀 어노테이션 `@Auth`와 `AuthUserArgumentResolver`를 직접 만들어 사용했습니다. 하지만 Spring Security를 도입하면서 이 구조를 표준 방식으로 변경했습니다.

기존에는 JWT 필터가 `request.setAttribute()`로 사용자 정보를 넘기고 ArgumentResolver가 이를 꺼냈습니다. 변경 후에는 인증 객체가 `SecurityContext`에 저장되고, 컨트롤러에서는 `@AuthenticationPrincipal`로 Principal을 전달받습니다.

```java
@PostMapping("/todos")
public ResponseEntity<TodoSaveResponse> saveTodo(
    @AuthenticationPrincipal AuthUser authUser,
    @Valid @RequestBody TodoSaveRequest request
) {
    return ResponseEntity.ok(
        todoService.saveTodo(authUser, request)
    );
}
```

프레임워크가 제공하는 표준 기능을 활용함으로써 다음과 같은 이점을 얻었습니다.

- `SecurityContext`를 통한 일관된 인증 정보 관리
- 불필요한 커스텀 ArgumentResolver와 설정 코드 제거
- Spring Security의 인가 기능을 `SecurityConfig`나 메서드 보안에서 선언적으로 구성
- 테스트 시 인증 컨텍스트를 표준 방식으로 주입하기 쉬움

## 공부하면서 느낀 점

이번 필수 기능 구현을 통해 단순히 API가 동작하게 만드는 것보다 **현재 요구사항에서 어디까지 프레임워크에 책임을 맡길 것인지 판단하는 능력**이 중요하다는 것을 깨달았습니다.

`@Transactional`의 적용 우선순위나 JPA의 Cascade 설정은 편리하지만, 동작 원리를 정확히 모른 채 사용하면 예상하지 못한 버그를 마주할 수 있습니다. 반대로 원리를 이해하고 도메인의 생명주기와 책임을 기준으로 선택하면 프레임워크의 기능을 훨씬 명확하게 사용할 수 있습니다.

## 한 줄 정리

> 기술의 편리함 뒤에 숨겨진 동작 원리를 이해할 때, 비로소 프레임워크를 도구로서 온전히 제어할 수 있다.

## References

- [Spring Framework Documentation - Transaction Management](https://docs.spring.io/spring-framework/reference/data-access/transaction.html)
- [Hibernate ORM User Guide - Cascading](https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#pc-cascade)
- [Spring Security Reference - Authentication](https://docs.spring.io/spring-security/reference/servlet/authentication/index.html)
- [이전 포스트: 인증 방식의 이해 (Session vs JWT)](/posts/session-jwt-spring/)
