---
title: Spring 테스트 구조에서 sourceSet 분리와 Testcontainers를 써보며 느낀 점
date: 2026-01-20
categories: [Java, Spring]
tags: [Spring, Java, 테스트, 통합 테스트, Testcontainers, Docker, 테스트 환경 설계, sourceSet]
permalink: /posts/spring-test-sourceset-testcontainers/
---

## 들어가며

좌석 예약 동시성 테스트를 구현하면서 **unit / integration 테스트를 명확히 나누고 싶다**는 생각이 들었다. 패키지만 갈라놓고 끝내는 대신, Gradle의 `sourceSet`으로 테스트 자체를 물리적으로 떼어내고, 통합 테스트에서는 **Testcontainers(MySQL)** 로 실제와 유사한 환경을 만들어보려 했다.

해보고 내린 결론은 이렇다. 틀린 선택은 아니었지만, 지금 맥락에서는 과한 구조였다. 이 글에는 내가 시도한 구조와 그 과정에서 부딪힌 문제들, 그리고 실무에서는 왜 다른 선택을 더 많이 하는지를 적어둔다.

## 내가 시도한 테스트 구조

### 1. 테스트 sourceSet 분리

```text
src/
 ├─ testUnit/
 │   └─ java
 ├─ testIntegration/
 │   └─ java
```

`testUnit`과 `testIntegration`을 각각 별도의 sourceSet으로 정의하고, 전용 Gradle task(`testUnit`, `testIntegration`)를 만든 뒤 classpath와 runtimeClasspath를 직접 설정했다.

의도는 명확했다. 단위 테스트는 빠르게 돌리고, DB와 Redis, 동시성 검증은 통합 테스트로 떼어내는 것이었다.

### 2. 통합 테스트에서 Testcontainers 사용

```java
@Configuration
class TestcontainersConfiguration {

    public static final MySQLContainer<?> MYSQL_CONTAINER;

    static {
        MYSQL_CONTAINER = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("hhplus")
            .withUsername("test")
            .withPassword("test");
        MYSQL_CONTAINER.start();

        System.setProperty("spring.datasource.url", MYSQL_CONTAINER.getJdbcUrl());
        System.setProperty("spring.datasource.username", MYSQL_CONTAINER.getUsername());
        System.setProperty("spring.datasource.password", MYSQL_CONTAINER.getPassword());
    }
}
```

테스트를 실행하면 MySQL 컨테이너가 자동으로 뜨고, Spring Datasource가 그 컨테이너에 연결된다. 이론상으로는 테스트를 돌리는 것만으로 DB 환경이 알아서 준비되는 셈이었다.

## 실제로 겪은 문제들

### 1. 컨테이너가 안 뜨는 문제

통합 테스트를 실행해도 Docker 컨테이너가 뜨지 않았다. 원인은 단순했지만 찾기는 어려웠다. `TestcontainersConfiguration`은 `test` sourceSet에 있는데, 정작 테스트는 `testIntegration` sourceSet에서 돌아갔던 것이다. 즉 **Spring context에 해당 Configuration이 아예 로딩되지 않았다.**

### 2. Spring Boot + sourceSet 분리의 복잡성

Spring Boot는 기본적으로 `src/test/java`, 하나의 test classpath, 그리고 자동 설정 스캔을 강하게 전제한다. 그런데 sourceSet을 나누는 순간부터 어떤 Configuration이 로딩되는지, profile이 어떤 순서로 적용되는지, static initializer가 언제 실행되는지를 전부 개발자가 직접 책임져야 한다.

### 3. Testcontainers는 특히 예민하다

Testcontainers는 클래스 로딩 시점, static block 실행 여부, 테스트 JVM 생명주기에 크게 의존한다. 조금만 어긋나도 컨테이너가 아예 뜨지 않거나, DB는 떠 있는데 데이터가 비어 있거나, 로컬과 CI 환경이 어긋나는 식으로 티가 났다.

## 그럼 이 구조는 나쁜 선택일까?

**아니다.** 다만 쓰는 맥락을 꽤 가린다.

### 실제로 이런 구조를 쓰는 곳

중대형 이상의 서비스, 테스트가 수천 개를 넘는 프로젝트, CI에서 unit → integration → e2e를 단계별로 나누는 파이프라인, 테스트 실행 시간이 곧 비용인 조직. 한마디로 테스트를 하나의 제품처럼 관리하는 팀이 이런 구조를 쓴다.

### 하지만 개인 프로젝트 / 과제에서는?

| 항목     | 비용 | 이득 |
| ------ | -- | -- |
| 구조 복잡도 | 높음 | 낮음 |
| 디버깅 시간 | 큼  | 작음 |
| 설명 난이도 | 큼  | 작음 |

결국 테스트로 얻는 가치보다 구조를 유지하는 비용이 더 커진다.

## 실무에서 더 흔한 선택

### 80%의 팀이 쓰는 방식

```text
src/test/java
 ├─ unit
 ├─ integration
 └─ e2e
```

sourceSet은 따로 나누지 않는다. test task는 하나로 두고, 패키지나 태그, CI 옵션으로 종류를 구분한다. 구조가 단순하니 잘 깨지지 않고, 새로 보는 사람에게 설명하기도 쉽다.

### 왜 이 방식이 선호될까?

Spring Boot의 기본 철학과 잘 맞고, Testcontainers를 붙이기도 훨씬 간단하다. 새 팀원이 이해하기 쉽다는 점도 크다.

## 지금 시점에서의 결론

이번 구조는 이렇게 정리할 수 있다.

> 실무에서도 쓰이는 고급 구조이지만,
> 지금 맥락에서는 문제를 해결하기보다 문제를 만들 가능성이 컸다.

그래도 남은 것이 있다. sourceSet 분리가 실제로 얼마나 까다로운지 몸으로 겪었다. Spring Test와 Testcontainers가 맞물리는 경계에서 직접 헤맸고, 그 덕에 왜 많은 팀이 "단순한 구조"를 택하는지 이제는 이해가 된다.

## 마치며

다음에 이 구조를 다시 꺼내든다면 팀 규모와 CI 파이프라인, 테스트 개수와 실행 비용부터 따져볼 생각이다.

지금은 구조를 단순하게 가져가고, **동시성, 분산락, 트랜잭션 경계 같은 핵심 문제에 집중하는 편이 더 나은 선택**이었다. 이번에 헤맨 경험이 다음 선택을 좀 더 정확하게 만들어 줄 거라고 생각한다.
