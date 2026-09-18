---
title: "Modern Java — 새 문법보다 코드의 의도를 먼저 판단하기"
date: 2026-09-18
categories: [TIL, Java, Spring]
tags: [Java, Modern Java, record, Optional, var, sealed, switch expression, Pattern Matching, Spring, TIL]
permalink: /posts/modern-java-feature-selection/
---

어제 [Java I/O의 흐름](/posts/java-io-stream-buffer-serialization-http-flow/)을 공부하면서 데이터를 주고받는 과정과 데이터의 표현을 바꾸는 과정을 나누어 보았다. 오늘은 그 데이터를 코드 안에서 어떻게 표현할지와 관련된 Modern Java 기능을 살펴봤다.

처음에는 새로운 문법을 알게 되면 기존 문법보다 적극적으로 사용하는 것이 좋다고 생각했다. 하지만 `record`, `Optional`, `var`, `sealed`, `switch expression`, `instanceof` pattern matching을 하나씩 비교해 보면서 기준이 조금 달라졌다. 중요한 것은 새 문법의 사용 여부가 아니라, **현재 코드의 의도를 더 정확하게 드러내는지**였다.

## record — 코드를 줄이는 것보다 역할을 드러내는 문법

처음 `record`를 봤을 때는 생성자와 getter, `equals()`, `hashCode()`를 자동으로 만들어 주는 축약 문법이라고 생각했다. 물론 코드가 짧아지는 효과는 있다. 하지만 오늘은 `record`가 데이터를 전달하는 객체라는 역할을 선언하는 데 더 의미가 있다는 쪽으로 이해가 바뀌었다.

일반적인 DTO는 다음처럼 필드와 생성자, 접근자를 직접 작성한다.

~~~java
public class UserResponse {

    private final Long id;
    private final String name;

    public UserResponse(Long id, String name) {
        this.id = id;
        this.name = name;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }
}
~~~

이 객체가 복잡한 생명주기나 상태 변경보다 데이터를 전달하는 데 집중한다면 다음처럼 표현할 수 있다.

~~~java
public record UserResponse(
        Long id,
        String name
) {
}
~~~

Oracle 문서에서 설명하듯 `record`는 고정된 값 집합을 표현하는 데이터 carrier에 가깝다. component에 대응하는 `final` 필드와 accessor, canonical constructor, `equals()`, `hashCode()`, `toString()`이 제공된다. 그래서 모의면접에서 DTO에 `record`를 사용할 수 있겠다고 답한 이유도 단순히 코드가 짧아서가 아니라, 이 객체의 주된 책임이 데이터 전달이라는 점을 코드에 남길 수 있기 때문이었다.

다만 `record`를 완전한 불변 객체라고 부르면 안 된다. component가 `List`처럼 변경 가능한 객체라면 참조가 가리키는 내부 상태까지 자동으로 불변이 되지는 않는다. Java의 `record`는 얕은 불변성을 제공한다는 점까지 함께 기억해야 한다.

## JPA Entity는 왜 같은 방식으로 보지 않았을까?

데이터를 담고 있다는 점만 보면 JPA Entity도 `record`로 만들 수 있을 것처럼 보인다. 하지만 오늘은 DTO와 Entity의 역할이 다르다는 데서 판단을 나누었다.

DTO가 데이터를 전달하는 객체라면 Entity는 생명주기와 상태를 가진 도메인 객체다. 상태가 변경될 수 있고, 도메인 메서드를 수행할 수도 있다. Persistence Context와 연결되는 과정, JPA가 객체를 다루는 방식과 프레임워크의 Proxy 동작도 고려해야 한다.

따라서 `record = 불변 객체`, `Entity = 가변 객체`라는 공식만으로 결론을 내릴 수는 없다. 더 먼저 볼 것은 객체가 맡은 역할과 프레임워크가 요구하는 동작이다. 문법이 가능하다는 사실과 그 문법이 자연스러운 설계라는 판단은 별개의 문제였다.

## Optional — null을 없애는 도구가 아니라 부재를 드러내는 반환 타입

`Optional`도 처음에는 null을 막기 위한 도구로만 생각했다. 하지만 더 정확한 설명은 **값이 존재하지 않을 수도 있다는 사실을 메서드의 반환 타입에 표현하는 것**이다.

Repository 조회 결과처럼 값이 없을 수 있는 상황이라면 호출부에서 그 경우를 처리하도록 만들 수 있다.

~~~java
Optional<User> user = userRepository.findById(userId);
~~~

값이 있다고 가정하고 `get()`을 호출하는 대신, 부재가 어떤 상황인지 정한다.

~~~java
User user = userRepository.findById(userId)
        .orElseThrow(UserNotFoundException::new);
~~~

Java API 문서도 `Optional`을 특히 결과가 없을 수 있는 메서드의 반환 타입으로 사용하는 것을 주요 용도로 설명한다. 그래서 모든 필드와 파라미터를 `Optional`로 감싸는 방향으로 확장하지 않았다. 값의 부재가 호출자에게 의미 있는 경우에 반환 타입으로 사용하는 편이 더 자연스럽다.

## `orElse()`와 `orElseGet()` — 기본값의 실행 시점을 봐야 한다

오늘 헷갈렸던 부분은 두 메서드가 모두 기본값을 반환한다는 점이었다. 다음 코드는 값이 이미 있어도 `loadDefaultUser()`가 호출될 수 있다.

~~~java
User user = findUser()
        .orElse(loadDefaultUser());
~~~

`orElse()`의 인자는 메서드가 실행되기 전에 평가된다. 따라서 기본값을 만드는 작업이 DB 조회나 외부 API 호출처럼 비용이 있다면, 값이 있을 때도 불필요한 작업이 실행된다.

~~~java
User user = findUser()
        .orElseGet(() -> loadDefaultUser());
~~~

`orElseGet()`은 값이 없을 때 `Supplier`를 호출해 기본값을 만든다. 그렇다고 항상 `orElseGet()`이 더 좋은 것은 아니다. 이미 준비된 상수처럼 생성 비용이 거의 없는 값이라면 `orElse()`가 더 읽기 쉬울 수 있다. 두 메서드의 선택 기준은 취향보다 기본값의 생성 비용과 실행 시점에 있다.

## `var` — 짧게 쓰기 전에 타입이 보이는지 확인하기

`var`를 Java의 동적 타입 기능으로 이해하면 안 된다. 실제 타입은 컴파일 시점에 결정되고, `var`는 지역 변수의 타입 선언을 컴파일러가 추론하도록 맡기는 문법이다.

우변만 봐도 타입이 분명한 경우에는 읽는 흐름을 끊지 않을 수 있다.

~~~java
var user = new User("wooram");
~~~

반대로 메서드 이름만으로 반환 타입을 알기 어려운 코드는 신중해야 한다.

~~~java
var result = service.execute();
~~~

모의면접에서 정리한 기준도 이 부분이었다. 타입을 생략해도 코드의 의미가 바로 읽히는가? 그렇지 않다면 몇 글자를 줄이는 대신 명시적인 타입을 남기는 편이 낫다. `var`를 전부 사용하거나 전부 피하는 것이 아니라, 주변 코드가 타입을 충분히 설명하는지를 먼저 본다.

## sealed class — 허용된 타입의 범위를 코드로 선언하기

일반적인 interface는 구현체를 열어 둔 구조다. 새로운 구현체가 추가될 수 있다는 확장성을 기본으로 가진다. `sealed`는 반대로 부모 타입을 구현하거나 상속할 수 있는 범위를 제한한다.

~~~java
public sealed interface Payment
        permits CardPayment, BankPayment {
}
~~~

이 선언만 보아도 `Payment`의 허용된 구현 타입을 확인할 수 있다. Oracle 문서의 설명처럼 `permits`에 지정된 하위 타입만 `extends` 또는 `implements`할 수 있고, 하위 타입은 `final`, `sealed`, `non-sealed` 중 하나로 다음 확장 여부를 표현한다.

다만 모든 interface를 `sealed`로 만들 필요는 없다. 결제 방식처럼 도메인에서 허용할 타입의 집합이 분명하고 그 범위를 통제해야 할 때는 도움이 된다. 반대로 외부 모듈이나 새로운 기능이 계속 구현체를 추가해야 하는 확장 지점이라면 제약이 될 수 있다.

## switch expression — 분기문이 아니라 결과를 만드는 표현식

처음에는 새로운 `switch`가 기존 문법보다 편하다는 정도로 생각했다. 오늘은 `switch` 자체가 하나의 값을 만들어 변수에 할당하거나 반환할 수 있는 표현식이라는 점을 중심으로 이해했다.

~~~java
String message = switch (status) {
    case SUCCESS -> "성공";
    case FAIL -> "실패";
};
~~~

`case ->` 형태는 각 분기가 어떤 값을 만드는지 한눈에 보여 주고, 기존 colon 방식에서 생길 수 있는 의도하지 않은 fall-through도 줄인다. 핵심은 문법이 새로워졌다는 사실보다 분기의 목적이 “여러 문장을 실행하는 것”이 아니라 “하나의 결과를 선택하는 것”일 때 표현식으로 나타낼 수 있다는 데 있다.

## `instanceof` pattern matching — 타입 검사와 변수 바인딩을 함께 표현하기

기존에는 타입을 검사한 뒤 다시 캐스팅하고, 사용할 변수에 대입해야 했다.

~~~java
if (obj instanceof User) {
    User user = (User) obj;
    System.out.println(user.getName());
}
~~~

pattern matching을 사용하면 타입 검사와 pattern variable 바인딩을 한 표현식에 담을 수 있다.

~~~java
if (obj instanceof User user) {
    System.out.println(user.getName());
}
~~~

처음에는 캐스팅과 타입 검사가 같은 역할이라고 생각했지만, 둘은 다르다. `instanceof`는 객체가 특정 타입인지 검사하고, pattern matching은 그 검사가 성공했을 때 사용할 변수를 함께 바인딩한다. 코드가 짧아진 것보다 검사와 사용 사이의 연결이 분명해진 것이 더 큰 변화였다.

## Modern Java 기능을 선택하는 기준

오늘의 결론은 “최신 문법으로 바꾸자”가 아니었다. 먼저 코드가 표현하려는 의도를 확인하고, 그 의도를 더 분명하게 만드는 기능인지 판단해야 한다.

데이터 전달이 주된 책임인 DTO라면 `record`를 검토할 수 있다. 값의 부재가 정상적인 결과라면 `Optional`을 반환 타입으로 고려한다. 기본값을 만드는 작업이 비싸다면 `orElseGet()`으로 실행 시점을 늦춘다. 우변만으로 타입이 분명한 지역 변수라면 `var`가 읽기 흐름을 단순하게 만들 수 있다. 허용된 타입 계층을 닫아야 한다면 `sealed`를, 분기의 결과를 바로 만들고 싶다면 `switch expression`을 검토한다. 타입 검사 뒤 캐스팅이 반복된다면 `instanceof` pattern matching이 그 의도를 잘 드러낼 수 있다.

![코드가 표현하려는 의도에서 Modern Java 기능을 선택하는 기준](/assets/images/2026-09-18-modern-java-feature-selection/modern-java-selection-criteria.svg)

## 실제 Java/Spring 백엔드에서 적용할 때

Spring API의 Request와 Response DTO는 데이터를 전달하는 역할이 분명하므로 `record`를 후보로 볼 수 있다. Repository 조회 결과는 값이 없을 수 있다는 사실을 `Optional`로 표현할 수 있다. 다만 도메인 규칙과 상태 변경이 중심인 Entity까지 같은 방식으로 바꾸지는 않는다.

지역 변수에서는 긴 Generic 타입을 반복하지 않아도 우변에서 타입을 쉽게 알 수 있을 때 `var`를 고려한다. 도메인의 구현 타입이 명확하게 제한되어야 할 때는 `sealed`가 맞을 수 있지만, 프로젝트에 억지로 적용할 사례를 만들지는 않는다. 외부 호출이나 비용 있는 계산이 fallback에 들어간다면 `orElseGet()`으로 실제 필요할 때만 실행되도록 한다.

결국 실제 프로젝트에서는 코드 스타일, 가독성, 프레임워크와의 호환성, 팀원의 이해도, 새 기능을 익히는 비용, 이후 변경과 유지보수 비용을 함께 봐야 한다. 문법 하나의 장점만 보고 선택하기에는 코드가 놓인 맥락이 더 크다.

## 오늘 학습하면서 바뀐 기준

처음에는 Modern Java를 많이 사용할수록 좋은 코드에 가까워진다고 생각했다. 지금은 새로운 문법을 발견할 때마다 다음 질문을 먼저 하게 된다.

> 이 문법을 사용하면 코드가 표현하려는 의미가 더 명확해지는가?

이 질문에 바로 답할 수 없다면 기존 문법을 유지하는 것도 충분한 선택이다. 새로운 문법을 사용했다는 사실보다, 객체의 역할과 데이터의 부재, 타입 계층, 분기의 결과처럼 코드가 말하려는 내용을 읽는 사람이 빠르게 파악할 수 있는지가 더 중요하다.

Modern Java는 기존 코드를 전부 최신 문법으로 바꾸는 규칙이 아니다. 기존 코드보다 의도를 정확하고 간결하게 표현할 수 있을 때 선택하는 도구에 가깝다. 오늘은 문법 목록보다 그 문법을 선택할 기준을 배웠다는 점이 가장 큰 수확이었다.

### 참고 자료 (Sources)

* **Oracle:** [Java SE 21 Record Classes](https://docs.oracle.com/en/java/javase/21/language/records.html)
* **Oracle:** [Java SE 21 `java.util.Optional` API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Optional.html)
* **Oracle:** [Java SE 21 Sealed Classes and Interfaces](https://docs.oracle.com/en/java/javase/21/language/sealed-classes-and-interfaces.html)
* **Oracle:** [Java SE 21 Pattern Matching](https://docs.oracle.com/en/java/javase/21/language/pattern-matching.html)


<!-- HUMANIZE-SUMMARY
초안/윤문본 글자수: 약 8,170자 / 7,500자
변경률: 약 18.4% (문장 단위 편집률 기준)
탐지/개선: A-2 4→0, A-7 2→0, A-10 6→1, C-7 3→0, C-11 5→0, D-1 3→0, H-1 4→1, I-1 2→0, J-3 2→0
자체검증: 6/6 통과 — 고유명사·수치·날짜·코드·공식 문서 링크·이미지 경로 보존, 장르·문체 일관성, S1 잔존 없음
등급: A — S1 잔존 0건, S2 잔존 2건 이하, 의미 보존과 학습 기록형 문체를 유지했다.
주요 변경 하이라이트:
1. Modern Java를 문법 목록이 아니라 코드의 의도를 표현하는 선택 기준으로 묶어 도입
2. record와 JPA Entity를 단순한 불변·가변 공식이 아니라 객체의 역할과 프레임워크 요구사항으로 구분
3. Optional의 반환 타입 용도와 orElse()·orElseGet()의 실행 시점을 하나의 판단 흐름으로 연결
4. var, sealed, switch expression, instanceof pattern matching을 각각 언제 읽기 쉬워지는지 중심으로 정리
5. 코드가 표현하려는 의도와 기능 선택 기준을 한 장의 SVG 다이어그램으로 시각화
-->
