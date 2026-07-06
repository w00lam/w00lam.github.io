---
title: "Nginx를 단순 프록시가 아니라 배포 전환 지점으로 이해하기"
date: 2026-07-06
categories: [Infrastructure, Nginx]
tags: [Nginx, Reverse Proxy, Docker Compose, Spring Boot, EC2, CI/CD, Blue-Green, TIL]
permalink: /posts/nginx-deployment-switching-point/
---

## 들어가면서

이전에 [Nginx는 왜 Spring Boot 앞단에 있을까?](/posts/why-nginx-in-front-of-spring-boot/)를 정리하면서, Nginx를 외부 요청을 먼저 받고 내부 Spring Boot 애플리케이션으로 전달하는 앞단 서버로 이해했다.

그때의 핵심은 다음 구조였다.

```text
Client → Nginx → Spring Boot
```

이 정도만 보면 Nginx는 Spring Boot 앞에서 요청을 넘겨주는 프록시처럼 보인다. 실제로 처음에는 나도 그렇게 이해했다. 사용자가 80번이나 443번 포트로 요청하면, Nginx가 내부의 8080 포트로 요청을 넘겨주는 정도로 생각했다.

하지만 Docker Compose, 단일 EC2 배포, GitHub Actions를 이용한 CI/CD, Blue-Green 배포까지 함께 생각하니 Nginx는 단순한 요청 전달자 이상으로 보이기 시작했다.

이전 [CI/CD는 YAML 작성이 아니라 안정적인 배포와 복구를 설계하는 과정이었다](/posts/cicd-design-not-yaml/) 글에서는 GitHub Actions가 이미지를 빌드하고 서버에 배포하는 흐름을 중심으로 봤다. 이번 글에서는 그 이후, 배포된 애플리케이션으로 실제 사용자 요청이 어떻게 전달되고 전환되는지를 Nginx 관점에서 조금 더 깊게 정리해보려 한다.

이번 글의 핵심은 다음이다.

> Nginx는 단순히 Spring Boot 앞에서 요청을 넘겨주는 프록시가 아니라, Docker 기반 배포 환경에서 외부 요청과 내부 애플리케이션 구조를 분리하고, upstream을 통해 로드밸런싱과 Blue-Green 배포 전환 지점이 되며, proxy header를 통해 원본 요청 정보를 애플리케이션에 전달하는 운영 경계다.

---

## 1. 이전에는 Nginx를 단순 앞단 프록시로 이해했다

처음에는 Nginx를 다음 정도로 이해했다.

```text
Client → Nginx → Spring Boot
```

사용자가 80/443 포트로 요청하면 Nginx가 내부 Spring Boot 8080 포트로 전달한다. Spring Boot는 비즈니스 로직을 처리하고, Nginx는 앞에서 요청을 받아 넘긴다.

이 설명 자체가 틀린 것은 아니다. 다만 이 수준에서 멈추면 운영 배포 구조에서 Nginx가 왜 중요한지 충분히 보이지 않는다.

예를 들어 Docker Compose로 Spring Boot, MySQL, Redis, Nginx를 함께 실행한다고 해보자. 여기에 GitHub Actions로 새 Docker 이미지를 빌드하고, EC2에서 컨테이너를 교체하는 흐름까지 붙이면 질문이 생긴다.

```text
새 컨테이너는 어떤 주소로 접근해야 하지?
Nginx에서 localhost는 무엇을 의미하지?
Blue와 Green 중 어느 쪽으로 트래픽을 보내야 하지?
Spring Boot는 원래 요청이 HTTPS였는지 어떻게 알지?
```

이 질문들을 따라가다 보니 Nginx는 단순히 "앞에서 받아서 뒤로 넘기는 서버"가 아니라, 외부 사용자와 내부 컨테이너 구조 사이의 경계라는 생각이 들었다.

---

## 2. Docker Compose 환경에서는 localhost의 의미가 달라진다

가장 먼저 헷갈렸던 부분은 `localhost`였다.

Nginx가 EC2 호스트에 직접 설치되어 있고, Spring Boot도 같은 EC2의 8080 포트에서 실행 중이라면 아래 설정은 자연스럽다.

```nginx
location / {
    proxy_pass http://localhost:8080;
}
```

이 경우 `localhost:8080`은 EC2 호스트 자신의 8080 포트를 의미한다. 즉, 같은 서버에서 실행 중인 Spring Boot 애플리케이션을 바라볼 수 있다.

하지만 Nginx도 Docker 컨테이너로 실행 중이라면 이야기가 달라진다.

```text
Docker Compose Network
├── nginx container
└── app container : 8080
```

이때 Nginx 컨테이너 안에서 `localhost`는 EC2 호스트가 아니다. Nginx 컨테이너 자기 자신이다.

따라서 아래 설정은 Spring Boot 컨테이너를 바라보지 않는다.

```nginx
proxy_pass http://localhost:8080;
```

이 설정은 Nginx 컨테이너 자신의 8080 포트를 바라보게 된다. 만약 Nginx 컨테이너 안에서 8080 포트를 사용하는 프로세스가 없다면 연결은 실패할 수 있다.

Docker Compose 내부에서 Spring Boot 컨테이너로 요청을 보내려면 Compose 서비스 이름을 사용해야 한다.

```nginx
proxy_pass http://app:8080;
```

여기서 `app`은 `docker-compose.yml`에 정의된 Spring Boot 서비스 이름이다.

이 차이를 이해하고 나니 Docker 환경에서 네트워크를 볼 때 `localhost`를 습관적으로 쓰면 안 된다는 것을 알게 됐다.

> Docker 환경에서 localhost는 항상 서버 전체를 의미하지 않는다. 컨테이너 내부에서 localhost는 해당 컨테이너 자신을 의미한다. 따라서 컨테이너 간 통신에는 localhost가 아니라 Compose 서비스 이름을 사용해야 한다.

![Docker Compose에서 localhost와 service name 차이](/assets/images/2026-07-06-nginx-deployment-switching-point/localhost-service-name.png)

---

## 3. Compose 서비스 이름은 내부 네트워크의 주소처럼 동작한다

Docker Compose에서는 같은 네트워크에 있는 서비스끼리 서비스 이름으로 통신할 수 있다.

예를 들어 Spring Boot 서비스와 Nginx 서비스가 다음처럼 정의되어 있다고 해보자.

```yaml
services:
  app:
    image: my-spring-app

  nginx:
    image: nginx
```

이때 Nginx 컨테이너는 `http://app:8080`으로 Spring Boot 컨테이너에 요청을 보낼 수 있다.

여기서 `app`은 외부 도메인이 아니다. Docker Compose 내부 네트워크에서 사용할 수 있는 서비스 이름이다. 같은 Compose 네트워크에 들어간 컨테이너들은 이 이름을 통해 서로를 찾을 수 있다.

이 구조를 단순히 그리면 다음과 같다.

```text
External User
  ↓
nginx container
  ↓ http://app:8080
app container
```

이전 [Docker Compose 다음에 Kubernetes가 필요한 이유](/posts/kubernetes-after-docker-compose/) 글에서는 Docker Compose가 단일 EC2 안에서 여러 컨테이너를 함께 실행하기 좋은 현실적인 선택이라고 정리했다. 이번에는 그 Compose 내부에서 컨테이너끼리 어떤 이름으로 연결되는지를 Nginx 설정을 통해 다시 확인한 셈이다.

결국 Nginx 설정에서 `proxy_pass`는 단순히 URL 하나를 적는 것이 아니라, 외부 요청을 Compose 내부의 어떤 서비스로 넘길지 결정하는 설정이다.

---

## 4. upstream은 내부 서버 그룹을 논리적으로 묶는 설정이다

처음에는 아래처럼 Spring Boot 서비스로 바로 요청을 보낼 수 있다.

```nginx
server {
    location / {
        proxy_pass http://app:8080;
    }
}
```

이 방식도 동작한다. 하지만 운영 설정에서는 내부 서버를 `upstream`으로 묶을 수 있다.

```nginx
upstream backend {
    server app:8080;
}

server {
    location / {
        proxy_pass http://backend;
    }
}
```

처음 이 설정을 봤을 때는 `backend`가 Docker 컨테이너 이름처럼 느껴졌다. 하지만 정확히는 아니다.

여기서 `backend`는 Docker Compose 서비스 이름이 아니라 Nginx 설정 안에서 정의한 upstream 그룹 이름이다.

실제 요청 대상은 `backend`라는 컨테이너가 아니다. `upstream backend` 안에 등록된 `app:8080`이다.

```text
proxy_pass http://backend
          ↓
upstream backend
          ↓
server app:8080
```

이렇게 보면 `upstream`은 내부 서버의 실제 주소를 감싸는 논리적인 이름이라고 볼 수 있다. Nginx는 외부 요청을 `backend`라는 그룹으로 보내고, 그 그룹 안에 등록된 서버로 실제 요청을 전달한다.

---

## 5. upstream은 Load Balancing 구조로 확장될 수 있다

Spring Boot 인스턴스가 여러 개라면 `upstream`에 여러 서버를 등록할 수 있다.

```nginx
upstream backend {
    server app-blue:8080;
    server app-green:8080;
}

server {
    location / {
        proxy_pass http://backend;
    }
}
```

이 경우 Nginx는 기본적으로 등록된 서버들에 요청을 나눠 보낸다.

```text
요청 1 → app-blue
요청 2 → app-green
요청 3 → app-blue
요청 4 → app-green
```

즉, Reverse Proxy 구조가 Load Balancing 구조로 확장된다.

여기서 중요한 점은 `upstream`이 단순히 설정을 보기 좋게 만드는 문법만은 아니라는 것이다. 내부 서버 그룹을 논리적으로 관리하고, 그 그룹 안에 서버를 하나에서 여러 개로 확장할 수 있게 해주는 기반이다.

처음에는 `proxy_pass http://app:8080`처럼 하나의 대상만 생각했다. 하지만 운영 관점으로 들어가면 "현재 요청을 어떤 서버 그룹으로 보낼 것인가"가 더 중요해진다. `upstream`은 그 서버 그룹을 Nginx 안에서 표현하는 방법이라고 이해했다.

---

## 6. Load Balancing과 Blue-Green 배포는 다르다

여기서 꼭 구분해야 할 부분이 있다.

`upstream`에 두 서버를 모두 열어두면 Nginx는 두 서버에 요청을 나눠 보낸다. 이것은 Load Balancing에 가깝다.

```nginx
upstream backend {
    server app-blue:8080;
    server app-green:8080;
}
```

이 구조에서는 `app-blue`와 `app-green`이 동시에 트래픽을 받는다. 두 애플리케이션이 모두 같은 버전이거나, 동시에 트래픽을 받아도 문제가 없는 구조라면 의미가 있다.

반면 Blue-Green 배포에서는 두 서버가 동시에 트래픽을 받는 것이 핵심이 아니다. 현재 운영 버전 하나만 트래픽을 받고 있다가, 새 버전이 준비되면 트래픽 대상을 전환하는 것이 핵심이다.

전환 전에는 Blue만 트래픽을 받게 둘 수 있다.

```nginx
upstream backend {
    server app-blue:8080;
    # server app-green:8080;
}
```

전환 후에는 Green으로 바꾼다.

```nginx
upstream backend {
    # server app-blue:8080;
    server app-green:8080;
}
```

이 차이를 놓치면 "Blue-Green은 컨테이너 두 개 띄우고 둘 다 upstream에 넣으면 되는 것 아닌가?"라고 오해할 수 있다. 하지만 그렇게 하면 두 버전이 동시에 요청을 나눠 받는 구조가 된다.

정리하면 다음과 같다.

> Load Balancing은 여러 서버에 요청을 나눠 보내는 구조이고, Blue-Green 배포는 현재 트래픽을 받는 버전을 새 버전으로 전환하는 구조다.

![Nginx upstream에서 Load Balancing과 Blue-Green 배포 차이](/assets/images/2026-07-06-nginx-deployment-switching-point/upstream-load-balancing-blue-green.png)

단일 EC2 + Docker Compose 환경에서 Blue-Green을 흉내 낸다면, Nginx는 사용자의 요청을 Blue로 보낼지 Green으로 보낼지 결정하는 전환 지점이 될 수 있다.

---

## 7. Blue-Green 전환 전에는 health check가 필요하다

Blue-Green 배포에서 중요한 것은 새 컨테이너를 띄우는 것 자체가 아니다. 새 버전이 정상 동작하는지 확인한 뒤 트래픽을 전환하는 것이다.

예를 들어 흐름은 다음처럼 볼 수 있다.

```text
1. 현재 트래픽은 Blue로 전달
   User → Nginx → app-blue

2. 새 버전 Green 실행
   app-green 기동

3. Green health check 확인
   curl http://app-green:8080/health

4. 정상 확인 후 Nginx 설정 전환
   User → Nginx → app-green

5. 문제가 있으면 Blue 유지
```

새 컨테이너가 `Up` 상태라고 해서 곧바로 운영 요청을 받을 준비가 끝났다고 볼 수는 없다.

다음과 같은 문제가 있을 수 있다.

* DB 연결 실패
* Redis 연결 실패
* 환경 변수 누락
* Flyway 마이그레이션 실패
* Spring Bean 생성 실패
* 외부 API 설정 누락
* `/health` 응답 실패

이전 CI/CD 글에서도 컨테이너 실행과 서비스 정상 응답은 다르다고 정리했다. 이번에는 그 관점이 Nginx 전환 시점과 연결된다.

Green 컨테이너가 실행됐더라도 health check를 통과하기 전까지는 트래픽을 넘기면 안 된다. 트래픽 전환은 "컨테이너가 떴다"가 아니라 "새 버전이 운영 요청을 처리할 준비가 됐다"는 확인 이후에 이루어져야 한다.

---

## 8. Nginx reload는 트래픽 전환에 사용될 수 있다

Nginx 설정을 변경한 뒤에는 reload가 필요하다.

```bash
sudo systemctl reload nginx
```

컨테이너 환경이라면 Nginx 컨테이너 안에서 reload를 실행하거나, 설정 반영 방식에 맞게 Nginx 컨테이너를 재시작할 수 있다.

여기서 중요한 점은 Nginx가 배포 도구 자체는 아니라는 것이다. GitHub Actions처럼 이미지를 빌드하거나, EC2에 접속해서 컨테이너를 실행하는 일을 Nginx가 대신해주지는 않는다.

다만 Nginx는 사용자 트래픽을 어느 애플리케이션 버전으로 보낼지 결정하는 전환 지점이 될 수 있다.

```text
GitHub Actions
  ↓
새 이미지 빌드
  ↓
EC2에서 Green 컨테이너 실행
  ↓
health check 통과
  ↓
Nginx upstream 대상을 Green으로 전환
  ↓
Nginx reload
```

물론 단일 EC2 + Docker Compose 구조에서 이것만으로 완전한 무중단 배포가 항상 보장되는 것은 아니다. 컨테이너 기동 시간, Nginx reload 시점, 애플리케이션 graceful shutdown, 기존 요청 처리, DB 마이그레이션 호환성까지 함께 고려해야 한다.

그래서 "Nginx가 있으면 무중단 배포가 된다"라고 단정하기보다는, Nginx가 무중단 배포 구조로 확장할 수 있는 트래픽 전환 지점을 만든다고 이해하는 것이 더 현실적이다.

---

## 9. proxy_set_header는 원본 요청 정보를 전달한다

마지막으로 `proxy_set_header`도 조금 더 깊게 이해할 필요가 있었다.

Reverse Proxy 뒤에 있는 Spring Boot는 사용자의 요청을 직접 받은 것이 아니다. Nginx가 전달한 요청을 받는다.

예를 들어 사용자는 다음처럼 요청한다.

```text
https://example.com/api/orders
```

하지만 Nginx는 내부적으로 다음처럼 Spring Boot에 전달할 수 있다.

```text
http://app:8080/api/orders
```

이때 Spring Boot 입장에서는 원래 요청이 HTTPS였는지, 사용자가 어떤 도메인으로 접근했는지, 실제 클라이언트 IP가 무엇인지 직접 알기 어렵다.

그래서 다음 설정을 사용한다.

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

각 헤더는 다음 정보를 전달한다.

* `Host`: 원래 요청 도메인
* `X-Real-IP`: Nginx가 본 클라이언트 IP
* `X-Forwarded-For`: 프록시를 거쳐온 IP 체인
* `X-Forwarded-Proto`: 원래 요청 프로토콜, HTTP 또는 HTTPS

특히 `X-Forwarded-Proto`는 외부 요청이 HTTPS였는지 알려주기 때문에 중요하다.

이 정보는 다음 상황에 영향을 줄 수 있다.

* HTTPS 리다이렉트
* OAuth callback URL 생성
* Swagger/OpenAPI 서버 URL
* Spring Security의 secure 판단
* 로그 분석

처음에는 `proxy_set_header`를 부가적인 헤더 설정 정도로 봤다. 하지만 Reverse Proxy를 거치면 원본 요청의 맥락이 흐려질 수 있다. 그 맥락을 애플리케이션에 다시 전달하는 설정이 `proxy_set_header`였다.

> proxy_set_header는 단순히 헤더를 추가하는 설정이 아니라, Reverse Proxy를 거치면서 흐려질 수 있는 원본 요청 정보를 애플리케이션에 전달하는 설정이다.

---

## 10. 마치며

처음에는 Nginx를 Spring Boot 앞에서 요청을 넘겨주는 단순 프록시로 이해했다.

하지만 Docker Compose 환경에서는 `localhost`의 의미부터 다시 생각해야 했다. Nginx가 컨테이너로 실행 중이라면 `localhost:8080`은 Spring Boot 컨테이너가 아니라 Nginx 컨테이너 자신을 가리킬 수 있다. 그래서 컨테이너 간 통신에는 Compose 서비스 이름을 사용해야 한다.

또한 `upstream`을 사용하면 내부 서버를 논리적으로 묶을 수 있고, 여러 서버로 확장되면 Load Balancing 구조가 된다. 다만 Load Balancing과 Blue-Green 배포는 다르다. Blue-Green 배포에서는 두 서버를 동시에 사용하는 것이 아니라, health check 이후 트래픽 대상을 전환하는 것이 중요하다.

마지막으로 Reverse Proxy 뒤의 Spring Boot는 원본 요청 정보를 직접 알기 어렵기 때문에 `proxy_set_header`로 Host, 실제 IP, HTTPS 여부 같은 정보를 전달해야 한다.

결국 Nginx는 단순한 웹 서버나 프록시가 아니라, 외부 사용자와 내부 컨테이너 기반 애플리케이션 사이에서 트래픽, 배포 전환, 요청 정보를 다루는 운영 경계라고 이해했다.

---

## 함께 보면 좋은 글

* [Nginx는 왜 Spring Boot 앞단에 있을까?](/posts/why-nginx-in-front-of-spring-boot/)
* [CI/CD는 YAML 작성이 아니라 안정적인 배포와 복구를 설계하는 과정이었다](/posts/cicd-design-not-yaml/)
* [Docker Compose 다음에 Kubernetes가 필요한 이유](/posts/kubernetes-after-docker-compose/)

---

## 글 중간에 넣을 이미지 위치 제안

### 이미지 1. Docker Compose에서 localhost와 service name 차이

`2. Docker Compose 환경에서는 localhost의 의미가 달라진다` 섹션 뒤에 넣으면 좋다. 호스트에 직접 설치된 Nginx의 `localhost:8080`과 컨테이너 안에서 실행 중인 Nginx의 `localhost:8080`이 서로 다른 대상을 가리킨다는 점을 직관적으로 보여줄 수 있다.

### 이미지 2. Nginx upstream 구조

`4. upstream은 내부 서버 그룹을 논리적으로 묶는 설정이다` 섹션 뒤에 넣으면 좋다. `backend`가 Docker 컨테이너 이름이 아니라 Nginx 내부의 upstream 그룹 이름이라는 점을 시각적으로 설명하기 좋다.

### 이미지 3. Load Balancing과 Blue-Green 차이

`6. Load Balancing과 Blue-Green 배포는 다르다` 섹션 뒤에 넣으면 좋다. 여러 서버에 요청을 나눠 보내는 구조와, 하나의 운영 버전에서 다른 버전으로 트래픽을 전환하는 구조를 비교할 수 있다.

### 이미지 4. proxy_set_header 흐름

`9. proxy_set_header는 원본 요청 정보를 전달한다` 섹션 뒤에 넣으면 좋다. Client → Nginx → Spring Boot 흐름에서 Host, IP, Proto 정보가 어떻게 전달되는지 보여주면 `proxy_set_header`의 필요성이 더 잘 드러난다.

---

## 이미지 생성 프롬프트

### 프롬프트 1. Docker Compose에서 localhost와 service name 차이

> 16:9 기술 블로그용 다이어그램 이미지. 흰색 또는 아주 밝은 배경, 깔끔한 기업 기술 블로그 스타일, 얇은 선, 둥근 박스, 빨간색 포인트 컬러, 과한 3D 금지. 주제는 Docker Compose 환경에서 Nginx의 `localhost:8080`과 `app:8080` 차이. 왼쪽 영역에는 "EC2 Host에 직접 설치된 Nginx", "Spring Boot : 8080", "`proxy_pass http://localhost:8080`", "localhost가 EC2 Host를 가리킴"을 표시한다. 오른쪽 영역에는 "Docker Compose Network", "nginx container", "app container : 8080", "`proxy_pass http://localhost:8080`은 nginx container 자신을 가리킴", "올바른 설정: `proxy_pass http://app:8080`"을 표시한다. 핵심 문구는 "컨테이너 내부의 localhost는 컨테이너 자신이다". 텍스트는 한국어로 작성하고, 읽기 쉬운 DevOps 다이어그램 스타일로 구성한다.

### 프롬프트 2. Nginx upstream, Load Balancing, Blue-Green 비교

> 16:9 기술 블로그용 비교 다이어그램 이미지. 흰색 배경, 좌우 비교 레이아웃, 빨간색 포인트 컬러, 얇은 선과 둥근 박스, DevOps 발표자료 느낌. 주제는 Nginx upstream이 Load Balancing과 Blue-Green 배포에서 어떻게 다르게 사용되는지 비교. 왼쪽은 "Load Balancing" 영역으로 구성하고, "Client → Nginx upstream backend" 흐름 아래에 app-blue와 app-green이 둘 다 활성화되어 있으며 요청 화살표가 두 서버로 나뉘는 모습을 보여준다. 문구는 "여러 서버에 요청 분산". 오른쪽은 "Blue-Green 배포" 영역으로 구성하고, "Client → Nginx" 이후 현재는 app-blue로만 트래픽이 전달되고, app-green은 health check 후 전환 대상으로 표시한다. 전환 후 app-green으로 트래픽이 이동하는 화살표를 함께 표시한다. 문구는 "정상 확인 후 트래픽 전환". 핵심 문구는 "Load Balancing은 분산, Blue-Green은 전환". 텍스트는 한국어로 작성한다.
