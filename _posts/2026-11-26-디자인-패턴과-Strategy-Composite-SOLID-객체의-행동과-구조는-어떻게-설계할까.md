---
title: "Strategy와 Composite, SOLID — 객체의 행동과 구조는 어떻게 설계할까?"
date: 2026-11-26
categories: [TIL, Java, Spring]
tags: [Java, Design Pattern, Strategy, Composite, SOLID, Spring, OOP, TIL]
permalink: /posts/design-pattern-strategy-composite-solid/
---

어제는 Template Method, Factory Method, Observer를 공부하며 실행 흐름과 객체 생성, 상태 변경에 따른 후속 작업의 책임을 나눠 보았다. 그 전에는 Adapter로 서로 다른 인터페이스를 연결하고 Singleton으로 객체의 생성 범위를 제한하는 방법을 정리했다.

오늘은 같은 역할을 수행하지만 내부 동작이 다른 객체를 어떻게 분리할지 Strategy Pattern으로 살펴봤다. 이어서 파일과 폴더처럼 개별 객체와 여러 객체로 구성된 계층을 같은 방식으로 다루는 Composite Pattern을 공부했다. 마지막으로 지금까지 본 패턴을 객체의 책임과 의존 관계라는 기준에서 다시 연결하기 위해 SOLID를 정리했다.

세 주제는 서로 다른 내용을 따로 외우는 데서 끝나지 않았다. 변경되는 행동은 어떻게 분리할지, 부분과 전체를 같은 계약으로 다룰 수 있는지, 그 구조가 정말 필요한지 판단하는 흐름으로 이어졌다.

## 1. Strategy Pattern

### 할인 정책이 서비스 안의 조건문으로 모일 때

상품 가격을 계산하는 서비스에 할인 정책이 하나만 있다면 다음과 같이 간단한 조건문으로 처리한다.

```java
if (isEventMember) {
    return price * 80 / 100;
}

return price;
```

이 코드는 그 자체로 잘못된 구현이 아니다. 정책이 적고 변경 가능성이 낮으며 조건이 짧다면 오히려 읽기 쉽다. 문제는 정책이 계속 늘어나고 각각의 규칙을 따로 테스트하거나 변경해야 할 때 생긴다.

- 새로운 정책이 추가될 때 기존 서비스도 수정해야 한다.
- 할인 정책과 가격 계산의 공통 흐름이 한 객체에 섞인다.
- 정책별 테스트를 작성하려면 서비스의 다른 책임도 함께 살펴봐야 한다.
- 분기가 늘수록 하나의 변경이 영향을 주는 범위가 커진다.

Strategy Pattern은 달라지는 알고리즘이나 정책을 별도의 객체로 분리하고 공통 인터페이스로 사용하도록 하는 행위 패턴이다. 할인 정책을 선택하는 책임과 선택된 정책을 실행하는 책임도 구분한다.

### 구성 요소와 책임

할인 예제의 구성 요소를 나누면 다음과 같다.

| 구성 요소 | 할인 예제 | 책임 |
| --- | --- | --- |
| Strategy | `DiscountPolicy` | 교체 가능한 할인 계산의 공통 계약 |
| Concrete Strategy | `NoDiscountPolicy`, `PercentageDiscountPolicy` | 정책별 실제 계산 |
| Context | `PriceCalculator` | 전략을 보관하고 가격 계산을 위임 |
| Client | 객체를 조립하는 코드 | 사용할 전략을 선택하고 Context에 전달 |

Context는 할인율을 직접 계산하지 않는다. 생성자에서 전달받은 `DiscountPolicy`에 계산을 위임한다. 반대로 어떤 정책을 사용할지 결정하는 책임까지 Context가 자동으로 가지는 것은 아니다. Client나 별도의 선택 코드가 전략을 고르고 Context를 조립한다.

### Java로 할인 정책 분리하기

이 예제에서 `discount()`는 할인 금액이 아니라 할인 적용 후의 최종 결제 금액을 반환한다. 따라서 10,000원에 20% 할인을 적용하면 반환값은 8,000원이다.

```java
public interface DiscountPolicy {
    int discount(int price);
}
```

```java
public class NoDiscountPolicy implements DiscountPolicy {

    @Override
    public int discount(int price) {
        return price;
    }
}
```

```java
public class PercentageDiscountPolicy implements DiscountPolicy {

    @Override
    public int discount(int price) {
        return price * 80 / 100;
    }
}
```

```java
public class PriceCalculator {

    private final DiscountPolicy discountPolicy;

    public PriceCalculator(DiscountPolicy discountPolicy) {
        this.discountPolicy = discountPolicy;
    }

    public int calculate(int price) {
        return discountPolicy.discount(price);
    }
}
```

실행하는 쪽에서는 다음과 같이 전략을 선택하고 Context에 전달한다.

```java
DiscountPolicy noDiscount = new NoDiscountPolicy();
PriceCalculator normalCalculator = new PriceCalculator(noDiscount);

DiscountPolicy percentageDiscount = new PercentageDiscountPolicy();
PriceCalculator eventCalculator = new PriceCalculator(percentageDiscount);

System.out.println(normalCalculator.calculate(10_000)); // 10,000
System.out.println(eventCalculator.calculate(10_000));  // 8,000
```

`PriceCalculator`는 `DiscountPolicy` 인터페이스 타입으로 구현체를 참조한다. `calculate()`가 실행되면 `discountPolicy.discount(price)`를 호출하고 실제 참조 객체에 따라 `NoDiscountPolicy` 또는 `PercentageDiscountPolicy`의 메서드가 동적 바인딩으로 실행된다.

여기서 `PriceCalculator`가 전략 객체를 필드로 보관하는 관계는 Composition이다. Context가 정책 클래스를 상속받아 동작을 바꾸는 것이 아니라 필요한 전략을 구성 요소로 가지고 위임한다. 새로운 할인 정책을 추가해도 기존 `PriceCalculator`의 계산 흐름은 그대로 유지한다.

다만 `final` 필드를 직접 바꿔 정책을 교체하는 흐름은 아니다. 다른 정책으로 계산하려면 그 정책을 전달받은 새로운 `PriceCalculator`를 만들거나, 요청마다 전략을 선택해 사용할 별도의 조립 구조가 필요하다. 전략을 만드는 책임과 선택하는 책임은 Context의 계산 책임과 분리되어 있다.

```text
NoDiscountPolicy          → 10,000원 반환
PercentageDiscountPolicy  →  8,000원 반환
```

{% include interactive/design-pattern-visualization.html kind='strategy' %}

*그림 1. Client가 선택한 전략을 새로운 `PriceCalculator`에 전달하고 Context가 동일한 `DiscountPolicy` 계약으로 서로 다른 결과를 받는 흐름을 확인한다.*

### Template Method와 Strategy의 차이

어제 공부한 Template Method도 달라지는 동작을 분리하지만 분리하는 방식이 Strategy와 다르다.

| 구분 | Template Method | Strategy |
| --- | --- | --- |
| 구조 | 상속 | 객체 조합 |
| 변경 대상 | 실행 흐름의 일부 단계 | 정책 또는 알고리즘 |
| 행동 결정 | 하위 클래스의 구현 | 전달된 전략 객체 |
| 주요 목적 | 공통 실행 흐름 유지 | 행동의 분리와 교체 |

Template Method는 상위 클래스가 실행 순서를 정의하고 하위 클래스가 일부 단계를 구현한다. Strategy는 별도의 객체로 행동을 분리한 뒤 Context가 그 객체에 위임한다.

어느 한 패턴이 항상 더 좋은 것은 아니다. 전체 실행 순서가 고정되어 있고 하위 클래스가 일부 단계만 바꾸면 Template Method가 자연스럽다. 정책을 실행 중에 조합하거나 객체 단위로 바꿔야 한다면 Strategy가 더 적절하다. 상속 계층과 객체 조합 중 무엇이 현재 변경 지점을 더 분명하게 만드는지 비교해야 한다.

### Spring Backend와 연결하기

Spring의 생성자 주입을 사용하면 서비스가 전략 인터페이스에 의존하도록 구성한다.

```java
@Service
public class PriceCalculator {

    private final DiscountPolicy discountPolicy;

    public PriceCalculator(DiscountPolicy discountPolicy) {
        this.discountPolicy = discountPolicy;
    }

    public int calculate(int price) {
        return discountPolicy.discount(price);
    }
}
```

여기서 세 개념은 구분해야 한다.

- Strategy Pattern은 달라지는 행동을 객체로 분리하고 Context가 선택된 전략에 위임하는 설계 방식이다.
- DI는 객체에 필요한 의존성을 외부에서 전달하는 방식이다.
- IoC는 객체 생성과 의존 관계 설정 같은 제어 책임을 외부로 이전하는 개념이다.

Spring DI를 사용한다고 자동으로 Strategy Pattern이 적용되는 것은 아니다. 서비스에 구현체 하나를 주입하는 것만으로는 교체 가능한 정책을 분리했다는 목적이 충분히 드러나지 않을 수 있다. 여러 구현체 중 어떤 전략을 사용할지 결정하는 책임도 별도로 존재한다.

반대로 Spring 없이도 생성자에 구현체를 전달해 DI를 적용한다. 중요한 것은 프레임워크의 어노테이션보다 정책의 변경과 선택, 계산의 책임이 실제로 분리되어 있는지다.

## 2. Composite Pattern

### 파일과 폴더를 다르게 처리해야 할 때

파일 시스템에는 파일과 폴더가 있다. 파일은 자신의 크기가 바로 정해져 있지만 폴더는 내부 파일과 하위 폴더의 크기를 합산해야 한다. 폴더 안에 또 다른 폴더가 들어갈 수 있다는 점이 핵심이다.

```text
Root
├── a.txt (100)
└── Documents
    ├── b.txt (200)
    └── c.txt (300)
```

Client가 매번 객체가 파일인지 폴더인지 확인하면 계층을 탐색하는 코드와 타입 검사가 반복된다. Composite Pattern은 개별 객체와 여러 객체를 포함하는 복합 객체가 공통 계약을 제공하도록 해, Client가 둘을 같은 방식으로 다룰 수 있게 하는 구조 패턴이다.

### 구성 요소와 책임

| 구성 요소 | 파일 시스템 예제 | 책임 |
| --- | --- | --- |
| Component | `Component` | 파일과 폴더가 함께 제공하는 공통 계약 |
| Leaf | `File` | 하위 객체 없이 자신의 값을 반환 |
| Composite | `Folder` | 여러 `Component`를 보관하고 연산을 위임 |
| Client | 크기를 조회하는 코드 | `Component` 타입으로 기능 호출 |

Leaf와 Composite는 같은 인터페이스를 구현하지만 내부 동작은 다르다. `Folder`의 자식은 `File`만이 아니라 또 다른 `Folder`도 될 수 있다. 그래서 자식 목록의 타입은 `List<Component>`로 선언한다.

### Java로 파일 크기 합산하기

```java
public interface Component {
    long getSize();
}
```

```java
public class File implements Component {

    private final long size;

    public File(long size) {
        this.size = size;
    }

    @Override
    public long getSize() {
        return size;
    }
}
```

```java
import java.util.ArrayList;
import java.util.List;

public class Folder implements Component {

    private final List<Component> children = new ArrayList<>();

    public void add(Component component) {
        children.add(component);
    }

    @Override
    public long getSize() {
        long total = 0;

        for (Component child : children) {
            total += child.getSize();
        }

        return total;
    }
}
```

예제의 계층은 다음처럼 조립한다.

```java
Folder root = new Folder();
root.add(new File(100));

Folder documents = new Folder();
documents.add(new File(200));
documents.add(new File(300));
root.add(documents);

System.out.println(root.getSize()); // 600
```

`root`와 `documents` 모두 `Folder`이지만 Client는 둘을 `Component` 계약으로 호출한다. 실행 흐름은 다음과 같다.

1. Client가 `Root.getSize()`를 호출한다.
2. Root가 자식 `Component`를 순회한다.
3. `a.txt`의 `getSize()`가 자신의 크기 100을 반환한다.
4. `Documents.getSize()`가 자신의 자식들을 순회한다.
5. `b.txt`와 `c.txt`가 각각 200과 300을 반환한다.
6. Documents가 합계 500을 반환한다.
7. Root가 최종 합계 600을 반환한다.

{% include interactive/design-pattern-visualization.html kind='composite' %}

*그림 2. `List<Component>`를 순회하면서 Leaf는 자신의 값을 반환하고 Composite는 하위 객체에 같은 연산을 위임하는 과정을 확인한다.*

### 다형성과 재귀 위임

`children`의 타입이 `List<Component>`인 이유는 파일과 폴더를 하나의 공통 계약으로 저장하기 위해서다. Client나 `Folder`는 자식이 실제로 `File`인지 `Folder`인지 직접 검사하지 않는다. `child.getSize()`를 호출하면 실제 참조 객체에 따라 알맞은 구현이 실행된다.

- Leaf는 자신의 값을 반환한다.
- Composite는 자식 객체에 동일한 연산을 위임하고 결과를 합산한다.
- 상위 Composite는 하위 Composite의 결과를 다시 자신의 합계에 반영한다.

이때 재귀 알고리즘 자체가 Composite Pattern인 것은 아니다. Composite Pattern은 객체의 계층 구조와 공통 계약을 정의하는 설계 방식이다. 그 구조에서 계층을 끝까지 내려가며 연산하기 위해 재귀 위임을 사용한다.

각 `getSize()` 호출에는 자신의 지역 변수 `total`이 있다. `Documents`가 아직 500을 반환하지 않았다면 Root의 `total`에 500을 미리 더할 수 없다. 하위 호출이 끝난 뒤 반환된 값이 상위 호출의 누적합에 반영된다.

### 자식 관리 메서드는 어디에 둘까

`add()`와 `remove()`를 공통 `Component`에 둘지, `Composite`에만 둘지는 설계 선택이다.

공통 `Component`에 선언하면 Client가 파일과 폴더를 동일한 인터페이스로 관리한다. 하지만 Leaf에도 자식 관리 메서드가 노출된다. Leaf에서 호출을 지원하지 않는다면 예외를 던지거나 아무 동작도 하지 않게 해야 하므로 공통 계약이 모호해질 수 있다.

반대로 `Composite`에만 선언하면 하위 객체를 가질 수 있는 객체에만 관리 기능을 제공한다. 지원하지 않는 연산을 타입 수준에서 제한하기 쉽지만 Client가 자식 관리 시 Leaf와 Composite를 구분해야 할 수 있다.

| 방식 | 장점 | trade-off |
| --- | --- | --- |
| `Component`에 `add/remove` 선언 | 모든 객체를 같은 인터페이스로 다루기 쉬움 | Leaf에 불필요한 연산이 노출될 수 있음 |
| `Composite`에만 선언 | 자식 관리가 필요한 타입에만 기능 제공 | 관리할 때 Composite 여부를 구분해야 할 수 있음 |

모든 객체가 실제로 자식 관리 계약을 제공할 수 있는지, Client의 편의성과 타입 안전성 중 어느 쪽이 더 중요한지에 따라 선택한다. 이 판단은 뒤에서 다룰 ISP와 LSP에도 연결된다.

### 백엔드 개발과 연결하기

상품 카테고리와 하위 카테고리, 메뉴와 하위 메뉴, 파일 및 폴더 구조처럼 계층이 계속 확장되고 공통 연산이 필요할 때 Composite를 검토한다. 상위와 하위 객체를 같은 조회 계약으로 다루면 Client의 분기와 계층 탐색 코드를 줄인다.

다만 모든 계층형 데이터에 Composite를 적용할 필요는 없다. 단순 조회나 데이터 전달만 필요하다면 일반적인 계층형 객체나 DTO가 더 간결하다. 패턴을 적용했을 때 얻는 다형성과 연산 위임의 이점이 클래스와 호출 흐름의 복잡도보다 큰지 먼저 확인해야 한다.

## 3. SOLID

### 패턴을 판단하는 기준

앞에서 본 디자인 패턴이 객체의 생성, 구성, 행동을 나누는 구체적인 설계 방법이었다면 SOLID는 객체의 책임과 의존 관계를 검토하는 원칙이다. 디자인 패턴의 이름을 붙였는지보다 변경이 발생했을 때 영향 범위를 줄였는지, 객체가 맡은 책임과 제공하는 계약이 명확한지를 판단하게 해 준다.

SOLID를 인터페이스를 많이 만드는 방법이나 클래스를 무조건 작게 나누는 규칙으로 이해하면 안 된다. 현재 코드에서 어떤 변경이 반복되는지, 어떤 의존이 문제를 만드는지, 분리했을 때 추가되는 조립 비용이 감당할 만한지를 함께 봐야 한다.

### SRP — Single Responsibility Principle

단일 책임 원칙에서 말하는 책임은 메서드 하나가 아니라 하나의 모듈이 변경되는 이유다. 주문 처리와 알림 발송처럼 서로 다른 변경 이유를 가진 기능이 하나의 객체에 모이면, 알림 방식의 변경이 주문 처리 객체의 수정과 테스트에 영향을 줄 수 있다.

```text
개선 전: OrderService = 주문 처리 + 알림 발송
개선 후: OrderService = 주문 흐름 조율
         NotificationSender = 알림 발송
```

그렇다고 모든 메서드를 각각의 클래스로 분리해야 하는 것은 아니다. 주문 검증에 속한 여러 규칙처럼 같은 정책과 같은 변경 이유를 공유하는 기능은 한 객체에 함께 둘 수 있다. SRP의 핵심은 클래스의 크기가 아니라 변경 이유를 명확하게 유지하는 데 있다.

### OCP — Open-Closed Principle

개방-폐쇄 원칙은 확장에는 열려 있고 수정에는 닫혀 있어야 한다는 의미다. 앞서 만든 `DiscountPolicy`를 이용하면 새로운 할인 정책을 구현체로 추가하면서 `PriceCalculator`의 계산 흐름은 유지한다.

```java
public class EventDiscountPolicy implements DiscountPolicy {

    @Override
    public int discount(int price) {
        return price * 70 / 100;
    }
}
```

새 구현체를 추가하는 확장과, 어떤 전략을 생성하고 선택할지 결정하는 부분의 변경은 구분해야 한다. 정책 선택 코드나 등록 설정까지 항상 수정하지 않아도 된다는 뜻은 아니다. OCP는 모든 소스 코드의 수정을 금지하는 원칙이 아니라 변경의 영향을 필요한 범위로 제한하려는 원칙이다.

### LSP — Liskov Substitution Principle

리스코프 치환 원칙은 상위 타입을 사용하는 코드가 하위 타입으로 대체되어도 기대하는 행동 계약이 유지되어야 한다는 뜻이다. 동일한 인터페이스를 구현하거나 컴파일에 성공한다는 사실만으로 LSP를 만족하지는 않는다.

예를 들어 `DiscountPolicy`의 계약이 유효한 가격에 대해 최종 결제 금액을 반환하는 것이라면 모든 구현체가 그 의미를 지켜야 한다. 어떤 구현체만 입력을 다르게 해석하거나, 정상적으로 지원해야 하는 연산에서 예외를 던지면 상위 타입을 사용하던 Client의 기대가 깨질 수 있다.

Composite에서도 같은 기준을 적용한다. `Component`가 모든 구현체에서 `getSize()`를 호출한다는 계약을 제공한다면 Leaf와 Composite는 그 계약을 지켜야 한다. `add()`를 공통 Component에 선언해 놓고 Leaf가 항상 지원 불가 예외를 던지도록 한다면 그 연산이 정말 공통 계약인지 다시 검토해야 한다. 예외를 던진다는 사실만으로 항상 LSP 위반이라고 단정할 수는 없고 공통 계약이 무엇을 약속했는지가 판단 기준이다.

### ISP — Interface Segregation Principle

인터페이스 분리 원칙은 Client나 구현체가 사용하지 않는 기능에 의존하도록 강제하지 않는 것이다. SMS만 발송하는 객체에 이메일과 Push 기능까지 구현하게 만들 필요는 없다.

```java
public interface SmsSender {
    void sendSms(String message);
}
```

SMS 발송만 담당하는 객체는 `SmsSender`에만 의존한다. Composite에서 자식 관리 기능을 `Component` 전체에 제공할지 `Composite`에만 제공할지 고민한 것도 같은 문제다. Leaf가 사용하지 않는 `add()`와 `remove()`를 공통 계약에 넣으면 불필요한 연산이 노출될 수 있다.

하지만 모든 메서드를 별도의 인터페이스로 나누는 것이 ISP는 아니다. 실제 Client가 함께 사용하는 기능과 변경 이유를 기준으로 계약을 나눠야 하며 인터페이스 수가 지나치게 늘어나는 비용도 고려해야 한다.

### DIP — Dependency Inversion Principle

의존 역전 원칙은 고수준 정책과 저수준 구현이 구체 클래스가 아니라 적절한 추상화에 의존하도록 구성하는 원칙이다. 주문 서비스가 특정 결제 SDK 구현체를 직접 알면 결제 기술의 변경이 주문 정책까지 번질 수 있다.

```java
public interface PaymentGateway {
    void pay(int amount);
}
```

```java
public class OrderService {

    private final PaymentGateway paymentGateway;

    public OrderService(PaymentGateway paymentGateway) {
        this.paymentGateway = paymentGateway;
    }

    public void pay(int amount) {
        paymentGateway.pay(amount);
    }
}
```

서비스가 `KakaoPayment` 같은 구체 구현체 대신 `PaymentGateway`를 바라보면 소스 코드의 의존 방향을 추상화 쪽으로 둘 수 있다. 실제 실행 시에는 생성자로 전달된 구현체의 `pay()`가 호출된다. 외부 SDK의 응답 형식을 `PaymentGateway`의 반환 타입에 그대로 노출하면 인터페이스가 다시 구현 세부사항에 묶일 수 있으므로, 애플리케이션이 이해하는 계약으로 변환하는 책임도 함께 살펴야 한다.

DIP, DI, IoC는 다음처럼 구분한다.

| 개념 | 핵심 질문 | 의미 |
| --- | --- | --- |
| DIP | 무엇에 의존하는가? | 고수준 정책과 저수준 구현의 의존 방향에 관한 설계 원칙 |
| DI | 의존 객체를 어떻게 전달받는가? | 생성자나 메서드 등으로 의존성을 외부에서 전달하는 방식 |
| IoC | 누가 제어권을 갖는가? | 객체 생성과 연결 등 제어 책임을 외부로 이전하는 개념 |

구체 클래스도 생성자로 주입받으므로 DI 자체가 DIP를 보장하지는 않는다. 반대로 Spring Container 없이도 생성자 주입은 가능하다. 적절한 추상화와 생성자 주입을 사용하면 테스트에서 `PaymentGateway`의 가짜 구현체를 전달해 실제 외부 시스템 없이 서비스 로직을 검증한다.

{% include interactive/design-pattern-visualization.html kind='solid' %}

*그림 3. SRP, OCP, LSP, ISP, DIP를 선택하며 문제 상황과 개선 방향, 적용에 따른 trade-off를 구조로 비교한다. DIP에서는 소스 코드의 의존 방향과 런타임 호출 대상을 구분한다.*

### SOLID와 디자인 패턴의 관계

SOLID와 디자인 패턴은 모두 요구사항과 변경 가능성에 따라 사용하는 설계 도구다. 어떤 패턴을 사용했다고 원칙을 자동으로 만족하는 것은 아니다.

| 패턴 | 연결해 볼 수 있는 원칙 | 판단할 내용 |
| --- | --- | --- |
| Strategy | OCP, DIP, LSP | 정책을 분리하고 구현체가 공통 계약을 지키는지 확인 |
| Composite | OCP, LSP, ISP | 공통 Component 계약과 자식 관리 기능의 범위를 확인 |
| Adapter | DIP, OCP | 외부 인터페이스와 내부 계약 사이의 결합을 완화하는지 확인 |
| Factory Method | SRP, OCP | 객체 생성과 사용 책임을 나누고 생성 확장을 격리하는지 확인 |
| Template Method | OCP, LSP | 공통 실행 흐름을 유지하면서 하위 타입의 계약을 지키는지 확인 |
| Observer | OCP, DIP | 상태 변경 객체와 후속 반응 객체의 결합을 줄이는지 확인 |

Strategy가 OCP에 도움을 주더라도 전략 선택 코드까지 자동으로 확장되는 것은 아니다. Composite가 공통 계약을 제공해도 Leaf가 제공하지 못하는 기능을 무리하게 Component에 넣으면 ISP와 LSP 문제가 생길 수 있다. Adapter를 만들었다고 외부 응답 형식이 애플리케이션 계약에서 완전히 분리되는 것도 아니다. 실제 의존 관계와 변경 지점을 확인해야 한다.

## 4. 오늘 학습한 내용 정리

Strategy로 같은 역할을 수행하는 객체라도 내부 행동을 별도의 전략으로 분리한다는 점을 이해했다. `PriceCalculator`는 `DiscountPolicy`의 공통 계약에 의존하고 `NoDiscountPolicy`와 `PercentageDiscountPolicy`가 각자의 계산을 수행한다. 전략을 선택하는 책임과 사용하는 책임은 다르며 Spring DI를 사용한다고 Strategy Pattern이 자동으로 적용되는 것은 아니다.

Composite로 개별 객체와 복합 객체가 동일한 `Component` 계약을 제공하면서 각자의 방식으로 연산을 수행한다는 점을 확인했다. Leaf는 자신의 값을 반환하고 Composite는 자식에게 연산을 위임한다. 이때 재귀 호출보다 먼저 봐야 할 것은 계층 구조와 공통 계약이며 자식 관리 메서드의 위치는 편의성과 타입 안전성 사이에서 선택해야 한다.

SOLID를 공부하면서 디자인 패턴을 선택하는 것보다 객체가 어떤 책임을 가지고 무엇에 의존하며 어떤 계약을 제공하는지 판단하는 일이 중요하다는 점을 정리했다.

- 변경되는 행동은 실제 변경 가능성이 있을 때 분리한다.
- 공통 계약은 실제 객체가 제공할 수 있는 행동을 기준으로 설계한다.
- 추상화는 변경을 격리하는 데 필요한 범위에서 사용한다.
- 디자인 패턴 적용 여부와 SOLID 준수 여부는 별개의 판단이다.
- 요구사항이 단순하고 안정적이라면 간단한 구현을 유지한다.

설계 원칙을 많이 적용하는 것이 목표는 아니다. 현재 코드에서 어떤 변경이 반복되고 어떤 의존이 문제를 만드는지 확인한 뒤 분리로 얻는 이점과 늘어나는 복잡도를 비교해야 한다.

### 관련 글

- [디자인 패턴과 Adapter, Singleton — 객체의 연결과 생성은 어떻게 관리할까?](/posts/design-pattern-adapter-singleton/) — 서로 다른 인터페이스를 연결하는 Adapter와 인스턴스 생성 범위를 앞서 정리했다.
- [디자인 패턴과 Template Method, Factory Method, Observer — 실행 흐름과 객체 생성, 상태 변경의 책임은 어떻게 나눌까?](/posts/design-pattern-template-factory-observer/) — 상속 기반 실행 흐름, 객체 생성, 상태 변경에 따른 알림의 책임을 정리했다.

### 참고 자료

- [Strategy Pattern 학습 기록](https://app.notion.com/p/3e2a108cd60281e3ab50ebaa80a81bf4) — 할인 정책을 Strategy로 분리하고 Context의 위임, 전략 선택 책임, Composition과 Spring DI의 차이를 확인했다.
- [Composite Pattern 학습 기록](https://app.notion.com/p/3e2a108cd6028112b51cd9d158a1b7fc) — 파일·폴더 계층의 공통 계약, 재귀적 연산 위임, 자식 관리 방식의 trade-off를 확인했다.
- [SOLID 학습 기록](https://app.notion.com/p/3e2a108cd60281039ec2d6f9d637ffac) — 다섯 원칙의 판단 기준과 디자인 패턴·Backend 설계의 연결을 확인했다.
- [Gyoogle — Strategy Pattern](https://gyoogle.dev/blog/design-pattern/Strategy%20Pattern.html) — 행위를 별도 객체로 캡슐화하고 상속보다 조합을 사용하는 기본 구조를 확인했다.
- [Gyoogle — Composite Pattern](https://gyoogle.dev/blog/design-pattern/Composite%20Pattern.html) — Leaf와 Composite를 공통 Component로 다루는 계층 구조를 확인했다.
- [Gyoogle — Design Pattern Overview](https://gyoogle.dev/blog/design-pattern/Overview.html) — 디자인 패턴 개요와 SOLID 항목을 학습 범위와 연결해 확인했다.
- [Spring Framework — Dependency Injection](https://docs.spring.io/spring-framework/reference/7.0/core/beans/dependencies/factory-collaborators.html) — 생성자 주입과 의존성을 외부에서 전달하는 DI의 의미를 확인했다.
- [Spring Boot — Spring Beans and Dependency Injection](https://docs.spring.io/spring-boot/reference/using/spring-beans-and-dependency-injection.html) — Spring Bean의 생성자 주입과 추상 타입 의존 구성을 확인했다.
