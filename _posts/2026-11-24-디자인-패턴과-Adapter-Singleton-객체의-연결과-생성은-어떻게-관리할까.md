---
title: "디자인 패턴과 Adapter, Singleton — 객체의 연결과 생성은 어떻게 관리할까?"
date: 2026-11-24
categories: [TIL, Java, Spring]
tags: [Java, Design Pattern, Adapter, Singleton, Spring, OOP, TIL]
permalink: /posts/design-pattern-adapter-singleton/
---

알고리즘 학습 시리즈를 마치고 오늘부터 디자인 패턴을 공부하기 시작했다. 지금까지는 자료구조와 알고리즘을 중심으로 데이터를 저장하고 탐색하고 처리하는 방법을 살펴봤다. 오늘은 시선을 조금 바꿔 객체를 어떻게 만들고, 서로 다른 객체를 어떻게 연결하며, 공유 객체를 어디까지 하나로 관리할지 정리했다.

처음에는 디자인 패턴을 자주 쓰는 코드를 모아 둔 일종의 템플릿처럼 생각했다. 학습을 시작하고 보니 패턴은 특정 코드를 그대로 가져다 쓰는 라이브러리가 아니라 반복해서 나타나는 설계 문제에 대한 아이디어에 가깝다. 같은 패턴도 언어의 기능과 애플리케이션의 요구사항에 따라 다른 모습으로 구현될 수 있다.

오늘은 디자인 패턴의 큰 분류를 먼저 확인한 뒤, 서로 다른 인터페이스를 연결하는 Adapter와 인스턴스 생성을 제한하는 Singleton을 이어서 공부했다. 두 패턴을 외우기보다 어떤 문제를 해결하고 그 과정에서 어떤 복잡도를 추가하는지에 집중했다.

## 1. Design Pattern Overview

### 디자인 패턴이 필요한 이유

소프트웨어를 만들다 보면 비슷한 설계 문제가 반복해서 등장한다. 외부 라이브러리의 인터페이스가 현재 애플리케이션의 코드와 맞지 않을 수도 있고, 여러 곳에서 사용할 객체를 매번 새로 만들지 말아야 할 수도 있다. 한 번만 겪은 문제라면 그때그때 해결할 수 있지만, 비슷한 상황이 여러 프로젝트에서 반복되면 해결 방법을 설명하고 공유할 수 있는 이름이 필요해진다.

디자인 패턴은 이런 문제를 해결한 설계 아이디어를 정리한 것이다. 코드 조각이나 구현된 기능을 제공하는 라이브러리와는 다르다. 라이브러리는 이미 만들어진 기능을 호출해 사용하지만, 디자인 패턴은 객체의 책임과 관계를 어떻게 배치할지 결정하는 기준을 제공한다. 그래서 패턴을 적용할 때는 현재 언어와 요구사항에 맞게 구현을 바꿔야 한다.

패턴을 사용하면 설계 의도를 짧게 공유한다는 장점도 있다. “외부 SDK와 내부 인터페이스 사이에 Adapter를 둔다”라고 말하면 변환과 위임을 담당하는 객체를 별도로 둔다는 그림이 함께 떠오른다. 다만 이름을 붙였다고 설계가 자동으로 좋아지는 것은 아니다. 변경 가능성이 거의 없는 코드에 미리 추상화와 클래스를 늘리면 오히려 읽어야 할 코드가 많아진다.

### 세 가지 분류

GoF 디자인 패턴은 해결하려는 설계 문제를 기준으로 생성, 구조, 행위 패턴으로 나눌 수 있다.

| 분류 | 해결하려는 문제 | 오늘의 예 |
| --- | --- | --- |
| 생성 패턴 | 객체를 어떻게 생성하고 관리할 것인가 | Singleton |
| 구조 패턴 | 객체와 클래스를 어떻게 구성하고 연결할 것인가 | Adapter |
| 행위 패턴 | 객체의 책임과 상호작용을 어떻게 구성할 것인가 | 오늘은 구현하지 않음 |

생성 패턴은 객체 생성 과정을 다루고, 구조 패턴은 여러 객체를 조합해 원하는 관계를 만드는 데 초점을 둔다. 행위 패턴은 객체가 맡은 책임과 서로 메시지를 주고받는 방식을 다룬다. 분류는 패턴의 목적을 빠르게 파악하기 위한 기준이지, 모든 구현을 엄격하게 나누는 규칙은 아니다.

{% include interactive/design-pattern-visualization.html kind='overview' %}

*그림 1. 디자인 패턴의 세 가지 분류와 오늘 살펴본 Adapter, Singleton의 위치를 비교한다.*

### 패턴은 언제 적용할까

패턴을 알고 있다는 이유만으로 모든 코드에 적용할 필요는 없다. 변경 가능성이 거의 없고 테스트하기에도 충분한 코드라면 간단한 구현이 더 읽기 좋다. 반대로 외부 API가 바뀌거나 같은 생성 규칙이 반복되거나 여러 객체의 책임이 계속 섞이는 문제가 보이면 그때 패턴을 검토한다.

이 판단은 YAGNI와도 연결된다. 아직 필요하지 않은 추상화를 미리 만들면 미래의 변경을 대비하는 대신 현재 코드에 간접 호출과 클래스를 추가하게 된다. 패턴을 적용했을 때 얻는 변경 격리와 재사용성, 늘어나는 클래스 수와 호출 단계를 함께 비교해야 한다.

SOLID와의 차이도 구분할 필요가 있다. SOLID는 객체지향 설계에서 지키면 좋은 원칙이고, 디자인 패턴은 반복되는 설계 문제에 대응하는 구체적인 방식이다. Adapter를 만들었다고 해서 자동으로 SOLID를 준수하는 것은 아니며, Singleton을 사용했다고 유지보수성이 보장되는 것도 아니다. 원칙과 패턴 모두 현재 코드의 문제를 설명하고 판단하는 도구로 사용해야 한다.

## 2. Adapter Pattern

### 서로 다른 인터페이스를 연결하는 객체

애플리케이션이 기대하는 결제 인터페이스와 외부 결제 SDK의 인터페이스가 다르다고 하자. 애플리케이션은 `pay(PaymentRequest)`를 호출하고 싶은데 외부 SDK는 `charge(ExternalChargeRequest)`를 제공한다. 요청 객체의 필드 이름과 금액 타입, 응답 형식도 서로 다르다.

서비스가 외부 SDK의 메서드를 직접 호출하면 처음에는 빠르게 연결된다. 하지만 SDK의 메서드 이름이나 요청 DTO가 바뀔 때마다 결제 서비스를 함께 수정해야 한다. 외부 시스템에 대한 의존성이 서비스 곳곳으로 퍼지는 구조다.

Adapter는 이 사이에서 인터페이스를 맞춰 주는 객체다. Client는 애플리케이션이 익숙한 Target 인터페이스만 알고, Adapter가 내부 요청을 Adaptee가 이해하는 형식으로 바꾼다. 실제 처리는 Adaptee에 위임하고, 반환된 외부 응답을 다시 Client가 사용하는 형식으로 변환한다.

구성 요소를 나누면 다음과 같다.

- Client: 기능을 사용하는 객체
- Target: Client가 기대하는 인터페이스
- Adaptee: 기능은 제공하지만 인터페이스가 다른 객체
- Adapter: Target을 구현하고 Adaptee에 변환과 처리를 위임하는 객체

Target은 실행 중에 독립적으로 요청을 처리하는 객체가 아니라 Client가 의존하는 계약이다. Adapter도 결제 비즈니스 로직 전체를 대신하는 객체는 아니다. 서로 다른 인터페이스를 연결하고 요청과 응답을 변환하는 책임이 핵심이다.

### Java로 결제 Adapter 만들기

다음 코드는 외부 결제 SDK의 실제 이름이 아니라 인터페이스 변환을 보여 주기 위한 예제다.

```java
public interface Payment {

    PaymentResult pay(PaymentRequest request);
}

public record PaymentRequest(String orderId, int amount) {
}

public record PaymentResult(boolean approved, String transactionId) {
}

public record ExternalChargeRequest(String orderNumber, long amountInWon) {
}

public record ExternalChargeResponse(boolean success, String approvalCode) {
}

public final class ExternalPaymentSdk {

    public ExternalChargeResponse charge(ExternalChargeRequest request) {
        return new ExternalChargeResponse(true, "approved-" + request.orderNumber());
    }
}

public final class PaymentAdapter implements Payment {

    private final ExternalPaymentSdk sdk;

    public PaymentAdapter(ExternalPaymentSdk sdk) {
        this.sdk = sdk;
    }

    @Override
    public PaymentResult pay(PaymentRequest request) {
        ExternalChargeRequest externalRequest =
                new ExternalChargeRequest(request.orderId(), request.amount());

        ExternalChargeResponse response = sdk.charge(externalRequest);

        return new PaymentResult(response.success(), response.approvalCode());
    }
}
```

실행 흐름은 Client가 `Payment`의 `pay()`를 호출하면서 시작한다. `PaymentAdapter`는 `PaymentRequest`의 `orderId`와 `amount`를 외부 SDK가 요구하는 `orderNumber`와 `amountInWon`으로 옮긴다. SDK가 반환한 `ExternalChargeResponse`의 `success`와 `approvalCode`는 다시 `PaymentResult`의 `approved`와 `transactionId`로 바뀐다.

즉, 호출 흐름은 다음 순서다.

```text
Client
  → Payment.pay(request)
  → PaymentAdapter가 외부 요청으로 변환
  → ExternalPaymentSdk.charge(externalRequest)
  → 외부 응답을 PaymentResult로 변환
  → Client가 내부 결과를 받음
```

{% include interactive/design-pattern-visualization.html kind='adapter' %}

*그림 2. Adapter가 Client의 요청을 외부 SDK 형식으로 바꾸고, 응답을 다시 내부 형식으로 돌려주는 과정을 단계별로 확인한다.*

### Object Adapter와 Class Adapter

위 예제는 `ExternalPaymentSdk` 객체를 `PaymentAdapter`의 필드로 보유하는 Object Adapter다. Composition으로 연결하고 생성자에서 외부 객체를 주입하므로 다른 구현체로 교체하거나 테스트용 대역 객체를 넣기 쉽다.

Class Adapter는 상속으로 Adaptee의 기능을 가져온다. 일반적인 모양은 Adapter가 Target을 구현하면서 Adaptee도 상속하는 방식이다. Java는 클래스를 여러 개 상속할 수 없으므로 실제 코드는 인터페이스 구현과 하나의 클래스 상속을 조합해야 한다. 이 방식은 상속 구조와 Adaptee의 구현 방식에 더 강하게 묶인다.

특히 Adaptee가 `final` 클래스라면 상속할 수 없다.

```java
public final class ExternalPaymentSdk {
    // 외부 SDK가 제공하는 구현
}
```

이때 `ExternalPaymentSdk`를 상속하는 Class Adapter는 만들 수 없으므로 Object Adapter처럼 필드로 보유해 연결한다. `final`이 붙었다고 객체의 모든 내부 상태가 불변이 되는 것은 아니다. 여기서 중요한 의미는 해당 클래스의 상속을 막는다는 점이다.

### 외부 API가 바뀌면 어디를 고칠까

외부 결제 API가 응답 필드 `approvalCode`를 `transactionKey`로 바꾼다고 하자. 외부 응답을 읽어 `PaymentResult`로 바꾸는 코드를 Adapter와 변환 DTO 안에 모아 두었다면 Client가 사용하는 `Payment` 계약을 그대로 유지한다. 변경 범위가 서비스 전체로 번지는 일을 줄이는 것이다.

다만 Adapter가 모든 변경을 막아 주는 것은 아니다. 외부 서비스의 기능이나 의미가 바뀌어 애플리케이션의 결제 정책도 달라져야 한다면 Client와 비즈니스 로직을 함께 수정해야 한다. Adapter가 제공하는 것은 인터페이스와 형식의 분리이지, 외부 시스템의 의미 변화까지 숨기는 방패는 아니다.

### 백엔드에서 만나는 Adapter

외부 API나 SDK 연동에서는 내부 Port 또는 서비스 인터페이스와 외부 호출 코드를 분리할 때 Adapter를 활용한다. Spring에서는 생성자 주입으로 `Payment` 구현체를 연결하므로 Adapter 객체를 테스트와 운영 환경에 맞게 바꿔 끼우기 쉽다.

Spring MVC의 `HandlerAdapter`도 서로 다른 Handler 실행 방식을 공통 처리 흐름에서 다룰 수 있게 해 준다. 다만 프레임워크 구성 요소의 이름이 같다고 해서 오늘 작성한 `PaymentAdapter`와 완전히 같은 구현이라고 단정할 수는 없다. Hexagonal Architecture의 Port와 Adapter 역시 외부 세계와 애플리케이션의 경계를 나누는 구조라는 점은 닮았지만, GoF Adapter Pattern과 용어의 범위가 완전히 일치하지는 않는다.

## 3. Singleton Pattern

### 인스턴스 생성을 하나로 제한한다

Singleton은 특정 범위에서 클래스의 인스턴스 생성을 하나로 제한하고 공통 접근점을 제공하는 생성 패턴이다. 여러 곳에서 같은 설정 객체나 공유 객체를 사용해야 할 때 매번 새로운 인스턴스를 만들지 않도록 생성과 접근을 관리한다.

여기서 “static 변수가 있다”와 “인스턴스 생성을 제한한다”는 같은 말이 아니다. static 필드에 인스턴스를 저장해도 생성자가 외부에 열려 있으면 다른 코드가 `new`로 객체를 추가로 만들 수 있다.

### 기본 구현

가장 단순한 Eager Initialization 방식은 클래스 초기화 과정에서 인스턴스를 만든다.

```java
public class AppConfig {

    private static final AppConfig INSTANCE = new AppConfig();

    private AppConfig() {
    }

    public static AppConfig getInstance() {
        return INSTANCE;
    }
}
```

각 요소의 역할은 다음과 같다.

- `private` 생성자: 외부에서 일반적인 `new AppConfig()` 호출을 막는다.
- `static` 필드: 클래스 수준에서 인스턴스 참조를 관리한다.
- `final` 필드: `INSTANCE`가 다른 객체로 재할당되지 않게 한다.
- `getInstance()`: 모든 호출자가 같은 참조를 얻는 접근점을 제공한다.

`static final INSTANCE`가 있어도 생성자가 `public`이면 다음 코드는 다른 인스턴스를 만들 수 있다.

```java
public AppConfig() {
}

AppConfig another = new AppConfig();
```

따라서 생성자 접근 제한이 인스턴스 생성을 막는 핵심이다. 동일한 인스턴스인지 확인할 때는 `equals()`가 아니라 참조 동일성을 비교하는 `==`를 사용한다.

```java
AppConfig first = AppConfig.getInstance();
AppConfig second = AppConfig.getInstance();

System.out.println(first == second); // true
```

이 방식은 구현이 간단하고 클래스 초기화 시점에 생성되므로 초기화 과정의 스레드 안전성도 JVM에 맡길 수 있다. 대신 실제로 사용하지 않더라도 클래스가 초기화될 때 객체가 만들어진다.

### Eager Initialization과 Lazy Initialization

Eager Initialization은 클래스 초기화 과정에서 객체를 만든다. 생성 시점이 명확하고 구현이 짧지만 필요 없는 경우에도 객체가 만들어진다. Lazy Initialization은 첫 `getInstance()` 호출이 들어왔을 때 객체를 만든다. 사용 시점까지 생성을 미룰 수 있지만 동기화 없이 작성하면 멀티스레드 환경에서 문제가 생긴다.

클래스가 로드되는 시점과 초기화되는 시점도 같은 개념으로 섞으면 안 된다. Java Language Specification은 클래스와 인터페이스의 초기화가 필요한 시점, 초기화 순서와 동기화 절차를 별도로 다룬다. Holder Idiom을 이해하려면 이 차이를 먼저 구분해야 했다.

### Lazy Initialization에서 Race Condition이 생기는 이유

다음 코드는 겉보기에는 첫 호출 때만 객체를 만드는 것처럼 보인다.

```java
private static AppConfig instance;

public static AppConfig getInstance() {
    if (instance == null) {
        instance = new AppConfig();
    }
    return instance;
}
```

하지만 `null` 확인과 객체 생성은 하나의 원자적 연산이 아니다. 가능한 실행 순서 중 하나는 다음과 같다.

1. `instance`가 `null`인 상태에서 Thread A가 확인한다.
2. Thread B도 `instance`가 `null`인지 확인한다.
3. Thread A가 객체 #1을 생성하고 참조를 할당한다.
4. Thread A가 객체 #1을 반환한다.
5. Thread B가 이미 객체가 생겼는지 다시 확인하지 않고 객체 #2를 생성한다.
6. Thread B가 객체 #2를 반환한다.

모든 실행에서 반드시 중복 생성이 일어나는 것은 아니다. 두 스레드가 처음 `null` 확인을 겹쳐 수행하면 서로 다른 객체가 만들어지는 실행 순서가 나온다. 동기화의 핵심은 확인과 생성 사이를 여러 스레드가 동시에 통과하지 못하게 하는 데 있다.

{% include interactive/design-pattern-visualization.html kind='singleton' %}

*그림 3. 동기화 없는 Lazy Initialization, `synchronized`, Double-Checked Locking에서 가능한 실행 순서를 비교한다. `count++`의 유실도 함께 확인한다.*

### 여섯 가지 구현 방식

오늘은 다음 여섯 가지 구현을 비교했다.

| 방식 | 생성 시점 | 생성 안전성 | 특징 |
| --- | --- | --- | --- |
| Eager Initialization | 클래스 초기화 과정 | 안전 | 단순하지만 사용하지 않아도 생성 |
| Lazy Initialization | 첫 접근 시점 | 동기화 필요 | 필요한 시점까지 생성 지연 |
| `synchronized` Lazy | 첫 접근 시점 | 메서드 모니터로 보호 | 구현이 단순하지만 매 호출마다 동기화 진입 |
| Double-Checked Locking | 첫 접근 시점 | `volatile`과 두 번의 확인 | 생성 후 바깥 확인으로 락 진입 감소 |
| Initialization-on-demand Holder Idiom | `getInstance()`가 Holder를 처음 사용한 시점 | JVM 클래스 초기화에 의존 | 명시적 락 없이 지연 초기화 |
| Enum Singleton | Enum 클래스 초기화 과정 | Enum 초기화 규칙 활용 | 구현이 짧고 직렬화·반사 공격 대응을 함께 고려하기 쉬움 |

`synchronized` 메서드는 같은 모니터를 사용하는 임계 구역을 보호한다. 한 스레드가 인스턴스 생성 여부를 확인하고 생성하는 동안 다른 스레드는 모니터를 얻을 때까지 기다린다. 생성이 끝난 뒤에도 메서드에 들어올 때마다 동기화를 수행한다.

Double-Checked Locking은 동기화 블록 바깥에서 먼저 `null`을 확인하고, 블록 안에서 다시 확인한다.

```java
private static volatile AppConfig instance;

public static AppConfig getInstance() {
    if (instance == null) {
        synchronized (AppConfig.class) {
            if (instance == null) {
                instance = new AppConfig();
            }
        }
    }
    return instance;
}
```

두 번째 `null` 확인은 대기하던 다른 스레드가 이미 인스턴스를 만들었을 가능성을 확인하기 위한 것이다. `volatile`은 쓰인 참조가 다른 스레드에 안전하게 공개되고 최신 값을 읽을 수 있게 하는 데 필요하다. `volatile` 하나가 모든 연산을 원자적으로 만드는 것은 아니다.

Holder Idiom은 내부 정적 클래스의 초기화 시점을 이용한다.

```java
public class AppConfig {

    private AppConfig() {
    }

    private static class Holder {
        private static final AppConfig INSTANCE = new AppConfig();
    }

    public static AppConfig getInstance() {
        return Holder.INSTANCE;
    }
}
```

`Holder`가 `getInstance()`에서 처음 사용될 때 내부 `INSTANCE`가 초기화된다. 클래스 초기화 과정에서 JVM이 제공하는 동기화 보장을 활용하므로 개발자가 직접 락을 조합하는 코드를 줄일 수 있다.

### 인스턴스 생성 안전성과 내부 상태 안전성

Singleton을 안전하게 생성하는 것과 Singleton 내부의 가변 상태를 안전하게 사용하는 것은 다른 문제다. Enum이나 `synchronized`로 인스턴스가 하나만 만들어져도 내부 필드에 여러 Thread가 동시에 접근하면 경쟁이 생길 수 있다.

```java
public enum Counter {
    INSTANCE;

    private int count = 0;

    public void increment() {
        count++;
    }
}
```

`count++`는 값을 읽고, 1을 더하고, 결과를 쓰는 여러 동작의 조합이다. Thread A와 B가 모두 `0`을 읽은 뒤 각각 `1`을 쓰면 두 번 증가했는데 최종 값은 `1`이 될 수 있다. 인스턴스가 하나라는 사실은 두 Thread가 같은 객체를 바라본다는 뜻이지, 그 객체의 모든 메서드가 자동으로 직렬화된다는 뜻이 아니다.

공유 상태 문제를 줄이는 방법은 상황에 따라 달라진다. 가변 상태를 없애거나, 증가 구간을 `synchronized`로 보호하거나, 카운터처럼 단순한 값에는 `AtomicInteger`를 선택한다. 오늘의 핵심은 특정 도구를 외우는 데 있지 않고 인스턴스 생성 안전성과 내부 상태의 동시성 안전성을 분리해 보는 데 있다.

## 4. Java Singleton과 Spring Singleton Bean

이름은 같지만 두 Singleton의 생성 책임과 범위는 다르다.

| 구분 | 일반 Java Singleton | Spring Singleton Bean |
| --- | --- | --- |
| 생성 책임 | 클래스가 생성자를 막고 직접 관리 | IoC Container가 생성과 생명주기를 관리 |
| 접근 방식 | `getInstance()` 같은 static 접근점 | 생성자 주입이나 Container 조회 |
| 기본 범위 | 보통 ClassLoader 범위에서 하나를 의도 | Container와 Bean 정의마다 하나 |
| 의존성 연결 | 클래스가 직접 관리하기 쉬움 | Container가 생성자에 주입 |
| 주의할 점 | 전역 접근과 강한 결합 | 공유 Bean의 가변 상태와 Container 범위 |

Spring 문서에서 설명하는 singleton scope는 “특정 클래스 전체에서 무조건 하나”라는 의미가 아니다. 하나의 Spring IoC Container에서 하나의 Bean 정의가 가리키는 객체를 하나만 만들고, 같은 Bean 정의를 조회할 때 그 객체를 돌려준다는 의미다. Spring Singleton은 Container별, Bean 정의별 범위로 이해해야 한다.

따라서 다음 상황은 서로 다르다.

1. 같은 ApplicationContext에서 같은 Bean 정의를 여러 번 조회하면 같은 인스턴스를 받는다.
2. 같은 ApplicationContext에 같은 클래스의 Bean 정의를 두 개 등록하면 각각 인스턴스가 생길 수 있다.
3. 서로 다른 ApplicationContext라면 각각의 Container가 인스턴스를 관리한다.
4. 서로 다른 JVM이나 서버에서 실행하면 각 환경에 인스턴스가 존재한다.

Bean 이름의 별칭은 같은 Bean 정의를 가리키므로 별도 인스턴스를 만드는 상황과 다르다. 반대로 같은 클래스에 서로 다른 Bean 정의를 만들면 클래스가 같아도 관리되는 객체는 달라질 수 있다.

{% include interactive/design-pattern-visualization.html kind='spring' %}

*그림 4. Spring Singleton Bean이 ApplicationContext와 Bean 정의를 기준으로 어느 범위에서 공유되는지 선택해 확인한다.*

이 차이 때문에 Spring Service 객체를 만들기 위해 직접 GoF Singleton을 구현하기보다 Container 관리와 생성자 주입을 사용하는 경우가 많다. 객체 생성과 의존성 연결을 Container에 맡기면 테스트에서 다른 구현체를 주입할 수 있고, static 접근점에 대한 결합도 줄어든다.

### Spring Singleton Bean의 공유 상태

Singleton Bean이라고 해서 요청이 한 번에 하나씩 처리되는 것은 아니다. 여러 요청이 같은 Service Bean의 메서드를 동시에 실행할 수 있다.

```text
Request A ─┐
           ├→ 같은 Service Bean
Request B ─┘
```

사용자별 값이나 요청별 임시 데이터를 Singleton Service의 인스턴스 필드에 저장하면 서로 다른 요청이 같은 필드를 덮어쓸 수 있다. 요청에서 계산한 값은 메서드 지역 변수로 두고, Bean은 가능한 한 상태를 갖지 않는 방향이 기본적인 출발점이다. 그렇다고 지역 변수면 항상 안전하다고 단정할 수도 없다. 지역 변수가 다른 Thread와 공유되는 가변 객체를 참조한다면 그 객체에 대한 경쟁은 여전히 남는다.

애플리케이션을 여러 서버나 JVM으로 실행하면 각 환경에 Singleton 인스턴스가 생긴다. Java Singleton이나 Spring Singleton Bean만으로 서버 전체의 공유 상태와 데이터 정합성을 보장할 수 없는 이유다. 분산 환경에서 필요한 동시성 제어는 별도의 저장소나 락 같은 경계를 기준으로 설계해야 하며, 오늘은 그 세부 구현까지 확장하지 않았다.

## 5. 오늘의 정리

디자인 패턴은 반드시 적용해야 하는 정답 목록이 아니라 특정 설계 문제에 대응하기 위한 방법이다. 패턴을 적용하기 전에 변경 가능성과 테스트 방식, 늘어나는 복잡도를 함께 확인해야 한다.

Adapter를 공부하면서 기존 객체를 수정하지 않고도 별도의 객체를 사이에 두어 인터페이스를 연결하는 방법을 이해했다. Object Adapter는 Composition으로 Adaptee를 보유하므로 구현체 교체와 테스트에 유리하다. 반대로 상속을 사용하는 Class Adapter는 Java의 단일 클래스 상속과 `final` 클래스 제약을 고려해야 한다.

Singleton에서는 인스턴스를 하나로 만드는 문제와 그 인스턴스를 여러 Thread가 안전하게 사용하는 문제가 서로 다르다는 점을 확인했다. `synchronized`, Double-Checked Locking, Holder Idiom, Enum은 생성 시점과 동기화 방식이 다르다. `count++`처럼 내부 가변 상태를 변경하는 연산은 Singleton이라는 이유만으로 안전해지지 않는다.

Spring Singleton Bean도 일반 Java Singleton과 범위가 다르다. Spring에서는 IoC Container와 Bean 정의를 기준으로 하나의 인스턴스를 관리하며, 여러 Context나 서버를 넘어서 하나의 객체가 되는 것은 아니다. 앞으로는 패턴 이름과 구현 코드를 외우는 것보다 “지금 어떤 설계 문제가 있고, 이 선택이 어떤 복잡도를 추가하는가?”를 먼저 질문하려고 한다.

### 관련 글

- [Java 추상 클래스와 인터페이스 — 무엇을 기준으로 선택할까](/posts/java-abstract-class-interface-selection/) — Target 인터페이스와 구현 객체의 관계를 다시 확인했다.
- [Java Thread와 동시성 — 공유 상태는 왜 문제가 되고 어떻게 제어할까?](/posts/java-thread-concurrency-shared-state/) — 공유 가변 상태와 `count++`의 경쟁 조건을 앞선 학습에서 이어서 살펴봤다.
- [Spring IoC와 DI — 객체를 누가 만들고 연결하는가](/posts/spring-ioc-di/) — 객체 생성과 의존성 연결을 Container에 맡기는 이유를 연결했다.
- [Spring Bean Lifecycle과 Scope — Annotation은 어떻게 동작할까](/posts/spring-bean-lifecycle-scope-annotation-reflection/) — Bean의 생명주기와 Scope를 다시 확인했다.
- [Spring MVC HTTP 요청 처리 흐름 — DispatcherServlet부터 Jackson까지](/posts/spring-mvc-http-request-flow/) — `HandlerAdapter`가 공통 흐름에서 핸들러 실행 방식을 연결하는 역할을 확인했다.

### 참고 자료

- [Gyoogle — Design Pattern Overview](https://gyoogle.dev/blog/design-pattern/Overview.html) — 디자인 패턴의 목적과 생성·구조·행위 분류를 확인했다.
- [Gyoogle — Adapter Pattern](https://gyoogle.dev/blog/design-pattern/Adapter%20Pattern.html) — 호환되지 않는 인터페이스를 Adapter로 연결하는 기본 구조를 확인했다.
- [Gyoogle — Singleton Pattern](https://gyoogle.dev/blog/design-pattern/Singleton%20Pattern.html) — Singleton의 생성자 제한과 Lazy, `synchronized`, Double-Checked Locking, Holder 구현을 비교했다.
- [Java Language Specification, Java SE 21 — Chapter 12. Execution](https://docs.oracle.com/javase/specs/jls/se21/html/jls-12.html) — 클래스 초기화 시점과 초기화 과정의 동기화를 확인했다.
- [Java Language Specification, Java SE 21 — Chapter 17. Threads and Locks](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html) — `synchronized`, `volatile`, happens-before와 공유 가변 상태의 동작을 확인했다.
- [Spring Framework — Bean Scopes](https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html) — Spring Singleton의 Container·Bean 정의별 관리 범위를 확인했다.
