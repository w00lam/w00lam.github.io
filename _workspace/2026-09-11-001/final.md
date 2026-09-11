---
title: "Java String은 왜 불변 객체이고, final은 왜 충분하지 않을까?"
date: 2026-09-11
categories: [TIL, Java, Spring]
tags: [Java, String, String Pool, StringBuilder, Immutable Object, Defensive Copy, OOP, TIL]
permalink: /posts/java-string-immutability-design/
---

## 제목 후보

- String은 왜 불변 객체일까?
- `final`을 붙이면 정말 불변 객체가 될까?
- String을 따라가며 이해한 불변 객체 설계
- 참조 공유를 막는 방어적 복사까지, 불변 객체 이해하기

이번 글의 제목은 **Java String은 왜 불변 객체이고, `final`은 왜 충분하지 않을까?**로 정했다. String을 공부하다 보니 문자열의 특징만 외우는 것으로는 부족했다. String Pool과 객체 참조를 이해해야 `==`와 `equals()`의 결과를 설명할 수 있었다. String의 불변성에서 출발해 `final`, 가변 객체, 방어적 복사까지 자연스럽게 이어졌다.

## String 비교에서 시작된 질문

먼저 다음 코드를 실행해 보았다.

```java
String a = "hello";
String b = "hello";
String c = new String("hello");

System.out.println(a == b);
System.out.println(a == c);
System.out.println(a.equals(c));
```

실행 결과는 다음과 같다.

```text
true
false
true
```

처음에는 이 결과를 보고 “`==`와 `equals()`는 다르다”라고만 정리했다. 하지만 이렇게 외우면 문자열이 아니라 다른 객체를 비교할 때 다시 헷갈린다. 왜 같은 문자열인데 `a == c`는 `false`이고, `a.equals(c)`는 `true`인지 설명하려면 변수와 객체의 관계부터 살펴봐야 한다.

## String Pool과 객체 참조

문자열 리터럴(String literal)은 일반적으로 String Pool에서 관리된다. 같은 문자열 리터럴은 같은 String 객체를 재사용하므로 다음 코드의 `a`와 `b`는 동일한 객체를 참조한다.

```java
String a = "hello";
String b = "hello";
```

`new String("hello")`는 다르게 동작한다. `"hello"`라는 리터럴은 String Pool에 존재하지만, `new`는 그 내용을 가진 별도의 String 객체를 새로 만든다. 그래서 `c`는 Pool의 객체가 아니라 새로 생성된 객체를 참조한다.

```mermaid
flowchart LR
    A["a"] --> P["String Pool\nhello"]
    B["b"] --> P
    C["c"] --> H["Heap의 별도 String 객체\nhello"]
```

> **이미지 생성 프롬프트:**
> 기술 블로그에 어울리는 심플한 시스템 다이어그램 스타일. 왼쪽에 변수 `a`, `b`, `c`를 세로로 배치하고, 오른쪽에 `String Pool` 영역과 일반 Heap 영역을 구분한다. `a`와 `b`는 String Pool 안의 동일한 `"hello"` 객체를 가리키고, `c`는 Heap의 별도 `"hello"` String 객체를 가리키는 화살표를 그린다. 같은 문자열 내용과 서로 다른 객체 참조가 대비되도록 표현한다. 흰색 배경, 검정·짙은 남색 선, 강조색은 한 가지 파란색만 사용하고 장식은 배제한다.

이 결과를 보면 `a`, `b`, `c`는 모두 문자열 내용으로는 `hello`를 갖지만 참조 관계는 같지 않다. `a`와 `b`가 같은 객체를 바라보고 `c`가 별도의 객체를 바라본다는 점을 구분하면 앞의 실행 결과가 설명된다.

## `==`와 `equals()`는 무엇을 비교하는가

### `==`는 참조 동일성을 비교한다

참조 타입에서 `==`는 두 변수가 같은 객체를 가리키는지 비교한다. 객체 내부의 문자열이나 필드가 같은지는 신경 쓰지 않는다.

```java
String first = new String("hello");
String second = new String("hello");
String third = first;

System.out.println(first == second); // false
System.out.println(first == third);  // true
```

`first`와 `second`는 내용이 같은 별개의 객체다. 반면 `third`에는 `first`의 참조를 대입했으므로 두 변수는 같은 객체를 가리킨다.

### `equals()`는 클래스가 정의한 논리적 동등성을 비교한다

`Object.equals()`의 기본 구현은 참조 동일성을 기준으로 동작한다. 하지만 String은 `equals()`를 오버라이딩하여 문자열 내용을 비교한다.

```java
String first = new String("hello");
String second = new String("hello");

System.out.println(first.equals(second)); // true
```

서로 다른 객체라도 String의 내용이 같으면 `equals()`는 `true`를 반환한다. 이때 “같다”는 말은 같은 인스턴스라는 뜻이 아니라, String 클래스가 정한 논리적 동등성(logical equality)을 만족한다는 뜻이다.

여기서 한 가지를 더 기억하자. 모든 클래스의 `equals()`가 자동으로 필드 값을 비교하는 것은 아니다. 기본 구현을 그대로 쓰는 클래스도 있고, ID만 비교하도록 직접 재정의하는 클래스도 있다. `equals()`가 무엇을 비교하는지는 해당 클래스의 구현과 도메인 규칙에 달려 있다.

이 내용은 바로 전날 정리한 [`Object` 클래스와 `equals()`·`hashCode()`](/posts/java-object-equals-hashcode/)와도 이어진다. 객체의 참조 동일성과 논리적 동등성을 구분하는 것이 공통된 출발점이다.

## String은 왜 불변 객체인가

이번에는 문자열을 이어 붙이는 코드를 살펴보았다.

```java
String value = "hello";
value = value + " world";
```

겉으로는 `value` 안의 문자열이 수정된 것처럼 보인다. 실제로는 기존 String 객체의 내용이 바뀌지 않는다.

```mermaid
flowchart LR
    subgraph BEFORE["변경 전"]
        V1["value"] --> S1["hello"]
    end
    subgraph AFTER["변경 후"]
        S2["hello\n기존 객체"]
        V2["value"] --> S3["hello world\n새로운 결과 객체"]
    end
```

`value = value + " world"`가 실행되면 `hello world`라는 새로운 문자열 결과가 만들어지고, `value`가 그 결과를 참조하도록 대입된다. 기존 `hello` 객체는 그대로 남는다.

> **이미지 생성 프롬프트:**
> 기술 블로그용 메모리 구조 다이어그램. 화면을 왼쪽과 오른쪽으로 나누어 왼쪽에는 `value → "hello"`, 오른쪽에는 기존 `"hello"` 객체는 그대로 둔 채 `value → "hello world"`라는 새 객체를 가리키는 구조를 보여준다. 변수의 참조가 이동한 것과 기존 객체의 내부 값은 변하지 않은 것을 굵은 화살표와 짧은 주석으로 강조한다. Java 코드 조각을 작게 배치하되 전체는 단색 선 중심의 깔끔한 인포그래픽으로 구성한다.

여기서 꼭 구분해야 할 것이 있다.

> 변수의 참조가 바뀌는 것과 객체 내부 상태가 바뀌는 것은 다르다.

String이 불변(immutable)이라는 말은 String 객체가 생성된 뒤 그 객체 내부의 문자열 상태를 변경할 수 없다는 뜻이다. `value`라는 변수는 다른 String 객체를 참조하도록 바뀐다. 변수의 재할당이 가능하다는 이유로 String 객체가 가변이라고 판단하면 안 된다.

String은 외부에서 내부 상태를 바꿀 수 있는 메서드를 제공하지 않고, 문자열을 변환하는 연산은 새로운 String을 반환한다. 구현 내부의 저장 방식은 JDK 버전에 따라 달라질 수 있지만, 사용자가 관찰하는 계약은 “한 번 만들어진 String의 내용은 변하지 않는다”는 것이다.

## StringBuilder는 왜 필요한가

String의 불변성은 안전한 공유와 예측 가능한 동작에 도움이 된다. 대신 문자열을 여러 번 이어 붙이는 코드에서는 중간 결과가 계속 만들어지기 쉽다.

```java
String result = "";

for (int i = 0; i < 1000; i++) {
    result += i;
}
```

이 코드는 반복할 때마다 이전 문자열과 새로운 값을 합친 결과를 다시 만들어 `result`에 대입하는 구조가 되기 쉽다. 문자열 길이가 커질수록 객체 생성과 기존 내용 복사 비용도 함께 커지기도 한다. 하나의 간단한 연결 표현식은 컴파일러가 최적화하기도 하지만, 반복적인 조작을 코드로 명확하게 표현하려면 가변 버퍼를 사용하는 편이 적절하다.

```java
StringBuilder builder = new StringBuilder();

for (int i = 0; i < 1000; i++) {
    builder.append(i);
}

String result = builder.toString();
```

`StringBuilder`는 내부 상태를 바꿀 수 있는 가변 객체다. 반복 중에는 같은 빌더에 값을 추가하고, 작업이 끝났을 때 `toString()`으로 최종 String을 만든다.

“StringBuilder가 더 빠르다”라고만 기억하기보다 다음 원인과 결과로 연결하는 편이 정확하다.

> String은 불변이므로 반복 수정에서 새로운 결과 객체가 만들어지기 쉽다. StringBuilder는 내부 버퍼를 변경하면서 작업하므로 반복적인 문자열 조작에 적합하다.

## `final`이면 불변 객체인가

String의 불변성을 살펴본 뒤 `final` 키워드와의 관계도 헷갈렸다. 다음 코드를 보자.

```java
final List<String> roles = new ArrayList<>();

roles.add("USER");
roles.add("ADMIN");
```

`roles`에는 `final`이 붙었지만 `add()`는 정상적으로 실행된다. `final`이 막는 것은 참조 변수의 재할당이지, 참조가 가리키는 객체의 내부 상태 변경이 아니기 때문이다.

```java
roles = new ArrayList<>(); // 컴파일 오류
roles.add("ADMIN");       // 가능
```

둘의 차이는 다음과 같다.

| 구분 | 보호하는 대상 | 예시 |
| --- | --- | --- |
| `final` 참조 | 참조 변수의 재할당 | `roles = otherList` 제한 |
| 불변 객체 | 객체 내부 상태의 변경 | 생성 후 값 변경 불가 |
| 수정 불가 컬렉션 | 컬렉션을 통한 구조 변경 | `add`, `remove` 제한 |

그래서 `final == immutable`은 성립하지 않는다. 불변 객체를 만들려면 필드의 참조를 한 번만 대입하는 것뿐 아니라 객체 내부 상태 자체가 변경되지 않아야 한다. 컬렉션처럼 가변 객체를 필드로 둔다면, 그 객체를 외부에서 바꿀 경로도 함께 차단해야 한다.

## 컬렉션 필드를 그대로 저장하면 생기는 문제

다음 `User` 클래스는 겉보기에는 `roles`를 `final`로 관리하고 있다.

```java
public class User {

    private final List<String> roles;

    public User(List<String> roles) {
        this.roles = roles;
    }

    public List<String> getRoles() {
        return roles;
    }
}
```

하지만 생성자에서 전달받은 List 참조를 그대로 저장하고 있다. 외부에서 같은 List를 계속 가지고 있으므로 다음과 같은 변경이 가능하다.

```java
List<String> roles = new ArrayList<>();
roles.add("USER");

User user = new User(roles);

roles.add("ADMIN");
System.out.println(user.getRoles()); // [USER, ADMIN]
```

`User`의 코드를 호출한 쪽이 `user`의 메서드를 호출하지 않았는데도 내부 역할 목록이 바뀌었다. 생성자에 전달한 List와 `User.roles`가 같은 객체를 가리키고 있기 때문이다.

```mermaid
flowchart LR
    R["외부 roles"] --> L["ArrayList"]
    U["User.roles"] --> L
    G["user.getRoles()"] --> L
```

> **이미지 생성 프롬프트:**
> 심플한 기술 블로그 다이어그램. 왼쪽에 `외부 roles`, 오른쪽에 `User.roles`, 아래에 `user.getRoles()`를 배치하고 세 참조가 하나의 `ArrayList` 객체를 함께 가리키는 구조를 보여준다. 이어서 옆에 안전한 구조를 비교 배치한다. 안전한 구조에서는 외부 `ArrayList A`와 `User.roles`가 가리키는 수정 불가한 `List B`를 분리하고, getter는 내부 List B를 반환하되 외부에서 `add`할 수 없다는 주석을 넣는다. 공유 참조와 복사된 참조의 차이가 한눈에 보이는 흑백·파란색 다이어그램으로 구성한다.

getter도 같은 문제를 만든다.

```java
user.getRoles().add("ADMIN");
```

`getRoles()`가 내부 List를 그대로 반환하면 외부 코드는 `User`의 내부 상태를 직접 수정할 여지가 생긴다. 필드에 `final`을 붙였다는 사실만으로는 이 경로를 막지 못한다.

## 방어적 복사로 참조 경계를 만든다

외부에서 전달된 가변 객체를 그대로 저장하지 않고, 객체가 관리할 사본을 만드는 방식을 방어적 복사(defensive copy)라고 한다. String 원소가 들어 있는 역할 목록이라면 다음처럼 작성한다.

```java
import java.util.List;

public class User {

    private final List<String> roles;

    public User(List<String> roles) {
        this.roles = List.copyOf(roles);
    }

    public List<String> getRoles() {
        return roles;
    }
}
```

`List.copyOf(roles)`는 전달받은 List의 내용을 바탕으로 수정할 수 없는 List를 만든다. 이제 생성자에 넘긴 외부 List를 나중에 수정해도 `User`의 역할 목록에는 영향을 주지 않는다. getter가 내부 List를 반환하더라도 `add()`나 `remove()`로 구조를 바꿀 수 없다.

참조 관계는 다음처럼 달라진다.

```text
참조를 그대로 저장한 경우
외부 roles ─────┐
                ▼
             ArrayList
                ▲
                │
User.roles ─────┘

방어적 복사를 적용한 경우
외부 roles ───▶ ArrayList A

User.roles ───▶ 수정 불가한 List B
```

방어적 복사는 단순히 `final`을 추가하는 작업이 아니다. 객체 안에서 관리할 상태의 소유권을 분리하고, 외부가 내부 상태에 접근할 수 있는 통로를 점검하는 작업이다.

다만 `List.copyOf()`는 컬렉션 구조를 복사할 뿐, 원소를 재귀적으로 복사하는 깊은 복사(deep copy)는 아니다. 지금처럼 원소가 String이면 String 자체도 불변이므로 문제가 없다. 만약 `Role` 같은 가변 객체가 원소라면 List를 복사해도 외부가 같은 `Role` 객체로 내부 상태를 바꿀 여지가 있다. 그 경우에는 원소까지 새로운 객체로 만드는 별도의 복사 전략이 필요하다.

## 모든 객체를 불변으로 만들어야 할까

불변 객체는 생성 후 상태가 바뀌지 않으므로 공유하기 쉽고, 변경 시점을 추적하기도 편하다. 값 자체가 객체의 의미인 Value Object나 생성 이후 내용이 바뀔 필요가 없는 DTO는 불변으로 설계하기 좋은 대상이다.

그렇다고 모든 객체에서 상태 변경을 없애야 하는 것은 아니다. 주문이나 예약처럼 상태 변화가 도메인 생명주기의 일부인 객체도 있다.

```text
CREATED
   ↓
PAID
   ↓
CANCELED
```

이런 객체를 무조건 불변으로 만들면 상태가 바뀔 때마다 새 객체를 만들어야 한다. 그 구조가 항상 나쁜 것은 아니지만, 도메인의 상태 전이를 표현하는 방식과 잘 맞는지 판단하는 것이 먼저다.

상태 변경이 필요한 엔티티라면 아무 곳에서나 필드를 바꾸게 하기보다, 객체가 자신의 변경 규칙을 책임지도록 만든다.

```java
public void cancel() {
    if (status == OrderStatus.COMPLETED) {
        throw new IllegalStateException("완료된 주문은 취소할 수 없습니다.");
    }

    this.status = OrderStatus.CANCELED;
}
```

`setStatus()`를 열어 두면 호출하는 쪽에서 완료된 주문을 취소하는 등 잘못된 상태를 만든다. `cancel()`처럼 의미 있는 메서드를 제공하면 상태 변경과 검증 규칙을 한곳에 둔다.

불변 객체 설계와 엔티티의 캡슐화는 서로 반대되는 개념이 아니다. 값이 바뀌지 않아야 하는 객체는 불변으로 만들고, 상태 전이가 필요한 객체는 허용된 전이를 메서드로 제한하면 된다.

## 학습하면서 헷갈렸던 부분

### `final`이면 객체도 수정할 수 없다고 생각했다

`final`은 참조의 재할당을 막는다. 참조가 가리키는 객체의 변경까지 막으려면 객체 자체가 불변이거나, 외부에 수정 가능한 참조를 노출하지 않아야 한다.

### String 변수의 값이 바뀌니 String 객체가 수정된다고 생각했다

변수에 새로운 String 객체의 참조를 다시 대입한 것이다. 기존 String 객체의 내용은 그대로 남아 있다.

### `equals()`는 모든 객체의 내부 값을 비교한다고 생각했다

`Object.equals()`의 기본 동작은 참조 동일성 비교다. String처럼 `equals()`를 오버라이딩한 클래스만 자신이 정한 기준에 따라 내용을 비교한다.

### 불변 객체는 모든 상태 변경을 없애는 설계라고 생각했다

객체의 역할에 따라 다르다. Value Object처럼 값이 바뀌지 않아야 하는 객체와, 주문처럼 상태 전이가 역할의 일부인 엔티티를 같은 방식으로 설계할 필요는 없다.

## 백엔드 개발과 연결하기

Spring 백엔드에서 DTO나 Value Object를 불변으로 만들면 여러 계층이 같은 객체를 참조하더라도 값이 중간에 바뀌는 경로를 줄인다. 특히 컬렉션 필드를 외부에 그대로 노출하면 서비스나 컨트롤러 어느 곳에서든 내부 상태를 수정할 수 있으므로 생성자와 getter 양쪽의 참조 경계를 확인할 필요가 있다.

여러 코드가 하나의 가변 List나 Map을 공유하는 구조도 주의할 대상이다. 변경을 수행한 코드를 찾기 어렵고, 호출 순서에 따라 결과가 달라질 수 있다. 내부에서 복사본을 소유하거나 수정 불가한 형태로 반환하면 이런 추적 비용을 줄인다.

JPA 엔티티처럼 생명주기 동안 상태가 바뀌는 객체는 무조건 불변으로 만들기보다 setter를 그대로 공개하지 않는 방식이 현실적이다. `pay()`, `cancel()`, `changeAddress()`처럼 의도가 드러나는 메서드 안에서 변경 조건을 검사하면 객체가 자신의 상태 규칙을 지키게 된다.

## 오늘의 정리

처음에는 String의 특징을 “문자열 리터럴은 Pool을 사용하고, `==`와 `equals()`의 결과가 다르다” 정도로 외우려고 했다. 지금은 변수와 객체를 나누어 생각하면 그 결과를 설명하게 되었다.

`==`는 참조 동일성을 비교하고, String의 `equals()`는 문자열 내용의 논리적 동등성을 비교한다. String의 불변성은 변수에 새 참조를 대입할 수 없다는 뜻이 아니라, 이미 만들어진 String 객체의 내부 상태를 바꿀 수 없다는 뜻이다. 반복적인 문자열 조작에서 StringBuilder를 사용하는 이유도 이 불변성에서 출발한다.

`final`은 불변 객체를 만드는 조건 중 하나가 될 수 있지만 충분조건은 아니다. 컬렉션 필드를 가진 객체는 생성자에서 외부 참조를 그대로 저장하지 않는지, getter로 내부의 가변 객체를 그대로 반환하지 않는지까지 확인할 필요가 있다. 이때 방어적 복사는 객체가 자신의 상태를 소유하도록 참조 경계를 만든다.

마지막으로 불변성은 모든 객체에 기계적으로 적용하는 규칙이 아니다. 값이 바뀌지 않아야 하는 객체는 불변으로 설계하고, 상태 전이가 필요한 엔티티는 의미 있는 메서드로 변경 규칙을 제한한다.

이제 `final`을 붙이거나 `List`를 필드로 선언할 때 다음 질문을 먼저 떠올리려고 한다.

> 이 객체의 상태를 누가 소유하고 있으며, 외부에서 그 상태를 바꿀 수 있는 참조가 남아 있는가?

이 질문을 기준으로 보면 불변 객체 설계는 키워드 하나를 붙이는 일이 아니라, 객체와 참조의 경계를 설계하는 일이라는 점이 분명해진다.

<!-- HUMANIZE-SUMMARY
원본/윤문본 글자수: 12,376자 / 10,880자
변경률: 12.1% (학습 메모를 블로그 원고로 정리한 뒤 반복 표현·번역투·기계적인 종결을 의미 보존 범위에서 윤문)
탐지 건수: A-2 2→0, A-7 1→0, A-10 12→1, C-11 2→0, D-1 3→0, H-1 1→0, I-4 9→1, J-3 1→1
자체검증: 6/6 통과 — 기술 용어·수치·코드·인용·내부 링크·이미지 프롬프트 보존, 장르·문체 일관성, S1 잔존 없음
등급: A — S1 잔존이 없고 S2 패턴을 허용 범위로 줄였으며, 신입 백엔드 개발자의 학습 흐름과 기술 블로그 문체를 유지했습니다.
주요 변경 하이라이트:
1. `==`와 `equals()`의 차이를 결과 암기가 아니라 변수와 객체의 참조 관계에서 설명
2. String 연결을 객체 내부 수정이 아닌 새로운 결과 객체와 변수 재대입의 흐름으로 전환
3. `final` 참조, 불변 객체, 수정 불가 컬렉션의 보호 범위를 표로 분리
4. 컬렉션 참조 공유와 방어적 복사를 Mermaid·텍스트 구조로 대비
5. 불변성이 적합한 Value Object와 상태 전이가 필요한 엔티티를 구분
-->
