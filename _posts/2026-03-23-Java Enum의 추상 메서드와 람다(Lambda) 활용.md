---
title: Java Enum의 추상 메서드와 람다(Lambda) 활용
date: 2026-03-23
categories: [Java, Programming]
tags: [Java, Enum, Lambda, FunctionalInterface]
---

Java의 `enum`은 단순히 상수를 나열하는 도구를 넘어, 각 상수가 고유한 로직을 실행할 수 있는 '행위'를 가질 수 있다. 이전에는 추상 메서드를 통해 이를 구현했다면, 더 나아가 함수형 인터페이스와 람다(Lambda)를 결합하여 코드를 훨씬 간결하게 만드는 방법을 학습했다.

## 1. Enum 내 추상 메서드와 상수별 클래스 본문

`enum` 내부에 추상 메서드를 선언하면, 모든 상수는 이 메서드를 반드시 구현해야 한다. 이를 **상수별 클래스 본문(Constant-specific class body)**이라고 하며, 마치 익명 클래스를 선언하듯 각 상수 옆에 로직을 붙일 수 있다.



```java
public enum Operator {
    PLUS {
        @Override
        public int apply(int a, int b) { return a + b; }
    },
    MINUS {
        @Override
        public int apply(int a, int b) { return a - b; }
    };

    public abstract int apply(int a, int b);
}
```

## 2. 람다(Lambda)를 활용한 Enum 로직 개선

추상 메서드를 일일이 `@Override` 하는 방식은 코드가 길어지고 가독성이 떨어질 수 있다. 이때 **함수형 인터페이스(Functional Interface)**를 `enum`의 필드로 선언하고 생성자에서 람다식을 주입받으면 코드가 매우 간결해진다.

```java
import java.util.function.BinaryOperator;

public enum Operator {
    PLUS("+", (a, b) -> a + b),
    MINUS("-", (a, b) -> a - b),
    MULTIPLY("*", (a, b) -> a * b),
    DIVIDE("/", (a, b) -> a / b);

    private final String symbol;
    private final BinaryOperator<Integer> expression;

    Operator(String symbol, BinaryOperator<Integer> expression) {
        this.symbol = symbol;
        this.expression = expression;
    }

    public int apply(int a, int b) {
        return expression.apply(a, b);
    }
}
```

## 3. 학습 내용 요약 및 비교

| 구분 | 추상 메서드 방식 | 람다(함수형 인터페이스) 방식 |
| :--- | :--- | :--- |
| **코드 가독성** | 상수마다 `@Override`가 붙어 길어짐 | 람다 한 줄로 표현되어 간결함 |
| **확장성** | 복잡한 로직이 필요할 때 유리함 | 짧고 명확한 로직에 최적화됨 |
| **핵심 원리** | 상수별 클래스 본문 활용 | 함수형 인터페이스를 필드로 주입 |

- **익명 함수의 조화:** `enum` 생성자에 람다식을 전달함으로써, 상수가 인스턴스화될 때 각기 다른 전략(Strategy)을 가질 수 있게 된다.
- **유연한 설계:** 단순히 연산뿐만 아니라 조건 검사, 문자열 변환 등 다양한 함수형 인터페이스(`Predicate`, `Function` 등)를 적용할 수 있음을 배웠다.

기존의 딱딱한 상수 나열에서 벗어나, 람다를 통해 `enum`을 하나의 강력한 클래스처럼 사용할 수 있다는 점이 Java 언어의 유연함을 다시금 느끼게 해주었다.

---

### 🔗 참고 자료 (Sources)
* **Oracle Java Documentation:** [Functional Interfaces](https://docs.oracle.com/javase/8/docs/api/java/lang/FunctionalInterface.html) - *Concept of single abstract method interfaces.*
* **Baeldung:** [Lambda Expressions in Java Enums](https://www.baeldung.com/java-enum-iteration) - *How to combine functional programming with enum types.*
* **Java Language Specification:** [Enum Constants](https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.9.1) - *Detailed specification on enum constant structure.*
