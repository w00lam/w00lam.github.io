---
title: "Java Thread와 동시성 — 공유 상태는 왜 문제가 되고 어떻게 제어할까?"
date: 2026-09-16
categories: [TIL, Java, Spring]
tags: [Java, Thread, Concurrency, Race Condition, synchronized, AtomicInteger, Thread Pool, Spring, TIL]
permalink: /posts/java-thread-concurrency-shared-state/
---

어제 [JVM 메모리 영역](/posts/java-jvm-memory-lifecycle/)을 공부하면서 지역 변수는 메서드 호출과 함께 생겼다가 Stack Frame과 함께 사라지고, 객체는 Heap에 존재한다는 흐름을 정리했다. 여기서 자연스럽게 다음 질문이 생겼다.

> 여러 요청이 들어오면 각 요청은 서로 다른 Thread에서 처리될 텐데, 같은 Heap 객체를 바라보면 무슨 일이 생길까?

처음에는 멀티스레드 환경에서 여러 작업이 동시에 실행되기 때문에 문제가 생긴다고 생각했다. 하지만 질문을 이어가면서 동시성 문제의 조건을 조금 더 정확하게 좁힐 수 있었다.

같은 객체를 여러 Thread가 바라보는 것 자체가 문제는 아니다. 각 Thread가 자기 지역 변수처럼 독립적인 데이터만 다룬다면 서로의 실행에 영향을 주지 않는다. 문제가 되는 것은 여러 Thread가 **같은 변경 가능한 상태(mutable state)** 를 공유하면서 동시에 수정하는 경우다.

이번 글에서는 `count++`를 중심으로 공유 상태가 왜 위험한지, `synchronized`, `AtomicInteger`, Thread Pool이 각각 어떤 문제를 다루는지 정리한다. 마지막에는 이 구분을 Spring Singleton Bean과 여러 서버가 실행되는 분산 환경까지 연결해 본다.

## Thread가 많아지면 무엇이 달라질까?

서버로 요청이 들어오는 상황을 단순하게 그리면 다음과 같다.

~~~text
Request A → Thread A
Request B → Thread B
Request C → Thread C
~~~

각 Thread가 서로 다른 요청 데이터만 사용한다면 실행이 겹쳐도 큰 문제가 없다. 반대로 다음처럼 여러 Thread가 같은 객체의 `count`에 접근하면 이야기가 달라진다.

~~~text
Thread A ─┐
          ├→ 같은 객체의 count
Thread B ─┘
~~~

이때 `count`가 읽기만 가능한 값이라면 경쟁할 이유가 없다. 값을 변경하는 과정이 있고 그 과정이 서로 겹칠 때 Race Condition이 생길 수 있다.

Thread를 많이 만든다고 처리량이 계속 좋아지는 것도 아니다. Thread마다 메모리가 필요하고, 실행 가능한 Thread가 지나치게 많으면 CPU가 실행 대상을 바꾸는 Context Switching도 잦아진다. 서버는 요청마다 Thread를 무제한으로 만들기보다 정해진 수의 Thread를 재사용하는 쪽을 택한다.

## Thread Pool은 실행 자원을 관리한다

처음에는 Thread가 많아지면 메모리만 부족해지는 문제라고 생각했다. 질문을 통해 Thread 생성 비용뿐 아니라 실행 가능한 Thread가 너무 많을 때 생기는 Context Switching 비용도 함께 봐야 한다는 것을 알게 됐다.

Thread Pool은 일정 수의 Thread를 미리 유지하고 들어온 작업에 다시 사용하는 구조다. Thread 수를 제한하면서 반복적인 생성 비용을 줄이고, 서버가 사용할 실행 자원의 범위도 관리한다.

다만 Thread Pool이 Context Switching 자체를 없애는 것은 아니다. 관리할 Thread 수를 줄여 과도한 생성과 실행 비용을 제어할 뿐이다.

Java의 `Executor`를 사용하면 작업을 제출하는 코드와 작업을 실행하는 방식을 분리할 수 있다. `ExecutorService`는 여기에 작업 제출, 종료 관리, `Future`를 통한 실행 결과 추적을 더한 인터페이스다. Thread Pool을 사용할 때는 작업을 넣는 것뿐 아니라 Pool의 생명주기와 종료도 함께 관리한다.

## 공유 상태는 왜 문제가 될까?

다음과 같은 Counter를 생각해 보자.

~~~java
class Counter {

    private int count = 0;

    public void increase() {
        count++;
    }
}
~~~

코드만 보면 `increase()`는 `count`에 1을 더하는 단순한 메서드다. 그래서 두 Thread가 한 번씩 호출하면 결과도 당연히 2라고 생각하기 쉽다.

동시성을 생각할 때는 이 한 줄을 그대로 믿지 말고 `count++`가 실제로 하나의 작업인지 다시 물어봐야 한다.

## `count++`는 하나의 연산처럼 보이지만 원자적이지 않다

`count++`는 개념적으로 다음 세 단계로 나뉜다.

~~~text
1. count 값을 읽는다.
2. 읽은 값에 1을 더한다.
3. 증가한 값을 count에 다시 저장한다.
~~~

초기값이 `0`이고 두 Thread의 실행이 다음 순서로 겹치면 문제가 드러난다.

~~~text
초기값 count = 0

Thread A : count 읽기 → 0
Thread B : count 읽기 → 0

Thread A : 0 + 1
Thread B : 0 + 1

Thread A : count = 1
Thread B : count = 1
~~~

두 Thread가 각각 한 번씩 증가했으니 기대값은 `2`다. 그런데 두 Thread가 같은 `0`을 읽었고, 마지막 저장이 앞선 결과를 덮어썼다. 그래서 실제 값은 `1`로 남는다.

이 현상을 “멀티스레드라서 값이 틀렸다”라고만 설명하면 부족하다. 여러 Thread의 실행 순서에 따라 결과가 달라지는 **Race Condition**이고, 공유 상태를 읽고 수정하고 쓰는 사이에 다른 Thread의 작업이 끼어들어 생긴다.

![두 Thread의 count++가 읽기-수정-쓰기 과정에서 서로 겹치며 최종 값 1을 만드는 Race Condition 흐름](/assets/images/2026-09-16-java-thread-concurrency/race-condition-count-increment.svg)

## 원자성은 연산의 경계를 보는 개념이다

원자성(Atomicity)을 처음에는 작업을 안전하게 처리하는 성질 정도로 이해했다. 지금은 하나의 작업으로 취급해야 하는 연산이 중간에 쪼개져 다른 Thread의 연산과 섞이는지를 보는 개념으로 정리한다.

`count++`에서 중요한 것은 읽기·수정·쓰기라는 세 단계가 있다는 사실이다. 이 전체가 하나의 원자적인 작업으로 보장되지 않기 때문에 중간에 다른 Thread가 들어올 수 있다.

동시성 문제가 의심되는 코드를 보면 가장 먼저 다음을 확인한다.

> 이 연산은 원자적인가?

연산이 여러 단계로 나뉘고 그 사이에 다른 Thread가 끼어들 수 있다면 Race Condition을 의심해야 한다.

## 임계 구역과 `synchronized`

여러 Thread가 동시에 접근했을 때 결과가 깨지는 코드 영역을 임계 구역(Critical Section)으로 본다. `count++`를 한 번에 한 Thread만 실행하게 만들면 읽기-수정-쓰기 사이에 다른 Thread가 들어오지 못한다.

~~~java
class Counter {

    private int count = 0;

    public synchronized void increase() {
        count++;
    }
}
~~~

인스턴스 메서드에 `synchronized`를 붙이면 해당 객체의 Monitor를 기준으로 메서드 본문을 한 번에 한 Thread만 실행한다. 이때 객체의 `count`를 변경하는 구간이 보호된다.

`synchronized`가 모든 Thread의 실행을 멈춘다는 뜻은 아니다. 공유 상태를 안전하게 수정해야 하는 임계 구역에 한 번에 하나씩 들어가도록 접근 순서를 제어한다.

## 모든 메서드를 `synchronized`로 만들면 될까?

처음에는 공유 객체의 메서드마다 `synchronized`를 붙이면 안전하다고 생각했다. 그런데 동기화 범위가 필요 이상으로 넓어지면 동시에 처리하는 작업의 수가 줄어든다.

공유 mutable state가 어디에 있는지 찾고, 실제 경쟁이 발생하는 범위를 확인한 뒤 필요한 구간만 보호한다. 상태와 무관한 계산까지 같은 임계 구역에 넣으면 동시성 제어 비용만 커진다.

동시성 문제를 만나면 다음 순서로 좁혀 간다.

~~~text
공유 상태가 있는가?
        ↓
그 상태를 변경하는가?
        ↓
여러 단계의 연산이 서로 섞일 수 있는가?
        ↓
필요한 범위만 임계 구역으로 보호한다.
~~~

## 단순한 증가에는 `AtomicInteger`

공유 상태가 단순한 숫자이고 필요한 동작이 증가·감소처럼 원자 연산으로 표현된다면 `AtomicInteger`를 먼저 떠올릴 수 있다.

~~~java
import java.util.concurrent.atomic.AtomicInteger;

class Counter {

    private final AtomicInteger count = new AtomicInteger();

    public void increase() {
        count.incrementAndGet();
    }
}
~~~

`AtomicInteger`는 원자적으로 갱신되는 `int` 값을 제공한다. `incrementAndGet()`은 현재 값을 원자적으로 증가시키고 갱신된 값을 돌려준다. 단순한 Counter에서는 `count++` 대신 연산의 의도가 드러나는 메서드를 호출하는 셈이다.

다만 `AtomicInteger`를 단순히 Thread-safe한 `Integer`라고 이해하면 선택 기준을 놓치기 쉽다. 여러 상태를 함께 확인하고 바꾸거나 여러 연산을 하나의 임계 구역으로 묶어야 한다면 `synchronized`처럼 더 넓은 범위를 보호하는 방법이 필요하다.

~~~text
단순한 숫자 증가·감소
→ AtomicInteger의 원자 연산을 고려

여러 상태와 여러 연산을 하나로 묶어야 함
→ synchronized 같은 동기화 수단을 고려
~~~

## Spring Singleton Bean의 mutable state

어제 JVM 메모리를 공부하며 Spring Bean도 결국 JVM Heap에 존재하는 객체라고 정리했다. 이 이해가 Thread와 동시성을 연결하는 출발점이 됐다.

~~~java
@Service
public class CounterService {

    private int count = 0;

    public void increase() {
        count++;
    }
}
~~~

Spring의 기본 Singleton Bean은 하나의 Container 안에서 하나의 인스턴스를 여러 요청이 함께 사용한다. 여러 요청을 처리하는 Thread가 같은 `CounterService` 객체의 `count`를 동시에 수정하면 앞에서 본 Race Condition이 재현된다.

그렇다고 “Singleton Bean은 Thread-safe하지 않다”라고 단정하면 정확하지 않다. Singleton이라는 생명주기 자체가 문제를 만드는 것이 아니라 여러 요청이 공유하는 객체 안에 변경 가능한 상태를 두고 동시에 수정하는 상황이 문제다.

~~~text
Bean도 Heap에 존재하는 객체다.
→ Singleton scope라면 여러 요청이 같은 객체를 사용한다.
→ 객체 안에 mutable state가 있으면 여러 요청이 같은 상태를 수정한다.
~~~

![여러 HTTP 요청이 서로 다른 Thread를 거쳐 하나의 Spring Singleton Bean과 mutable field를 공유하는 구조](/assets/images/2026-09-16-java-thread-concurrency/spring-singleton-shared-state.svg)

일반적인 Spring Service에서는 요청마다 필요한 값을 지역 변수나 메서드 인자로 처리하는 stateless 설계를 먼저 고려하는 편이 단순하다. 공유 상태가 정말 필요할 때 그 범위에 맞는 동기화 수단을 선택한다.

## `synchronized`는 어디까지 보장할까?

예약이나 재고 차감 문제를 처음 접했을 때는 `synchronized`를 붙이면 전체 동시성 문제가 해결될 것이라고 생각하기 쉽다. 하지만 `synchronized`가 보호하는 범위는 **같은 JVM 안의 Thread**로 한정된다.

서버가 하나라면 다음처럼 동작 범위를 그려볼 수 있다.

~~~text
Server A (JVM A)
  Thread A ─┐
  Thread B ─┼→ 같은 객체의 synchronized 구간
  Thread C ─┘
~~~

서버가 여러 대라면 각 JVM은 자기 객체와 자기 Monitor를 따로 가진다.

~~~text
Server A (JVM A)                 Server B (JVM B)
  synchronized                      synchronized
       │                                  │
       └────────────── 같은 DB ────────────┘
~~~

Server A의 Lock과 Server B의 Lock은 서로 공유되지 않는다. 두 서버 인스턴스가 같은 좌석이나 재고를 동시에 수정한다면 Java의 `synchronized`만으로 시스템 전체를 조정할 수 없다.

![Server A와 Server B가 서로 다른 JVM Lock으로 같은 DB에 접근하는 분산 환경 구조](/assets/images/2026-09-16-java-thread-concurrency/distributed-jvm-locks.svg)

이 구분을 알고 나면 “동기화하면 안전하다”라는 문장을 그대로 외우지 않게 된다. 무엇이 같은 범위에서 공유되는지 먼저 확인해야 한다. 단일 JVM의 객체 상태와 여러 서버가 함께 사용하는 DB 상태는 같은 동시성 문제라도 제어 범위가 다르다.

## 예약 시스템으로 연결해 보기

좌석 예약을 세 단계로 줄이면 다음 흐름이다.

~~~text
1. 좌석이 예약 가능한지 조회한다.
2. 예약 가능 상태를 확인한다.
3. 좌석을 예약 상태로 변경한다.
~~~

두 요청이 변경 전에 모두 “예약 가능”을 읽으면 같은 좌석을 동시에 예약하려고 한다. `count++`에서 본 읽기-수정-쓰기 문제와 구조가 같다.

~~~text
읽기
→ 조건 확인과 수정
→ 쓰기
~~~

단일 JVM 안에서 객체의 상태만 경쟁한다면 필요한 임계 구역을 Java 동기화 수단으로 보호한다. 여러 서버가 하나의 DB를 공유한다면 JVM 밖에서도 같은 변경을 조정해야 한다. 이때 DB의 동시성 제어나 Redis 기반 분산 Lock을 검토한다.

오늘은 이 방식의 상세 구현까지 확장하지 않는다. 지금 단계에서 기억할 것은 동시성 제어 수단을 고르기 전에 문제가 발생한 공유 범위를 먼저 확인한다는 점이다.

## 오늘 헷갈렸던 부분과 수정된 이해

### Thread가 많으면 메모리만 문제일까?

처음에는 Thread가 많아지면 메모리 공간이 부족해진다고만 생각했다. 이제는 Thread마다 필요한 메모리와 함께, 실행 가능한 Thread가 지나치게 많을 때 Context Switching 비용도 커진다고 이해한다.

### Thread Pool을 사용하면 Context Switching이 없어질까?

Thread Pool은 정해진 수의 Thread를 재사용해 Thread 생성과 실행 자원을 관리한다. Context Switching을 없애는 도구가 아니라 Thread 수를 제한해 비용을 다루는 구조다.

### `count++`는 왜 안전하지 않을까?

처음에는 여러 Thread가 같은 값을 수정하기 때문이라고만 생각했다. 실제 원인은 `count++`가 읽기 → 수정 → 쓰기로 나뉘고, 이 전체가 원자적으로 보장되지 않는 데 있다.

### `synchronized`를 사용하면 모든 환경에서 안전할까?

동기화하면 안전하다고 단순하게 이해했지만 `synchronized`는 동일 JVM 안에서 Thread가 같은 Monitor를 두고 경쟁할 때 적용된다. 여러 JVM이 있는 분산 환경의 동시성은 별도 문제다.

### Singleton Bean 자체가 문제일까?

Singleton 객체라는 사실 자체보다 여러 요청이 공유하는 객체 안에 변경 가능한 상태를 두는 것이 문제다. 변경되지 않는 의존성을 `final` 필드로 보관하는 것과 요청마다 달라지는 값을 인스턴스 필드에 누적하는 일은 구분해야 한다.

## 동시성 문제를 보는 순서가 달라졌다

처음에는 동시성 문제를 “여러 Thread가 동시에 실행해서 생기는 문제”라고 생각했다. 지금은 다음 순서로 코드를 살펴본다.

~~~text
여러 Thread가 실행되는가?
        ↓
같은 데이터를 공유하는가?
        ↓
그 데이터가 변경되는가?
        ↓
연산이 원자적인가?
        ↓
Race Condition이 발생할 수 있는가?
        ↓
공유 상태 제거 / Atomic / synchronized 검토
        ↓
분산 환경이라면 JVM 밖의 동시성 제어까지 검토
~~~

이 순서를 따라가면 해결 방법도 한 가지로 고정되지 않는다. 공유 상태 자체를 없애는 설계가 가장 단순하고, 숫자 하나의 연산에는 `AtomicInteger`, 여러 연산을 묶는 임계 구역에는 `synchronized`를 고려한다. 서버가 여러 대라면 DB나 Redis처럼 JVM 밖에서 공유되는 제어 수단까지 살펴본다.

오늘 배운 내용을 한 문장으로 묶으면 이렇다.

> 동시성 문제의 핵심은 Thread가 많다는 사실보다 여러 Thread가 같은 변경 가능한 상태를 공유하고 그 상태를 바꾸는 연산이 원자적으로 처리되는지에 있다. `synchronized`도 모든 동시성 문제를 해결하는 도구가 아니라 같은 JVM 안에서 공유 상태의 접근을 제어하는 방법이다.

### 참고 자료 (Sources)

* **Oracle:** [AtomicInteger — Java SE 21 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/atomic/AtomicInteger.html)
* **Oracle:** [Executor — Java SE 21 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Executor.html)
* **Oracle:** [ExecutorService — Java SE 21 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ExecutorService.html)
* **Oracle:** [Object — Java SE 21 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html)
