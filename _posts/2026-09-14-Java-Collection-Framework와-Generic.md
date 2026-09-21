---
title: "Java Collection과 Generic — 자료구조 선택과 타입 안전성은 어떻게 연결될까?"
date: 2026-09-14
categories: [TIL, Java, Spring]
tags: [Java, Collection Framework, Generic, List, Set, Map, PECS, OOP, TIL]
permalink: /posts/java-collection-framework-generic/
---

Java에서 여러 데이터를 다루려면 배열부터 떠올리게 된다. 하지만 애플리케이션의 데이터는 처음부터 개수가 정해져 있지 않고 저장한 뒤 어떤 방식으로 찾고 제거할지도 계속 달라진다. 배열만으로 이 요구를 모두 처리하려면 크기 관리와 탐색, 중복 검사 같은 기능까지 직접 작성하게 된다.

이번에는 [변수와 타입](/posts/java-variable-type/)에서 정리한 참조 타입, [Object 클래스와 객체 동등성](/posts/java-object-equals-hashcode/)에서 살펴본 `equals()`와 `hashCode()`, [String의 불변성과 객체 설계](/posts/java-string-immutability-design/)에서 이어진 불변성 개념을 Collection에 연결해 보았다. 단순히 `List`, `Set`, `Map`의 차이를 외우는 대신 다음 질문을 기준으로 정리했다.

> 이 데이터는 어떤 방식으로 저장하고 어떤 기준으로 찾아야 하는가?

Collection Framework는 데이터 구조를 고르는 기준을 보여 주고 Generic은 그 구조에 어떤 타입을 담을지 컴파일 시점에 정한다. 두 기능을 함께 보면 Java에서 데이터를 안전하게 관리하는 흐름이 보인다.

## 배열만으로 데이터를 관리하기 어려운 이유

배열은 여러 값을 저장하는 가장 단순한 방법이다. 다만 생성할 때 크기가 고정되고 중간에 값을 넣거나 삭제하는 기능은 기본으로 제공하지 않는다.

```java
String[] comments = new String[10];
```

댓글이 10개를 넘으면 더 큰 배열을 새로 만들고 기존 값을 옮기게 된다. 특정 값을 삭제한 뒤 빈 공간을 어떻게 처리할지도 직접 정한다. 데이터 개수가 바뀌는 상황에서 배열을 계속 관리하기에는 애플리케이션 코드가 자료구조의 세부 작업까지 떠안게 된다.

Collection Framework는 이 문제를 해결하기 위해 여러 자료구조와 공통 API를 제공한다. `add()`, `remove()`, `contains()`, 순회 같은 작업을 자료구조마다 비슷한 방식으로 다루며 실제 저장 방식은 구현체가 맡는다.

```java
List<String> comments = new ArrayList<>();
comments.add("첫 번째 댓글");
comments.add("두 번째 댓글");
```

여기서 중요한 점은 Collection이 단순히 크기가 변하는 배열이라는 사실이 아니다. **데이터를 저장하고 다루는 여러 구조를 공통된 인터페이스로 사용할 수 있게 만든 프레임워크**라는 점이다.

![Java Collection Framework의 주요 인터페이스와 구현체 구조](/assets/images/2026-09-14-collection-framework-generic/collection-framework.svg)

`List`와 `Set`은 `Collection`을 상속하지만 `Map`은 별도의 계층에 있다. `Map`은 값을 하나씩 저장하는 대신 `Key`와 `Value`의 관계를 관리하기 때문이다.

## List, Set, Map은 데이터 사용 방식으로 고른다

세 인터페이스의 차이를 저장 순서와 중복 여부만으로 외우면 실제 선택 상황에서 다시 막히기 쉽다. 먼저 데이터를 어떻게 사용할지 정하면 자료구조의 방향이 자연스럽게 좁혀진다.

### 순서와 위치가 필요하면 List

`List`는 저장 순서를 유지하고 중복을 허용한다. 인덱스로 특정 위치의 요소를 가져올 수도 있다.

```java
List<Comment> comments;
```

댓글 목록처럼 작성 순서가 의미 있고 같은 형태의 데이터가 여러 개 존재하며 순서대로 화면에 보여줘야 하는 데이터에는 `List`가 잘 맞는다.

### 같은 값의 중복을 막으면 Set

`Set`은 인덱스보다 어떤 값이 이미 들어 있는지가 중요할 때 사용한다.

```java
Set<Role> roles;
```

한 사용자에게 `USER` 권한이 여러 번 저장될 이유가 없다. 이런 데이터는 추가하기 전에 직접 중복을 검사하는 대신 `Set`에 맡기는 편이 의도를 코드에 남기기 쉽다.

### Key로 값을 찾으면 Map

`Map`은 다음과 같은 관계를 저장한다.

```text
Key → Value
```

회원 ID로 사용자를 반복 조회한다면 다음 구조가 자연스럽다.

```java
Map<Long, User> users;

User user = users.get(userId);
```

이때 중요한 것은 데이터의 순서가 아니라 `userId`라는 Key로 원하는 Value를 찾는 일이다. 순차 조회가 중심이면 `List`, 중복 제거가 중심이면 `Set`, Key 기반 조회가 중심이면 `Map`을 고려한다.

## ArrayList와 LinkedList의 차이는 저장 구조에서 나온다

`ArrayList`와 `LinkedList`를 “조회는 ArrayList, 삽입·삭제는 LinkedList”로만 기억하면 한 가지 조건이 빠진다. 삽입하거나 삭제할 위치를 찾는 비용까지 함께 확인한다.

### ArrayList는 배열 기반으로 인덱스 접근을 빠르게 한다

`ArrayList`는 내부 배열에 요소를 저장한다. 그래서 인덱스로 위치를 계산해 바로 접근한다.

```java
list.get(100);
```

반면 중간에 요소를 넣으면 뒤의 요소를 한 칸씩 옮겨야 한다.

```text
삽입 전  [A][B][C][D]

B 앞에 X 삽입

삽입 후  [A][X][B][C][D]
                 ← 요소 이동
```

### LinkedList는 노드의 연결 관계를 바꾼다

`LinkedList`는 각 노드가 앞뒤 노드와 연결되는 구조다. 삽입할 위치의 노드를 이미 알고 있다면 연결 관계만 바꾸면 되므로 요소 전체를 옮길 필요가 없다.

```text
[A] ↔ [B] ↔ [C] ↔ [D]
             ↑
        노드를 따라 탐색
```

하지만 `get(100)`처럼 특정 위치를 찾으려면 앞이나 뒤에서 노드를 따라가야 한다. 삽입 위치를 찾는 과정에서 이미 탐색 비용이 발생하면 연결만 바꾸는 장점이 전체 작업 시간으로 이어지지 않는다. 노드 객체와 연결 정보를 따로 관리하는 비용도 있다.

![ArrayList의 배열 기반 저장과 LinkedList의 노드 연결 구조 비교](/assets/images/2026-09-14-collection-framework-generic/arraylist-linkedlist.svg)

따라서 구현체 선택은 Big-O 하나를 보고 끝낼 문제가 아니다. 인덱스 조회와 순회가 많은 일반적인 백엔드 코드에서는 `ArrayList`가 기본 선택이 되는 경우가 많다. 중간 삽입·삭제가 정말 빈번하고 위치를 이미 알고 있는지, 또는 다른 자료구조가 더 적합한지를 사용 패턴과 함께 확인한다.

## Set의 중복 판단에는 equals()와 hashCode()가 함께 필요하다

`HashSet`이 중복을 허용하지 않는다는 말은 단순히 같은 값을 한 번만 저장한다는 뜻이다. 객체가 논리적으로 같은지 판단하는 규칙이 있어야 한다.

```java
User user1 = new User(1L, "woolam");
User user2 = new User(1L, "woolam");
```

두 객체가 같은 사용자를 나타낸다고 정했다면 `equals()`가 그 기준을 표현한다. `Object.equals()`의 기본 구현은 참조 동일성을 기준으로 비교하므로 별도로 만든 `user1`과 `user2`는 필드 값이 같아도 다른 객체로 판단될 수 있다.

해시 기반 자료구조에서는 `equals()`만 재정의해서는 부족하다. `HashSet`은 먼저 `hashCode()`를 이용해 확인할 범위를 좁힌 뒤 같은 범위에 후보가 있으면 `equals()`로 논리적 동등성을 확인한다.

```text
객체
 ↓
hashCode()
 ↓
해시 버킷 탐색
 ↓
equals()
 ↓
논리적으로 같은 객체인지 결정
```

![HashSet이 hashCode()와 equals()로 객체의 중복을 판단하는 흐름](/assets/images/2026-09-14-collection-framework-generic/hashset-equals-hashcode.svg)

따라서 다음 계약이 필요하다.

> `equals()`가 `true`인 두 객체는 반드시 같은 `hashCode()`를 반환해야 한다.

반대로 해시 코드가 같다고 항상 같은 객체인 것은 아니다. 서로 다른 객체가 같은 해시 코드를 가질 수 있기 때문에 최종 판단은 `equals()`가 맡는다.

이 규칙은 [Object 클래스와 객체 동등성](/posts/java-object-equals-hashcode/)에서 정리한 내용과 그대로 연결된다. `HashSet`의 원소나 `HashMap`의 Key로 사용할 객체라면 동등성 기준과 해시 코드도 함께 설계한다.

## Map의 Key를 바꾸면 저장된 값을 찾지 못하는 이유

`HashMap`도 해시 기반 자료구조이므로 Key의 동등성 기준이 중요하다. 여기에 객체의 상태가 변경 가능한지도 영향을 준다.

```java
Map<User, String> userMessages = new HashMap<>();
User user = new User(1L, "woolam");

userMessages.put(user, "hello");
user.changeName("new-name");

String message = userMessages.get(user);
```

만약 `hashCode()`가 `name`을 포함하고 `changeName()`이 Key의 이름을 바꾼다면 문제가 생긴다. 저장할 때 계산한 해시 코드와 조회할 때 계산한 해시 코드가 달라져 서로 다른 버킷을 탐색하기 때문이다.

```text
저장 시 name = "woolam"
        ↓
기존 hashCode() → Bucket A

Key의 name 변경
        ↓
새 hashCode() → Bucket B 탐색
```

실제 객체가 Map 안에 남아 있어도 `get()`이 `null`을 반환하거나 조회에 실패한다. 그래서 해시 기반 자료구조의 Key는 동등성 판단에 사용하는 상태를 바꾸지 않는 편이 안전하다. ID처럼 생성 후 바뀌지 않는 값을 기준으로 삼거나, Key 자체를 불변 객체로 설계하는 방법을 우선 검토한다.

## Generic이 없으면 오류가 실행 중에 드러난다

Collection의 구조를 골랐다면 그 안에 어떤 타입을 저장할지도 정한다. Generic을 사용하지 않는 Raw Type은 여러 타입을 하나의 컬렉션에 넣도록 허용한다.

```java
List list = new ArrayList();

list.add("hello");
list.add(100);
```

꺼낼 때 원하는 타입으로 직접 변환하는데 실제 값의 타입을 잘못 가정하면 문제가 실행 중에 발생한다.

```java
String value = (String) list.get(1);
```

두 번째 요소는 `Integer`이므로 이 코드는 `ClassCastException`을 일으킨다. 잘못된 타입이 컬렉션에 들어간 순간에는 알기 어렵고 값을 꺼내는 실행 경로에 도달했을 때 오류가 드러난다.

## Generic은 타입을 컴파일 시점에 제한한다

같은 코드를 여러 타입에 재사용하면서도 저장할 타입을 제한하려면 Generic을 사용한다.

```java
List<String> list = new ArrayList<>();

list.add("hello");
list.add(100); // 컴파일 오류
```

이제 `list`에는 `String`만 저장된다. 값을 꺼낼 때도 컴파일러가 이미 타입을 알고 있으므로 별도의 캐스팅이 필요하지 않다.

```java
String value = list.get(0);
```

Generic은 단순히 Collection 문법을 짧게 쓰는 기능이 아니다. **공통 로직을 재사용하면서 잘못된 타입 사용을 컴파일 시점에 차단하는 장치**다.

이 특성은 Collection 밖에서도 유용하다. 예를 들어 공통 응답 구조를 다음처럼 정의한다.

```java
public class ApiResponse<T> {

    private T data;
}
```

공통 구조는 재사용하면서 실제 데이터 타입만 달라진다.

```java
ApiResponse<User>
ApiResponse<Order>
ApiResponse<List<Restaurant>>
```

Spring/JPA에서도 공통 Repository나 응답 객체에서 이런 설계가 확인된다. 다만 모든 API 응답을 하나의 Generic 구조에 억지로 넣는다는 뜻은 아니다. 특정 API만의 의미 있는 필드와 상태가 필요하다면 별도의 응답 DTO가 더 읽기 좋고 안전하다.

## `? extends T`는 읽을 타입을 안전하게 보장한다

Wildcard는 Generic 타입의 범위를 유연하게 표현할 때 사용한다.

```java
List<? extends Animal> animals;
```

이 변수에 실제로 어떤 List가 들어 있는지는 선언만 보고 확정할 수 없다.

```text
List<Dog>
List<Cat>
List<Animal>
```

만약 실제 객체가 `List<Dog>`인데 다음 코드를 허용하면 문제가 생긴다.

```java
animals.add(new Cat());    // 허용되지 않음
animals.add(new Animal()); // 허용되지 않음
```

변수의 실제 List가 `Dog`만 받는데 `Cat`이나 `Animal`을 추가하면 타입 안전성이 깨지기 때문이다. 그래서 `null`을 제외한 일반 객체는 안전하게 추가하지 못한다.

대신 어떤 하위 타입이 들어 있더라도 그 값은 최소한 `Animal`로 읽는다.

```java
Animal animal = animals.get(0);
```

`? extends Animal`은 **Animal을 생산하는 컬렉션을 읽는 상황**에 적합하다. 그래서 `Producer Extends`라는 기준으로 설명한다.

## `? super T`는 T를 안전하게 넣는 이유

이번에는 반대 방향의 범위를 살펴본다.

```java
List<? super Dog> dogs;
```

실제 List는 다음 중 하나일 수 있다.

```text
List<Dog>
List<Animal>
List<Object>
```

어느 경우든 `Dog`는 해당 타입에 대입 가능하므로 안전하게 추가한다.

```java
dogs.add(new Dog());
```

반면 값을 꺼낼 때는 실제 List의 타입을 정확히 알 수 없다. `Dog`일 수도 있고 `Animal`이나 `Object`일 수도 있기 때문에 일반적으로 `Object`로 받아야 한다.

```java
Object value = dogs.get(0);
```

`? super Dog`는 **Dog를 소비하는 컬렉션에 값을 넣는 상황**에 적합하다. 이 관계를 줄여서 다음처럼 표현한다.

```text
Producer Extends
Consumer Super
```

![Generic Wildcard에서 extends와 super의 읽기·쓰기 방향을 비교한 PECS 다이어그램](/assets/images/2026-09-14-collection-framework-generic/generic-wildcards-pecs.svg)

PECS는 암기 문구로만 남기기보다 “컴파일러가 실제 타입을 어디까지 확정하는가?”라는 질문으로 이해하는 편이 낫다. `extends`에서는 읽을 값의 상한을 알고 `super`에서는 넣을 값의 하한을 보장한다.

## 실제 코드에서는 무엇을 기준으로 선택할까

자료구조와 Generic을 함께 쓰면 선언만으로도 데이터의 사용 의도가 드러난다.

```java
List<Comment> comments;
Set<Role> roles;
Map<Long, User> users;
```

댓글은 작성 순서를 유지하며 순차 조회하므로 `List`를 선택한다. 구현체는 조회와 순회가 많은 경우 `ArrayList`를 먼저 고려한다.

권한은 같은 값이 중복될 필요가 없으므로 `Set`을 사용한다. 이때 `Role`을 해시 기반 컬렉션에 넣는다면 `equals()`와 `hashCode()`의 기준도 함께 확인한다.

회원은 ID로 반복 조회하므로 `Map<Long, User>`가 자연스럽다. Key로 사용하는 `Long`은 불변 값 타입이며 직접 만든 객체를 Key로 쓴다면 조회 기준이 되는 상태가 저장 뒤 바뀌지 않는지 살펴본다.

결국 자료구조는 익숙한 구현체를 고르는 문제가 아니다. 다음 질문이 선택의 출발점이 된다.

```text
순서를 유지해야 하는가?
중복을 허용해야 하는가?
Key로 값을 찾는가?
인덱스 조회와 순회가 많은가?
삽입·삭제 위치를 이미 알고 있는가?
```

Generic을 붙일 때도 같은 방식으로 생각한다.

```text
이 타입의 값을 읽는가?
이 타입의 값을 넣는가?
공통 구조와 로직을 재사용할 필요가 있는가?
```

## 오늘 학습하면서 달라진 관점

처음에는 `List`, `Set`, `Map`을 순서와 중복 여부로만 구분했다. `ArrayList`와 `LinkedList`도 조회와 삽입의 속도 차이로 외우려고 했다.

하지만 자료구조 이름보다 먼저 볼 것은 데이터의 사용 방식이었다. 댓글처럼 순서대로 읽는 데이터와 ID로 바로 찾는 데이터는 저장 목적부터 다르다. 중복을 제거할 데이터라면 `Set`을 선택하는 것 자체가 도메인 규칙을 코드에 표현한다.

`HashSet`과 `HashMap`을 공부하면서 [Object의 동등성](/posts/java-object-equals-hashcode/)과 [불변 객체](/posts/java-string-immutability-design/)도 다시 연결됐다. 해시 기반 컬렉션은 `equals()`와 `hashCode()`의 계약을 전제로 동작하며 Key의 상태가 바뀌면 저장 위치와 조회 위치가 달라질 수 있다. 자료구조를 선택하는 일은 인터페이스 이름 하나를 고르는 데서 끝나지 않고 그 안에 들어갈 객체의 동등성과 변경 가능성까지 살피는 일이다.

Generic도 `<T>` 문법을 추가하는 일 이상의 의미가 있었다. Raw Type에서는 잘못된 타입이 실행 중에야 드러나지만 Generic은 그 실수를 컴파일 시점에 발견하게 만든다. `extends`와 `super` 역시 외우는 문장보다 읽기와 쓰기 중 어느 쪽의 타입을 보장해야 하는지로 접근해야 이해가 오래 남는다.

앞으로 Collection을 선택할 때는 먼저 저장 순서, 중복, Key 조회 여부와 실제 작업 비율을 확인하려고 한다. Generic을 설계할 때는 타입을 읽는지 넣는지, 공통 구조를 재사용할 이유가 있는지를 함께 살핀다.

> 자료구조는 데이터를 어떻게 사용할지 결정하고 Generic은 그 구조에 어떤 타입을 허용할지 결정한다.

이 둘을 한 흐름으로 보면 Java의 Collection은 단순한 저장 공간이 아니다. 데이터의 사용 방식과 타입 규칙을 코드에 함께 남기는 설계 도구다.
