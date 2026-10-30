---
title: "Blocking / Non-Blocking I/O — 데이터를 기다리는 동안 호출 스레드는 무엇을 할까?"
date: 2026-10-30
categories: [TIL, Backend, Network, Java]
tags: [Java, Spring Boot, Network, I/O, NIO, Blocking I/O, Non-Blocking I/O, Selector, TIL]
permalink: /posts/blocking-non-blocking-io/
---

이전에 [Java I/O의 흐름 — Stream과 Buffer부터 Spring HTTP 요청·응답까지](https://w00lam.github.io/posts/java-io-stream-buffer-serialization-http-flow/)를 정리하면서 I/O가 파일 읽기와 쓰기에만 한정되지 않는다는 점을 확인했다. 백엔드 서버가 네트워크 요청을 받고 DB 조회나 외부 API 응답을 기다리는 과정도 프로그램과 외부 시스템 사이에서 데이터가 이동하는 I/O다.

그렇다면 데이터가 아직 도착하지 않았을 때 호출한 스레드는 무엇을 할까? `InputStream.read()`가 반환되기 전에는 같은 스레드가 다음 코드를 실행할 수 없다고 배웠다. 반대로 Java NIO의 논블로킹 채널은 데이터가 없을 때도 호출을 반환하고 `Selector`는 여러 채널 중 처리할 준비가 된 채널을 알려준다. 오늘은 이 두 흐름을 호출 스레드의 관점에서 나누어 보았다.

## 1. Blocking I/O에서 스레드는 어떻게 기다리는가

Blocking I/O는 데이터가 준비되거나 I/O 작업이 끝날 때까지 호출 스레드가 기다리는 방식이다. 메서드 호출이 반환되지 않았으므로 호출한 스레드는 그 호출 아래에 있는 다음 코드를 실행하지 못한다.

`InputStream.read()`가 그 예다. [Java SE 21의 InputStream 문서](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/InputStream.html)는 `read()`가 입력 데이터가 준비되거나 스트림의 끝에 도달하거나 예외가 발생할 때까지 블로킹한다고 설명한다.

```java
int data = inputStream.read(); // 입력 데이터나 스트림 종료 등을 기다리는 호출이다.
process(data);                 // read()가 반환된 다음 같은 스레드에서 실행된다.
```

위 코드에서 `read()`가 아직 반환되지 않았다면 `process(data)`로 넘어갈 수 없다. 애플리케이션 관점에서 호출 스레드는 입력 결과를 기다리는 상태로 해당 요청의 작업을 계속 맡고 있다. 운영체제가 이 스레드를 실행 가능한 다른 스레드로 바꿀 수는 있지만 그 스레드가 `read()`를 호출한 흐름을 스스로 이어서 진행하는 것은 아니다.

여기서 중요한 것은 “스레드가 기다린다”는 말과 “CPU가 계속 그 스레드의 코드를 실행한다”는 말을 구분해야 한다는 점이다. Blocking I/O에서는 호출이 끝날 때까지 같은 실행 흐름이 다음 단계로 넘어가지 못한다. 데이터가 도착하거나 스트림이 끝났다는 결과를 받아야 그 다음 처리를 시작한다.

## 2. Non-Blocking I/O는 무엇이 다른가

Non-Blocking I/O는 데이터가 아직 준비되지 않았을 때 호출이 그 자리에서 기다리지 않고 반환하는 방식이다. 논블로킹 모드의 채널은 요청한 만큼의 데이터를 모두 읽지 못할 수 있고 지금 읽을 데이터가 없으면 0바이트를 반환할 수도 있다.

[SelectableChannel 문서](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/SelectableChannel.html)는 블로킹 모드에서는 채널의 I/O 작업이 완료될 때까지 블로킹하고 논블로킹 모드에서는 I/O 작업이 블로킹하지 않으며 요청한 것보다 적은 데이터 또는 아무 데이터도 전달하지 않을 수 있다고 설명한다.

```java
channel.configureBlocking(false);

int bytes = channel.read(buffer);
if (bytes == 0) {
    // 지금은 읽을 데이터가 없으므로 다른 작업으로 넘어간다.
}
```

여기서 `0`은 “읽기 작업이 끝났고 완료 결과를 받았다”는 뜻이 아니다. 지금 시점에는 읽을 데이터가 없었다는 뜻에 가깝다. 호출한 코드는 반환값을 확인한 뒤 다른 일을 하거나 다음 기회에 다시 읽기를 시도한다. 스트림 끝이라면 `read()`가 `-1`을 반환하는 경우처럼 반환값의 의미도 따로 확인해야 한다.

논블로킹 호출이 자동으로 완료 콜백을 보내는 것도 아니다. 채널의 읽기 호출이 기다리지 않고 돌아왔을 뿐이고 이후 언제 다시 읽을지와 읽은 데이터를 어떻게 처리할지는 애플리케이션의 흐름이 결정한다.

## 3. Selector는 준비 상태를 알려준다

채널 하나만 직접 확인한다면 논블로킹 모드에서도 애플리케이션이 반복해서 각 채널을 확인해야 할 수 있다. Java NIO의 `Selector`는 여러 `SelectableChannel`을 등록해 두고 그중 읽기나 쓰기 같은 작업을 수행할 준비가 된 채널을 찾는 역할을 한다.

흐름을 단순화하면 다음과 같다.

```java
Selector selector = Selector.open();

channel.configureBlocking(false);
channel.register(selector, SelectionKey.OP_READ);

int readyCount = selector.select(); // 준비된 채널이 생길 때까지 기다릴 수 있다.
```

채널을 등록할 때는 관심 있는 작업을 지정한다. 선택 작업이 끝나면 애플리케이션은 선택된 키에서 채널을 얻고 실제 `read()`나 `write()`를 수행한다. [java.nio.channels 패키지 문서](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/package-summary.html)도 채널을 논블로킹 모드로 바꾼 뒤 Selector에 등록하고 선택된 키에서 해당 채널을 얻어 필요한 I/O를 수행하는 흐름을 설명한다.

Selector가 직접 채널의 데이터를 읽어 주는 것은 아니다. Selector는 “이 채널에 관심 있는 작업을 시도해 볼 준비가 되었다”는 정보를 모으고 애플리케이션은 그 알림을 바탕으로 실제 I/O를 수행한다. 준비 상태가 곧 I/O 완료를 뜻하지도 않는다. 공식 문서도 선택 키가 알려 주는 준비 상태는 힌트이며 실제 작업이 반드시 블로킹 없이 끝난다는 보장은 아니라고 설명한다.

![Blocking I/O와 Selector 기반 Non-Blocking I/O에서 호출 스레드가 데이터를 기다리는 흐름 비교](/assets/images/2026-10-30-blocking-non-blocking-io/blocking-non-blocking-selector.svg)

*그림 1. Blocking I/O에서는 `read()` 호출이 반환될 때까지 같은 흐름이 기다리고 Selector 기반 구조에서는 준비된 채널을 애플리케이션이 골라 처리한다.*

여기서 논블로킹 채널과 `Selector.select()`를 같은 의미로 보면 안 된다. 채널의 I/O 호출은 논블로킹으로 설정할 수 있지만 `select()`는 준비된 채널이 생길 때까지 기다릴 수 있다. 채널을 하나씩 읽는 호출은 기다리지 않게 만들고 Selector의 선택 작업은 여러 채널의 준비 상태가 바뀌기를 기다리는 구조다.

## 4. Blocking / Non-Blocking과 Sync / Async를 구분하기

두 구분은 모두 호출의 흐름을 설명하지만 판단 기준이 다르다.

| 구분 | 판단하는 기준 | 예시 |
| --- | --- | --- |
| Blocking / Non-Blocking | I/O 호출 자체가 준비될 때까지 기다리는가 | `InputStream.read()`와 논블로킹 채널의 `read()` |
| Synchronous / Asynchronous | 결과나 완료를 어떤 흐름으로 확인하는가 | 호출 흐름에서 직접 확인하거나 `Future`·`CompletionHandler`로 전달받는 방식 |

`InputStream.read()`처럼 데이터가 올 때까지 호출이 반환되지 않는 것은 블로킹이면서 동기적인 흐름으로 볼 수 있다. 논블로킹 채널에서 `read()`를 호출하고 `0`을 받은 뒤 애플리케이션이 나중에 다시 확인하는 방식은 호출 자체는 논블로킹이지만 결과 확인은 호출 흐름이 직접 맡는다.

반면 Java의 비동기 채널은 작업을 시작한 뒤 완료 결과를 `Future`로 확인하거나 `CompletionHandler`로 전달받는다. [java.nio.channels 패키지 문서](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/package-summary.html)는 비동기 채널이 보류 중인 결과를 나타내는 `Future`를 반환하고 작업 완료 시 `CompletionHandler`를 호출한다고 설명한다.

그렇다고 비동기 처리가 자동으로 병렬 실행을 보장하는 것은 아니다. 비동기 작업을 시작한 뒤 `Future.get()`으로 결과를 기다리면 호출한 스레드는 그 시점에 다시 블로킹된다. 비동기라는 말은 작업의 완료 통지가 호출 흐름과 분리된다는 뜻이지 어떤 스레드도 기다리지 않는다는 뜻은 아니다.

## 5. 백엔드 요청 처리와 연결하기

백엔드 요청 처리에서는 하나의 요청을 맡은 스레드가 DB 조회나 외부 API 응답을 기다리는 상황을 자주 만난다. 블로킹 방식이라면 I/O 호출이 반환될 때까지 그 요청을 처리하던 스레드는 다음 비즈니스 로직으로 넘어가지 못한다. 대기 중인 요청이 늘어나면 스레드가 점유되고 응답 지연이나 Thread Pool의 대기열로 이어질 수 있다.

이 흐름은 [스레드는 많을수록 좋을까? Context Switching과 Thread Pool의 관계](https://w00lam.github.io/posts/thread-pool-context-switching/)에서 정리한 내용과도 연결된다. I/O를 기다리는 요청이 있다고 해서 스레드 수를 계속 늘리면 처리량이 항상 증가하는 것은 아니다. 스레드 메모리와 전환 비용이 커지고 DB Connection Pool이나 외부 시스템의 처리량 같은 다른 제한도 남아 있기 때문이다.

Selector 기반의 다중화 구조는 연결마다 I/O 대기 스레드를 하나씩 두는 부담을 줄이는 데 도움을 줄 수 있다. 한 Selector가 여러 채널의 준비 상태를 확인하고 준비된 채널만 애플리케이션이 처리하기 때문이다. [java.nio.channels 패키지 문서](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/package-summary.html)도 Selector와 SelectableChannel, SelectionKey를 이용한 다중화 논블로킹 I/O가 스레드 중심의 블로킹 I/O보다 확장성이 높은 구조라고 설명한다.

다만 Selector가 I/O 지연 자체를 없애는 것은 아니다. `select()`를 호출한 스레드는 준비 상태를 기다릴 수 있고 준비된 채널을 처리하는 CPU 시간도 필요하다. 그 뒤의 DB, 외부 API, 저장소가 병목이라면 Selector를 사용해도 그 대기까지 사라지지 않는다. 논블로킹은 대기 구조를 바꾸는 방법이지 모든 병목을 자동으로 제거하는 기능은 아니다.

## 6. 학습 중 바뀐 이해

처음에는 Blocking과 Non-Blocking을 “기다리느냐 기다리지 않느냐”로만 나누고 Sync와 Async도 같은 축에 놓으려 했다. 다시 정리해 보니 Blocking과 Non-Blocking은 I/O 호출 중 호출 스레드가 기다리는지를 보고 Synchronous와 Asynchronous는 결과나 완료를 어떤 흐름으로 확인하는지를 본다. 서로 관련은 있지만 같은 구분이 아니었다.

Selector도 여러 채널의 데이터를 직접 처리하는 도구라고 생각하기 쉬웠다. 실제로는 등록된 채널의 준비 상태를 알려 주고 애플리케이션이 선택된 채널을 가져와 I/O를 수행한다. 선택 키가 있다는 것은 작업을 시도할 준비가 되었다는 뜻이지 이미 읽기나 쓰기가 끝났다는 뜻이 아니다.

마지막으로 논블로킹 I/O를 사용하면 모든 스레드가 전혀 기다리지 않는다고 생각하면 안 된다. 채널의 `read()`는 데이터를 기다리지 않고 반환할 수 있지만 `Selector.select()`는 준비된 채널을 기다릴 수 있다. 비동기 작업도 `Future.get()`을 호출하는 순간에는 결과를 기다리는 흐름으로 바뀔 수 있다.

## 7. 오늘의 정리

- Blocking I/O에서는 호출 스레드가 I/O 호출의 반환을 기다리므로 다음 코드를 바로 실행하지 못한다.
- Non-Blocking I/O에서는 데이터가 없을 때 호출이 반환될 수 있고 논블로킹 채널의 읽기 결과가 0일 수 있다.
- Selector는 여러 채널의 준비 상태를 알려 주며 실제 읽기와 쓰기는 애플리케이션이 수행한다.
- `Selector.select()`는 준비된 채널이 생길 때까지 기다릴 수 있고 준비 상태는 I/O 완료와 다르다.
- Blocking / Non-Blocking은 호출 중 대기 여부를, Sync / Async는 결과 확인 흐름을 구분한다.

오늘은 `InputStream.read()`가 데이터를 기다리는 동안 같은 호출 스레드가 다음 줄로 넘어가지 못한다는 사실에서 출발했다. 논블로킹 채널은 데이터가 없을 때 호출을 반환하고 Selector는 여러 채널 중 처리할 준비가 된 채널을 알려 준다. 하지만 Selector 자체가 항상 즉시 반환하는 것은 아니며 비동기 작업도 결과를 기다리는 순간에는 블로킹될 수 있다. 결국 I/O를 이해할 때는 “어떤 호출이 무엇을 기다리는가”와 “결과를 어떤 흐름으로 확인하는가”를 따로 물어야 했다.

### 참고 자료 (Sources)

* Oracle, [InputStream (Java SE 21)](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/InputStream.html) — `read()`의 블로킹과 반환 조건을 확인했다.
* Oracle, [SelectableChannel (Java SE 21)](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/SelectableChannel.html) — 채널의 블로킹 모드와 논블로킹 모드 차이를 확인했다.
* Oracle, [Selector (Java SE 21)](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/Selector.html) — 준비된 채널을 선택하는 역할과 `select()`의 대기 동작을 확인했다.
* Oracle, [java.nio.channels package (Java SE 21)](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/package-summary.html) — Selector 기반 다중 채널 처리와 비동기 채널의 `Future`·`CompletionHandler`를 확인했다.
