---
title: "Main Memory에서 Paging과 Page Replacement까지 — 가상 주소는 어떻게 실제 메모리에 올라가는가"
date: 2026-08-18
categories: [TIL, OS, Java, Spring]
tags: [Operating System, Main Memory, Virtual Memory, Paging, Page Fault, Page Replacement, FIFO, OPT, LRU, JVM, GC, Cache]
permalink: /posts/paging-page-replacement/
---

## Main Memory를 공부하며 생긴 의문

운영체제를 공부하면서 이런 질문이 생겼다.

> “프로세스마다 독립적인 주소 공간을 가진다고 하는데, 결국 실제 RAM은 하나다.
> 그렇다면 프로세스가 바라보는 주소와 실제 메모리는 어떻게 연결되는 걸까?”

이 질문을 따라가다 보니 `Paging`, `Page Fault`, `Page Replacement`가 각각 따로 외워야 하는 개념이 아니라 하나의 메모리 관리 흐름이라는 것을 알게 됐다.

이 글에서는 프로세스가 바라보는 주소가 어떻게 실제 RAM으로 연결되는지, 필요한 데이터가 메모리에 없을 때 운영체제가 어떤 방식으로 처리하는지를 정리해 본다. 신입 Java/Spring 백엔드 개발자가 기술면접에서 설명할 수 있을 정도의 깊이를 목표로 했다.

## Logical Address와 Physical Address

프로세스가 실행될 때 바라보는 주소는 실제 RAM의 주소와 다르다.

- `Logical Address(논리 주소)`: 프로세스 입장에서 보이는 주소
- `Logical Address Space(논리 주소 공간)`: 프로세스가 사용할 수 있다고 인식하는 주소들의 범위
- `Physical Address(물리 주소)`: 실제 `Main Memory(RAM)`에 존재하는 위치

프로세스는 자신만의 Logical Address Space를 가진다. 따라서 두 프로세스가 같은 논리 주소를 사용하더라도 실제로는 서로 다른 Physical Address에 연결될 수 있다. 프로세스 입장에서는 0번 주소에서 시작하는 자신만의 메모리를 사용하는 것처럼 보이지만, 운영체제는 그 주소를 실제 RAM의 어느 위치에 둘지 관리한다.

이 분리가 필요한 이유는 단순히 편리해서가 아니다. 프로세스가 다른 프로세스의 메모리를 임의로 읽거나 덮어쓰지 못하게 해야 하기 때문이다. 프로세스마다 주소 공간을 분리하면 프로그램은 자신에게 허용된 범위 안에서만 메모리를 사용할 수 있다.

## MMU는 주소 변환과 보호를 돕는다

논리 주소를 물리 주소로 변환하는 과정에는 `MMU(Memory Management Unit)`가 관여한다. MMU는 CPU가 만든 논리 주소를 운영체제가 관리하는 매핑 정보와 함께 해석해 실제 물리 주소를 결정한다.

MMU를 단순히 “주소를 바꾸는 장치”라고만 이해하면 아쉽다. 주소 변환 과정에서 해당 접근이 허용된 범위인지 확인하는 데에도 관여하므로, 프로세스 사이의 주소 공간을 분리하고 메모리 보호를 실현하는 중요한 하드웨어 구성 요소다.

다만 MMU가 모든 메모리 보호를 혼자 담당한다고 말할 수는 없다. 운영체제가 페이지 테이블과 접근 권한을 설정하고, CPU의 권한 수준과 예외 처리 등이 함께 동작해야 메모리 보호가 완성된다.

이전에 [System Call과 프로세스 실행 흐름을 다룬 글](/posts/system-call-fork-exec-wait/)에서 살펴본 Process Address Space 관점이 출발점이었다면, 이번에는 그 논리 주소가 실제 Physical Memory와 어떻게 연결되는지를 보는 셈이다. 이 연결을 이해하면 [Interrupt](/posts/interrupt-execution-flow/)에서 다룬 예외 처리 흐름과도 자연스럽게 이어진다.

## Paging이 필요한 이유

프로세스마다 큰 메모리 공간을 연속된 덩어리 하나로 확보한다고 생각해 보자. 프로세스가 많아지거나 실행과 종료가 반복되면 빈 공간이 여러 조각으로 나뉠 수 있다. 필요한 전체 용량은 충분해도 연속된 큰 공간을 확보하지 못하는 문제가 생긴다.

또한 프로그램 전체를 실행하는 동안 항상 RAM에 올려둘 필요가 있는 것도 아니다. 지금 당장 사용하는 부분만 메모리에 두고 나머지는 필요할 때 가져올 수 있다면 한정된 RAM을 여러 프로세스가 더 효율적으로 사용할 수 있다.

`Paging(페이징)`은 이런 문제를 다루기 위해 논리 주소 공간과 물리 메모리를 고정 크기의 단위로 나누어 관리하는 방식이다.

- `Logical Address Space`는 `Page(페이지)` 단위로 나눈다.
- `Physical Memory`는 `Frame(프레임)` 단위로 나눈다.
- Page와 Frame은 같은 크기를 사용한다.

여기서 중요한 점은 다음과 같다.

> Page와 Frame은 주소 자체가 아니라 메모리를 관리하기 위한 고정 크기의 단위다.

프로세스의 논리 주소 공간이 Page 여러 개로 나뉘고, 실제 RAM은 같은 크기의 Frame 여러 개로 나뉜다. 그러면 논리 공간의 Page를 물리 메모리의 연속된 공간에 모두 배치하지 않아도 된다. Page 0은 Frame 3에, Page 1은 Frame 7에, Page 2는 Frame 1에 놓이는 식으로 흩어져 배치할 수 있다.

![Paging 주소 변환: Page와 Frame의 매핑](/assets/images/2026-08-18-paging-page-replacement/paging-address-translation.png)

이렇게 하면 프로세스 전체가 RAM에 연속해서 올라가야 한다는 제약이 줄어든다. 프로세스가 당장 사용하지 않는 Page를 메모리에 올리지 않는 것도 가능해진다. 대신 “이 Page가 현재 어느 Frame에 있는가?”를 추적할 관리 정보가 필요하다.

## Page Table을 통한 주소 변환

프로세스의 각 Page가 실제 어느 Frame에 있는지 기록하는 자료구조가 `Page Table(페이지 테이블)`이다. 운영체제는 프로세스마다 Page Table을 관리하고, MMU는 주소 변환 시 이 정보를 참조한다.

개념적인 변환 과정은 다음과 같다.

```text
Logical Address
      ↓
Page Number + Offset
      ↓
Page Table
      ↓
Frame Number + Offset
      ↓
Physical Address
```

논리 주소는 크게 `Page Number(페이지 번호)`와 `Offset(오프셋)`으로 나누어 생각할 수 있다. Page Number를 이용해 Page Table에서 해당 Page가 매핑된 Frame Number를 찾고, Page 내부의 위치를 나타내는 Offset은 그대로 사용해 Physical Address를 결정한다.

즉 핵심 관계는 다음과 같다.

> Page Number로 Frame Number를 찾고, Offset은 그대로 사용한다.

Page Table에는 Page가 메모리에 올라와 있는지, 읽기·쓰기 같은 접근 권한이 무엇인지와 같은 정보도 함께 관리될 수 있다. 실제 시스템에서는 TLB 같은 캐시를 사용해 매번 Page Table을 메모리에서 읽는 비용을 줄이기도 하지만, 여기서는 주소 변환의 기본 관계에 집중하자.

## Paging에도 단점이 있다 — Internal Fragmentation

Paging은 고정 크기 단위로 메모리를 나눈다. 이 방식은 관리가 단순하고 외부 단편화를 줄이는 데 도움이 되지만, 마지막 Page에서 공간이 남을 수 있다.

예를 들어 Page 크기가 4KB인데 프로세스에 필요한 공간이 10KB라면 3개의 Page가 필요하다. 실제로 사용하는 공간은 10KB지만 12KB를 할당받으므로 마지막 Page에 약 2KB가 남는다. 이렇게 할당된 Page 내부에서 사용하지 못하고 남는 공간을 `Internal Fragmentation(내부 단편화)`이라고 한다.

`Segmentation(세그멘테이션)`은 코드, 데이터, 스택처럼 프로그램의 의미 있는 논리 단위를 가변 크기로 나누는 방식이다. 두 방식을 비교하면 다음과 같다.

| 구분 | Paging | Segmentation |
| --- | --- | --- |
| 관리 단위 | 고정 크기의 Page와 Frame | 의미 있는 논리 단위 |
| 크기 | 고정 크기 | 가변 크기 |
| 대표적인 단편화 | Internal Fragmentation 가능 | External Fragmentation 가능 |

Segmentation이 Internal Fragmentation을 완전히 해결한다고 단정할 수는 없다. 두 방식은 메모리를 나누는 기준과 trade-off가 다르며, 실제 시스템은 목적에 따라 하나의 방식 또는 여러 방식을 조합한다.

## 필요한 Page가 메모리에 없다면?

프로세스가 어떤 주소에 접근하려면 그 주소가 속한 Page가 실제 Physical Memory의 Frame에 올라와 있어야 한다. 그런데 모든 Page를 항상 RAM에 올려두면 여러 프로세스가 사용할 수 있는 메모리보다 필요한 메모리의 총량이 커질 수 있다.

그래서 운영체제는 당장 필요한 Page만 메모리에 올리고, 나머지는 보조기억장치에 둔다. 프로세스가 아직 RAM에 올라오지 않은 Page를 접근하면 `Page Fault(페이지 폴트/페이지 부재)`가 발생한다.

Page Fault라는 이름 때문에 프로그램 오류나 실행 실패처럼 느껴질 수 있지만, 그 자체가 비정상 종료를 의미하는 것은 아니다.

> Page Fault는 필요한 Page가 현재 Physical Memory에 없다는 것을 운영체제가 처리하기 위한 정상적인 메모리 관리 이벤트다.

CPU가 해당 주소에 접근했을 때 Page Table의 해당 항목이 메모리에 없음을 나타내면, CPU는 운영체제에 제어를 넘긴다. 운영체제는 보조기억장치에서 필요한 Page를 읽어 RAM에 배치한 뒤 중단됐던 명령을 다시 수행한다.

## Page Fault 처리 과정

Page Fault가 발생한 뒤의 흐름을 단순화하면 다음과 같다.

```text
CPU가 Page 접근
       ↓
Page Table 확인
       ↓
메모리에 Page가 없음
       ↓
Page Fault
       ↓
빈 Frame 확인
       ↓
┌──────────────────┐
│ 빈 Frame 있음     │ → Page 적재
└──────────────────┘
       ↓ 없음
Page Replacement
       ↓
Victim Page 선택
       ↓
필요한 Page 적재
       ↓
명령 다시 수행
```

![Page Fault와 Page Replacement 처리 흐름](/assets/images/2026-08-18-paging-page-replacement/page-fault-replacement-flow.png)

여기서 가장 중요한 구분은 다음이다.

> Page Fault 발생 ≠ 항상 Page Replacement 발생

Page Fault가 발생해도 빈 Frame이 있다면 그곳에 필요한 Page를 바로 적재하면 된다. 반대로 `Page Fault + 빈 Frame 없음`인 상황에서만 이미 올라와 있는 Page 하나를 내보내는 `Page Replacement(페이지 교체)`가 필요하다.

교체 대상으로 선택된 Page를 `Victim Page(희생 페이지)`라고 부른다. 어떤 Page를 Victim으로 고르느냐에 따라 이후에 다시 Page Fault가 발생할 가능성과 전체 성능이 달라진다.

## Page Replacement Algorithm

### FIFO — 가장 먼저 들어온 Page를 제거한다

`FIFO(First-In, First-Out)`는 메모리에 가장 먼저 들어온 Page를 제거한다. Page가 들어온 순서만 Queue처럼 관리하면 되므로 구현이 단순하다는 장점이 있다.

하지만 오래전에 들어왔다는 이유만으로 지금도 자주 사용하는 Page를 제거할 수 있다. 또한 `Belady's Anomaly`가 발생할 수 있다.

> Belady's Anomaly는 Frame 개수를 증가시켰는데도 Page Fault 횟수가 오히려 증가할 수 있는 현상이다.

일반적으로 Frame이 많아지면 더 많은 Page를 메모리에 유지할 수 있을 것 같지만, FIFO에서는 Frame 수가 늘어난 결과가 오히려 참조 흐름과 나쁘게 맞물릴 수 있다. 따라서 “Frame이 많으면 항상 Page Fault가 줄어든다”고 말할 수 없다.

### OPT — 미래에 가장 늦게 다시 사용될 Page를 제거한다

`OPT(Optimal Page Replacement)`는 앞으로 가장 늦게 다시 참조될 Page를 제거한다.

“앞으로 사용되지 않을 Page를 제거한다”라고만 말하면 기준이 불완전하다. 다시 사용되지 않는 Page가 있다면 가장 좋은 후보일 수 있지만, 정확한 기준은 다음이다.

> 미래에 가장 늦게 다시 참조되는 Page를 제거한다.

앞으로의 메모리 접근 순서를 미리 알아야 하므로 실제 운영체제가 그대로 구현할 수는 없다. 대신 다른 Page Replacement Algorithm이 낸 Page Fault 횟수를 비교할 때 이론적인 최저 기준으로 사용한다.

### LRU — 가장 오랫동안 사용되지 않은 Page를 제거한다

`LRU(Least Recently Used)`는 과거의 접근 기록을 보고 가장 오랫동안 사용되지 않은 Page를 제거한다.

미래의 접근 순서를 알 수 없다는 점에서 OPT를 그대로 사용할 수는 없다. 대신 최근까지 어떤 Page가 사용됐는지를 관찰해 가까운 미래의 사용 가능성을 추정한다.

같은 Page Reference String을 보더라도 알고리즘이 선택하는 Victim Page는 다를 수 있다. 예를 들어 3개의 Frame에 `7, 0, 1`이 들어 있는 상태에서 다음 Page `2`를 적재해야 한다면, 첫 교체 시점의 선택은 다음과 같이 달라진다.

- FIFO: 가장 먼저 적재된 Page 7
- OPT: 미래에 다시 참조되지 않는 Page 1
- LRU: 가장 오랫동안 사용되지 않은 Page 7

![FIFO, OPT, LRU의 Victim Page 선택 비교](/assets/images/2026-08-18-paging-page-replacement/replacement-algorithms-comparison-v2.png)

## Locality와 LRU의 관계

LRU가 어느 정도 합리적으로 동작하는 이유를 이해하려면 `Locality of Reference(참조의 지역성)`를 함께 봐야 한다. 프로그램의 메모리 접근은 완전히 무작위라기보다 일정한 범위와 시간에 집중되는 경향이 있다.

### Temporal Locality — 시간 지역성

최근에 참조된 데이터나 명령어는 가까운 미래에도 다시 참조될 가능성이 높다는 성질이다. 반복문 안의 변수나 메서드 실행에 필요한 코드가 대표적인 예다.

### Spatial Locality — 공간 지역성

어떤 주소가 참조되면 그 주변 주소도 가까운 미래에 참조될 가능성이 높다는 성질이다. 배열을 순서대로 순회하면 인접한 원소가 연속해서 접근되는 것이 예다.

LRU는 “최근에 사용되지 않은 Page는 가까운 미래에도 사용되지 않을 가능성이 상대적으로 높다”고 추정한다. 이 추정이 Temporal Locality와 어느 정도 맞기 때문에, 미래를 직접 알 수 없는 현실적인 환경에서 OPT에 가까운 선택을 기대할 수 있다. 다만 프로그램의 접근 패턴이 항상 지역성을 보장하는 것은 아니므로 LRU도 모든 상황에서 최선은 아니다.

## Dirty Bit가 Page Replacement 비용을 바꾸는 이유

Victim Page를 내보낼 때 항상 메모리의 내용을 Disk에 다시 쓰는 것은 아니다. Page가 메모리에 올라온 뒤 수정되었는지를 나타내는 `Dirty Bit(수정 비트)`를 확인할 수 있다.

### Dirty Bit = 0

Page가 메모리에 올라온 뒤 수정되지 않은 상태다. 보조기억장치에 있는 원본 Page가 그대로 유효하므로 Victim Page를 Disk에 다시 쓸 필요가 없다. 새로운 Page를 읽어오는 작업 중심으로 처리할 수 있다.

### Dirty Bit = 1

Page가 메모리에 올라온 뒤 내용이 수정된 상태다. 메모리의 변경 내용을 보조기억장치에 반영해야 하므로 다음과 같은 작업이 필요할 수 있다.

```text
Victim Page Write
+
New Page Read
```

따라서 Dirty Bit가 1인 Page를 교체하면 Write와 Read가 모두 발생할 수 있어 Page Replacement 비용이 커진다. 실제 교체 알고리즘은 사용 빈도뿐 아니라 수정 여부나 접근 권한 같은 상태도 함께 고려할 수 있다.

## Page Fault가 성능에 큰 영향을 주는 이유

Page Fault 처리에는 단순한 CPU 연산보다 훨씬 느린 보조기억장치 I/O가 포함될 수 있다. Page Replacement까지 필요하다면 상황에 따라 다음 작업이 이어진다.

- Dirty Victim Page를 Disk에 Write
- 필요한 Page를 Disk에서 Read
- Page Table 정보 갱신
- 중단됐던 명령 다시 수행

CPU가 명령을 계산하는 시간과 Disk I/O가 완료되기를 기다리는 시간에는 큰 차이가 있다. 그래서 Page Fault가 가끔 발생하는 것과 계속 발생하는 것은 성능에 미치는 영향이 다르다. 필요한 Page가 계속 교체되고 다시 읽히는 상황을 `Thrashing(스래싱)`으로 이어서 생각할 수도 있다. 이 경우 CPU가 실제 작업보다 Page 교체와 I/O를 기다리는 데 더 많은 시간을 쓰게 된다.

## Java와 JVM의 메모리 흐름으로 연결하기

Java/Spring 개발을 하다 보면 메모리를 JVM Heap이나 GC 관점에서 먼저 접하게 된다. 하지만 JVM이 관리하는 메모리와 운영체제가 관리하는 메모리는 같은 단위가 아니다. 대략적인 관계는 다음처럼 볼 수 있다.

```text
Java Object
    ↓
JVM Heap
    ↓
JVM Process의 Virtual Memory
    ↓
OS Page
    ↓
Physical Memory Frame
```

여기서 `Java Object`와 `OS Page`가 1:1로 대응한다고 생각하면 안 된다. 객체는 JVM이 관리하는 논리적인 단위이고, Page는 운영체제가 Virtual Memory와 Physical Memory를 관리하기 위한 고정 크기 단위다. 객체 여러 개가 하나의 Page에 함께 들어갈 수 있고, 하나의 객체가 여러 Page에 걸쳐 있을 수도 있다.

JVM의 구성 요소와 GC 동작은 [JVM 구성 요소와 Garbage Collection 동작 원리](/posts/java-jvm-gc/)에서 별도로 정리했다. 이번 글에서는 그보다 한 단계 아래에서, JVM 프로세스가 사용하는 가상 메모리가 OS의 Paging과 연결된다는 점만 기억하면 된다.

## GC와 Page Replacement는 같은 메모리 관리일까?

둘 다 메모리를 비운다는 점 때문에 비슷해 보이지만 서로 다른 계층의 문제다.

| 구분 | GC | Page Replacement |
| --- | --- | --- |
| 관리 주체 | JVM | Operating System |
| 관리 대상 | Heap Object의 생명주기 | Virtual Memory와 Physical Memory 사이의 Page 배치 |
| 제거 기준 | Reachable 여부 등 GC 알고리즘 | Frame 부족 시 어떤 Page를 내보낼지 |
| 목적 | 더 이상 사용하지 않는 객체의 Heap 공간 회수 | 제한된 RAM에 필요한 Page를 배치 |

`GC`는 JVM 내부에서 Reachable하지 않은 객체를 정리한다. `Page Replacement`는 RAM의 Frame이 부족할 때 운영체제가 어떤 Page를 보조기억장치로 내보낼지 결정한다. GC가 객체를 수집한다고 해서 그 즉시 OS Page가 교체되는 것도 아니고, Page Replacement가 발생한다고 해서 JVM이 객체의 생명주기를 정리하는 것도 아니다.

정리하면 다음과 같다.

> GC = JVM 수준
>
> Page Replacement = OS 수준

## Spring Cache, Redis Cache, CPU Cache의 차이

백엔드 개발을 하면서 `Cache`라는 단어를 자주 접하다 보니 CPU Cache와 Redis Cache, Spring Cache를 같은 종류로 착각하기 쉽다. 하지만 캐시가 위치한 계층과 줄이려는 비용이 다르다.

Spring의 Cache나 Redis Cache는 보통 다음 흐름에서 사용한다.

```text
Application
      ↓
Redis / Application Cache
      ↓
Database 또는 외부 자원
```

애플리케이션이 Database나 외부 API에 접근하는 비용을 줄이기 위한 캐시다. Spring Cache와 RedisTemplate을 사용하는 구체적인 설계는 [Spring Cache의 Key 설계와 동기화](/posts/spring-cache-design-sync-redistemplate/)에서, Redis에 객체를 저장할 때 직렬화가 필요한 이유는 [Redis 캐시 직렬화 글](/posts/redis-cache-serialization/)에서 다뤘다.

반면 CPU Cache는 다음 계층에 있다.

```text
CPU
 ↓
L1 / L2 / L3 Cache
 ↓
Main Memory
```

CPU와 RAM 사이의 속도 차이를 줄이기 위한 하드웨어 수준의 캐시다. CPU Cache도 최근 데이터나 인접한 데이터를 다시 사용할 가능성이 높다는 Locality 원리를 활용한다. 그러나 Redis Cache가 애플리케이션과 Database 사이에 있고 CPU Cache가 CPU와 Main Memory 사이에 있는 것처럼, 둘은 동일한 계층의 캐시가 아니다.

## 공부하며 정리된 생각

처음에는 Paging, Page Fault, Page Replacement를 각각 별개의 개념이라고 생각했다. 하지만 공부하면서 이 개념들이 하나의 처리 흐름으로 연결된다는 것을 알게 됐다.

```text
Logical Address
→ Paging
→ Page Table
→ Physical Frame
→ Page Fault
→ Page Replacement
```

프로세스는 Logical Address Space를 바라보고, MMU와 Page Table은 그 주소를 Physical Frame으로 연결한다. 필요한 Page가 RAM에 없으면 Page Fault가 발생한다. 이때 빈 Frame이 있으면 Page를 적재하고, 빈 Frame이 없을 때만 Page Replacement Algorithm으로 Victim Page를 선택한다.

이번 글에서 가장 중요한 문장을 하나로 정리하면 다음과 같다.

> Paging은 프로세스의 Logical Address Space와 Physical Memory를 Page와 Frame 단위로 관리하는 방식이고, Page Fault는 필요한 Page가 현재 Physical Memory에 없을 때 발생한다. 이때 빈 Frame이 없다면 Page Replacement Algorithm을 이용해 Victim Page를 선택한다.

GC나 Redis Cache처럼 백엔드 개발에서 자주 접했던 메모리 관련 개념도 운영체제의 메모리 관리와 같은 개념은 아니었다. 같은 “메모리”나 “캐시”라는 단어가 등장하더라도 추상화 수준과 관리 주체를 먼저 구분해서 봐야 한다는 점을 배웠다.

기술면접에서 이 주제를 설명한다면 주소 변환과 Page Fault를 따로 끊기보다 다음 순서로 말하는 것이 자연스럽다.

1. 프로세스는 독립적인 Logical Address Space를 바라본다.
2. MMU와 Page Table이 Page Number를 Frame Number로 변환하고 Offset은 유지한다.
3. Paging은 Page와 Frame이라는 고정 크기 단위로 메모리를 관리한다.
4. 접근한 Page가 RAM에 없으면 Page Fault가 발생한다.
5. 빈 Frame이 있으면 바로 적재하고, 없을 때 Page Replacement로 Victim Page를 고른다.
6. FIFO, OPT, LRU처럼 어떤 Victim을 고르느냐에 따라 Page Fault와 I/O 비용이 달라진다.

이 흐름이 연결되면 Main Memory를 단순히 “RAM에 데이터를 올려두는 공간”이 아니라, Virtual Memory와 Physical Memory 사이의 차이를 운영체제가 관리하는 구조로 볼 수 있다.
