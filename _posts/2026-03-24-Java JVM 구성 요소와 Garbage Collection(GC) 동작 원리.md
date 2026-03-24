---
title: Java JVM 구성 요소와 Garbage Collection(GC) 동작 원리
date: 2026-03-24
categories: [Java, Architecture]
tags: [JVM, GC, RuntimeDataArea, JIT]
---

JVM(Java Virtual Machine)의 핵심 구성 요소인 Class Loader, Runtime Data Area, Execution Engine, 그리고 Garbage Collector가 어떻게 상호작용하며 자바 프로그램을 실행하는지 정리한다.

![JVM](/assets/images/2026-03-24-posting/JVM.jpg)

## 1. 자바 코드 실행 흐름

개발자가 작성한 `.java` 소스 코드는 다음과 같은 과정을 거쳐 실행된다.
![flow](/assets/images/2026-03-24-posting/flow.jpg)
1. **자바 컴파일러(javac)** 가 소스 코드를 바이트코드(`.class`)로 변환한다.
2. **Class Loader**가 바이트코드를 읽어 **Runtime Data Area**에 적재한다.
3. **Execution Engine**이 메모리에 적재된 바이트코드를 해석하고 실행한다.

---

## 2. JVM 구성 요소별 역할

### Class Loader (클래스 로더)
바이트코드를 읽어 JVM의 메모리 영역에 적재하는 역할을 한다. 모든 클래스를 한 번에 올리지 않고, 실제 사용되는 시점에 동적으로 로드하는 **Lazy Loading** 방식을 취해 메모리 효율을 높인다.

* **로드(Loading):** `.class` 파일을 찾아 읽음
* **링크(Linking):** 검증, 메모리 할당, 참조 연결
* **초기화(Initialization):** `static` 변수 및 블록 실행

### Runtime Data Area (런타임 데이터 영역)
JVM이 OS로부터 할당받은 메모리 공간이다.
* **공유 영역:** Heap, Method Area (모든 스레드 공유)
* **스레드 전용:** Stack, PC Register, Native Method Stack (각 스레드별 독립 존재)

> **💡 static 사용을 주의해야 하는 이유**
> `static`은 Method Area에 생성되어 JVM 종료 시까지 유지된다. GC의 관리 대상이 아니므로 무분별하게 사용하면 메모리 누수의 원인이 되며, 모든 스레드가 공유하므로 동시성 문제(Race Condition)가 발생할 수 있다.

### Execution Engine (실행 엔진)
* **Interpreter:** 바이트코드를 한 줄씩 읽어 실행한다. 초기 실행 속도는 빠르지만 반복 작업에 취약하다.
* **JIT Compiler:** 자주 실행되는 코드(Hotspot)를 감지해 네이티브 코드로 컴파일 후 캐싱한다. 이 과정 때문에 자바 애플리케이션은 실행 초기에 **워밍업(Warm-up)** 시간이 필요하며, 시간이 지날수록 실행 속도가 빨라진다.

---

## 3. Garbage Collection (GC)

C언어와 달리 자바는 GC가 메모리 해제를 대신 수행한다. GC는 주로 **Heap** 영역의 객체 중 참조되지 않는(Unreachable) 객체를 수거한다.

### Heap 메모리 구조와 세대별 관리
객체의 생존 기간에 따라 영역을 나누어 관리함으로써 효율을 높인다.
![Heap](/assets/images/2026-03-24-posting/Heap.jpg)

![Generation](/assets/images/2026-03-24-posting/Generation.png)
1. **Young Generation:** 새 객체가 생성되는 영역
   - **Eden:** 신규 객체 할당
   - **Survivor 0/1:** Minor GC에서 살아남은 객체 이동
   - Eden이 꽉 차면 **Minor GC**가 발생한다.

2. **Old Generation:** 오래 살아남은 객체의 영역
   - Young 영역에서 설정된 age 임계값을 넘긴 객체가 승격(Promote)되어 온다.
   - Old 영역이 꽉 차면 **Major GC(Full GC)** 가 발생하며, 이때 **Stop The World(STW)** 현상으로 인해 모든 스레드가 일시 정지된다.

### GC 동작 메커니즘: Mark & Sweep
![Mark-Sweep](/assets/images/2026-03-24-posting/Mark%20%26%20Sweep.jpg)

1. **Mark:** **GC Root**(Stack, static 변수 등)에서 시작해 참조 사슬을 따라가며 살아있는 객체를 표시한다.
   ![Mark1](/assets/images/2026-03-24-posting/Mark1.png) | ![Mark2](/assets/images/2026-03-24-posting/Mark2.png) | ![Mark3](/assets/images/2026-03-24-posting/Mark3.png)
   ---|---|---|
3. **Sweep:** Mark되지 않은(Unreachable) 객체들을 메모리에서 제거한다.
   ![Sweep](/assets/images/2026-03-24-posting/Sweep.png)
4. **Compact:** (선택적) 분산된 메모리를 한곳으로 모아 단편화를 방지한다.

---

## 4. 요약 및 비교

| 구분 | Minor GC | Major GC (Full GC) |
| :--- | :--- | :--- |
| **대상 영역** | Young Generation | Old Generation |
| **발생 시점** | Eden 영역이 꽉 찼을 때 | Old 영역이 꽉 찼을 때 |
| **실행 속도** | 매우 빠름 | 상대적으로 느림 |

![GC1](/assets/images/2026-03-24-posting/GC1.png) | ![GC2](/assets/images/2026-03-24-posting/GC2.png)
---|---|
![GC3](/assets/images/2026-03-24-posting/GC3.png) | ![GC4](/assets/images/2026-03-24-posting/GC4.png)

---

## 회고
자바의 구동 원리에 대해 어렴풋이만 알고 있었는데, 이번 기회에 내부에서 구체적으로 어떻게 동작하는지 깊이 있게 들여다볼 수 있었다. 특히 단순히 '힙 메모리를 비워주는 것'으로만 알았던 GC가 세대별로 나뉘어 체계적으로 작동하는 과정을 보며 자바라는 언어에 더 큰 흥미를 느끼게 되었다.

처음에는 시스템 구조가 복잡해 보였지만, 자세히 뜯어보면 단순하고 명확한 작업들이 유기적으로 합쳐져 돌아가는 모습이 인상적이었다. 이 모습이 마치 자바의 객체지향 철학을 시스템 단위로 구현해 놓은 것 같아 재미있었고, 결국 자바는 런타임 환경조차 '자바답게' 설계되었다는 것을 다시 한번 깨닫는 시간이었다.

---

### 🔗 참고 자료 (Sources)
* **Oracle:** [Java Virtual Machine Specification](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)
* **Oracle:** [Garbage Collection Tuning Guide](https://docs.oracle.com/en/java/javase/17/gctuning/introduction-garbage-collection-tuning.html)
* **Baeldung:** [JVM Architecture Explained](https://www.baeldung.com/jvm-vs-jre-vs-jdk)
* **Baeldung:** [How Garbage Collection Works in Java](https://www.baeldung.com/java-garbage-collection)
