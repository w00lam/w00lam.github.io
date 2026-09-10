---
title: "Java Object 클래스와 equals/hashCode — ==만으로 객체를 비교하면 왜 안 될까?"
date: 2026-09-10
categories: [TIL, Java, Spring]
tags: [Java, Object, equals, hashCode, toString, OOP, TIL]
permalink: /posts/java-object-equals-hashcode/
---

Java에서 객체를 비교하는 방법을 공부하다가 `==`와 `equals()`의 차이에서 멈췄다. 두 객체의 필드 값이 같은데도 `==`는 `false`를 반환했고, `HashSet`에서는 `equals()`만 재정의했을 때 같은 객체가 중복으로 들어갈 수 있었다.

처음에는 `equals()`가 객체의 값을 비교하는 메서드라고 생각했다. 하지만 조금 더 살펴보니 먼저 정해야 할 것이 있었다.

> 어떤 상태가 같을 때 두 객체를 논리적으로 같은 것으로 볼 것인가?

이번 글에서는 이 질문을 따라가며 `Object`, `==`, `equals()`, `hashCode()`, `toString()`의 역할을 정리해 보았다.

## Object 클래스는 왜 필요한가?

Java의 모든 클래스는 직접 또는 간접적으로 `Object`를 상속한다.

```java
public class User {
    // 실제로는 Object를 상속하고 있다.
}
```

위 코드는 다음처럼 작성한 것과 같은 의미다.

```java
public class User extends Object {
}
```

모든 클래스가 같은 최상위 부모를 가진다는 것은 단순히 상속 계층의 꼭대기에 `Object`가 있다는 뜻만은 아니다. 모든 객체가 기본적으로 사용할 수 있는 공통 기능의 기준을 제공한다는 의미도 있다.

객체를 서로 비교하거나, 객체의 상태를 문자열로 출력하거나, `HashMap`과 `HashSet` 같은 해시 기반 자료구조에서 객체를 다룰 때 공통으로 사용할 수 있는 메서드가 필요하다. `Object`는 이런 최소한의 기준을 제공한다.

이번 글에서는 `Object`의 여러 메서드 중 객체 동등성과 직접 연결되는 `equals()`, `hashCode()`, 그리고 디버깅에 자주 사용하는 `toString()`에 집중한다.

## `==`로 객체를 비교하면 무엇을 비교하는가?

먼저 이름만 가진 간단한 `User`를 만들고 두 객체를 비교해 보았다.

```java
public class User {

    private final String name;

    public User(String name) {
        this.name = name;
    }
}
```

```java
User user1 = new User("wooram");
User user2 = new User("wooram");

System.out.println(user1 == user2);
```

실행 결과는 다음과 같다.

```text
false
```

두 객체 모두 `name`이 `wooram`인데 왜 `false`일까?

참조 타입에서 `==`는 객체 내부의 상태값을 비교하지 않는다. 두 참조 변수가 메모리상 동일한 객체를 가리키는지, 즉 참조 동일성을 확인한다.

`new User("wooram")`가 두 번 실행되면서 `User` 객체도 두 개 만들어졌다. `user1`과 `user2`는 같은 이름을 가진 서로 다른 객체를 바라보고 있으므로 `==`의 결과가 `false`다.

반대로 하나의 참조를 다른 변수에 대입하면 결과가 달라진다.

```java
User user3 = user1;

System.out.println(user1 == user3); // true
```

이번에는 두 변수가 같은 객체를 가리키기 때문에 `true`다. 이 결과를 보고 나면 자연스럽게 이런 의문이 생긴다.

> 값이 같은데 왜 같은 객체라고 판단되지 않을까?

그 이유는 `==`가 값의 의미나 객체의 상태가 아니라 참조의 동일성을 비교하기 때문이다. 객체의 상태를 기준으로 비교하려면 다른 기준이 필요하다.

![==는 참조 동일성을, equals()는 개발자가 정의한 논리적 동등성을 비교하는 구조](/assets/images/2026-09-10-object-equality/identity-vs-equality.svg)

## `equals()`는 무엇을 비교하는가?

`Object`가 제공하는 기본 `equals()`도 기본적으로 `==`와 같은 참조 동일성 비교를 수행한다. 따라서 `User`의 이름이나 ID가 같을 때 논리적으로 같은 사용자라고 판단하고 싶다면 `equals()`를 재정의해야 한다.

이번에는 이름이 아니라 ID를 기준으로 같은 사용자인지 판단해 보았다.

```java
import java.util.Objects;

public class User {

    private final Long id;
    private final String name;

    public User(Long id, String name) {
        this.id = id;
        this.name = name;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }

        if (!(obj instanceof User other)) {
            return false;
        }

        return Objects.equals(id, other.id);
    }
}
```

이제 다음 코드는 `true`를 출력한다.

```java
User user1 = new User(1L, "wooram");
User user2 = new User(1L, "wooram");

System.out.println(user1.equals(user2)); // true
```

두 객체가 같은 인스턴스라는 뜻은 아니다. 서로 다른 객체지만, 이 `User` 클래스에서는 ID가 같으면 같은 사용자로 보기로 정했기 때문에 논리적으로 동등하다는 뜻이다.

여기서 중요한 부분은 `equals()`가 모든 필드를 무조건 비교하는 메서드가 아니라는 점이다. 어떤 상태를 동등성의 기준으로 삼을지는 클래스의 의미와 도메인 규칙에 따라 개발자가 정한다.

예를 들어 이름만으로 같은 사용자를 판단하면 `wooram`이라는 이름을 가진 두 사람이 모두 같은 사용자로 처리될 수 있다. 동명이인 문제가 생기는 이유다. 반면 시스템에서 유일하게 관리되는 ID를 기준으로 삼으면 이름이 달라도 같은 사용자를 표현할 수 있다.

따라서 `equals()`를 재정의하기 전에는 다음 질문부터 확인해야 한다.

> 이 클래스에서 어떤 상태가 같을 때 같은 객체로 볼 것인가?

이 기준이 곧 해당 클래스의 논리적 동등성이다.

## 그런데 왜 `hashCode()`도 같이 재정의해야 할까?

`equals()`를 재정의했으니 객체 비교 문제는 해결된 것처럼 보였다. 하지만 `HashSet`이나 `HashMap`을 사용하면 `hashCode()`도 함께 고려해야 한다.

해시 기반 자료구조는 객체를 찾을 때 대략 다음 순서로 동작한다.

```text
hashCode()
→ 해시 버킷으로 탐색 범위를 좁힘
→ equals()
→ 같은 버킷 안에서 논리적 동등성을 확인
```

`hashCode()`는 최종적으로 같은 객체인지 판정하는 메서드가 아니다. 먼저 객체가 들어갈 버킷을 정해 비교해야 할 후보를 줄이는 역할을 한다. 실제 논리적 동등성은 같은 버킷 안에서 `equals()`로 확인한다.

그래서 `equals()`만 재정의하고 `hashCode()`를 그대로 두면 문제가 생긴다.

```java
Set<User> users = new HashSet<>();

users.add(new User(1L, "wooram"));
users.add(new User(1L, "wooram"));

System.out.println(users.size()); // 보통 2
```

두 객체의 `equals()`는 `true`지만 `hashCode()`는 `Object`의 기본 구현을 사용한다. 서로 다른 객체에서 나온 해시값이 다르면 두 객체가 서로 다른 버킷으로 나뉜다. 이 경우 `HashSet`은 같은 버킷 안에서 비교할 필요가 없다고 판단하고 `equals()`까지 확인하지 않아 두 객체를 모두 저장할 수 있다.

이 문제를 해결하려면 동등성 기준으로 사용한 ID를 `hashCode()`에도 사용해야 한다.

```java
@Override
public int hashCode() {
    return Objects.hash(id);
}
```

`equals()`와 `hashCode()`를 함께 재정의하면 같은 ID를 가진 객체는 같은 해시 버킷에서 비교되고, `equals()`가 `true`를 반환하면서 `HashSet`에는 하나만 남는다.

```text
users.size() == 1
```

두 메서드의 관계는 다음 규칙으로 기억하면 된다.

> `equals()`가 `true`인 두 객체는 반드시 같은 `hashCode()`를 가져야 한다.

반대 방향은 항상 성립하지 않는다.

> `hashCode()`가 같다고 해서 `equals()`가 반드시 `true`인 것은 아니다.

서로 다른 객체가 같은 해시값을 갖는 해시 충돌이 발생할 수 있기 때문이다. 해시값은 탐색 범위를 좁히는 기준이고, 최종 판단은 `equals()`가 맡는다.

![HashSet이 hashCode()로 버킷을 찾은 뒤 equals()로 논리적 동등성을 확인하는 흐름](/assets/images/2026-09-10-object-equality/hashset-lookup.svg)

## `HashSet`에서 직접 확인하기

앞에서 본 흐름을 조금 더 완성된 `User`로 확인해 보았다.

```java
public class User {

    private final Long id;
    private final String name;

    // 생성자 생략

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!(obj instanceof User other)) {
            return false;
        }
        return Objects.equals(id, other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
```

```java
Set<User> users = new HashSet<>();

users.add(new User(1L, "wooram"));
users.add(new User(1L, "wooram"));

System.out.println(users.size()); // 1
```

두 번 `add()`했지만 ID가 같은 객체는 같은 논리적 사용자로 판단된다. 같은 해시 버킷에서 `equals()`가 실행되고 `true`가 반환되므로 `HashSet`은 두 번째 객체를 중복으로 저장하지 않는다.

실무에서는 `HashMap`의 키나 `HashSet`의 원소로 사용할 객체라면 동등성 기준뿐 아니라 해시값도 함께 설계해야 한다. 특히 해시 기반 자료구조에 넣은 뒤 동등성 기준에 사용하는 필드를 바꾸면 객체를 찾지 못할 수 있으므로, 이런 필드는 가능하면 변경하지 않는 편이 안전하다.

## `toString()`은 왜 재정의할까?

객체를 로그로 출력하거나 디버거에서 확인할 때 `toString()`을 사용한다.

```java
System.out.println(user1);
```

`toString()`을 재정의하지 않으면 다음처럼 클래스 이름과 해시값을 조합한 형태가 출력된다.

```text
User@5e2de80c
```

이 값만으로는 객체의 상태를 파악하기 어렵다. 필요한 상태를 사람이 읽기 쉬운 형태로 표현하면 디버깅이 편해진다.

```java
@Override
public String toString() {
    return "User{id=" + id + ", name='" + name + "'}";
}
```

이제 출력 결과는 다음과 같다.

```text
User{id=1, name='wooram'}
```

다만 모든 필드를 무조건 출력하면 안 된다. `password`, `token`처럼 민감한 정보는 로그나 `toString()`에 포함하지 않는 것이 좋다. 편리한 디버깅보다 정보 노출을 막는 것이 먼저다.

## 모든 클래스에서 세 메서드를 재정의해야 할까?

그렇지는 않다. 모든 클래스에 `equals()`, `hashCode()`, `toString()`을 습관적으로 작성할 필요는 없다.

객체의 논리적 동등성 비교가 필요한 클래스라면 `equals()`와 `hashCode()` 재정의를 고려한다. 특히 `HashMap`의 키나 `HashSet`의 원소로 사용할 객체라면 두 메서드의 규칙을 함께 맞춰야 한다.

반대로 해당 객체를 참조 동일성으로만 구분해도 충분하다면 `Object`의 기본 구현을 그대로 사용할 수 있다. `toString()`도 로그나 디버깅에서 객체 상태를 확인할 필요가 있을 때 재정의하면 된다.

중요한 것은 메서드를 재정의했다는 사실보다, 그 클래스에서 말하는 “같다”의 기준이 무엇인지 설명할 수 있는가이다.

## 정리

`Object`는 모든 객체가 비교, 문자열 표현, 해시 기반 자료구조 사용에 필요한 공통 기능을 제공한다.<br>
참조 타입의 `==`는 객체의 값이 아니라 두 변수가 같은 인스턴스를 가리키는지 비교한다.<br>
`equals()`는 클래스의 의미에 맞춰 논리적 동등성 기준을 개발자가 정의하는 메서드다.<br>
`hashCode()`는 해시 기반 자료구조의 탐색 범위를 줄이고, 같은 버킷 안의 최종 판단은 `equals()`가 담당한다.<br>
따라서 `equals()`가 `true`면 `hashCode()`도 같아야 하지만, `hashCode()`가 같다고 `equals()`가 반드시 `true`인 것은 아니다.
