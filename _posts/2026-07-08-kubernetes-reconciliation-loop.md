---
title: "Kubernetes를 명령어가 아니라 조정 루프로 이해하기"
date: 2026-07-08
categories: [Infrastructure, Kubernetes]
tags: [Kubernetes, Docker, Docker Compose, EC2, CI/CD, DevOps, TIL]
permalink: /posts/kubernetes-reconciliation-loop/
---

## 들어가면서

Kubernetes를 처음 보면 용어가 꽤 많다. Pod, Service, Deployment, ReplicaSet, Controller, Scheduler, kubelet 같은 단어가 한꺼번에 나오기 때문에 처음에는 "이걸 다 외워야 하나?"라는 생각이 들었다.

하지만 Docker와 EC2 기반 배포를 공부한 흐름에서 다시 보니, Kubernetes는 단순히 컨테이너를 실행하는 도구라기보다 **컨테이너가 운영되는 상태를 계속 유지하는 시스템**에 가깝다고 느꼈다.

이전에 [Docker Compose 다음에 Kubernetes가 필요한 이유](/posts/kubernetes-after-docker-compose/)를 정리하면서, 단일 EC2와 Docker Compose 기반 배포는 작은 서비스에서 충분히 현실적인 선택이라고 봤다. 다만 서버가 여러 대가 되고 컨테이너 수가 늘어나면 "띄우는 것"보다 "계속 원하는 상태로 유지하는 것"이 더 중요해진다.

이번 글에서는 Kubernetes 명령어 사용법보다, Kubernetes가 왜 이런 구조를 갖게 되었는지와 어떤 철학으로 동작하는지를 정리해보려 한다.

핵심은 하나다.

> Kubernetes에서 사용자는 과정을 명령하는 것이 아니라 원하는 상태를 선언한다.

---

## 1. Docker로 컨테이너를 띄운 다음 생기는 문제

Spring Boot 애플리케이션을 Docker 이미지로 만들고 실행하는 것 자체는 비교적 명확하다.

```text
Spring Boot Application
  -> Docker Image
  -> docker run
  -> Container
```

단일 EC2 서버에서 Spring Boot 컨테이너 하나를 실행한다면, 내가 직접 서버에 접속해서 컨테이너를 띄우고 로그를 확인하고 문제가 생기면 다시 실행할 수 있다. Docker Compose를 쓰면 Spring Boot, MySQL, Redis 같은 여러 컨테이너도 하나의 설정 파일로 함께 띄울 수 있다.

문제는 서비스가 커졌을 때부터다.

* 새 컨테이너는 어느 서버에 띄워야 할까?
* 서버가 죽으면 누가 대신 띄워줄까?
* 트래픽이 늘면 컨테이너 수는 누가 조절할까?
* 컨테이너 IP가 바뀌면 서비스끼리는 어떻게 찾을까?
* 새 버전은 어떻게 끊김 없이 교체할까?

이 질문들은 겉으로 보면 서로 다른 문제처럼 보인다. 하나는 배치 문제이고, 하나는 장애 복구 문제이고, 하나는 스케일링 문제이며, 또 하나는 서비스 디스커버리와 배포 전략 문제다.

하지만 공통점이 있다. 모두 현재 상태를 계속 지켜보다가, 내가 원하는 상태와 다르면 바로잡아야 하는 문제다.

![Docker에서 Kubernetes가 필요한 이유](/assets/images/2026-07-08-kubernetes-reconciliation-loop/docker-to-kubernetes-orchestration.png)

Docker가 컨테이너 실행을 쉽게 만들어줬다면, Kubernetes는 여러 서버 위에서 많은 컨테이너를 어떻게 계속 원하는 상태로 운영할 것인가에 초점을 둔다. 그래서 Kubernetes를 이해할 때는 "컨테이너 실행 도구"보다 "컨테이너 운영 시스템"이라는 관점이 더 잘 맞는 것 같다.

---

## 2. Kubernetes의 핵심은 명령이 아니라 선언이다

내가 처음 배포를 공부할 때 익숙했던 방식은 명령형에 가까웠다.

```text
서버에 접속한다.
새 이미지를 pull 한다.
기존 컨테이너를 내린다.
새 컨테이너를 띄운다.
정상 동작하는지 확인한다.
```

이 방식은 절차가 눈에 보이기 때문에 이해하기 쉽다. 단일 EC2에서는 오히려 이 방식이 더 직관적이다. 내가 무엇을 했는지 바로 확인할 수 있고, 문제가 생기면 다시 서버에 접속해서 고칠 수 있다.

하지만 서버가 여러 대가 되면 "어떤 절차를 어떤 순서로 실행할 것인가"보다 "결과적으로 어떤 상태여야 하는가"가 더 중요해진다.

예를 들어 명령형 사고는 이렇게 말한다.

```text
서버 2번에 접속해서 컨테이너를 하나 더 띄워라.
```

반면 선언형 사고는 이렇게 말한다.

```text
이 애플리케이션은 항상 3개 떠 있어야 한다.
```

Kubernetes는 후자에 가깝다. 사용자가 YAML의 `spec`에 원하는 상태를 선언하면, Kubernetes는 현재 클러스터 상태를 관찰하면서 그 상태에 맞추려고 움직인다.

이 관점은 SQL이나 Spring의 `@Transactional`과도 조금 닮았다. SQL에서 "인덱스를 이렇게 타고, 레코드를 이 순서로 가져와라"를 매번 명령하기보다 "이 조건에 맞는 데이터를 원한다"고 선언하면 DB가 실행 계획을 세운다. `@Transactional`도 매번 commit, rollback 절차를 직접 작성하기보다 "이 범위는 하나의 트랜잭션이어야 한다"고 선언하는 쪽에 가깝다.

Kubernetes도 마찬가지로 사용자가 모든 운영 절차를 직접 지시하지 않는다. "Pod를 3개 유지해줘", "이 Label을 가진 Pod로 트래픽을 보내줘", "새 버전으로 점진적으로 교체해줘" 같은 원하는 상태를 선언한다.

이때부터 Kubernetes의 많은 구성요소가 조금 덜 낯설게 보인다. 결국 모든 구성요소는 선언된 상태를 저장하고 관찰하고 차이를 줄이기 위해 존재한다.

---

## 3. Desired State, Current State, Reconciliation Loop

Kubernetes를 이해하는 데 가장 중요한 세 단어는 Desired State, Current State, Reconciliation Loop라고 생각한다.

* **Desired State**: 사용자가 YAML의 `spec`에 선언한 원하는 상태
* **Current State**: 실제 클러스터에서 현재 관찰되는 상태
* **Reconciliation Loop**: 둘의 차이를 계속 비교하고 맞추는 루프

예를 들어 Deployment에 `replicas: 3`을 선언했다고 해보자.

```yaml
spec:
  replicas: 3
```

이때 원하는 상태는 "Pod가 3개 떠 있어야 한다"이다. 그런데 실제로는 Pod가 2개만 떠 있다면 현재 상태와 원하는 상태 사이에 차이가 생긴다. Kubernetes의 Controller는 이 차이를 보고 Pod 하나를 더 만들려고 한다.

![Kubernetes Reconciliation Loop](/assets/images/2026-07-08-kubernetes-reconciliation-loop/reconciliation-loop.png)

이 구조는 에어컨 온도 조절기와 비슷하다. 내가 원하는 온도를 24도로 설정하면 에어컨은 현재 온도를 계속 관찰한다. 현재 온도가 28도라면 냉방을 하고 24도에 가까워지면 동작을 조절한다. 중요한 것은 내가 "압축기를 몇 초 동안 켜고, 팬을 몇 단계로 돌려라"라고 매번 명령하지 않는다는 점이다. 원하는 상태만 설정하면 시스템이 현재 상태를 관찰하며 맞춰간다.

Kubernetes의 장애 복구도 이 관점에서 보면 특별한 별도 기능이라기보다 같은 루프의 결과다.

Pod 하나가 죽었다면 현재 상태가 달라진 것이다. `replicas`를 3에서 5로 늘렸다면 원하는 상태가 달라진 것이다. 새 이미지 버전으로 Deployment를 업데이트했다면 원하는 Pod 템플릿이 달라진 것이다.

겉으로는 장애 복구, 스케일링, 롤링 업데이트가 서로 다른 기능처럼 보이지만, 내부 원리는 비슷하다.

> 원하는 상태와 현재 상태가 다르다. Controller가 그 차이를 메운다.

이 문장으로 정리하고 나니 Kubernetes가 조금 덜 복잡하게 느껴졌다. 수많은 리소스 이름을 외우기 전에, 이 조정 루프가 Kubernetes의 기본 동작 방식이라는 점을 먼저 잡는 것이 중요하다고 느꼈다.

---

## 4. Kubernetes 아키텍처는 철학의 구현이다

Kubernetes 아키텍처도 암기식으로 보면 어렵다. API Server, etcd, Scheduler, Controller Manager, kubelet, kube-proxy 같은 구성요소 이름이 한꺼번에 나온다.

하지만 앞에서 본 철학을 기준으로 보면 왜 필요한지 조금 더 자연스럽다.

선언형으로 가려면 상태를 저장할 곳이 있어야 한다. 그래서 etcd가 필요하다.
상태를 안전하게 다루려면 모든 요청이 들어오는 단일 관문이 있어야 한다. 그래서 API Server가 필요하다.
아직 어느 노드에도 배치되지 않은 Pod가 있다면 적절한 노드를 결정해야 한다. 그래서 Scheduler가 필요하다.
원하는 상태와 현재 상태의 차이를 계속 메워야 한다. 그래서 Controller Manager가 필요하다.
각 노드에서는 실제로 Pod를 실행하고 상태를 보고해야 한다. 그래서 kubelet이 필요하다.

![Kubernetes 아키텍처](/assets/images/2026-07-08-kubernetes-reconciliation-loop/kubernetes-architecture.svg)

Control Plane은 클러스터의 상태를 판단하고 조정하는 쪽이다. Worker Node는 실제 워크로드가 실행되는 쪽이다.

API Server는 모든 요청의 단일 관문이다. `kubectl`로 요청하든, CI/CD 파이프라인이 요청하든, Controller가 상태를 갱신하든 모두 API Server를 거쳐 클러스터 상태를 다룬다.

etcd는 클러스터 상태의 단일 진실 역할을 한다. 사용자가 선언한 리소스 정보와 현재 상태 정보가 저장된다. Kubernetes가 선언형 시스템이라면, "무엇이 선언되었는가"를 안정적으로 보관할 저장소가 반드시 필요하다.

Scheduler는 아직 노드가 정해지지 않은 Pod를 보고 어느 Worker Node에 배치할지 결정한다. 이때 노드의 리소스 상황, 제약 조건, 스케줄링 정책 등을 고려한다.

Controller Manager는 조정 루프를 실행하는 여러 Controller를 관리한다. Deployment Controller, ReplicaSet Controller 같은 것들이 원하는 상태와 현재 상태의 차이를 보며 필요한 작업을 만든다.

Worker Node 쪽에서는 kubelet이 중요하다. kubelet은 해당 노드에서 Pod가 실제로 실행되도록 container runtime과 통신하고, 상태를 API Server에 보고한다. kube-proxy는 Service가 Pod로 트래픽을 전달할 수 있도록 네트워크 규칙을 관리한다.

이렇게 보면 Kubernetes 아키텍처는 단순히 구성요소 묶음이 아니다. 원하는 상태를 선언하고 저장하고 관찰하고 차이를 메우기 위한 역할 분담이다.

---

## 5. Pod, Deployment, Service로 보는 Kubernetes의 실행 단위

Kubernetes에서 실제 애플리케이션을 다룰 때 가장 먼저 만나는 흐름은 Deployment, ReplicaSet, Pod, Container의 계층 구조다.

![Deployment ReplicaSet Pod Container 계층](/assets/images/2026-07-08-kubernetes-reconciliation-loop/deployment-replicaset-pod-container.svg)

Pod는 Kubernetes의 최소 실행 단위다. Docker만 사용할 때는 컨테이너를 직접 떠올리기 쉽지만, Kubernetes에서는 컨테이너가 Pod 안에서 실행된다. 대부분의 경우 하나의 Pod 안에 하나의 애플리케이션 컨테이너가 들어간다고 생각하면 출발점으로 충분하다.

ReplicaSet은 Pod 개수를 유지한다. 원하는 Pod 개수가 3개인데 현재 2개라면 하나를 더 만들고, 4개라면 하나를 줄이는 식이다.

Deployment는 ReplicaSet 위에서 배포 전략을 관리한다. 새 이미지 버전으로 바꿀 때 한 번에 모든 Pod를 갈아치우는 것이 아니라, 새 ReplicaSet을 만들고 점진적으로 트래픽을 받을 수 있는 Pod를 교체한다. 롤링 업데이트와 롤백이 Deployment의 중요한 역할이다.

이전에 [CI/CD는 YAML 작성이 아니라 안정적인 배포와 복구를 설계하는 과정이었다](/posts/cicd-design-not-yaml/) 글에서 이미지를 빌드하고 배포하는 자동화 흐름을 정리했다. Kubernetes의 Deployment는 그 다음 단계에서 "배포 이후 클러스터 안의 상태를 어떻게 안정적으로 바꿀 것인가"를 선언형으로 다루는 리소스라고 볼 수 있다.

하지만 Pod가 원하는 개수만큼 떠 있다고 해서 네트워크 문제가 끝나는 것은 아니다. Pod는 언제든 죽고 새로 만들어질 수 있다. 그 과정에서 IP도 바뀐다.

그래서 Service가 필요하다.

> Pod는 언제든 죽고 새로 만들어질 수 있기 때문에, 클라이언트는 Pod 자체가 아니라 Service라는 고정된 문을 바라봐야 한다.

![Kubernetes Service와 Pod 관계](/assets/images/2026-07-08-kubernetes-reconciliation-loop/service-label-selector.png)

Service는 Label과 Selector를 기준으로 요청을 보낼 Pod를 찾는다. 예를 들어 Service에 `app=my-spring-app`이라는 Selector가 있다면, 같은 Label을 가진 Pod들이 대상이 된다.

중요한 점은 Service가 특정 Pod IP에 고정되는 것이 아니라는 점이다. Pod A가 죽고 Pod D가 새로 생기더라도, Pod D가 같은 Label을 달고 있으면 Service는 새 Pod를 대상으로 삼을 수 있다.

이 구조를 이해하고 나면 Service가 단순한 로드밸런서라기보다, 변하는 Pod 집합 앞에 고정된 접근 지점을 만들어주는 리소스라는 점이 보인다.

---

## 6. Kubernetes를 쓰면 무조건 좋은가?

Kubernetes를 공부하다 보면 "그러면 이제 모든 프로젝트에 Kubernetes를 써야 하나?"라는 생각이 들 수 있다. 하지만 지금까지 공부한 배포 흐름을 돌아보면 답은 그렇지 않은 것 같다.

Kubernetes는 강력하지만 학습 비용과 운영 복잡도가 크다. 클러스터를 구성하고, 네트워크를 이해하고, 리소스 요청량과 제한을 잡고, 배포 전략과 모니터링까지 챙기려면 단순히 컨테이너 몇 개를 띄우는 것보다 훨씬 많은 운영 지식이 필요하다.

단일 서버에서 작은 MVP를 운영한다면 Docker Compose가 더 적합할 수 있다. Spring Boot 애플리케이션 하나와 MySQL, Redis 정도를 한 EC2에서 운영하는 상황이라면, Kubernetes를 도입하는 것 자체가 오히려 복잡도를 키울 수 있다.

이전에 [Nginx를 단순 프록시가 아니라 배포 전환 지점으로 이해하기](/posts/nginx-deployment-switching-point/)를 정리하면서 단일 EC2와 Docker Compose 환경에서도 Nginx를 이용해 Blue-Green 배포 전환 지점을 만들 수 있다는 점을 봤다. 이런 구조는 Kubernetes만큼 일반화된 플랫폼은 아니지만, 작은 서비스에서는 충분히 현실적일 수 있다.

반대로 여러 서버에서 많은 컨테이너를 운영해야 하고, 잦은 배포와 자동 복구, 스케일링, 서비스 디스커버리가 필요해진다면 Kubernetes의 복잡도를 감수할 가치가 생긴다. Kubernetes는 복잡도를 없애는 도구라기보다, 커진 운영 복잡도를 일관된 원리로 다루게 해주는 플랫폼에 가깝다.

그래서 지금 내 기준으로는 Kubernetes를 "무조건 좋은 배포 도구"라고 보기보다, 운영 요구사항이 일정 수준 이상 커졌을 때 빛을 발하는 시스템으로 이해하는 편이 더 현실적이다.

---

## 7. CRD와 Operator, GitOps까지 이어지는 확장성

Kubernetes가 흥미로운 이유는 조정 루프 패턴이 내장 리소스에서 끝나지 않는다는 점이다.

기본적으로 Kubernetes에는 Pod, Service, Deployment 같은 리소스가 있다. 그런데 CRD(Custom Resource Definition)를 사용하면 사용자가 새로운 리소스 타입을 정의할 수 있다.

예를 들어 `Database`, `Certificate`, `KafkaCluster` 같은 도메인 특화 리소스를 Kubernetes API 안에 새로 정의할 수 있다. 이렇게 하면 Kubernetes는 단순히 컨테이너만 다루는 시스템이 아니라, 운영 대상 자체를 확장할 수 있는 플랫폼이 된다.

Operator는 여기서 한 단계 더 나아간다. Operator는 사용자 정의 리소스의 원하는 상태를 보고 실제 시스템을 그 상태로 맞추는 Controller다.

![Kubernetes CRD Operator GitOps 확장 구조](/assets/images/2026-07-08-kubernetes-reconciliation-loop/crd-operator-gitops.svg)

GitOps도 같은 맥락에서 이해할 수 있다. Git에 선언된 상태와 클러스터의 현재 상태를 비교하고, 차이가 있으면 클러스터를 Git의 상태에 맞춘다. 여기에도 Desired State, Current State, Reconciliation Loop가 반복된다.

> Kubernetes의 조정 루프 패턴은 내장 리소스에서 끝나지 않고, 사용자가 직접 만든 리소스와 운영 자동화까지 확장된다.

이 지점 때문에 Kubernetes를 "플랫폼의 플랫폼"이라고 부르는 것 같다. 단순히 애플리케이션 컨테이너를 띄우는 도구가 아니라, 원하는 운영 상태를 선언하고 그 상태를 맞춰가는 방식을 여러 도메인으로 확장할 수 있기 때문이다.

---

## 마무리

Kubernetes를 처음 볼 때는 Pod, Service, Deployment, Controller 같은 용어가 많아서 어렵게 느껴졌다. 특히 Docker Compose처럼 비교적 단순한 도구에 익숙한 상태에서는 Kubernetes의 구조가 과하게 복잡해 보이기도 했다.

하지만 하나씩 따라가 보니 결국 하나의 원리로 정리할 수 있었다.

> 원하는 상태를 선언하고, 시스템이 현재 상태를 관찰하며 차이를 메운다.

Pod가 죽었을 때 다시 만드는 것도, replicas를 늘렸을 때 Pod를 더 만드는 것도, 새 버전으로 점진적으로 교체하는 것도, Service가 바뀌는 Pod 앞에서 고정된 접근 지점을 제공하는 것도 모두 이 관점과 연결된다.

Kubernetes는 컨테이너를 실행하는 도구라기보다, 컨테이너가 운영되는 상태를 계속 유지하는 시스템이다. 그리고 이 조정 루프를 이해하고 나니 Kubernetes의 많은 구성요소가 단순한 암기 대상이 아니라, 하나의 운영 철학을 구현하기 위한 역할들로 보이기 시작했다.

물론 모든 프로젝트에 Kubernetes가 필요한 것은 아니다. 작은 서비스에서는 Docker Compose와 단순한 배포 구조가 더 좋은 선택일 수 있다. 다만 여러 서버, 많은 컨테이너, 잦은 배포, 자동 복구와 확장성이 필요해지는 순간에는 Kubernetes가 왜 이런 구조를 가졌는지 조금 더 납득할 수 있을 것 같다.
