---
title: "Docker Compose 다음에 Kubernetes가 필요한 이유"
date: 2026-07-03
categories: [Infrastructure, Kubernetes]
tags: [Kubernetes, Docker Compose, Docker, EC2, CI/CD, DevOps, TIL]
permalink: /posts/kubernetes-after-docker-compose/
---

## Kubernetes를 공부하게 된 이유

최근 배포 흐름을 공부하면서 단일 EC2 배포, Docker Compose, GitHub Actions를 이용한 CI/CD, 무중단 배포, Blue-Green, ASG 같은 개념들을 차례대로 살펴봤다.

처음에는 애플리케이션을 서버에 올리고 실행하는 것 자체가 배포의 핵심이라고 생각했다. 하지만 배포를 공부할수록 단순히 애플리케이션을 실행하는 것과 운영하는 것은 다르다는 생각이 들었다.

Spring Boot 애플리케이션을 컨테이너로 만들고, MySQL과 Redis까지 Docker Compose로 함께 실행하면 꽤 그럴듯한 배포 구조가 만들어진다. 여기에 GitHub Actions로 CI/CD까지 붙이면 코드가 변경될 때 자동으로 빌드하고 배포하는 흐름도 만들 수 있다.

그런데 여기서 한 단계 더 생각해보면 질문이 생긴다.

컨테이너가 죽으면 어떻게 하지?  
트래픽이 늘어나면 애플리케이션을 어떻게 늘리지?  
서버가 여러 대가 되면 컨테이너를 어디에 어떻게 배치하지?  
배포 중 기존 요청은 어떻게 처리하지?

이런 질문들을 만나면서 Kubernetes를 단순히 "Docker보다 더 좋은 기술"이 아니라, 컨테이너를 운영하는 방식 자체를 다루는 플랫폼으로 바라보게 되었다.

---

## Docker Compose로 충분해 보였던 이유

Docker Compose는 작은 프로젝트나 초기 MVP 단계에서는 충분히 현실적인 선택이라고 느꼈다.

예를 들어 단일 EC2 안에서 Spring Boot, MySQL, Redis를 함께 실행한다고 하면 다음과 같은 구조를 만들 수 있다.

```text
EC2
├── Spring Boot Container
├── MySQL Container
└── Redis Container
```

이 구조는 단순하다. `docker-compose.yml` 파일 하나에 여러 컨테이너 설정을 작성하고, 명령어 한 번으로 필요한 컨테이너들을 함께 실행할 수 있다.

로컬 개발 환경에서도 좋고, 작은 사이드 프로젝트나 초기 서비스에서는 오히려 Kubernetes보다 Docker Compose가 더 현실적일 수 있다. 구성도 빠르고, 이해하기 쉽고, 비용도 적게 든다.

특히 Spring Boot 애플리케이션 하나와 MySQL, Redis 정도를 한 서버에서 실행하는 수준이라면 Docker Compose만으로도 충분히 많은 것을 해결할 수 있다.

그래서 Kubernetes를 처음 봤을 때는 "굳이 이렇게까지 해야 하나?"라는 생각도 들었다.

---

## 운영 관점에서 생기는 문제

하지만 Docker Compose는 컨테이너 실행을 단순하게 만들어주지만, 여러 서버에서 안정적으로 운영하는 문제까지 모두 해결해주지는 않는다.

운영 관점에서는 다음과 같은 문제가 생길 수 있다.

* 컨테이너가 죽었을 때 어떻게 복구할 것인가?
* 트래픽이 늘어나면 애플리케이션 인스턴스를 어떻게 늘릴 것인가?
* 여러 서버에 컨테이너를 어떻게 배치할 것인가?
* 배포 중 기존 요청은 어떻게 처리할 것인가?
* Pod나 컨테이너의 IP가 바뀌어도 안정적으로 접근하려면 어떻게 해야 하는가?

단일 EC2에서는 문제가 단순해 보인다. 서버에 접속해서 컨테이너 상태를 확인하고, 필요하면 다시 실행하면 된다.

하지만 서버가 여러 대가 되고, 애플리케이션 인스턴스가 여러 개가 되고, 배포 중에도 사용자의 요청을 안정적으로 처리해야 한다면 이야기가 달라진다.

이때부터는 "컨테이너를 실행하는 것"보다 "컨테이너가 원하는 상태로 계속 유지되게 하는 것"이 중요해진다.

Kubernetes가 필요한 지점이 바로 여기라고 이해했다.

![Docker Compose에서 Kubernetes로 확장되는 배포 구조](/assets/images/2026-07-03-kubernetes-after-docker-compose/docker-compose-to-kubernetes.png)

---

## Kubernetes의 핵심: 원하는 상태 유지

Kubernetes의 핵심은 Desired State, 즉 원하는 상태를 선언하고 Kubernetes가 그 상태를 유지하려고 동작한다는 점이다.

예를 들어 내가 다음과 같은 상태를 원한다고 선언할 수 있다.

```text
원하는 상태: Spring Boot 애플리케이션 Pod 3개 실행
현재 상태: Pod 2개 실행 중
Kubernetes: 부족한 1개를 새로 생성해서 3개를 맞춤
```

이 흐름이 Kubernetes를 이해하는 데 가장 중요하다고 느꼈다.

Docker Compose는 컨테이너를 실행하는 데 초점이 있다면, Kubernetes는 선언한 상태를 계속 유지하는 데 초점이 있다.

즉, Kubernetes는 컨테이너를 한 번 실행하고 끝내는 도구가 아니라, 선언한 상태를 계속 유지하려고 동작하는 시스템이다.

애플리케이션 Pod가 3개 있어야 한다고 선언했는데 하나가 죽으면, Kubernetes는 다시 하나를 생성해서 3개를 맞추려고 한다. 이 관점이 기존에 Docker Compose를 사용할 때와 가장 크게 다르게 느껴졌다.

---

## Pod, Deployment, Service로 이해하기

이번에는 Kubernetes의 많은 개념을 모두 보려고 하기보다, 입문 단계에서 가장 기본이 되는 Pod, Deployment, Service를 중심으로 이해했다.

### Pod

Pod는 Kubernetes에서 컨테이너가 실행되는 최소 단위다.

Spring Boot 애플리케이션을 컨테이너 이미지로 만들었다면, Kubernetes에서는 그 컨테이너가 Pod 안에서 실행된다.

단순하게 생각하면 다음과 같다.

```text
Pod
└── Spring Boot Container
```

Docker Compose에서는 컨테이너 자체를 중심으로 생각했다면, Kubernetes에서는 컨테이너를 직접 다루기보다 Pod라는 단위 안에서 컨테이너가 실행된다고 이해하면 된다.

### Deployment

Deployment는 Pod를 원하는 개수만큼 유지하고, 배포를 관리하는 리소스다.

예를 들어 Spring Boot Pod를 3개 유지하고 싶다면 Deployment에 그 상태를 선언한다.

```yaml
replicas: 3
template:
  metadata:
    labels:
      app: spring-app
  spec:
    containers:
      - image: spring-app:latest
        ports:
          - containerPort: 8080
```

여기서 중요한 것은 `replicas: 3`이다.

이 설정은 Spring Boot Pod를 3개 유지하겠다는 의미다. 만약 Pod 하나가 죽어서 2개만 남으면 Deployment는 다시 하나를 생성해서 3개를 맞추려고 한다.

### Service

Pod는 죽었다가 다시 생성될 수 있다. 그리고 그 과정에서 IP가 바뀔 수 있다.

따라서 클라이언트가 특정 Pod IP에 직접 접근하는 방식은 안정적이지 않다. 오늘 접근하던 Pod가 내일은 사라질 수도 있고, 새로 만들어진 Pod는 다른 IP를 가질 수 있기 때문이다.

이 문제를 해결하기 위해 Service가 필요하다.

Service는 변할 수 있는 Pod들 앞에서 고정된 접근 경로를 제공한다. 그리고 Label과 Selector를 기준으로 어떤 Pod에 요청을 보낼지 결정한다.

예를 들어 Service가 다음과 같은 Selector를 가진다고 해보자.

```text
Service selector: app=spring-app

Pod A: app=spring-app
Pod B: app=spring-app
Pod C: app=spring-app
```

이 경우 Service는 `app=spring-app`이라는 Label을 가진 Pod들에게 요청을 전달할 수 있다.

만약 Pod A가 죽고 Pod D가 새로 생성되더라도, Pod D가 같은 Label을 가지고 있다면 Service는 다시 그 Pod를 대상으로 요청을 전달할 수 있다.

```text
Service selector: app=spring-app

Pod B: app=spring-app
Pod C: app=spring-app
Pod D: app=spring-app
```

이 구조 덕분에 클라이언트는 개별 Pod의 IP 변화를 신경 쓰지 않고 Service를 통해 안정적으로 접근할 수 있다.

정리하면 Deployment는 Pod를 원하는 개수만큼 유지하고, Service는 변할 수 있는 Pod들 앞에서 안정적인 접근 경로를 제공한다.

---

## Kubernetes가 무조건 정답은 아니다

Kubernetes를 공부하면서 중요하게 느낀 점은 Kubernetes가 Docker Compose의 무조건적인 상위 호환은 아니라는 것이다.

Kubernetes는 강력하지만, 작은 프로젝트에서는 오히려 학습 비용과 운영 복잡도가 더 클 수 있다.

단일 EC2에서 Spring Boot, MySQL, Redis를 실행하는 작은 서비스라면 Docker Compose가 더 단순하고 현실적인 선택일 수 있다. 운영 인원이 적고, 트래픽이 크지 않고, 서버도 한 대라면 Kubernetes를 도입하는 것 자체가 부담이 될 수 있다.

반대로 서비스 규모가 커지고, 여러 서버에서 컨테이너를 운영해야 하고, 장애 복구와 확장, 배포 안정성이 중요해지면 Kubernetes가 제공하는 구조가 의미를 가지기 시작한다.

이번 학습을 통해 Kubernetes는 Docker Compose의 상위 호환이라기보다, 운영 복잡도가 커졌을 때 그 복잡도를 구조적으로 관리하기 위한 플랫폼이라고 이해했다.

결국 중요한 것은 도구의 유명함이 아니라 현재 서비스의 운영 요구사항에 맞는 선택이라고 느꼈다.

---

## 정리

Docker Compose는 작은 프로젝트나 초기 MVP에서 여러 컨테이너를 빠르게 실행하기 좋은 도구다. 단일 EC2 안에서 Spring Boot, MySQL, Redis를 함께 실행하는 구조라면 충분히 현실적인 선택이 될 수 있다.

하지만 운영 관점으로 들어가면 컨테이너 복구, 확장, 여러 서버 배치, 배포 안정성, 네트워크 접근 방식 같은 문제가 생긴다.

Kubernetes는 이런 문제를 "원하는 상태를 선언하고, 그 상태를 유지하는 방식"으로 해결하려고 한다.

이번 글에서는 Kubernetes의 많은 개념 중 Pod, Deployment, Service만 중심으로 살펴봤다.

* Pod는 컨테이너가 실행되는 최소 단위다.
* Deployment는 Pod를 원하는 개수만큼 유지하고 배포를 관리한다.
* Service는 변할 수 있는 Pod들 앞에서 안정적인 접근 경로를 제공한다.

아직 Helm, Ingress, StatefulSet, PV/PVC, HPA, Cluster 구성 같은 주제는 깊게 다루지 않았다. 이 개념들은 Kubernetes를 실제 운영 환경에서 사용하려면 이어서 학습해야 할 내용이라고 생각한다.

이번 학습을 통해 Kubernetes를 "더 좋은 Docker Compose"가 아니라, 운영 요구사항이 커졌을 때 컨테이너 기반 서비스를 안정적으로 관리하기 위한 플랫폼으로 이해하게 되었다.

---

## 다음에 더 학습하면 좋은 주제

* **Ingress**: 외부 요청을 Kubernetes 내부 Service로 연결하는 방식
* **HPA**: 트래픽이나 리소스 사용량에 따라 Pod 개수를 자동으로 늘리고 줄이는 방식
* **PV/PVC**: 데이터베이스처럼 상태를 가진 애플리케이션의 저장소를 Kubernetes에서 다루는 방식
