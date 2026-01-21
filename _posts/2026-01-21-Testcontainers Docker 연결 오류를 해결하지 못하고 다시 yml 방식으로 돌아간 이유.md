---
title: Testcontainers Docker 연결 오류를 해결하지 못하고 다시 yml 방식으로 돌아간 이유
date: 2026-01-21
categories: [Spring]
tags: [Spring Boot, Testcontainers, Docker, Windows, Testing]
---

## 들어가며

개인 프로젝트에서 통합 테스트 환경을 구성하면서  
**Testcontainers로 Docker 컨테이너를 띄우는 방식**을 다시 시도했다.

과거에는 `docker-compose.yml` 기반으로 테스트 환경을 구성해  
큰 문제 없이 사용한 경험이 있었고,  
이번에는 조금 더 테스트 친화적인 구조를 만들고 싶어  
Testcontainers를 선택했다.

하지만 결과적으로는  
**Docker 연결 단계에서 계속 같은 오류를 넘지 못했고**,  
Testcontainers 방식은 잠시 내려두고  
다시 yml 기반 컨테이너 실행 방식으로 돌아가기로 했다.

이 글은  
“왜 Testcontainers를 포기했는지”에 대한 해결 글이 아니라,  
**해결되지 않은 상태에서의 판단과 정리**에 가깝다.

---

## 발생한 오류

테스트 실행 시 가장 먼저 마주친 에러는 다음과 같았다.

- `EnvironmentAndSystemPropertyClientProviderStrategy`
- `NpipeSocketClientProviderStrategy`

형태는 조금씩 달랐지만, 요지는 같았다.

> Testcontainers가 Docker 데몬에 연결하지 못한다

Windows 환경에서 Testcontainers를 사용할 때  
자주 언급되는 에러 메시지들이기도 했다.

---

## 에러 메시지가 의미하는 것은 이해했다

여러 글을 찾아보면서  
이 에러들이 무엇을 의미하는지는 충분히 이해할 수 있었다.

정리하면 다음과 같다.

- Testcontainers는 내부적으로 Docker Client를 통해 Docker 데몬과 통신한다
- Windows에서는 보통 **Docker Desktop + npipe 방식**을 사용한다
- 위 전략 클래스들은  
  “어떤 방식으로 Docker에 연결할지”를 시도하다가 실패했음을 의미한다

즉,

> Docker가 실행 중이 아니거나  
> Docker Desktop과의 통신 경로를 찾지 못했다

라는 메시지였다.

---

## 인터넷에 나온 해결 방법들

문제는 여기서부터였다.

검색을 통해 나온 해결 방법들은 거의 다 시도해봤다.

- Docker Desktop 실행 여부 확인
- WSL2 설정 확인
- Docker Context 확인
- 환경 변수 설정 (`DOCKER_HOST`)
- Testcontainers 버전 변경
- Spring Boot / JUnit 조합 변경
- 관리자 권한 실행

하지만 결과는 모두 같았다.

> 동일한 에러 메시지 반복

환경 설정을 하나 바꿀 때마다  
“이번엔 되지 않을까?” 기대했지만,  
테스트는 항상 Docker 연결 단계에서 멈췄다.

---

## 개인 프로젝트에서의 판단

이 시점에서 선택지가 생겼다.

- Docker + Testcontainers 환경을 끝까지 파고든다
- 아니면, 이미 검증된 방식으로 돌아간다

지금은 **팀 프로젝트가 아닌 개인 프로젝트**였고,  
목표는 Docker 자체를 정복하는 것이 아니라  
**도메인 로직과 테스트 구조를 검증하는 것**이었다.

그리고 중요한 점 하나.

> 과거에는 yml 기반 컨테이너 실행 방식으로  
> 같은 환경에서 문제없이 테스트를 구성한 경험이 있었다

그래서 이번에는  
“Testcontainers를 반드시 써야 한다”는 고집을 내려놓기로 했다.

---

## 다시 yml 방식으로 돌아가기로 한 이유

결론적으로 판단 기준은 단순했다.

- 에러의 의미는 이해했다
- 하지만 해결되지 않았다
- 개인 프로젝트에서 환경 이슈에 과도한 시간을 쓰고 싶지 않았다
- 이미 성공 경험이 있는 방식이 있었다

그래서 이번 단계에서는

- Testcontainers 도입은 보류
- `docker-compose.yml` 기반 컨테이너 실행으로 회귀
- 테스트는 그 위에서 안정적으로 진행

이라는 선택을 했다.

---

## 마무리

Testcontainers는 분명 강력한 도구다.  
하지만 모든 상황에서 반드시 써야 하는 도구는 아니다.

이번 경험을 통해 느낀 점은 하나다.

> 기술 선택에서 중요한 건  
> “멋있어 보이는가”가 아니라  
> “지금 이 프로젝트에 맞는가”다

언젠가 다시 Testcontainers를 제대로 파볼 날이 오겠지만,  
지금 이 프로젝트에서는  
**안정적으로 굴러가는 구조를 우선**하기로 했다.

이 판단이 틀렸는지 맞았는지는  
프로젝트가 끝났을 때 다시 돌아보면 알 수 있을 것이다.
