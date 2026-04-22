---
title: Facade vs Application Service
date: 2026-04-22
categories: [Backend, Architecture]
tags: [Facade, Application-Service, Interface, Refactoring]
---

> 호출 개수가 아니라 책임의 방향으로 구분하기

설계에서 중요한 것은 겉으로 드러나는 복잡함이 아니라  
**해당 클래스가 어떤 책임을 가지며 어디를 향해 의존하는가**이다.

이번 리팩토링의 출발점은 Facade와 Application Service의 개념을 구분하는 것이 아니라
**서비스 간 순환참조를 해결하는 것**이었다.  
당시에는 순환참조를 끊기 위해 Facade를 도입했다고 생각했다.  
하지만 피드백 이후 코드를 다시 돌아보며 책임을 해석해 보니 내가 Facade라고 인식했던 계층은 단순한 조회 조합을 넘어 **하나의 비즈니스 흐름을 실행하는 역할**까지 함께 가지고 있었다.

처음에는 Facade 패턴을 적용했다고 생각했지만  
실제로는 **Facade와 Application Service의 성격이 섞인 형태**였던 것이다.

이 경험을 통해 두 패턴을 구분하는 기준은 서비스 호출 개수나 메서드 길이가 아니라  
**그 클래스의 책임이 조합에 있는지 실행에 있는지**라는 점을 더 분명히 이해하게 됐다.

이번 글에서는 그 기준을 어떤 관점으로 정리하게 되었는지  
그리고 인터페이스를 왜 구현 교체용이 아니라 **역할 중심의 추상화**로 바라보게 되었는지 정리해보려 한다.

## 1. Facade는 조율과 조합의 책임을 가진다

Facade를 단순히 여러 서비스를 호출하는 클래스로 이해하면 범위가 너무 넓어진다.  
실제로 더 본질적인 역할은 **여러 도메인 또는 하위 기능을 조율해 클라이언트가 원하는 형태의 결과를 제공하는 것**이다.

즉, Facade는 내부의 복잡한 흐름을 감추고 외부에는 단순한 진입점을 제공한다.  
이때 핵심은 상태 변경 그 자체보다 **결과를 조합하고 흐름을 단순화하는 책임**에 있다.

### 예시: 일정과 댓글을 함께 조회하는 경우

아래 메서드는 일정 정보와 댓글 목록을 각각 조회한 뒤 이를 하나의 응답으로 묶어 반환한다.

```java
@Transactional(readOnly = true)
public ScheduleGetOneResponse getScheduleWithComments(Long userId, Long scheduleId) {
    Schedule schedule = scheduleService.findByIdAndUserIdOrThrow(scheduleId, userId);
    List<Comment> comments = commentService.getComments(schedule);

    List<CommentGetResponse> commentResponses = comments.stream()
            .map(CommentGetResponse::from)
            .toList();

    return ScheduleGetOneResponse.from(schedule, commentResponses);
}
```

이 로직의 핵심은 단순 조회가 아니라 
**서로 다른 책임을 가진 기능들을 조합해 클라이언트 친화적인 응답을 만들어낸다**는 점이다.  
이런 성격의 로직은 Application Service보다는 Facade로 해석하는 편이 더 자연스럽다.

## 2. Application Service는 유스케이스를 수행한다

반면 Application Service는 **하나의 비즈니스 유스케이스를 완성하는 실행 흐름**에 더 가깝다.  
여러 서비스를 호출하더라도 그 목적이 결과 조합이 아니라 **상태 변경을 포함한 비즈니스 흐름의 완료**라면 Application Service의 성격이 강하다.

### 예시: 회원 탈퇴 처리

아래 메서드는 댓글, 일정, 사용자 데이터를 순차적으로 삭제하며 회원 탈퇴를 완료한다.

```java
@Transactional
public void deleteUserAccount(Long userId) {
    commentService.deleteAllByUserId(userId);
    scheduleService.deleteAllByUserId(userId);
    userService.delete(userId);
}
```

여기서 중요한 점은 이 로직이 단순히 여러 서비스를 호출한다는 사실이 아니다.  
핵심은 **회원 탈퇴라는 하나의 유스케이스를 완성하기 위해 필요한 명령을 순서 있게 수행한다**는 데 있다.

이 메서드의 중심은 조합된 조회 결과 제공이 아니라  
**비즈니스 목적을 달성하기 위한 실행**이다.

## 3. 내가 헷갈렸던 지점: Facade를 도입했다고 생각했지만

이번 리팩토링에서 가장 인상 깊었던 지점은  
처음에는 순환참조를 해결하기 위해 Facade를 도입했다고 생각했지만  
나중에 보니 그 계층이 **Facade로만 보기에는 책임이 더 무거웠다**는 점이었다.

당시에는 “여러 서비스를 감싸서 호출하니 Facade겠지”라고 이해했다.  
하지만 책임을 다시 해석해 보니 일부 코드는 단순한 조회 조합이 아니라  
**하나의 유스케이스를 끝까지 수행하는 흐름**을 포함하고 있었다.

결국 문제는 패턴 이름을 잘못 붙였다는 데 있다기보다  
**책임의 경계를 충분히 의식하지 못한 채 구조를 먼저 만들었다는 점**에 있었다고 생각한다.

이 경험 이후로는  
- 몇 개의 서비스를 호출하는지  
- 조회인지 변경인지  
- 코드가 얼마나 길어졌는지  

같은 겉모습보다

- 이 클래스는 복잡한 내부 흐름을 감추는가?
- 아니면 하나의 비즈니스 목적을 완수하는가?

를 먼저 보게 됐다.

## 4. 결국 기준은 호출 수가 아니라 책임의 무게중심이다

정리하면 Facade와 Application Service를 나누는 기준은 다음처럼 볼 수 있다.

- **Facade**
  - 여러 기능을 조율한다
  - 결과를 조합한다
  - 외부에 단순한 진입점을 제공한다
  - 복잡한 내부 흐름을 감춘다

- **Application Service**
  - 하나의 비즈니스 유스케이스를 수행한다
  - 상태 변경을 포함한 흐름을 완성한다
  - 도메인 로직 실행을 순서 있게 지휘한다

이 관점에서 보면 서비스를 몇 개 호출했는가는 본질적인 기준이 아니다.  
두세 개를 호출하더라도 조합 중심이면 Facade일 수 있고  
여러 개를 호출하더라도 유스케이스 수행 중심이면 Application Service일 수 있다.

## 5. 인터페이스는 구현 교체용이 아니라 역할 명세이기도 하다

파사드 패턴에 대해 공부하면서 다시 생각하게 된 것은 인터페이스의 역할이었다.  
구현체가 하나뿐인데도 인터페이스를 둘 필요가 있을까 하는 의문은 자주 생긴다.

하지만 인터페이스는 단순히 구현체를 여러 개 둘 때만 쓰는 도구가 아니었다.  
오히려 더 중요한 역할은 **클라이언트가 구체 구현이 아니라 역할과 약속에 의존하도록 만드는 것**이다.

다만 현재 프로젝트는 규모가 작아 이러한 추상화를 실제 구조에 모두 적용하면 설계 이점보다 복잡도 증가가 더 클 수 있다.  
따라서 아래 예시는 현재 코드베이스에 그대로 적용하기 위한 제안이라기보다 **책임과 의존 방향을 설명하기 위한 개념적 예시**로 이해하는 편이 더 적절하다.

### 예시: 조회 조합 역할을 인터페이스로 추상화

```java
public interface ScheduleQueryFacade {
    ScheduleDetailResponse getScheduleDetail(Long userId, Long scheduleId);
}
```

```java
@Service
@RequiredArgsConstructor
public class ScheduleQueryService implements ScheduleQueryFacade {

    private final ScheduleReader scheduleReader;
    private final CommentReader commentReader;

    @Override
    @Transactional(readOnly = true)
    public ScheduleDetailResponse getScheduleDetail(Long userId, Long scheduleId) {
        // 일정 조회
        // 댓글 조회
        // 응답 DTO 조합
        return null;
    }
}
```

### 예시: 유스케이스를 인터페이스로 분리

```java
public interface UserAccountUseCase {
    void withdraw(Long userId);
}
```

```java
@Service
@RequiredArgsConstructor
public class UserAccountService implements UserAccountUseCase {

    private final CommentService commentService;
    private final ScheduleService scheduleService;
    private final UserService userService;

    @Override
    @Transactional
    public void withdraw(Long userId) {
        // 연관 데이터 삭제
        // 사용자 삭제
    }
}
```

### 예시: 클라이언트는 구현이 아니라 역할에 의존한다

```java
@RestController
@RequiredArgsConstructor
public class UserController {

    private final UserAccountUseCase userAccountUseCase;
    private final ScheduleQueryFacade scheduleQueryFacade;
}
```

이 구조에서 Controller는 구체 클래스가 아니라 역할 인터페이스를 바라본다.  
이 방식의 장점은 단순히 구현 교체 가능성에만 있지 않다.

- 책임 경계를 더 명확하게 드러낼 수 있고
- 사용하는 쪽이 내부 구현 세부사항을 몰라도 되며
- 테스트와 구조 설명에서도 의도를 표현하기 쉽다

결국 인터페이스는 어떻게 구현하는가보다  
**이 역할이 무엇을 제공하는가를 명확히 드러내는 추상화 수단**으로 볼 수 있다.

## 6. 이번 리팩토링에서 얻은 기준

이번 리팩토링을 통해 가장 크게 정리된 기준은 다음 한 문장으로 요약할 수 있다.

> **Facade와 Application Service는 호출 개수로 구분하는 것이 아니라 책임이 조합에 있는지 실행에 있는지로 구분해야 한다.**

그리고 그 기준은 단순한 개념 정리에서 나온 것이 아니라  
**순환참조를 해결하려는 실제 리팩토링 과정** 속에서 더 분명해졌다.

처음에는 Facade를 도입했다고 생각했지만  
그 안에 Application Service의 역할까지 함께 들어가 있었다는 사실을 뒤늦게 이해했다.  
이 경험은 “패턴 이름을 먼저 붙이는 것”보다  
**현재 코드가 실제로 어떤 책임을 지고 있는지 읽어내는 것**이 더 중요하다는 점을 알려줬다.

이제는 클래스를 볼 때 먼저 이런 질문을 던지게 된다.

- 이 클래스는 여러 기능을 **조합해 단순한 창구를 제공하는가?**
- 아니면 하나의 비즈니스 흐름을 **끝까지 수행하는가?**

이 질문에 대한 답이 클래스의 성격을 더 명확하게 드러내 준다.

## 마무리

좋은 설계는 클래스를 많이 나누는 데서 시작되지 않는다.  
오히려 각 클래스가 **어떤 책임을 지고 어떤 방향으로 의존하는지**를 분명히 하는 데서 시작된다.

이번 정리를 통해 Facade는 조율과 조합의 책임  
Application Service는 유스케이스 수행의 책임을 가진다는 기준을 조금 더 명확하게 잡을 수 있었다.

또한 인터페이스 역시 단순한 형식적 분리가 아니라  
클라이언트가 구현이 아닌 역할에 의존하게 만드는 중요한 설계 도구라는 점을 다시 확인할 수 있었다.

무엇보다 이번 경험은  
순환참조를 해결하기 위해 시작한 리팩토링이 결국 **책임 경계를 다시 정리하는 과정**이었다는 사실을 보여줬다.

앞으로도 클래스를 나눌 때는 겉으로 드러난 형태보다  
**책임의 무게중심이 어디에 놓여 있는지**를 먼저 보게 될 것 같다.

## References

- Robert C. Martin, *Clean Architecture*
- Project Repository: [w00lam/my-scheduler-v2](https://github.com/w00lam/my-scheduler-v2)
