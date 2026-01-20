---

title: Spring 테스트 구조에서 sourceSet 분리와 Testcontainers를 써보며 느낀 점
date: 2026-01-20
categories: [Java, Spring]
tags: [Spring, Java, 테스트, 통합 테스트, Testcontainers, Docker, 테스트 환경 설계, sourceSet]

---

## 들어가며

좌석 예약 동시성 테스트를 구현하면서 **unit / integration 테스트를 명확히 나누고 싶다**는 생각이 들었다.
단순히 패키지 분리로 끝내는 대신, Gradle의 `sourceSet`을 활용해 테스트 자체를 물리적으로 분리하고,
통합 테스트에서는 **Testcontainers(MySQL)** 를 사용해 실제와 유사한 환경을 만들고자 했다.

결론부터 말하면 **틀린 선택은 아니었지만, 지금 맥락에서는 과한 구조**였다.
이 글에서는 내가 시도한 구조와, 그 과정에서 겪은 문제들, 그리고 왜 실무에서는 다른 선택을 더 많이 하는지 정리해본다.

---

## 내가 시도한 테스트 구조

### 1. 테스트 sourceSet 분리

```text
src/
 ├─ testUnit/
 │   └─ java
 ├─ testIntegration/
 │   └─ java
```

* `testUnit`, `testIntegration`을 별도의 sourceSet으로 정의
* 각각 전용 Gradle task (`testUnit`, `testIntegration`) 생성
* classpath / runtimeClasspath 직접 설정

의도는 명확했다.

* 빠른 단위 테스트
* DB / Redis / 동시성 검증은 통합 테스트로 분리

---

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

* 테스트 실행 시 MySQL 컨테이너를 자동으로 띄우고
* Spring Datasource를 컨테이너로 연결

이론상으로는 **테스트 실행 = DB 환경 자동 준비**였다.

---

## 실제로 겪은 문제들

### 1. 컨테이너가 안 뜨는 문제

* 통합 테스트를 실행해도 Docker 컨테이너가 뜨지 않음
* 원인은 단순했지만 찾기 어려웠다

👉 `TestcontainersConfiguration`은 `test` sourceSet에 있고,
👉 실제 테스트는 `testIntegration` sourceSet에서 실행

즉, **Spring context에 해당 Configuration이 로딩되지 않았다.**

---

### 2. Spring Boot + sourceSet 분리의 복잡성

Spring Boot는 기본적으로 다음을 강하게 가정한다.

* `src/test/java`
* 하나의 test classpath
* 자동 설정 스캔

sourceSet을 나누는 순간부터:

* 어떤 Configuration이 로딩되는지
* profile 적용 순서
* static initializer 실행 시점

👉 전부 개발자가 직접 책임져야 한다.

---

### 3. Testcontainers는 특히 예민하다

Testcontainers는:

* 클래스 로딩 시점
* static block 실행 여부
* 테스트 JVM 생명주기

에 크게 의존한다.

조금만 어긋나도 결과는:

* 컨테이너 미실행
* DB는 있는데 데이터 없음
* 로컬/CI 환경 불일치

이었다.

---

## 그럼 이 구조는 나쁜 선택일까?

**아니다.** 다만 쓰는 맥락을 많이 가린다.

### 실제로 이런 구조를 쓰는 곳

* 중대형 이상 서비스
* 테스트 수천 개 이상
* CI에서 unit → integration → e2e 단계 분리
* 테스트 실행 시간이 비용인 조직

👉 테스트를 하나의 제품처럼 관리하는 팀

---

### 하지만 개인 프로젝트 / 과제에서는?

| 항목     | 비용 | 이득 |
| ------ | -- | -- |
| 구조 복잡도 | 높음 | 낮음 |
| 디버깅 시간 | 큼  | 작음 |
| 설명 난이도 | 큼  | 작음 |

👉 **테스트 가치보다 유지 비용이 커진다.**

---

## 실무에서 더 흔한 선택

### 80%의 팀이 쓰는 방식

```text
src/test/java
 ├─ unit
 ├─ integration
 └─ e2e
```

* sourceSet 분리 ❌
* 하나의 test task
* 패키지 / 태그 / CI 옵션으로 분리

👉 단순하고, 안정적이고, 설명하기 쉽다.

---

### 왜 이 방식이 선호될까?

* Spring Boot 기본 철학과 잘 맞음
* Testcontainers 적용이 훨씬 단순
* 새 팀원이 이해하기 쉬움

---

## 지금 시점에서의 결론

이번 구조는 이렇게 정리할 수 있다.

> 실무에서도 쓰이는 고급 구조이지만,
> 지금 맥락에서는 문제를 해결하기보다 문제를 만들 가능성이 컸다.

하지만 동시에 중요한 점도 있다.

* sourceSet 분리의 실제 난이도를 체감했고
* Spring Test + Testcontainers의 경계 지점을 직접 겪었으며
* 왜 많은 팀이 "단순한 구조"를 택하는지 이해하게 됐다.

---

## 마치며

다음에 다시 이 구조를 쓴다면,

* 팀 규모
* CI 파이프라인
* 테스트 개수와 실행 비용

을 먼저 고려할 것이다.

지금은 구조를 단순화하고,
**동시성, 분산락, 트랜잭션 경계 같은 핵심 문제에 집중하는 게 더 좋은 선택**이었다.

이 경험은 분명 다음 선택을 더 정확하게 만들어 줄 거라고 생각한다.
