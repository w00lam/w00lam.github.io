---
title: "Enum, Lambda, Stream: 선언적 코드와 객체지향적 책임의 결합"
date: 2026-03-31
categories: [Java, OOP]
tags: [Enum, Lambda, Stream, StrategyPattern, FunctionalProgramming]
permalink: /posts/enum-lambda-stream/
---

**한 줄 요약. 값 중심의 프로그래밍에서 타입과 의도 중심의 프로그래밍으로 넘어가는 이야기다.**

## 1. Enum, 상수 집합을 넘어선 상태 도메인 모델

`String`이나 `int` 상수는 값만 전달할 뿐 의도, 즉 타입은 담지 못합니다. Enum은 인스턴스 수가 고정된 특별한 클래스라서 타입 안정성(Type Safety)을 보장합니다.

### 1-1. 실무형 Enum의 조건
실무에서는 상수 이름 말고도 DB 코드, 설명, 상태 전이 규칙 등을 Enum 안에 응집시켜야 합니다.

* **데이터 응집:** 코드값, 설명, 상태 종료 여부 등을 필드로 관리.
* **행위 포함:** 상태 전이 규칙(`canTransitionTo`) 등을 내부에 두어 서비스 로직의 비대화를 방지.
* **주의사항:** `ordinal()`은 선언 순서에 의존하므로 절대 DB나 외부 API 계약에 사용하지 말 것.

### 1-2. Enum과 전략 패턴 (Strategy Pattern)
Enum 안에 추상 메서드를 선언하고 상수마다 구현하면 `if-else` 분기 없이 다형성으로 전략 패턴을 구현할 수 있습니다. 새로운 정책을 추가할 때 기존 코드를 건드리지 않으니 OCP(개방-폐쇄 원칙)도 자연스럽게 지켜집니다.

> 추상 메서드 방식도 좋지만, 함수형 인터페이스와 람다를 필드로 활용하면 코드가 한결 간결해집니다. 추상 메서드를 직접 구현하는 방식과 람다를 주입하는 방식 중 무엇이 더 나은지는 실제 구현 코드로 비교해 봤는데, [Java Enum의 추상 메서드와 람다(Lambda) 활용](/posts/java-enum-lambda/) 포스팅에서 자세히 다뤘습니다.

---

## 2. 람다, 동작을 값처럼 다루기

람다는 `for-loop`를 줄이는 도구에 그치지 않습니다. 핵심은 동작(Behavior)을 파라미터로 전달할 수 있다는 것이다.

* **함수형 인터페이스:** 람다는 추상 메서드가 하나뿐인 인터페이스 문맥에서만 동작한다. (`Predicate`, `Function`, `Consumer`, `Supplier` 등)
* **의도의 분리:** 반복할 대상(반복 로직)과 처리 방식(동작 로직)을 떼어놓을 수 있게 해준다.

---

## 3. 스트림, 데이터 변환의 파이프라인

스트림은 데이터를 저장하는 자료구조가 아니라 데이터 소스 위에서 동작하는 연산 파이프라인입니다.

### 3-1. 스트림의 3단계 구조
1.  **Source:** 데이터 시작 (`list.stream()`)
2.  **Intermediate Operation:** 연산 설계 (`filter`, `map`, `sorted`). 지연 연산(Lazy Evaluation) 특성 덕분에 터미널 연산 전까지 실행되지 않는다.
3.  **Terminal Operation:** 실제 실행 및 결과 생성 (`toList`, `collect`, `count`). 

### 3-2. 스트림의 핵심 동작 원리
* **Lazy Evaluation:** 필요한 시점까지 계산을 미루어 효율성을 극대화한다.
* **Short-circuit:** `findFirst()`, `anyMatch()` 등은 조건을 채우면 나머지 원소를 보지 않고 즉시 종료한다.
* **일회성:** 한 번 소비된 스트림은 재사용할 수 없다.

---

## 4. 언제 무엇을 쓸까: Stream vs for-loop

요즘 자바 코딩에서 스트림은 강력하지만 늘 정답은 아닙니다. 상황에 맞게 골라 써야 합니다.

| 비교 항목 | Stream 활용 | for-loop 활용 |
| :--- | :--- | :--- |
| **강점** | 데이터 변환, 필터링, 집계 | 복잡한 제어 흐름, 예외 처리 |
| **가독성** | 비즈니스 로직(의도)이 명확히 드러남 | 구현 세부사항(어떻게)이 노출됨 |
| **적합한 상황** | 선언적 파이프라인이 필요할 때 | Checked Exception 처리, 부수 효과(Side Effect) 중심일 때 |

---

## 5. 참고 자료 및 신뢰성 뒷받침 (References)

이 글에서 다룬 설계 방식은 자바 생태계의 표준 가이드라인과 기술 근거에 기대고 있습니다.

* **Effective Java (3rd Edition) - Joshua Bloch**
    * **Item 34:** "int 상수 대신 열거 타입(Enum)을 사용하라" - Enum의 타입 안정성과 데이터 응집의 근거.
    * **Item 42:** "익명 클래스보다는 람다를 사용하라" - 함수형 인터페이스 활용의 당위성.
    * **Item 45:** "스트림은 주의해서 사용하라" - 스트림과 반복문 사이의 균형 있는 선택 가이드.
* **Oracle Java Documentation**
    * [Java 8 - Functional Interfaces](https://docs.oracle.com/javase/8/docs/api/java/util/function/package-summary.html): 표준 함수형 인터페이스의 종류와 목적 정의.
    * [Package java.util.stream](https://docs.oracle.com/javase/8/docs/api/java/util/stream/package-summary.html): 스트림의 지연 연산 및 파이프라인 구조 공식 설명.
* **성능적 관점 (Performance)**
    * 스트림은 내부적으로 Lazy Evaluation과 Short-circuit 최적화를 수행하지만 아주 작은 규모의 데이터셋에서는 `for-loop`보다 오버헤드가 발생할 수 있습니다. 
    * 하지만 유지보수성과 가독성 측면에서의 이점이 크기 때문에 성능이 극도로 민감한 루프가 아니라면 스트림 사용을 우선적으로 고려하는 것이 현대 자바의 추세입니다.
 
---

## 6. 배운 점 및 다짐
* **응집도의 중요성:** Enum을 상수로만 쓰지 않고 관련 로직(상태 전이, 할인 정책 등)을 안에 넣어 도메인 모델로 설계할 수 있다는 점도 알게 됐습니다.
* **가독성의 기준:** 스트림을 한 줄로 길게 늘어놓기보다 중간 연산을 의미 있는 메서드로 추출(`Method Reference` 활용)해서 읽는 사람이 비즈니스 흐름을 바로 잡게 하는 편이 진짜 클린 코드라는 걸 깨달았습니다.
* **책임의 분리:** 반복문 안에 숨어 있던 조건과 변환 로직을 람다와 스트림으로 떼어내면 각 객체와 메서드가 단일 책임(SRP)을 지도록 설계할 수 있으니, 이런 연습을 꾸준히 해봐야겠습니다.
