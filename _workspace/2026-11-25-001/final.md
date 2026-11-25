---
title: "디자인 패턴과 Template Method, Factory Method, Observer — 실행 흐름과 객체 생성, 상태 변경의 책임은 어떻게 나눌까?"
date: 2026-11-25
categories: [TIL, Java, Spring]
tags: [Java, Design Pattern, Template Method, Factory Method, Observer, Spring, OOP, TIL]
permalink: /posts/design-pattern-template-factory-observer/
---

어제는 디자인 패턴의 큰 분류를 확인하고 Adapter와 Singleton을 공부했다. Adapter에서는 서로 다른 인터페이스를 연결하는 객체의 책임을 살펴봤고, Singleton에서는 인스턴스를 생성하고 관리하는 범위를 구분했다. 객체 사이의 연결과 생성 방식을 정리하고 나니 실행 순서와 상태 변경에 따른 후속 작업은 어떻게 나눌 수 있는지도 궁금해졌다.

오늘은 Template Method, Factory Method, Observer를 공부했다. 세 패턴은 모두 변경에 대응하기 위한 설계 방식이지만, 분리하는 대상이 다르다. Template Method는 실행 흐름과 세부 동작을 나누고, Factory Method는 객체 생성과 객체 사용을 나눈다. Observer는 상태를 바꾸는 객체와 그 변화에 반응하는 객체를 분리한다.

패턴 이름을 외우는 데서 끝내지 않고 각 객체가 무엇을 책임지는지, 실제 메서드가 어떤 순서로 호출되는지, 적용했을 때 어떤 복잡도가 추가되는지를 중심으로 정리했다.

## 1. Template Method Pattern

### 반복되는 실행 순서에서 생기는 문제

파일을 읽어 변환하는 처리와 API 응답을 읽어 변환하는 처리가 있다고 하자. 두 작업은 세부 구현은 다르지만 초기화, 데이터 읽기, 변환, 검증, 마무리라는 큰 순서는 비슷하다.

이 흐름을 각각의 클래스에서 직접 작성하면 다음 문제가 생긴다.

- 공통 처리 코드가 여러 클래스에 중복된다.
- 클래스마다 메서드를 호출하는 순서가 달라질 수 있다.
- 필수 단계 하나를 빼먹어도 컴파일 단계에서 발견하기 어렵다.
- 공통 순서를 바꿀 때 여러 클래스를 함께 수정해야 한다.

Template Method Pattern은 상위 클래스에서 전체 알고리즘의 뼈대를 정하고, 하위 클래스에서 달라지는 세부 동작을 구현하는 방식이다. 처리 순서는 상위 클래스가 관리하고, 구체적인 데이터 읽기나 변환 방법은 하위 클래스가 결정한다.

### AbstractProcessor의 Template Method

다음 예제는 세부 처리 대상에 따라 `load()`와 `transform()`이 달라지는 상황을 단순화한 코드다.

```java
abstract class AbstractProcessor {

    public final void process() {
        initialize();
        load();
        transform();
        if (shouldValidate()) {
            validate();
        }
        finish();
    }

    protected void initialize() {
        System.out.println("initialize");
    }

    protected abstract void load();

    protected abstract void transform();

    protected boolean shouldValidate() {
        return true;
    }

    protected void validate() {
        System.out.println("validate");
    }

    protected void finish() {
        System.out.println("finish");
    }
}
```

`process()`가 Template Method다. `final`을 붙였기 때문에 하위 클래스가 전체 실행 순서를 오버라이딩할 수 없다. 이때 `final`은 메서드 오버라이딩을 제한하는 키워드이지 동시성이나 데이터 정합성을 보장하는 기능은 아니다.

코드 안에는 세 종류의 메서드가 함께 있다.

- `load()`와 `transform()`은 하위 클래스가 반드시 구현해야 하는 Abstract Method다.
- `initialize()`, `validate()`, `finish()`는 상위 클래스가 공통 구현을 제공하는 Concrete Method다.
- `shouldValidate()`는 기본값을 제공하면서 하위 클래스가 선택적으로 오버라이딩할 수 있는 Hook Method다.

하위 클래스는 다음과 같이 자신에게 필요한 세부 동작만 구현한다.

```java
final class FileProcessor extends AbstractProcessor {

    @Override
    protected void load() {
        System.out.println("load file");
    }

    @Override
    protected void transform() {
        System.out.println("transform file");
    }
}

final class ApiProcessor extends AbstractProcessor {

    @Override
    protected void load() {
        System.out.println("load API response");
    }

    @Override
    protected void transform() {
        System.out.println("transform API response");
    }

    @Override
    protected boolean shouldValidate() {
        return false;
    }
}
```

`FileProcessor`는 기본 Hook 값인 `true`를 사용하므로 `validate()`가 실행된다. `ApiProcessor`는 `shouldValidate()`를 오버라이딩해 `false`를 반환하므로 검증 단계를 건너뛴다. 하지만 두 클래스 모두 `initialize()`와 `finish()`를 포함한 전체 순서는 바뀌지 않는다.

`AbstractProcessor` 타입의 참조로 `process()`를 호출해도 실제 객체가 `FileProcessor`라면 `load()`와 `transform()`은 `FileProcessor`의 구현이 실행된다. 상위 클래스의 메서드가 하위 클래스의 메서드를 호출할 수 있는 이유는 오버라이딩과 동적 바인딩 때문이다. 호출할 메서드의 선언은 상위 타입을 기준으로 확인하지만, 오버라이딩된 인스턴스 메서드의 실제 실행 대상은 런타임 객체 타입에 따라 결정된다.

```java
AbstractProcessor processor = new FileProcessor();
processor.process();
```

실행 결과는 다음과 같다.

```text
initialize
load file
transform file
validate
finish
```

실행 순서를 단계별로 나누면 Client가 선택한 하위 클래스의 `process()`를 호출하고, 상위 클래스의 Template Method가 공통 초기화를 실행한 뒤 하위 클래스의 세부 동작을 호출한다. 그 다음 Hook 결과에 따라 검증을 실행하고 공통 마무리까지 끝낸다.

{% include interactive/design-pattern-visualization.html kind='template' %}

*그림 1. 하위 클래스를 바꿔도 `AbstractProcessor.process()`가 관리하는 실행 순서는 유지되고 세부 동작만 달라지는 모습을 확인한다.*

### 상속과 합성 사이의 선택

Template Method는 공통 흐름을 한곳에서 관리하기 좋다. 필수 단계와 호출 순서를 상위 클래스에서 통제하므로 하위 클래스가 전체 알고리즘을 제각각 구현하는 문제도 줄어든다.

하지만 상위 클래스와 하위 클래스 사이의 결합도가 높아진다. 상위 클래스의 메서드 보호 수준이나 호출 순서를 바꾸면 여러 하위 클래스에 영향을 줄 수 있고, 상속 계층이 깊어질수록 실행 흐름을 추적하기 어려워진다.

전체 실행 흐름은 같고 일부 단계만 바뀌는 경우에는 Template Method가 잘 맞는다. 반대로 공유하는 기능만 일부 있고 각 기능의 실행 흐름이 서로 다르다면 상속보다 합성으로 전략 객체나 협력 객체를 주입하는 편이 나을 수 있다. 요구사항이 아직 단순하다면 패턴을 먼저 만들기보다 실제 중복과 변경 문제가 생겼을 때 리팩터링하는 것도 선택지다.

### Spring JdbcTemplate과의 관계

Spring의 `JdbcTemplate`은 이름 때문에 Template Method Pattern의 대표 사례처럼 보이지만, GoF Template Method와 완전히 같은 상속 구조는 아니다.

`JdbcTemplate`은 JDBC 자원을 획득하고 반환하며 SQL 실행과 예외 변환 같은 공통 처리를 담당한다. 호출자는 SQL이나 결과 매핑처럼 달라지는 부분을 콜백으로 전달한다. 즉 개발자가 `JdbcTemplate`을 상속한 하위 클래스를 만들어야 하는 것이 아니라, Template Callback 방식으로 필요한 동작을 합성해 전달한다.

상속 기반 Template Method와 콜백 기반 Template Callback은 공통 흐름과 변경되는 동작을 분리한다는 목적은 비슷하다. 다만 변경되는 동작을 하위 클래스의 오버라이딩으로 제공하는지, 콜백 객체나 람다로 전달하는지가 다르다.

## 2. Factory Method Pattern

### 객체 생성과 사용이 한곳에 섞일 때

알림을 보내는 코드가 이메일과 SMS 객체를 직접 생성한다고 하자.

```java
if (type.equals("email")) {
    new EmailNotification().notify(message);
} else if (type.equals("sms")) {
    new SmsNotification().notify(message);
}
```

처음에는 단순하지만 알림 유형이 추가될 때 객체 생성 정책과 알림을 사용하는 코드가 함께 바뀐다. 구체 클래스 이름과 `new` 호출이 여러 곳으로 퍼지면 생성 방식이 변경될 때 수정 범위도 커진다.

Factory Method Pattern은 객체를 사용하는 공통 흐름과 구체 객체를 생성하는 책임을 분리한다. Product 계층은 실제 기능을 제공하고, Creator 계층은 어떤 Product를 생성할지 결정하는 메서드와 Product를 사용하는 공통 흐름을 관리한다.

### Product와 Creator의 역할

알림 예제의 역할은 다음과 같이 나눌 수 있다.

| 역할 | 예제 클래스 | 책임 |
| --- | --- | --- |
| Product | `Notification` | 생성된 객체가 제공해야 할 기능의 계약 |
| ConcreteProduct | `EmailNotification`, `SmsNotification` | 알림 유형별 실제 기능 구현 |
| Creator | `NotificationCreator` | Factory Method와 Product 사용 흐름 정의 |
| ConcreteCreator | `EmailCreator`, `SmsCreator` | 생성할 ConcreteProduct 결정 및 생성 |

Product와 Creator는 서로 다른 계층이다. Creator가 Product를 상속하는 것이 아니며, Product가 자신의 Creator를 관리하는 구조도 아니다.

### Notification 예제

먼저 Product 계층을 정의한다.

```java
interface Notification {
    void notify(String message);
}

final class EmailNotification implements Notification {

    @Override
    public void notify(String message) {
        System.out.println("Email: " + message);
    }
}

final class SmsNotification implements Notification {

    @Override
    public void notify(String message) {
        System.out.println("SMS: " + message);
    }
}
```

다음은 Creator 계층이다.

```java
abstract class NotificationCreator {

    public final void send(String message) {
        Notification notification = createNotification();
        notification.notify(message);
    }

    protected abstract Notification createNotification();
}

final class EmailCreator extends NotificationCreator {

    @Override
    protected Notification createNotification() {
        return new EmailNotification();
    }
}

final class SmsCreator extends NotificationCreator {

    @Override
    protected Notification createNotification() {
        return new SmsNotification();
    }
}
```

`send()`는 Product를 생성하고 기능을 사용하는 공통 흐름을 정의한다. 어떤 구체 객체를 만들지는 `createNotification()`이라는 Factory Method에 맡긴다. `EmailCreator`와 `SmsCreator`는 이 메서드를 오버라이딩해 각자 생성할 Product를 결정한다.

클라이언트의 실행 흐름은 다음과 같다.

1. `EmailCreator` 또는 `SmsCreator` 같은 ConcreteCreator를 선택한다.
2. 선택한 Creator 인스턴스를 만든다.
3. Creator에 정의된 공통 메서드 `send()`를 호출한다.
4. 동적 바인딩으로 실제 Creator의 `createNotification()`이 실행된다.
5. `EmailNotification` 또는 `SmsNotification` 객체가 생성된다.
6. 생성된 객체가 `Notification` 타입으로 반환된다.
7. 공통 메서드가 `Notification` 인터페이스를 통해 알림 기능을 호출한다.

```java
NotificationCreator creator = new EmailCreator();
creator.send("hello");

creator = new SmsCreator();
creator.send("hello");
```

출력은 다음과 같다.

```text
Email: hello
SMS: hello
```

여기서 `creator`의 참조 타입은 `NotificationCreator`지만 실제 객체는 처음에는 `EmailCreator`다. 상위 클래스의 `send()`가 `createNotification()`을 호출하면 실제 Creator의 구현이 실행된다. 반환 변수의 타입이 `Notification`이라고 해서 실제 객체가 인터페이스 인스턴스로 바뀌는 것은 아니다. 실제 객체 타입은 `EmailNotification` 또는 `SmsNotification`으로 남고, 참조를 통해 접근하는 계약만 `Notification`으로 제한된다.

Factory Method를 사용해도 ConcreteCreator를 선택하는 책임까지 없어지는 것은 아니다. 어떤 알림 정책을 사용할지 결정하는 코드나 설정은 여전히 어딘가에 있어야 한다. 다만 그 선택 이후의 생성과 사용 흐름을 Creator 계층 안에 모아 새로운 유형을 추가할 때 기존 공통 로직의 변경을 줄일 수 있다.

{% include interactive/design-pattern-visualization.html kind='factory' %}

*그림 2. ConcreteCreator 선택, Factory Method 호출, ConcreteProduct 생성, Product 인터페이스를 통한 사용 흐름을 분리해 확인한다.*

### 비슷한 생성 방식과 비교

객체를 생성하는 메서드가 있다고 해서 모두 GoF Factory Method Pattern은 아니다.

| 방식 | 생성 책임의 위치 | 구체 객체 결정 | 상속·오버라이딩 | 유형 추가 시 특징 |
| --- | --- | --- | --- | --- |
| 직접 `new` | 사용하는 코드 | 사용하는 코드 | 사용하지 않음 | 사용 코드가 구체 클래스에 직접 의존 |
| Simple Factory | 하나의 Factory | 조건문이나 입력값 | 보통 사용하지 않음 | Factory 조건문이 변경될 수 있음 |
| Static Factory Method | 클래스의 정적 메서드 | 정적 메서드 내부 | 보통 사용하지 않음 | 생성 로직을 숨기지만 상속 기반 구조는 아님 |
| GoF Factory Method | Creator와 ConcreteCreator | ConcreteCreator의 오버라이딩 | 사용함 | Product·Creator 클래스가 늘어날 수 있음 |

Simple Factory와 Static Factory Method는 생성 로직을 별도의 메서드로 감싼다는 공통점이 있다. 하지만 하위 Creator가 Factory Method를 오버라이딩하고 상위 Creator의 공통 흐름에서 호출하는 구조까지 갖춰야 GoF Factory Method의 구조라고 볼 수 있다.

### Spring DI, BeanFactory, FactoryBean

Spring에는 객체 생성과 관련된 이름이 여러 곳에 등장하지만 각각의 역할을 구분해야 한다.

- Spring DI는 객체를 구성하고 필요한 의존성을 전달하는 방식이다.
- `BeanFactory`는 Bean 정의를 기준으로 객체를 관리하고 조회하는 컨테이너 계약이다.
- `FactoryBean`은 Spring 컨테이너 안에서 다른 객체를 생성해 노출하는 확장 지점이다.

Spring DI를 사용한다고 해서 GoF Factory Method를 반드시 함께 적용해야 하는 것은 아니다. Container가 객체의 구성과 의존성 연결을 관리하는 문제와, 하위 Creator가 생성할 Product를 결정하는 문제는 다르다. 생성 시점, 객체 선택 기준, 변경 가능성, 클래스 수와 추적 비용을 보고 필요한 구조를 선택해야 한다.

`FactoryBean`이라는 이름도 주의해야 한다. Spring의 `FactoryBean`은 컨테이너가 관리하는 객체 생성 확장 계약이며, `getObject()`가 노출할 객체를 반환한다. 이름에 Factory가 들어 있다는 이유만으로 GoF Factory Method와 같은 상속 구조라고 볼 수는 없다.

## 3. Observer Pattern

### 상태 변경과 후속 작업이 섞일 때

주문 상태가 바뀔 때 이메일과 SMS 알림을 보내야 한다고 하자. `OrderService`나 주문 객체가 `EmailNotifier`, `SmsNotifier`를 직접 호출하면 처음에는 흐름이 명확해 보인다.

```java
emailNotifier.send(status);
smsNotifier.send(status);
```

하지만 알림 유형이 추가될 때마다 상태를 관리하는 객체가 새로운 구현체를 알아야 한다. 상태 변경과 후속 작업이 같은 클래스에 모이면 의존성이 계속 늘어난다.

Observer Pattern은 상태를 관리하는 Subject와 상태 변경에 반응하는 Observer를 분리한다. Subject는 구체 관찰자 대신 Observer 인터페이스를 알고, 등록된 관찰자에게 상태 변경을 알린다.

Observer Pattern을 적용해도 메서드 호출 자체가 사라지는 것은 아니다. `OrderSubject`는 여전히 등록된 관찰자의 `update()`를 호출한다. 달라지는 점은 구체 구현체를 직접 호출하는 대신 Observer 계약을 통해 호출한다는 것이다.

### 객체별 책임

이번 예제에서는 다음과 같이 역할을 나눈다.

- Subject: 관찰자 등록·해제·알림에 대한 계약을 제공한다.
- ConcreteSubject: 실제 상태와 관찰자 목록을 관리하고 상태 변경 시 알림을 실행한다.
- Observer: 상태 변경 정보를 받는 `update()` 메서드 계약을 제공한다.
- ConcreteObserver: 알림을 받은 뒤 이메일이나 SMS 같은 실제 후속 작업을 수행한다.

학습하면서 특히 두 부분을 구분해야 했다. 상태와 관찰자 목록을 관리하는 책임은 ConcreteSubject인 `OrderSubject`에 있고, 관찰자 등록을 해제한 뒤에는 해당 객체가 사라지는 것이 아니라 이후 알림 대상에서만 제외된다.

### OrderSubject 구현

```java
interface Subject {
    void register(Observer observer);

    void unregister(Observer observer);

    void notifyObservers();
}

interface Observer {
    void update(String status);
}

final class OrderSubject implements Subject {
    private final List<Observer> observers = new ArrayList<>();
    private String status = "CREATED";

    @Override
    public void register(Observer observer) {
        observers.add(observer);
    }

    @Override
    public void unregister(Observer observer) {
        observers.remove(observer);
    }

    @Override
    public void notifyObservers() {
        for (Observer observer : List.copyOf(observers)) {
            observer.update(status);
        }
    }

    public void setStatus(String status) {
        this.status = status;
        notifyObservers();
    }
}
```

`List<Observer>`에는 `EmailObserver`와 `SmsObserver`처럼 서로 다른 구현체를 저장할 수 있다. 두 클래스가 모두 `Observer`를 구현하기 때문이다. `notifyObservers()`에서 `Observer` 타입으로 `update()`를 호출해도 실제 구현체의 메서드가 실행되는 이유는 다형성과 동적 바인딩에 있다.

구체 관찰자는 자신이 처리할 후속 작업만 구현한다.

```java
final class EmailObserver implements Observer {

    @Override
    public void update(String status) {
        System.out.println("Email: " + status);
    }
}

final class SmsObserver implements Observer {

    @Override
    public void update(String status) {
        System.out.println("SMS: " + status);
    }
}
```

실행 순서는 다음과 같다.

```java
OrderSubject order = new OrderSubject();
EmailObserver emailObserver = new EmailObserver();
SmsObserver smsObserver = new SmsObserver();

order.register(emailObserver);
order.register(smsObserver);
order.setStatus("PAID");
order.unregister(smsObserver);
order.setStatus("CANCELLED");
```

첫 번째 `setStatus("PAID")`에서는 두 관찰자가 모두 목록에 있으므로 다음과 같이 출력된다.

```text
Email: PAID
SMS: PAID
```

그 다음 `unregister(smsObserver)`가 실행되면 `SmsObserver` 객체가 메모리에서 삭제되는 것이 아니라 `observers` 목록에서 해당 참조가 제거된다. 이후 `setStatus("CANCELLED")`가 호출되면 현재 목록을 순회하는 대상은 `EmailObserver`뿐이다.

```text
Email: CANCELLED
```

이 흐름에서 등록 해제는 과거에 실행된 `PAID` 알림을 취소하지 않는다. 이미 완료된 작업은 그대로 남고, 등록 해제 이후 발생하는 상태 변경부터 알림 대상에서 빠진다.

{% include interactive/design-pattern-visualization.html kind='observer' %}

*그림 3. 관찰자 목록을 기준으로 `PAID`와 `CANCELLED` 알림 대상이 달라지는 과정을 확인한다.*

### Spring Application Event와의 연결

Spring `ApplicationContext`는 `ApplicationEventPublisher`를 통해 이벤트를 발행하고, `ApplicationListener` 또는 `@EventListener`를 사용하는 리스너에게 전달할 수 있다. 상태를 발행하는 객체와 이벤트에 반응하는 리스너를 분리한다는 점에서 Observer Pattern과 연결해 볼 수 있다.

다만 Spring Application Event가 곧 모든 Observer 구현과 같은 것은 아니다. Spring은 애플리케이션 컨텍스트 내부에서 이벤트를 전달하는 인프라를 제공하고, 리스너 등록과 타입 매칭 같은 컨테이너 기능도 함께 담당한다.

기본 이벤트 처리는 동기 방식이다. 발행 메서드가 리스너의 처리가 끝날 때까지 기다리는 흐름이며, `@Async`나 별도의 멀티캐스터 설정을 사용하면 비동기 처리로 바꿀 수 있다. Observer Pattern 자체가 비동기 처리나 분산 환경의 메시지 전달을 보장하는 것은 아니다.

## 4. 세 패턴의 차이와 선택 기준

오늘 공부한 세 패턴은 모두 변경되는 책임을 분리하지만, 문제의 위치가 다르다.

| 패턴 | 분류 | 분리하는 책임 | 핵심 구조 | 주의할 점 |
| --- | --- | --- | --- | --- |
| Template Method | 행위 | 공통 실행 흐름과 변경되는 세부 동작 | 상속과 오버라이딩 | 상속 결합도와 계층 추적 비용 |
| Factory Method | 생성 | 객체 생성과 생성된 객체의 사용 | Creator와 Product 계층 | 클래스 수와 생성 구조 복잡도 |
| Observer | 행위 | 상태 변경과 상태 변경에 따른 후속 작업 | Subject와 Observer 목록 | 알림 흐름과 관찰자 관리 비용 |

Template Method는 “순서를 누가 통제하는가?”라는 문제에 가깝다. Factory Method는 “구체 객체를 누가 생성하는가?”를 나눈다. Observer는 “상태 변경을 누가 알고, 누가 반응하는가?”를 분리한다.

세 패턴을 한 시스템에 모두 적용해야 하는 것은 아니다. 실행 순서가 실제로 고정되어 있는지, 생성 유형이 계속 늘어날 가능성이 있는지, 하나의 상태 변경에 여러 후속 작업이 필요한지를 먼저 확인해야 한다. 추상화와 클래스가 늘면서 호출 흐름이 더 복잡해진다면 패턴을 적용한 이점이 줄어들 수 있다.

{% include interactive/design-pattern-visualization.html kind='comparison' %}

*그림 4. Template Method, Factory Method, Observer가 각각 어떤 책임을 분리하는지 비교한다.*

## 5. Java/Spring 백엔드 개발과의 연결

세 패턴은 이름을 그대로 적용하기보다 백엔드 코드에서 반복되는 책임을 바라보는 관점으로 연결할 수 있다.

Template Method를 볼 때는 서비스나 인프라 코드의 공통 실행 순서가 실제로 고정되어 있는지 확인한다. 상속이 필요하지 않다면 콜백이나 합성으로 같은 목적을 달성할 수 있다. Spring의 `JdbcTemplate`도 자원 관리와 예외 변환 같은 공통 처리를 프레임워크가 맡고, 애플리케이션은 SQL과 결과 매핑을 전달한다는 점에서 이 관점을 떠올리게 한다.

Factory Method를 볼 때는 객체를 사용하는 코드가 구체 클래스 생성까지 직접 담당하고 있는지 확인한다. 생성 정책이 자주 바뀌거나 제품 유형이 늘어날 때 Creator와 Product의 책임을 분리할 수 있다. 반대로 유형이 적고 생성 로직이 단순하다면 직접 생성이나 정적 팩토리가 더 읽기 쉬울 수 있다.

Observer를 볼 때는 하나의 상태 변경에 여러 후속 작업이 붙는지 확인한다. Subject가 모든 구체 알림 구현체를 직접 알게 되면 변경 범위가 커질 수 있으므로 인터페이스와 등록 목록으로 의존성을 줄일 수 있다. Spring Application Event는 이 구조를 애플리케이션 컨텍스트 안에서 전달하는 방법 중 하나지만, 이벤트가 필요하지 않은 단순한 호출까지 모두 이벤트로 바꿀 이유는 없다.

## 6. 오늘 학습한 내용 정리

오늘은 객체지향 설계에서 변경되는 책임을 세 방향으로 나눠 보았다.

Template Method에서는 상위 클래스의 `final` Template Method가 실행 순서를 고정하고, 하위 클래스가 Abstract Method와 Hook Method를 통해 변하는 세부 동작을 제공한다. 상위 타입으로 호출해도 오버라이딩된 인스턴스 메서드가 실행되는 이유는 동적 바인딩에 있다. 다만 상속으로 인한 결합도를 함께 고려해야 한다.

Factory Method에서는 Product 계층과 Creator 계층을 분리했다. `NotificationCreator`는 Product를 사용하는 공통 흐름을 정의하고, `EmailCreator`와 `SmsCreator`가 Factory Method를 오버라이딩해 구체 Product를 만든다. Product 인터페이스 타입으로 반환해도 실제 객체 타입까지 인터페이스 인스턴스로 바뀌는 것은 아니다. ConcreteCreator를 선택하는 책임도 여전히 클라이언트나 설정에 남는다.

Observer에서는 `OrderSubject`가 상태와 `List<Observer>`를 관리하고, `EmailObserver`와 `SmsObserver`가 상태 변경 이후의 작업을 담당하도록 나눴다. `unregister()`는 관찰자 객체를 삭제하는 동작이 아니라 목록에서 참조를 제거해 이후 알림 대상에서 제외하는 동작이다. 상태 변경과 알림 호출을 구분해서 봐야 등록 해제 이후의 흐름도 정확하게 설명할 수 있다.

세 패턴 모두 변경을 격리하는 데 도움을 줄 수 있지만, 적용 자체가 목표는 아니다. 실행 흐름, 객체 생성, 상태 변경 중 실제로 어떤 책임이 자주 바뀌는지 확인한 뒤 코드의 복잡도와 유지보수 비용을 함께 비교해야 한다.

### 관련 글

- [디자인 패턴과 Adapter, Singleton — 객체의 연결과 생성은 어떻게 관리할까?](/posts/design-pattern-adapter-singleton/) — 서로 다른 인터페이스를 연결하는 Adapter와 인스턴스 생성 범위를 제한하는 Singleton을 앞서 정리했다.

### 참고 자료

- [Gyoogle — Template Method Pattern](https://gyoogle.dev/blog/design-pattern/Template%20Method%20Pattern.html) — Template Method의 실행 순서 고정과 하위 클래스의 세부 동작 구현 구조를 확인했다.
- [Gyoogle — Factory Method Pattern](https://gyoogle.dev/blog/design-pattern/Factory%20Method%20Pattern.html) — Creator가 하위 클래스에 객체 생성을 맡기는 기본 구조를 확인했다.
- [Gyoogle — Observer Pattern](https://gyoogle.dev/blog/design-pattern/Observer%20Pattern.html) — Subject와 Observer의 등록·해제·알림 책임을 확인했다.
- [Spring Framework — Using the JDBC Core Classes to Control Basic JDBC Processing and Error Handling](https://docs.spring.io/spring-framework/reference/data-access/jdbc/core.html) — `JdbcTemplate`의 자원 관리, 공통 JDBC 처리, 콜백 전달 방식을 확인했다.
- [Spring Framework — Additional Capabilities of the ApplicationContext](https://docs.spring.io/spring-framework/reference/core/beans/context-introduction.html) — `ApplicationEventPublisher`, 이벤트 리스너, 기본 동기 이벤트 처리 방식을 확인했다.
- [Spring Framework — Container Extension Points](https://docs.spring.io/spring-framework/reference/core/beans/factory-extension.html) — Spring `FactoryBean`의 역할과 컨테이너 생성 확장 지점을 확인했다.
- [Spring Framework — BeanFactory API](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/beans/factory/BeanFactory.html) — Bean 정의와 컨테이너 조회 계약의 역할을 확인했다.
<!-- HUMANIZE-SUMMARY
- 원본/윤문본 글자수·변경률: 신규 작성이라 비교 가능한 원문 없음 / 최종 17,688자
- 카테고리별 탐지 건수(before → after): 신규 작성 N/A → A-1 0, A-7 0, A-8 0, C-11 0, D-1 0, I-1 0
- 자체검증: 6/6 통과
- 등급: A — 신규 기술 블로그 글이며 핵심 S1 잔존 0건, 기술 용어·수치·날짜 보존, 장르와 격식체 유지
- 주요 변경 하이라이트: 실행 순서 중심으로 문단을 정리 / 객체별 책임을 직접 서술 / 반복되는 번역투와 메타 접속어를 줄여 문장 리듬을 조정
--->
