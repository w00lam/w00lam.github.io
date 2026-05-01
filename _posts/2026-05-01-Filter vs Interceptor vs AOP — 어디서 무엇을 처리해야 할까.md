---
title: "Filter vs Interceptor vs AOP — 어디서 무엇을 처리해야 할까"
date: 2026-05-01
categories: [TIL, Backend, Spring]
tags: [Spring, Filter, Interceptor, AOP, Architecture]
---

## 배경

Spring을 사용하다 보면 공통 로직을 어디에 넣어야 할지 고민하게 된다.

* 인증 처리
* 로깅
* 예외 처리
* 권한 검사

처음에는 단순하게 “한 곳에서 처리하면 되지 않을까?”라고 생각했지만,
실제로는 **Filter / Interceptor / AOP 각각의 역할이 명확히 다르다**는 걸 알게 됐다.

특히 JWT 인증을 적용하면서 이 차이를 제대로 이해할 필요가 있었다.

---

## 전체 흐름에서 위치

이 세 가지를 이해하려면 먼저 요청 흐름을 기준으로 봐야 한다.

```text
Client Request
   ↓
Filter
   ↓
DispatcherServlet
   ↓
Interceptor
   ↓
Controller
   ↓
AOP (Service / Method 내부)
```

👉 핵심은 **어디에서 개입하느냐**다

---

## 1. Filter — 가장 앞단에서 요청을 가로챔

Filter는 Servlet 스펙에 포함된 개념이다.

* Spring이 아니라 **웹 서버 레벨**
* DispatcherServlet보다 **이전**에 실행됨

---

### 특징

* 요청/응답 자체를 직접 다룸
* 모든 요청에 대해 동작
* Spring Context와는 분리된 레이어

---

### 언제 사용하나

* 인증 (JWT, Spring Security)
* CORS 처리
* 인코딩 처리
* XSS 방어 등

---

### 핵심 느낌

> “이 요청 자체를 통과시킬지 말지 결정하는 단계”

---

## 2. Interceptor — 컨트롤러 전/후 제어

Interceptor는 Spring MVC에서 제공하는 기능이다.

* DispatcherServlet 이후
* Controller 호출 전/후에 개입

---

### 특징

* Handler(Controller) 기준으로 동작
* Spring Bean 사용 가능
* 세밀한 제어 가능

---

### 주요 메서드

* `preHandle` → 컨트롤러 실행 전
* `postHandle` → 컨트롤러 실행 후
* `afterCompletion` → 요청 완료 후

---

### 언제 사용하나

* 로그인 체크
* 권한 검사 (간단한)
* 요청 로깅
* API 호출 추적

---

### 핵심 느낌

> “이 요청을 컨트롤러까지 보내도 되는가?”

---

## 3. AOP — 메서드 단위로 개입

AOP는 Spring의 핵심 기능 중 하나다.

* Controller가 아니라 **비즈니스 로직 내부**
* 특정 메서드 실행 전/후에 개입

---

### 특징

* 프록시 기반
* 메서드 단위 제어
* 재사용 가능한 공통 로직 분리

---

### 언제 사용하나

* 트랜잭션 처리
* 로깅
* 성능 측정
* 예외 처리

---

### 핵심 느낌

> “이 로직 실행 전/후에 공통 처리를 하자”

---

## 비교 정리

| 구분    | Filter               | Interceptor        | AOP        |
| ----- | -------------------- | ------------------ | ---------- |
| 위치    | DispatcherServlet 이전 | 이후, Controller 전/후 | 메서드 내부     |
| 범위    | 모든 요청                | 특정 요청 (Handler 기준) | 특정 메서드     |
| 기술    | Servlet              | Spring MVC         | Spring     |
| 주요 목적 | 인증, 인프라 처리           | 요청 흐름 제어           | 비즈니스 로직 분리 |

---

## 언제 무엇을 써야 하는가

이게 실제로 가장 중요하다.

---

### Filter를 써야 할 때

* 인증 (JWT)
* 요청 자체를 차단해야 할 때

👉 요청이 **애초에 들어오면 안 되는 경우**

---

### Interceptor를 써야 할 때

* 로그인 체크
* 권한 검사
* 요청 로그

👉 Controller 실행 여부를 판단할 때

---

### AOP를 써야 할 때

* 트랜잭션
* 공통 로직 분리
* 로깅, 성능 측정

👉 비즈니스 로직 내부에서 공통 처리

---

## 실제로 겪었던 혼동

처음에는 이렇게 생각했다.

* “AOP로 인증 처리하면 되지 않나?”
* “Interceptor로도 다 되는 거 아닌가?”

하지만 구조를 보니 명확해졌다.

* 인증은 Filter (요청 차단)
* 요청 흐름 제어는 Interceptor
* 로직 내부 처리는 AOP

---

## 정리하면서 느낀 점

세 가지는 기능이 겹치는 게 아니라
**각자 책임이 다른 레이어**에 존재한다.

문제는 “무엇을 할 수 있느냐”가 아니라

> “이 로직은 어느 계층에서 처리하는 게 맞는가”

이 기준을 잡는 것이 훨씬 중요했다.

---

## 한 줄 정리

> Filter는 요청을 걸러내고, Interceptor는 흐름을 제어하며, AOP는 로직을 분리한다.
