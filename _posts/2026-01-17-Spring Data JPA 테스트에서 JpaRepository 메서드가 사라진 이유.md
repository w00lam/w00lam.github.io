---
title: "Spring Data JPA 테스트에서 JpaRepository 메서드가 사라진 이유"
date: 2026-01-17
categories: [Spring, JPA, Gradle]
tags: [spring-data-jpa, gradle, sourceset, classpath, ide]
permalink: /posts/jpa-method-missing/
---

## 문제 상황

멀티 SourceSet(`testUnit`, `testIntegration`) 환경에서 테스트를 구성하다가 이상한 문제를 만났다. 런타임이 아니라 컴파일 타임, 그러니까 IDE 단계에서부터 설명이 안 되는 증상이었다.

`JpaReservationRepository` 인터페이스 자체는 멀쩡해 보이는데, `JpaRepository`가 제공하는 `findAll()`, `count()` 같은 메서드를 IDE도 컴파일러도 알아보지 못했다. 처음부터 IDE에서 메서드가 사라져 있는 상태였다.

## 처음에 의심했던 원인들

원인을 찾기 전에는 흔한 가능성부터 하나씩 짚어봤다. 먼저 import를 잘못했나 싶었다. `org.springframework.data.jpa.repository.JpaRepository`가 아니라 엉뚱한 Repository 타입을 가져왔을 수 있으니까. 필드 타입을 인터페이스가 아니라 구현체처럼 착각한 건 아닌지도 봤고, IntelliJ 캐시가 꼬였을 가능성도 있어서 Invalidate Caches & Restart까지 돌려봤다. 하지만 셋 다 원인이 아니었다.

## 실제 증상 정리

증상을 다시 들여다봤다. `JpaReservationRepository` 인터페이스 자체는 정상적으로 인식됐다. 문제는 부모 인터페이스인 `JpaRepository`에서 상속받은 메서드만 통째로 증발했다는 점이다. IDE 입장에서는 마치 부모 인터페이스가 없는 인터페이스처럼 보였다. 여기까지 오니 문제가 코드가 아니라 Classpath에 있다는 게 분명해졌다.

## 첫 번째 문제 원인: testIntegration SourceSet에 JPA 의존성 미연결

멀티 SourceSet 환경에서는 SourceSet마다 Classpath가 독립적으로 구성된다. 처음 확인된 문제가 바로 여기서 나왔다. `testIntegration` SourceSet에 Spring Data JPA 의존성이 빠져 있었던 것이다.

### 해결

```gradle
dependencies {
    testIntegrationImplementation("org.springframework.boot:spring-boot-starter-data-jpa")
}
```

## 두 번째 진짜 원인: compileClasspath를 덮어쓴 설정

`testIntegration` SourceSet에 JPA 의존성을 추가하자 문제가 일부 풀렸다. 하지만 IDE는 여전히 `JpaRepository`의 상속 메서드를 인식하지 못했다. 그래서 SourceSet 설정을 처음부터 하나씩 다시 뜯어봤고, 그 과정에서 진짜 문제를 찾았다.

```gradle
compileClasspath = files(
    sourceSets["main"].output,
    configurations.testCompileClasspath
)
```

## 왜 이 설정이 문제였을까?

핵심은 `=` 연산자다.

이 설정은 Gradle이 기본으로 구성해 둔 `compileClasspath`를 전부 지우고 지정한 값으로 강제로 덮어쓴다. 그래서 컴파일 Classpath에는 `sourceSets["main"].output`과 `configurations.testCompileClasspath` 둘만 남고, Gradle이 자동으로 엮어 두었던 의존성 그래프는 통째로 날아간다.

문제는 여기서 그치지 않는다. `configurations.testCompileClasspath`가 담는 건 `testImplementation`까지다. 그런데 이 프로젝트는 멀티 SourceSet 구조라서, `testIntegrationImplementation`으로 확장한 의존성은 `testCompileClasspath`에 들어오지 않는다. 결국 `testIntegration`에 필요한 JPA 의존성이 컴파일 Classpath에는 아예 올라오지 못한다.

그 결과 Classpath에서 Spring Data JPA의 타입 정보가 사라지면서 컴파일 단계에서 문제가 줄줄이 터졌다. `JpaRepository` 타입을 찾지 못하고, 부모 인터페이스를 인식하지 못하고, `findAll()`, `count()` 같은 상속 메서드가 IDE에서 증발했다. 의존성은 분명히 선언해 뒀는데 정작 컴파일 Classpath에는 존재하지 않는 상태였다.

## 해결 방법: Classpath는 덮어쓰지 말고 누적한다

SourceSet의 `compileClasspath`는 덮어쓰지 말고 `+=`로 누적해서 쌓아야 한다.

```gradle
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
```

`compileClasspath += sourceSets["main"].output`은 Gradle이 이미 만들어 둔 의존성 그래프를 그대로 두고 `main`의 컴파일 결과만 얹는다. `runtimeClasspath += output + compileClasspath`는 테스트를 실행할 때 필요한 클래스를 모두 챙겨서 컴파일과 런타임 사이의 Classpath 불일치를 막아 준다.

## 왜 IDE에서 먼저 문제가 드러났을까?

Spring Data JPA의 Repository 메서드는 컴파일 타임에 인터페이스 상속 구조를 기준으로 풀린다. 그래서 Classpath에 `JpaRepository`가 없으면 IDE는 이 인터페이스가 아무 메서드도 상속하지 않는다고 판단해 버린다. 그 순간 `findAll()`, `count()`을 비롯해 Spring Data JPA가 제공하던 메서드들이 IDE에서 사라진다.

## 정리

결국 이번 문제는 JPA도 Spring도 아닌 Gradle SourceSet과 Classpath 설정 문제였다. SourceSet은 의존성을 알아서 공유해 주지 않고, `compileClasspath =`처럼 덮어쓰는 설정은 위험하다. 특히 멀티 SourceSet 환경에서 조심할 건, '의존성을 선언했다'와 'Classpath에 포함됐다'가 결코 같은 말이 아니라는 점이다. JpaRepository 메서드가 IDE에서 사라졌다면, 코드보다 Classpath를 먼저 의심하자.
