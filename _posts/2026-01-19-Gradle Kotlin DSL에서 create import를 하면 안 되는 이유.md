---
title: "Gradle Kotlin DSL에서 create import를 하면 안 되는 이유"
date: 2026-01-19
categories: [Spring, Gradle]
tags: [Gradle, Kotlin DSL, Test, Build]
---

## 문제 상황

Gradle Kotlin DSL로 커스텀 `sourceSet`을 추가하다 보면 IDE가 이런 제안을 하는 순간이 온다.

> "create()에 import가 필요합니다"

그리고 IDE는 친절하게 다음과 같은 후보를 내민다.

* `kotlin.collections.create`
* `java.util.create`
* 기타 전혀 관계없는 `create`

하지만 이 상황에서의 **정답은 단 하나다.**

> 👉 **아무 것도 import 하면 안 된다**

IDE가 잘못된 방향으로 유도하고 있는 것이다.

---

## 왜 import 추천이 뜨는가 (핵심 원인)

```kotlin
sourceSets {
    create("testUnit") {
        // ...
    }
}
```

이 코드는 **Gradle Kotlin DSL 문맥**에서는 전혀 문제가 없다.

하지만 IDE는 이 코드를:

* Gradle DSL이 아닌
* **일반 Kotlin 코드**로 오해한다

그 결과 `create()`를 다음과 같이 해석하려고 시도한다.

* Kotlin Collection 함수
* Java Utility 함수

그래서 전혀 관계없는 `create` import들을 추천하게 되는 것이다.

👉 **이 추천들은 전부 잘못된 후보**다.

---

## 결론부터 말하면

* IDE가 틀렸다
* Gradle DSL에서 `create`는 import 대상이 아니다
* import를 추가하면 오히려 DSL 맥락이 깨진다

---

## ✅ 올바른 해결 방법 (가장 확실한 방식)

### 🔹 1. `create` 대신 `register` 사용 (강력 추천)

Gradle Kotlin DSL에서 **정석**으로 권장되는 방식이다.

```kotlin
sourceSets {
    val main by getting

    register("testUnit") {
        java.srcDir("src/testUnit/java")
        resources.srcDir("src/testUnit/resources")

        compileClasspath += main.output
        runtimeClasspath += output + compileClasspath
    }

    register("testIntegration") {
        java.srcDir("src/testIntegration/java")
        resources.srcDir("src/testIntegration/resources")
        resources.srcDir("src/test/resources")

        compileClasspath += main.output
        runtimeClasspath += output + compileClasspath
    }
}
```

이렇게 하면:

* ❌ `create` 관련 import 제안 사라짐
* ❌ 타입 추론 오류 사라짐
* ❌ IDE 경고 대부분 해결

> `register`는 lazy configuration을 사용하기 때문에
> Gradle 철학에도 더 잘 맞는다.

---

### 🔹 2. 정말 `create`를 쓰고 싶다면 (비추천)

가능은 하지만 조건이 있다.

* **절대 import를 추가하지 말 것**
* 반드시 `val main by getting`을 사용할 것

```kotlin
sourceSets {
    val main by getting

    create("testUnit") {
        java.srcDir("src/testUnit/java")
        resources.srcDir("src/testUnit/resources")
        compileClasspath += main.output
    }
}
```

그래도 IDE는 계속 경고를 띄울 가능성이 높다.

---

## ❌ 절대 하면 안 되는 것

다음 중 하나라도 하면 **Gradle DSL 문맥이 완전히 깨진다.**

* IDE가 추천하는 `create` import 추가 ❌
* `import kotlin.collections.create` ❌
* `import org.gradle.api.create` ❌

이 순간부터 DSL이 아니라 **일반 Kotlin 코드**로 인식된다.

---

## 한 줄 요약

> **Gradle Kotlin DSL에서 `create`는 import 대상이 아니다.**
>
> IDE가 헷갈린 것이고, `register`로 바꾸는 게 가장 깔끔한 해결책이다.

이 문제를 만났다면 IDE를 믿지 말고 Gradle DSL 문맥을 믿자.
