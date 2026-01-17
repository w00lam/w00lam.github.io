---
title: "Spring Data JPA 테스트에서 JpaRepository 메서드가 사라진 이유"
date: 2026-01-17
categories: [Spring, JPA, Gradle]
tags: [spring-data-jpa, gradle, sourceset, classpath, ide]
---

## 문제 상황

멀티 SourceSet(`testUnit`, `testIntegration`) 환경에서 테스트를 구성하던 중  
**컴파일 타임(IDE) 기준으로 이해하기 어려운 문제**가 발생했다.

> `JpaReservationRepository` 인터페이스는 정상적으로 보이는데  
> `JpaRepository`가 제공하는 `findAll()`, `count()` 같은 메서드가  
> **IDE와 컴파일러에서 인식되지 않았다.**

런타임 오류가 아니라 **IDE 단계에서부터 메서드가 사라진 상태**였다.

---

## 처음에 의심했던 원인들

문제 원인을 파악하기 전, 일반적으로 아래와 같은 가능성을 먼저 의심하게 된다.

### 후보 1. 잘못된 import
- `org.springframework.data.jpa.repository.JpaRepository`가 아닌
- 다른 Repository 타입을 import했을 가능성

### 후보 2. 필드 타입을 구현체로 착각
- Repository를 인터페이스가 아닌 구현체처럼 사용했을 가능성

### 후보 3. IDE 캐시 문제
- IntelliJ 캐시 오류 → Invalidate Caches & Restart

하지만 위 세 가지 모두 **문제의 원인이 아니었다.**

---

## 실제 증상 정리

정확한 증상은 다음과 같았다.

- `JpaReservationRepository` 인터페이스 자체는 정상 인식
- 하지만 **부모 인터페이스인 `JpaRepository`의 상속 메서드만 증발**
- IDE 기준으로는  
  > “부모 인터페이스가 없는 인터페이스”  
  처럼 보이는 상태

이 시점에서 문제는 **코드가 아니라 Classpath**임이 명확해졌다.

---

## 첫 번째 문제 원인: testIntegration SourceSet에 JPA 의존성 미연결

멀티 SourceSet 환경에서는  
**각 SourceSet이 독립적인 Classpath**를 가진다.

첫 번째로 확인된 문제는 다음이었다.

> `testIntegration` SourceSet에  
> **Spring Data JPA 의존성이 포함되어 있지 않았다.**

### 해결

```gradle
dependencies {
    testIntegrationImplementation("org.springframework.boot:spring-boot-starter-data-jpa")
}
```

## 두 번째 진짜 원인: compileClasspath를 덮어쓴 설정

첫 번째로 `testIntegration` SourceSet에 JPA 의존성을 추가하면서  
문제의 일부는 해결되는 듯 보였다.

하지만 여전히 IDE에서는  
`JpaRepository`의 상속 메서드들이 인식되지 않았다.

그래서 SourceSet 설정을 다시 하나씩 점검했고,  
그 과정에서 **결정적인 문제**를 발견했다.

```gradle
compileClasspath = files(
    sourceSets["main"].output,
    configurations.testCompileClasspath
)
```

## 왜 이 설정이 문제였을까?

이 설정의 핵심 문제는 `=` 연산자에 있다.

---

### 1. `=` 연산자는 기존 Classpath를 완전히 덮어쓴다

아래 설정은 Gradle이 기본적으로 구성해 둔 `compileClasspath`를 모두 제거하고  
지정한 값만 **강제로 덮어쓰는 구조**다.

```gradle
compileClasspath = files(
    sourceSets["main"].output,
    configurations.testCompileClasspath
)
```

이 설정으로 인해 컴파일 Classpath에는 다음 두 가지만 남게 된다.

- `sourceSets["main"].output`
- `configurations.testCompileClasspath`

기존에 Gradle이 자동으로 구성해 둔 **의존성 그래프는 모두 사라진 상태**였다.

---

### 2. `configurations.testCompileClasspath`의 한계

`testCompileClasspath`에는 다음까지만 포함된다.

- `testImplementation`

하지만 이 프로젝트는 **멀티 SourceSet 구조**를 사용하고 있었고,

- `testIntegrationImplementation`에서 확장한 의존성들은  
  `testCompileClasspath`에 **포함되지 않는다**

즉,

- `testIntegration`에서 필요한 JPA 관련 의존성들이
- 컴파일 Classpath에 **아예 올라오지 않는 구조**

가 만들어지고 있었다.

---

### 3. 그 결과 발생한 현상

Classpath에서 Spring Data JPA의 타입 정보가 제거되면서  
컴파일 단계에서 다음과 같은 문제가 발생했다.

- `JpaRepository` 타입 정보를 찾지 못함
- 부모 인터페이스를 인식하지 못함
- `findAll()`, `count()` 등 상속 메서드들이 IDE에서 증발

결과적으로 다음과 같은 상태가 되었다.

> **의존성은 선언되어 있지만**  
> **컴파일 Classpath에는 존재하지 않는 상태**

---

## 해결 방법: Classpath는 덮어쓰지 말고 누적한다

SourceSet의 `compileClasspath`는  
**반드시 누적(`+=`) 방식으로 구성해야 한다.**

---

sourceSets {
    create("testUnit") {
        java.srcDir("src/testUnit/java")
        resources.srcDir("src/testUnit/resources")

        compileClasspath += sourceSets["main"].output
        runtimeClasspath += output + compileClasspath
    }

    create("testIntegration") {
        java.srcDir("src/testIntegration/java")
        resources.srcDir("src/testIntegration/resources")
        resources.srcDir("src/test/resources")

        compileClasspath += sourceSets["main"].output
        runtimeClasspath += output + compileClasspath
    }
}

---

## 핵심 포인트 정리

### `compileClasspath += sourceSets["main"].output`

- Gradle이 이미 구성한 **의존성 그래프를 유지**
- `main` SourceSet의 **컴파일 결과만 추가**

### `runtimeClasspath += output + compileClasspath`

- 테스트 실행 시 필요한 **모든 클래스 보장**
- 컴파일 / 런타임 **Classpath 불일치 방지**

---

## 왜 IDE에서 먼저 문제가 드러났을까?

Spring Data JPA의 Repository 메서드들은  
**컴파일 타임에 인터페이스 상속 구조를 기준으로 해석**된다.

Classpath에 `JpaRepository`가 존재하지 않으면  
IDE는 다음과 같이 판단한다.

> “이 인터페이스는 아무 메서드도 상속하지 않는다”

그 결과 다음 메서드들이 IDE에서 사라진다.

- `findAll()`
- `count()`
- 기타 Spring Data JPA가 제공하는 메서드들

---

## 정리

### 이번 문제의 본질

- JPA의 문제가 아니다
- Spring의 문제가 아니다
- **Gradle SourceSet과 Classpath 설정 문제**다

---

### 기억할 교훈

- SourceSet은 의존성을 자동으로 공유하지 않는다
- `compileClasspath =` 설정은 매우 위험하다
- 멀티 SourceSet 환경에서는 다음을 반드시 구분해야 한다.

> **“의존성을 선언했다”**  
> **“Classpath에 포함됐다”**

이 둘은 전혀 다른 개념이다.

---

## 한 줄 요약

> **JpaRepository 메서드가 IDE에서 사라진다면**  
> **코드보다 먼저 Classpath를 의심하자.**
