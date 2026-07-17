---
title: Testcontainers Docker 연결 오류를 해결하지 못하고 다시 yml 방식으로 돌아간 이유
date: 2026-01-21
categories: [Spring]
tags: [Spring Boot, Testcontainers, Docker, Windows, Testing]
permalink: /posts/testcontainers-docker-error-yml/
---

## 들어가며

개인 프로젝트에서 통합 테스트 환경을 꾸리면서 **Testcontainers로 Docker 컨테이너를 띄우는 방식**을 다시 시도했다.

예전에는 `docker-compose.yml`로 테스트 환경을 구성해 큰 탈 없이 써 왔다. 이번에는 좀 더 테스트 친화적인 구조를 만들고 싶었고, 그래서 Testcontainers를 골랐다.

결과부터 말하면 잘 안 됐다. Docker 연결 단계에서 같은 오류를 끝내 넘지 못했다. 그래서 Testcontainers는 잠시 내려놓고, 다시 yml 기반 컨테이너 실행으로 돌아오기로 했다.

그러니 이 글은 "왜 Testcontainers를 포기했는가"에 답하는 해결기가 아니다. 문제를 풀지 못한 채 내린 판단과, 그 판단을 정리한 기록이다.

## 발생한 오류

테스트를 돌리자마자 가장 먼저 튀어나온 에러는 이런 것들이었다.

- `EnvironmentAndSystemPropertyClientProviderStrategy`
- `NpipeSocketClientProviderStrategy`

형태는 조금씩 달랐지만 요지는 하나였다.

> Testcontainers가 Docker 데몬에 연결하지 못한다

Windows에서 Testcontainers를 쓸 때 흔히 언급되는 메시지들이기도 하다.

## 에러 메시지가 의미하는 것은 이해했다

여러 글을 찾아보면서 이 에러들이 무엇을 뜻하는지는 충분히 파악할 수 있었다.

Testcontainers는 내부적으로 Docker Client를 거쳐 Docker 데몬과 통신한다. Windows에서는 보통 **Docker Desktop + npipe 방식**을 쓴다. 앞의 전략 클래스들은 "어떤 방식으로 Docker에 연결할지"를 시도하다가 실패했음을 의미한다.

즉,

> Docker가 실행 중이 아니거나
> Docker Desktop과의 통신 경로를 찾지 못했다

는 메시지였다.

## 인터넷에 나온 해결 방법들

정작 막막했던 건 그다음이었다. 검색해서 나온 방법은 거의 다 시도해봤다.

- Docker Desktop 실행 여부 확인
- WSL2 설정 확인
- Docker Context 확인
- 환경 변수 설정 (`DOCKER_HOST`)
- Testcontainers 버전 변경
- Spring Boot / JUnit 조합 변경
- 관리자 권한 실행

그런데 결과는 늘 똑같았다.

> 동일한 에러 메시지 반복

설정을 하나 바꿀 때마다 "이번엔 되지 않을까" 기대했지만, 테스트는 매번 Docker 연결 단계에서 멈췄다.

## 개인 프로젝트라서 내린 판단

이쯤에서 선택지가 갈렸다. Docker와 Testcontainers 환경을 끝까지 파고들 것인가, 아니면 이미 검증된 방식으로 돌아갈 것인가.

지금은 팀 프로젝트가 아닌 개인 프로젝트였다. 목표도 Docker 자체를 정복하는 게 아니라 도메인 로직과 테스트 구조를 검증하는 데 있었다.

여기에 하나가 더 걸렸다. 예전에 yml 기반 컨테이너 실행으로, 같은 환경에서 문제없이 테스트를 꾸려 본 경험이 있었다는 점이다.

그래서 이번에는 "Testcontainers를 반드시 써야 한다"는 고집을 내려놓기로 했다.

## 다시 yml 방식으로 돌아가기로 한 이유

결론을 내린 기준은 단순했다. 에러의 의미는 이해했지만 해결하지는 못했고, 개인 프로젝트에 환경 이슈로 시간을 과하게 쏟고 싶지 않았다. 마침 이미 성공해 본 방식도 있었다.

그래서 이번 단계에서는 Testcontainers 도입을 보류하고, `docker-compose.yml` 기반 컨테이너 실행으로 돌아갔다. 테스트는 그 위에서 안정적으로 이어 가기로 했다.

## 마무리

Testcontainers가 강력한 도구라는 데는 이견이 없다. 다만 어떤 상황에서든 꼭 써야 하는 도구는 아니었다.

이번에 남은 건 결국 기술을 고르는 기준이었다. 멋져 보이느냐보다, 지금 이 프로젝트에 맞느냐가 먼저다.

언젠가 Testcontainers를 제대로 파 볼 날이 오겠지만, 적어도 지금 이 프로젝트에서는 **안정적으로 굴러가는 구조**를 앞에 두기로 했다.

이 판단이 옳았는지는 프로젝트를 끝내고 나서야 알게 될 것이다.
