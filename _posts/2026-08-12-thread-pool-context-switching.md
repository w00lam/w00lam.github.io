---
title: "스레드는 많을수록 좋을까? Context Switching과 Thread Pool의 관계"
date: 2026-08-12
categories: [TIL, Backend, Java, Spring]
tags: [Java, Spring Boot, Thread, Thread Pool, Context Switching, Performance, Concurrency, TIL]
permalink: /posts/thread-pool-context-switching/
---

서버가 동시에 많은 요청을 처리해야 한다는 말을 들으면, 처음에는 스레드 수부터 늘리면 된다고 생각하기 쉽다.

> **동시에 많은 요청을 처리하려면 스레드를 많이 만들면 되는 것 아닌가?**

하지만 스레드는 공짜 작업자가 아니다. 스레드마다 메모리가 필요하고, CPU 코어보다 실행 가능한 스레드가 많아지면 운영체제가 스레드를 번갈아 실행하기 위해 Context Switching을 수행한다. 요청이 DB나 외부 API를 기다리는 동안에는 더 많은 스레드가 도움이 될 수 있지만, 그마저도 DB Connection Pool이나 외부 시스템의 처리량이라는 한계를 만난다.

이번 글에서는 운영체제의 Context Switching을 출발점으로, Java/Spring 서버의 Thread Pool 크기를 왜 무작정 늘릴 수 없는지 정리해 본다.

## 1. Context Switching이란 무엇일까

CPU는 한 순간에 하나의 실행 흐름만 실행할 수 있다. CPU 코어가 여러 개라면 코어마다 하나씩 실행할 수 있지만, 실행해야 할 프로세스나 스레드가 코어 수보다 많다면 모든 작업을 동시에 실행할 수는 없다.

이때 운영체제는 실행 중인 작업을 잠시 멈추고 다른 작업을 실행한다. 이 전환을 **Context Switching**이라고 한다.

스레드 A에서 스레드 B로 전환한다고 해 보자. 운영체제는 대략 다음과 같은 일을 수행한다.

1. 현재 실행 중인 스레드 A의 실행 상태를 저장한다.
2. 스케줄러를 통해 다음에 실행할 스레드 B를 선택한다.
3. 스레드 B가 이전에 멈췄던 실행 상태를 복원한다.
4. 복원된 위치부터 스레드 B의 실행을 이어 간다.

여기서 말하는 실행 상태에는 다음과 같은 정보가 포함된다.

- **Program Counter(PC)**: 다음에 실행할 명령어의 위치
- **CPU Register**: 연산 중인 값이나 상태를 담는 레지스터
- **Stack Pointer**: 현재 스레드의 스택 위치
- 그 밖에 현재 실행 흐름을 이어 가기 위해 필요한 CPU 상태

프로세스 단위로 상태를 관리할 때는 **PCB(Process Control Block)**라는 자료구조가 사용된다. PCB에는 프로세스 상태, 다음 실행 위치, 레지스터 정보처럼 프로세스를 중단했다가 다시 실행하기 위한 정보가 들어간다. 스레드도 독립적인 실행 상태를 가지므로, 운영체제는 스레드 단위의 실행 문맥을 저장하고 복원해야 한다.

다이어그램으로 보면 다음 흐름이다.

![Thread A에서 Thread B로 Context Switching이 일어나는 흐름](/assets/images/2026-08-12-thread-pool-context-switching/context-switching-flow.svg)

즉 Context Switching은 단순히 “다음 스레드를 고르는 것”이 아니다. 현재 상태를 안전하게 보관하고, 다른 실행 흐름의 상태를 되살린 뒤, CPU가 그 위치에서 다시 실행하도록 만드는 과정이다.

## 2. Context Switching은 언제 발생할까

Context Switching은 운영체제가 공평하고 효율적으로 CPU를 나누어 사용하기 위해 필요하다. 대표적인 발생 상황은 다음과 같다.

### Time Slice가 끝났을 때

운영체제는 한 스레드가 CPU를 영원히 점유하지 않도록 일정한 실행 시간(Time Slice)을 배정한다. 시간이 끝나면 현재 스레드를 잠시 멈추고 다른 Runnable 스레드에 CPU를 넘길 수 있다.

### I/O를 기다릴 때

스레드가 DB Query, 파일 읽기, 네트워크 응답을 기다리는 동안 CPU에서 할 일이 없다면 계속 CPU를 점유할 이유가 없다. 운영체제는 해당 스레드를 대기 상태로 전환하고, 다른 Runnable 스레드가 CPU를 사용할 수 있도록 한다.

이 덕분에 한 스레드가 DB 응답을 기다리는 동안 다른 요청을 처리할 수 있다. I/O-bound 작업에서 CPU-bound 작업보다 더 많은 스레드를 활용할 여지가 생기는 이유도 여기에 있다.

### Interrupt가 발생했을 때

하드웨어나 운영체제 이벤트를 처리하기 위해 현재 실행 흐름이 중단될 수 있다. 이벤트 처리 후 기존 스레드로 돌아가거나 다른 스레드가 선택되면서 전환이 일어날 수 있다.

### 우선순위가 높은 작업이 실행될 때

더 높은 우선순위의 작업이 실행 가능해지면 현재 작업을 멈추고 우선순위가 높은 작업을 먼저 실행할 수 있다. 이 역시 스케줄러에 의한 CPU 재할당으로 볼 수 있다.

중요한 점은 스레드가 I/O 대기에 들어갔다고 해서 CPU가 쉬는 것은 아니라는 것이다. 기다리는 스레드 대신 실행 가능한 다른 스레드가 CPU를 사용한다. 이 구조가 서버가 여러 요청을 겹쳐 처리할 수 있는 기반이 된다.

## 3. Context Switching에도 비용이 있다

Context Switching은 작업 자체를 처리하는 시간이 아니라, **작업을 바꾸기 위한 비용**이다.

전환이 한 번 일어날 때마다 CPU 상태를 저장하고 복원해야 하며, 스케줄러도 다음 실행 대상을 결정해야 한다. 이전 스레드가 사용하던 데이터가 CPU Cache에 남아 있더라도, 새 스레드가 다른 데이터를 사용하면 Cache 효율이 떨어질 수 있다.

그렇다고 Context Switching이 항상 나쁜 것은 아니다. I/O를 기다리는 스레드 대신 다른 작업을 실행할 수 있게 해 주므로, 서버 전체가 멈추지 않게 만드는 데 필요한 기능이다. 문제는 Runnable 스레드가 지나치게 많아져 전환이 너무 자주 발생하는 경우다.

```text
실제 작업 수행 시간
        +
CPU 상태 저장/복원
        + 스케줄러 실행
        + Cache 효율 저하 가능성
        = 전체 처리 흐름의 비용
```

스레드 수가 늘어나면 스케줄러가 관리할 대상도 늘어난다. CPU가 실제 작업을 수행하는 시간보다 스레드를 바꾸는 시간이 커지면, 스레드를 늘렸는데도 전체 처리량이 기대만큼 증가하지 않을 수 있다.

## 4. 프로세스 전환과 스레드 전환은 무엇이 다를까

같은 프로세스 안의 스레드들은 프로세스의 메모리 공간을 일부 공유한다.

- Code 영역
- Data 영역
- Heap 영역

반면 각 스레드는 다음 실행 상태를 독립적으로 가진다.

- Stack
- Program Counter
- Register 상태

그래서 일반적으로 다른 프로세스로 전환하는 것보다 같은 프로세스 내부에서 스레드를 전환하는 비용이 상대적으로 작다고 설명한다. 프로세스 전체 주소 공간을 바꾸는 부담이 줄어들기 때문이다.

다만 “스레드 전환은 비용이 없다”는 뜻은 아니다. 스레드마다 Stack이 있고, 실행 상태를 저장·복원해야 하며, Cache locality가 깨질 수도 있다. 비용이 상대적으로 작다는 것과 비용이 없다는 것은 전혀 다른 이야기다.

## 5. 스레드는 많을수록 좋을까

스레드 수를 늘리면 어느 구간까지는 동시에 처리할 수 있는 작업이 증가할 수 있다. 특히 많은 스레드가 I/O를 기다리는 상황에서는 CPU가 놀지 않도록 다른 스레드를 실행할 수 있다.

하지만 스레드 수가 계속 늘어난다고 처리량이 선형으로 증가하지는 않는다. CPU 코어가 4개인데 Runnable 상태의 스레드가 100개라고 해 보자. 한 순간에 실제로 실행되는 스레드는 최대 4개뿐이고, 나머지는 CPU를 배정받기를 기다린다.

![CPU 코어보다 Runnable Thread가 많아졌을 때의 스케줄링 비용](/assets/images/2026-08-12-thread-pool-context-switching/thread-count-and-switching.svg)

이때 스레드가 많아질수록 다음 비용이 함께 커진다.

- 스레드별 Stack 메모리 사용량
- 실행 가능한 스레드 사이의 Context Switching 증가
- CPU 스케줄링 오버헤드
- JVM 메모리 사용량 증가
- 서로 다른 작업이 Cache를 밀어내며 Cache locality 저하

따라서 “스레드 증가 = 무조건 처리량 증가”가 아니다. 처리할 작업이 충분히 많고, 스레드가 실제로 CPU를 사용하거나 I/O를 기다리는 동안 얻는 이득이 전환 비용보다 클 때만 스레드 증가가 의미가 있다.

## 6. CPU-bound와 I/O-bound를 구분해야 한다

Thread Pool 크기를 정할 때는 CPU 코어 수만 보는 것보다 작업의 성격을 먼저 봐야 한다.

### CPU-bound 작업

CPU-bound 작업은 실행되는 동안 CPU를 계속 사용하는 작업이다.

- 이미지 처리
- 압축
- 암호화
- 대규모 계산

이런 작업은 CPU 코어가 한정되어 있기 때문에 스레드 수를 과도하게 늘려도 동시에 실행할 수 있는 작업 수가 크게 늘지 않는다. 오히려 스레드가 CPU를 차지하기 위해 경쟁하면서 Context Switching과 스케줄링 비용만 늘어날 수 있다.

CPU-bound 작업에서는 CPU 사용률, 실행 큐, 작업 자체의 처리 시간을 확인하면서 코어 수에 가까운 수준에서 시작해 보는 편이 자연스럽다. 물론 실제 최적값은 작업의 구현과 서버 환경에 따라 달라진다.

### I/O-bound 작업

I/O-bound 작업은 DB, 네트워크, 파일 같은 외부 자원을 기다리는 시간이 큰 작업이다.

- DB Query
- 외부 API 호출
- 파일 I/O
- 네트워크 통신

한 스레드가 I/O를 기다리는 동안 다른 스레드가 CPU를 사용할 수 있으므로, CPU-bound 작업보다 더 많은 스레드를 활용할 여지가 있다.

그렇다고 I/O-bound라는 이유만으로 스레드를 무한정 늘릴 수 있는 것은 아니다. DB Connection Pool의 크기, 외부 API의 Rate Limit, 메모리, 타임아웃, downstream 서비스의 처리량이 함께 제한으로 작동한다. 스레드만 늘리면 실제 작업이 빨라지는 대신 대기 중인 스레드만 늘어날 수 있다.

## 7. Spring 서버의 Thread Pool과 연결하기

전통적인 Spring MVC 서버에서는 HTTP 요청이 들어오면 WAS의 Worker Thread가 요청을 처리한다. 단순화하면 다음과 같은 흐름이다.

```text
HTTP 요청
   ↓
Tomcat Worker Thread
   ↓
Service
   ↓
DB Query
   ↓
Connection Pool
```

Thread Pool을 사용하는 이유는 요청이 들어올 때마다 스레드를 새로 만들고 삭제하는 비용을 줄이기 위해서다. 미리 만들어 둔 Worker Thread를 재사용하면 스레드 생성·삭제 비용을 줄이고, 동시에 처리할 수 있는 요청 수를 제한해 시스템 자원을 보호할 수 있다.

여기서 중요한 것은 HTTP 요청을 받을 수 있는 스레드 수와 실제 DB 작업을 동시에 수행할 수 있는 수가 다를 수 있다는 점이다.

예를 들어 Tomcat Thread Pool이 500개이고 DB Connection Pool이 30개라면, HTTP 요청 500개가 진입하는 것 자체는 가능할 수 있다. 하지만 DB Connection을 동시에 사용할 수 있는 요청은 최대 30개 수준에서 제한된다.

Thread Pool을 500개로 늘렸다고 DB 작업이 500개 동시에 실행되는 것은 아니다. 나머지 요청은 Connection Pool에서 커넥션을 얻기 위해 기다린다. 그 결과 스레드는 살아 있지만 실제로는 DB 커넥션을 기다리는 상태가 되고, 응답 시간과 메모리 사용량이 함께 증가할 수 있다.

## 8. Thread Pool만 보면 안 되는 이유

서버 처리량은 Thread Pool 하나로 결정되지 않는다. 하나의 요청이 끝나기까지 통과하는 자원 중 가장 느린 구간이 병목이 될 수 있다.

![Spring 서버의 Thread Pool과 DB Connection Pool 병목 구조](/assets/images/2026-08-12-thread-pool-context-switching/spring-thread-pool-bottleneck.svg)

다음과 같은 자원을 함께 확인해야 한다.

- CPU Core와 CPU 사용률
- JVM Heap과 스레드별 Stack 메모리
- DB Connection Pool 크기와 사용률
- Redis Connection과 대기 시간
- 외부 API Rate Limit
- 네트워크 대역폭과 지연 시간
- downstream service의 처리량과 응답 시간

예를 들어 다음 흐름을 생각해 보자.

```text
HTTP Thread Pool = 300
DB Connection Pool = 30

→ 최대 300개의 요청이 서버에 들어올 수 있음
→ 하지만 DB를 동시에 사용하는 요청은 Connection 수에 의해 제한됨
→ DB Connection을 기다리는 Thread 증가
→ 요청의 응답 시간 증가
→ 대기 Thread와 요청 객체로 메모리 사용 증가
```

이런 상황에서 Thread Pool을 더 키우면 병목이 해결되는 것이 아니라 DB Connection Pool 앞의 대기열이 커질 수 있다. 즉 Thread Pool 조정은 병목을 없애는 작업이 아니라 병목의 위치를 다른 곳으로 옮기는 작업이 될 수도 있다.

## 9. Thread Pool 크기를 정하는 실무적인 기준

Thread Pool 크기를 공식 하나로 결정할 수 있다고 생각하면 위험하다. “CPU Core가 8개니까 Thread도 8개”처럼 단순하게 정하기보다, 실제 워크로드와 downstream 병목을 관찰하면서 조정해야 한다.

다음 지표를 함께 확인하는 것이 좋다.

- CPU 사용률과 실행 큐
- 평균 응답 시간보다 p95, p99 응답 시간
- Thread Pool의 active count와 대기 상태
- DB Connection Pool 사용률과 대기 시간
- 요청 Queue 길이
- Timeout 발생 수와 실패율
- 단위 시간당 처리량(Throughput)
- 부하 테스트 결과

예를 들어 Thread Pool을 늘린 뒤 Throughput이 증가했더라도 DB Connection 대기 시간과 p99 응답 시간이 악화되었다면 좋은 조정이라고 보기 어렵다. 반대로 CPU 사용률이 낮고 I/O 대기가 많으며, Pool 대기와 메모리 사용이 안정적이라면 조금 더 많은 동시성을 검토할 수 있다.

결국 적절한 크기는 다음 질문에 대한 실험으로 찾아야 한다.

> **현재 워크로드에서 스레드를 더 추가했을 때 실제 작업량이 늘어나는가, 아니면 대기와 전환 비용만 늘어나는가?**

부하 테스트에서는 Thread Pool만 바꿔 보는 데서 끝내지 말고 DB Connection Pool, CPU, 메모리 지표를 함께 기록해야 한다. 그래야 성능이 좋아진 이유와 나빠진 이유를 구분할 수 있다.

## 10. 이번에 이해한 흐름

이번 내용을 정리하며 가장 크게 바뀐 생각은 “동시 처리량은 Thread 수로 결정된다”는 단순한 관점이었다.

처음에는 서버가 많은 요청을 처리하려면 Thread 수를 늘리면 된다고 생각했다. 하지만 Thread 역시 비용이 있는 자원이다. 스레드가 많아지면 각자의 Stack 메모리가 필요하고, CPU 코어보다 Runnable Thread가 많을 때는 Context Switching 비용과 스케줄링 오버헤드가 증가한다.

또한 실제 서버에서는 Thread보다 먼저 병목이 되는 자원이 존재할 수 있다. DB Connection Pool이 작거나, 외부 API의 Rate Limit에 걸리거나, downstream 서비스의 처리량이 낮다면 Thread Pool만 크게 만들어도 요청이 빨라지지 않는다.

그래서 중요한 것은 Thread 개수를 많이 설정하는 것이 아니라, 다음 흐름을 하나의 시스템으로 보는 것이다.

```text
CPU
 ↓
Thread Pool
 ↓
Connection Pool
 ↓
DB / Redis / 외부 API
 ↓
downstream 처리량
```

이번 학습을 통해 **CPU, Thread Pool, Connection Pool, 외부 시스템의 처리량을 하나의 흐름으로 보고 병목 지점을 찾는 것**이 Thread Pool 튜닝의 출발점이라는 점을 배웠다.

관련해서 [동시성 문제를 이해하면서 정리한 생각 — 왜 락이 필요할까](/posts/concurrency-control-strategy/)에서 데이터 정합성 관점의 동시성 제어를 살펴봤다면, 이번 글은 요청을 처리하는 실행 자원과 병목에 초점을 맞춘다. 실제 부하를 넣고 지표를 확인하는 방법은 [k6로 성능 테스트를 코드로 관리하기](/posts/k6-performance-testing-code/)와도 이어진다.

> **Thread는 많을수록 좋은 자원이 아니다. 서버의 처리량은 Thread 수 하나가 아니라 CPU와 각종 Pool, 그리고 downstream 시스템 전체의 병목에 의해 결정된다.**
