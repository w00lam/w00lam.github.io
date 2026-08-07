---
title: "세션 인증은 서버가 여러 대가 되면 어떻게 동작할까?"
date: 2026-08-07
categories: [TIL, Backend, Security, AWS]
tags: [Session, Sticky Session, Redis, Spring Session, JWT, ALB, EC2, Stateless, Auto Scaling, Blue-Green, TIL]
permalink: /posts/session-auth-multi-server/
---

이전 글에서 Basic Auth와 세션 인증의 차이를 정리했다. Basic Auth는 요청마다 인증 정보를 보내는 방식이고, 세션 인증은 로그인할 때 서버가 로그인 상태를 만들어 둔 뒤 이후 요청에서는 세션 ID로 사용자를 식별하는 방식이었다.

그때까지만 해도 세션 인증은 꽤 단순하게 느껴졌다. 로그인하면 서버에 로그인 정보를 저장하고, 브라우저에는 쿠키 하나만 남기면 되기 때문이다.

그런데 애플리케이션을 EC2 한 대에서 여러 대로 늘리고, 그 앞에 ALB(Application Load Balancer)를 두는 순간 질문이 달라진다.

> 사용자가 어느 서버로 가더라도 로그인 상태를 유지하려면, 세션은 어디에 저장되어 있어야 할까?

이번 글에서는 이 질문을 기준으로 Sticky Session, Redis 기반 세션 저장소, JWT 기반 Stateless 인증을 비교해 보려고 한다. 단순히 “세션은 Stateful이고 JWT는 Stateless다”에서 끝내지 않고, 실제 운영 환경에서 Auto Scaling과 배포까지 연결해서 생각해 보았다.

## 제목 후보와 최종 선택

이번 글의 제목 후보는 다음과 같았다.

1. 세션 인증은 서버가 여러 대가 되면 어떻게 동작할까?
2. 다중 서버 환경에서 세션 인증을 유지하는 방법
3. Sticky Session, Redis, JWT는 왜 필요할까?

최종 제목은 **“세션 인증은 서버가 여러 대가 되면 어떻게 동작할까?”**로 정했다. 특정 기술 하나를 추천하기보다, 서버가 늘어날 때 세션 인증의 구조가 어떻게 달라지는지를 설명하는 글이기 때문이다.

## 1. 세션 인증의 기본 구조

세션 인증은 서버가 사용자의 로그인 상태를 기억하는 방식이다. 여기서 중요한 점은 브라우저가 사용자 정보를 직접 들고 있는 것이 아니라, 서버가 관리하는 세션을 가리키는 **Session ID**만 쿠키로 들고 있다는 것이다.

로그인 과정을 단순화하면 다음과 같다.

```text
Client
  ↓ Login Request (아이디/비밀번호)
Server
  ↓ 사용자 인증 성공
Session 생성
  ↓ Session ID 발급
Cookie 저장 (예: JSESSIONID=abc123)
  ↓ 이후 요청마다 Cookie 헤더로 Session ID 전달
Server가 Session ID로 사용자 식별
```

조금 더 구체적으로 나누면 다음 순서다.

1. 사용자가 로그인 요청을 보낸다.
2. 서버는 아이디와 비밀번호를 확인한다.
3. 인증에 성공하면 서버가 세션을 생성하고 사용자 식별자, 권한, 만료 시간 같은 정보를 세션에 저장한다.
4. 서버는 Session ID를 응답 쿠키로 전달한다. 일반적인 Spring Boot 환경에서는 `JSESSIONID`라는 이름을 자주 볼 수 있다.
5. 브라우저는 쿠키를 저장하고, 이후 요청마다 다음과 같은 쿠키를 자동으로 보낸다.

```http
Cookie: JSESSIONID=abc123
```

6. 서버는 `abc123`을 세션 저장소에서 조회한다.
7. 세션에 저장된 사용자 정보를 확인한 뒤 해당 요청을 인증된 사용자 요청으로 처리한다.

실제 응답에는 다음과 같은 속성이 함께 붙을 수 있다.

```http
Set-Cookie: JSESSIONID=abc123; HttpOnly; Secure; SameSite=Lax
```

`HttpOnly`, `Secure`, `SameSite`는 쿠키를 안전하게 다루기 위한 설정이다. 다만 이 글의 핵심은 쿠키 보안 옵션보다 **Session ID가 가리키는 세션 데이터가 어디에 저장되어 있는가**에 있다.

세션을 서버 메모리에 저장하는 가장 단순한 구조는 다음과 같다.

```text
EC2 한 대
└─ Spring Boot 애플리케이션
   └─ 메모리
      ├─ abc123 → User A, ROLE_USER
      └─ def456 → User B, ROLE_ADMIN
```

브라우저가 가지고 있는 것은 `abc123`이라는 식별자뿐이다. 실제 사용자 정보는 서버 메모리에 있다. 따라서 요청을 처리한 서버가 그 Session ID에 해당하는 세션 데이터를 가지고 있어야 한다.

이 지점이 단일 서버에서는 잘 보이지 않다가, 서버가 여러 대가 되면 문제가 된다.

참고로 Basic Auth와 세션 인증의 차이는 이전 글인 [Basic Auth와 세션 인증은 무엇이 다른가](/posts/basic-auth-vs-session-auth/)에서 로그인 화면, 로그아웃, 만료, 쿠키 관점으로 먼저 정리했다. 이번 글은 그다음 단계로, 세션의 저장 위치와 서버 확장 문제에 집중한다.

## 2. 단일 서버에서는 왜 문제가 없는가

EC2 한 대에서 Spring Boot 애플리케이션을 운영한다고 가정해 보자.

```text
Client
  ↓
EC2-A
  └─ 애플리케이션 메모리
     └─ Session ID abc123 → User A
```

사용자가 EC2-A에서 로그인하면 `abc123` 세션이 EC2-A의 메모리에 저장된다. 이후 요청도 계속 EC2-A로 들어온다면, EC2-A는 매번 같은 메모리에서 `abc123`을 찾을 수 있다.

그래서 사용자는 로그인 상태를 유지한다.

```text
1. 로그인 요청  → EC2-A
2. 세션 생성   → EC2-A 메모리에 저장
3. 상품 조회   → EC2-A에서 abc123 조회 성공
4. 주문 요청   → EC2-A에서 abc123 조회 성공
```

이 구조에서는 세션 저장소와 요청을 처리하는 서버가 항상 같기 때문에 문제가 드러나지 않는다. 개발 환경에서 애플리케이션 하나를 실행할 때 세션 인증이 자연스럽게 동작하는 이유도 여기에 있다.

물론 단일 서버의 메모리 세션도 서버가 재시작되면 사라진다. 하지만 트래픽을 여러 서버로 분산했을 때처럼 “요청이 정상적으로 살아 있는 다른 서버로 갔는데 세션을 못 찾는” 문제는 없다.

## 3. 서버가 여러 대가 되면 세션이 깨지는 이유

이제 구조를 다음과 같이 바꿔 보자.

```text
Client
  ↓
ALB
  ├─ EC2-A
  └─ EC2-B
```

ALB는 들어온 요청을 여러 EC2 인스턴스 중 하나로 전달한다. 중요한 점은 ALB가 Spring Boot 애플리케이션의 세션 내용을 알고 라우팅하는 것이 아니라는 점이다. 기본적으로 ALB는 헬스 체크와 로드 밸런싱 기준에 따라 요청을 전달한다.

다음과 같은 일이 생길 수 있다.

1. 사용자가 ALB를 통해 EC2-A에서 로그인한다.
2. EC2-A 메모리에 `Session ID = abc123`이 저장된다.
3. 브라우저는 `JSESSIONID=abc123` 쿠키를 다음 요청에도 보낸다.
4. 다음 요청이 ALB에 의해 EC2-B로 전달된다.
5. EC2-B 메모리에는 `abc123` 세션 정보가 없다.
6. EC2-B는 사용자를 로그인하지 않은 사용자처럼 처리할 수 있다.

이 상황을 그림으로 보면 더 분명하다.

![다중 서버 환경에서 EC2-A의 로컬 세션을 EC2-B가 찾지 못하는 구조](/assets/images/2026-08-07-session-auth-scaling/local-session-failure.png)
_EC2-A에는 `Session: abc123`이 있지만, 다음 요청을 받은 EC2-B에는 해당 세션이 없다._

브라우저가 쿠키를 잃어버린 것이 아니다. Session ID도 그대로 `abc123`이다. 문제는 **Session ID를 해석할 세션 상태가 특정 서버의 메모리에만 존재한다는 것**이다.

즉, 세션 인증에서 “서버가 로그인 상태를 기억한다”는 말은 동시에 “그 상태를 어느 서버가 기억하고 있는가?”라는 질문을 포함한다. 서버가 한 대일 때는 이 질문의 답이 항상 같지만, 여러 대가 되면 답이 달라질 수 있다.

이것이 다중 서버 환경에서 로컬 메모리 세션이 갖는 문제다. 세션 상태가 특정 서버에 종속되어 있기 때문에, ALB의 라우팅 결과에 따라 같은 사용자가 로그인 사용자였다가 로그아웃 사용자처럼 보일 수 있다.

## 4. 해결 방법 1: Sticky Session

가장 먼저 떠올릴 수 있는 해결책은 **Sticky Session**이다. 말 그대로 같은 사용자의 요청을 가급적 같은 서버로 계속 보내는 방식이다.

```text
Client
  ↓
ALB
  ↓
EC2-A ← 로그인 이후에도 같은 사용자의 요청을 계속 전달
└─ 메모리: abc123 → User A
```

### ALB에서 어떻게 동작하는가

AWS ALB에서는 Target Group의 stickiness 설정을 켜고, 로드 밸런서가 발급하는 쿠키를 기준으로 같은 클라이언트의 요청을 같은 Target으로 전달할 수 있다. 브라우저가 이 쿠키를 유지하는 동안 ALB는 해당 사용자를 특정 EC2 인스턴스에 붙여 둔다.

이 경우 사용자의 `JSESSIONID=abc123`이 EC2-A의 메모리에 있어도, ALB가 계속 EC2-A로 보내 주기 때문에 세션이 유지된다. 애플리케이션 코드를 크게 바꾸지 않고 기존의 메모리 세션을 그대로 사용할 수 있다는 점이 가장 큰 장점이다.

### Sticky Session의 장점

구현이 비교적 간단하다. 기존 Spring Boot의 `HttpSession` 구조를 유지하면서 ALB 설정만 추가할 수 있는 경우가 많다. 작은 서비스나 마이그레이션 초기 단계에서 빠르게 적용하기 좋은 이유다.

### Sticky Session의 한계

하지만 Sticky Session은 세션 문제를 근본적으로 없앤다기보다, 요청이 세션을 가진 서버로 가도록 유도하는 방법이다.

- 특정 EC2 인스턴스에 사용자가 계속 붙으면 트래픽이 고르게 분산되지 않을 수 있다.
- 신규 인스턴스가 추가되어도 기존 사용자의 요청이 기존 인스턴스에 몰릴 수 있다.
- 한 서버에 장애가 발생하면 그 서버 메모리에만 있던 세션도 함께 사라진다.
- ALB가 다른 정상 서버로 요청을 우회하더라도, 그 서버에는 기존 세션이 없을 수 있다.
- 서버 간에 세션 상태를 공유하는 구조 자체는 만들어지지 않는다.

특히 Auto Scaling을 생각하면 한계가 더 분명해진다. 트래픽이 줄어 EC2-A를 축소 대상으로 선택했는데, 그 안에 많은 사용자의 세션이 남아 있다면 인스턴스를 종료하는 순간 해당 세션은 사라진다. 반대로 트래픽이 늘어 EC2-C를 새로 추가해도 새 서버가 기존 세션을 자동으로 알게 되는 것은 아니다.

따라서 Sticky Session은 다음처럼 이해하는 것이 적절하다.

> Sticky Session은 “세션을 공유한다”가 아니라 “세션을 가진 서버로 계속 보낸다”에 가깝다.

운영 규모가 작고 서버 장애 시 재로그인을 허용할 수 있다면 현실적인 선택이 될 수 있다. 그러나 고가용성, 자유로운 스케일 인/아웃, 무중단 배포가 중요해질수록 외부 세션 저장소를 검토하게 된다.

## 5. 해결 방법 2: Redis 기반 세션 저장

두 번째 방법은 세션을 각 EC2의 메모리가 아니라 Redis 같은 외부 저장소에 저장하는 것이다.

```text
Client
  ↓
ALB
  ├─ EC2-A ─┐
  ├─ EC2-B ─┼─→ Redis
  └─ EC2-C ─┘    └─ Session ID abc123 → User A
```

이번에는 로그인 요청이 EC2-A로 들어가더라도 세션 데이터는 Redis에 저장된다.

1. EC2-A가 로그인 성공 후 세션을 생성한다.
2. 세션 데이터가 Redis에 저장된다.
3. 브라우저는 여전히 Session ID를 쿠키로 저장한다.
4. 다음 요청이 EC2-B로 전달된다.
5. EC2-B는 `abc123`을 Redis에서 조회한다.
6. EC2-B도 User A의 세션을 확인하고 인증된 요청으로 처리한다.

![여러 EC2 인스턴스가 하나의 Redis 세션 저장소를 공유하는 구조](/assets/images/2026-08-07-session-auth-scaling/redis-session-sharing.png)
_세션이 Redis에 있으므로 ALB가 어떤 EC2로 요청을 전달해도 같은 로그인 상태를 조회할 수 있다._

### Spring Session + Redis

Spring Boot에서는 Spring Session을 사용해 `HttpSession`을 Redis에 저장하도록 구성할 수 있다. 애플리케이션 코드가 세션을 사용하는 방식은 크게 바꾸지 않고, 세션 구현과 저장 위치를 외부 저장소 기반으로 바꾸는 접근이다.

개념적으로는 다음과 같다.

```text
HttpSession API
      ↓ Spring Session
Redis에 세션 데이터 저장
```

Gradle에서는 다음과 같은 의존성을 추가할 수 있다.

```groovy
implementation 'org.springframework.session:spring-session-data-redis'
implementation 'org.springframework.boot:spring-boot-starter-data-redis'
```

설정은 사용하는 Spring Boot 버전에 따라 조금씩 다를 수 있지만, 개념적으로는 다음과 같이 Redis와 세션 저장 방식을 지정한다.

```yaml
spring:
  session:
    store-type: redis
    timeout: 30m
  data:
    redis:
      host: redis.example.internal
      port: 6379
```

기존 애플리케이션 코드에서는 여전히 `HttpSession`을 사용할 수 있다.

```java
@PostMapping("/login")
public void login(HttpServletRequest request) {
    HttpSession session = request.getSession(true);
    session.setAttribute("userId", "user-1");
}
```

실제 로그인에서는 비밀번호 검증과 세션 고정 공격 방어, 세션 ID 재발급 등을 함께 고려해야 한다. 여기서 중요한 부분은 `HttpSession`을 호출하는 코드와 세션 데이터가 실제로 저장되는 위치가 분리된다는 점이다.

### Redis 세션의 장점

Redis를 세션 저장소로 두면 애플리케이션 서버는 세션 상태를 로컬 메모리에 들고 있지 않아도 된다. 그래서 “완전한 Stateless”는 아니지만, **애플리케이션 서버만 보면 Stateless에 가까운 구조**가 된다.

- 어떤 EC2로 요청이 가도 같은 세션을 조회할 수 있다.
- Sticky Session 없이도 ALB가 요청을 자유롭게 분산할 수 있다.
- 새 EC2를 추가해도 별도의 세션 복사 과정이 필요 없다.
- 서버를 축소하거나 교체해도 세션 데이터가 애플리케이션 인스턴스와 함께 사라지지 않는다.
- Auto Scaling, Rolling Deployment, Blue-Green Deployment에 유리하다.

즉, 세션 상태를 서버와 분리하면 서버는 “요청을 처리하는 역할”에 집중할 수 있다.

### Redis 세션의 운영상 한계

대신 Redis가 인증 흐름의 중요한 의존성이 된다. Redis가 장애를 일으키거나 네트워크가 끊기면, 애플리케이션이 세션을 조회하지 못해 로그인 사용자를 인증하지 못할 수 있다.

운영할 때는 다음을 함께 생각해야 한다.

- Redis 장애가 인증 전체에 미치는 영향과 장애 대응 방법
- Primary-Replica, Sentinel, Cluster 같은 고가용성 구성
- 세션 TTL과 만료 정책
- Redis 메모리 사용량과 eviction 정책
- 네트워크 지연과 커넥션 풀
- TLS, 인증 정보, 접근 제어
- 세션 직렬화 형식이 배포 버전과 호환되는지 여부
- Redis 비용과 모니터링, 백업 및 복구 정책

Redis는 단순한 캐시로만 쓰일 때보다, 세션 저장소로 사용될 때 장애의 의미가 더 커진다. Redis를 캐시에 객체로 저장할 때 직렬화가 필요한 이유는 [Redis 캐시에 객체를 저장할 때 직렬화가 필요한 이유](/posts/redis-cache-serialization/)에서 정리했고, Redis 장애 감지와 Failover는 [단일 Redis 장애에서 Sentinel까지](/posts/redis-sentinel-high-availability/)에서 더 자세히 다뤘다.

## 6. 해결 방법 3: JWT 기반 Stateless 인증

세 번째 방법은 서버가 세션을 저장하는 대신, 인증에 필요한 정보를 토큰에 담아 클라이언트가 보내도록 하는 JWT 기반 인증이다.

```text
Client
  └─ JWT Access Token
       ↓
      ALB
       ├─ EC2-A
       ├─ EC2-B
       └─ EC2-C
```

각 서버가 같은 서명 키를 알고 있거나 공개 키를 가지고 있다면, 어느 서버로 요청이 들어와도 JWT의 서명과 만료 시간, 필요한 클레임을 직접 검증할 수 있다. 서버 메모리에서 `abc123` 세션을 조회할 필요가 없다.

### Access Token과 Refresh Token

JWT 인증에서는 보통 토큰을 두 종류로 나눈다.

- **Access Token**: API 요청을 인증하는 짧은 수명의 토큰이다. 요청마다 `Authorization: Bearer <token>` 형태로 보내거나, 쿠키에 담아 보낼 수 있다.
- **Refresh Token**: Access Token이 만료됐을 때 새 Access Token을 발급받기 위한 긴 수명의 토큰이다. 일반 API 요청마다 보내기보다는 토큰 재발급 흐름에서만 사용한다.

Access Token을 짧게 유지하면 탈취됐을 때의 피해 시간을 줄일 수 있다. 하지만 너무 짧게 만들면 만료와 재발급 요청이 잦아진다. Refresh Token은 오래 살아 있는 만큼 더 조심해서 보관해야 한다.

### JWT 서버가 세션을 저장하지 않아도 되는 이유

세션 방식에서는 다음과 같은 외부 상태가 필요하다.

```text
Session ID abc123 → User A
```

반면 JWT에는 사용자 식별자, 권한, 만료 시간 등이 서명된 토큰 안에 들어 있다. 서버는 서명을 검증해 토큰이 신뢰할 수 있는 발급자에게서 왔는지 확인하고, 만료 여부와 권한을 검사한다.

```text
JWT
  ├─ sub: user-1
  ├─ exp: 만료 시간
  └─ signature: 서버가 검증할 서명
```

따라서 EC2-A와 EC2-B가 같은 검증 규칙과 키를 가지고 있다면 별도의 세션 저장소 없이도 같은 사용자를 인증할 수 있다. 이 특성 때문에 서버를 여러 대로 늘리거나 새 인스턴스를 교체하는 데 유리하다.

### JWT의 운영상 고민

JWT가 세션 저장소를 없애 준다고 해서 인증 문제가 모두 사라지는 것은 아니다.

첫 번째 문제는 토큰 탈취다. Access Token이 탈취되면 만료될 때까지 공격자가 정상 사용자처럼 요청할 수 있다. JWT는 서명된 토큰이지, 기본적으로 내용이 암호화된 토큰은 아니다. 민감한 정보를 클레임에 넣지 않는 것도 중요하다.

두 번째 문제는 로그아웃과 강제 만료다. 서버가 토큰 상태를 저장하지 않는다면, 이미 발급한 Access Token을 서버가 즉시 회수하기 어렵다. 사용자가 로그아웃해도 토큰의 만료 시간 전까지는 기술적으로 유효할 수 있다.

이를 보완하는 방법은 여러 가지다.

- Access Token의 만료 시간을 짧게 설정한다.
- Refresh Token을 삭제하거나 폐기해 추가 발급을 막는다.
- Refresh Token Rotation을 적용해 사용할 때마다 새 토큰으로 교체한다.
- 로그아웃한 토큰이나 토큰 식별자를 Redis Denylist에 저장한다.
- 사용자별 토큰 버전이나 `securityVersion`을 DB에서 확인한다.

이때 Refresh Token을 어디에 저장할지도 설계 대상이다. 서버 DB에 해시 형태로 저장할 수도 있고, Redis에 TTL과 함께 저장할 수도 있다. 브라우저 기반 서비스라면 Refresh Token을 `HttpOnly`, `Secure` 쿠키에 보관하는 방식을 검토할 수 있다. 모바일 클라이언트라면 운영체제의 안전한 저장소를 사용할 수 있다.

결국 JWT라고 해서 무조건 Redis가 필요 없는 것은 아니다.

```text
JWT Access Token 검증 자체  → 서버 로컬에서 처리 가능
Refresh Token 폐기/Rotation → Redis 또는 DB가 필요할 수 있음
강제 로그아웃/차단 목록     → Redis 또는 DB가 필요할 수 있음
```

즉, JWT는 “모든 인증 상태를 외부 저장소에서 제거한다”기보다, **일반 요청의 인증을 세션 조회 없이 처리할 수 있게 한다**고 이해하는 편이 정확하다.

세션과 JWT의 기본적인 차이, Spring에서 ArgumentResolver를 활용하는 방법은 [인증 방식의 이해: Session vs JWT와 Spring ArgumentResolver 활용](/posts/session-jwt-spring/)에서 이어서 볼 수 있다. 실제 JWT 검증 책임을 필터 안에서 어떻게 나눌지 고민했다면 [JWT 인증 필터에서 검증 책임을 분리한 이유](/posts/why-split-jwt-validation-responsibilities/)도 연결해서 읽기 좋다.

## 7. 세 가지 방식을 운영 관점에서 비교하기

세 방식은 정답과 오답의 관계가 아니다. 어떤 방식이 적합한지는 트래픽 규모, 장애 시 허용할 수 있는 사용자 경험, 로그아웃 정책, 인프라 운영 역량에 따라 달라진다.

| 비교 기준 | Sticky Session | Redis Session | JWT Stateless |
| --- | --- | --- | --- |
| 구현 난이도 | 낮음. 기존 `HttpSession`을 유지하고 ALB stickiness 설정을 추가 | 중간. Spring Session과 Redis 운영을 함께 구성 | 중간~높음. 토큰 발급, 검증, 재발급, 보안 정책 필요 |
| 서버 확장성 | 낮음~중간. 사용자가 특정 서버에 묶임 | 높음. 모든 서버가 같은 세션 저장소를 조회 | 높음. 서버가 토큰을 독립적으로 검증 |
| 서버 장애 대응 | 취약. 장애 서버의 로컬 세션이 사라질 수 있음 | Redis가 정상이라면 애플리케이션 서버 장애에 강함 | 애플리케이션 서버 장애에 강함. 키와 토큰 정책은 공유되어야 함 |
| 상태 저장 위치 | 각 EC2의 메모리 | 외부 Redis | Access Token 자체. Refresh Token은 DB/Redis 등에 저장 가능 |
| 운영 복잡도 | 낮지만 트래픽 편중과 장애 대응 부담 존재 | Redis HA, 모니터링, 비용, 직렬화 관리 필요 | 키 관리, 토큰 수명, 탈취, 재발급 정책 관리 필요 |
| 로그아웃 처리 | 세션 삭제로 비교적 명확 | Redis의 세션 삭제로 명확 | Access Token 즉시 폐기가 어렵고 Refresh Token 폐기 정책 필요 |
| 강제 세션 만료 | 특정 서버 메모리에서 삭제. 전체 서버 일관성은 어려움 | Redis에서 중앙 삭제 가능 | Denylist, 토큰 버전, 짧은 만료 시간 등 별도 설계 필요 |
| 적합한 상황 | 작은 서비스, 빠른 적용, 재로그인 허용 가능 | 서버가 여러 대이고 서버 주도 세션/즉시 로그아웃이 중요할 때 | API 서버 확장, 서비스 간 인증, 서버의 인증 상태 의존성을 줄이고 싶을 때 |

여기서 “서버 확장성이 높다”는 말만 보고 JWT를 선택하면 안 된다. 예를 들어 관리자 웹 서비스에서 사용자가 로그아웃했을 때 즉시 모든 세션을 끊어야 하고, 강제 로그아웃이나 권한 변경을 중앙에서 통제해야 한다면 Redis Session이 더 단순하고 명확할 수 있다.

반대로 여러 서비스가 토큰을 검증해야 하거나, 각 요청에서 중앙 세션 저장소를 조회하는 비용을 줄이고 싶다면 JWT가 적합할 수 있다. 다만 Refresh Token과 폐기 정책까지 포함해 설계해야 한다.

## 8. Stateless 서버가 중요한 이유

이번에 가장 크게 이해한 부분은 Stateless가 단순히 유행하는 인증 방식의 이름이 아니라, **서버를 교체하고 늘리고 줄이기 쉽게 만드는 운영 원칙**이라는 점이다.

### Stateful 구조

```text
Stateful Application Server

EC2-A
└─ User A Session

EC2-B
└─ User B Session
```

이 구조에서는 사용자의 상태가 특정 인스턴스에 묶인다. EC2-A가 종료되면 User A의 세션도 함께 사라진다. EC2-A가 아닌 다른 서버가 User A의 요청을 받으면 인증할 방법이 없다.

### Stateless에 가까운 구조

```text
Stateless Application Server

EC2-A ─┐
EC2-B ─┼─→ Redis / DB
EC2-C ─┘
```

애플리케이션 서버에 사용자 상태를 두지 않고 Redis나 DB 같은 공유 저장소에 두면, 어느 인스턴스가 요청을 처리해도 같은 상태를 볼 수 있다. JWT처럼 요청 안에 인증 정보가 포함되는 방식이라면 애플리케이션 서버가 외부 세션을 조회하지 않을 수도 있다.

여기서 중요한 구분이 있다. Redis Session은 인증 상태를 외부로 분리했지만 여전히 서버 측 세션을 사용하는 Stateful 인증이다. 다만 **애플리케이션 인스턴스가 세션 상태를 독점하지 않는다**는 점에서 운영상 Stateless에 가까운 효과를 얻는다.

### Auto Scaling과의 연결

Auto Scaling은 트래픽에 따라 EC2 인스턴스를 추가하거나 제거한다.

- 새 EC2가 추가될 때 로컬 세션을 가지고 있지 않아도 바로 요청을 처리할 수 있어야 한다.
- 기존 EC2가 축소될 때 그 서버에만 있던 세션이 함께 사라지면 안 된다.
- ALB가 새 서버로 요청을 보내도 인증 상태가 유지되어야 한다.

Sticky Session은 이 문제를 일부 완화할 뿐이다. 사용자를 기존 서버에 계속 붙들어 두기 때문이다. 반면 Redis Session은 새 서버도 같은 저장소를 조회하고, JWT는 새 서버도 같은 토큰 검증 규칙을 사용하므로 서버 교체가 자유롭다.

배포 자동화와 Auto Scaling의 연결은 [배포 자동화와 오토스케일링은 어떻게 연결될까?](/posts/deployment-automation-and-autoscaling/)에서도 다뤘다. 이번 주제와 연결해 보면, 오토스케일링이 진짜 유연하게 동작하려면 애플리케이션이 특정 인스턴스의 로컬 상태에 덜 의존해야 한다.

### Blue-Green Deployment와의 연결

Blue-Green Deployment는 기존 Blue 환경과 새 Green 환경을 동시에 띄워 두고 트래픽을 전환하는 방식이다.

세션이 Blue 서버의 메모리에만 있다면 다음 문제가 생긴다.

```text
Blue EC2-A
└─ User A Session

트래픽 전환
        ↓

Green EC2-C
└─ User A Session 없음
```

트래픽을 Green으로 한 번에 전환하는 순간 기존 사용자가 다시 로그인해야 할 수 있다. 세션을 미리 복사하는 방법을 생각할 수도 있지만, 복사 시점의 일관성, 세션 만료, 보안 정보까지 관리해야 하므로 간단하지 않다.

Redis Session을 사용하면 Blue와 Green이 같은 Redis를 바라보게 할 수 있다. JWT라면 토큰 검증 키와 클레임 규칙이 호환되는 한 새 환경에서도 같은 토큰을 검증할 수 있다. 다만 세션 속성이나 토큰 클레임을 변경하는 배포라면 이전 버전과 새 버전의 호환성까지 확인해야 한다.

Spring Boot를 앞단의 Nginx와 함께 운영할 때의 Reverse Proxy, Blue-Green 전환 지점은 [Nginx는 왜 Spring Boot 앞단에 있을까?](/posts/why-nginx-in-front-of-spring-boot/)에서 연결해 볼 수 있다. ALB가 외부 트래픽을 분산하고 Nginx가 인스턴스 안에서 애플리케이션을 바라보는 구조에서도, 인증 상태의 저장 위치 문제는 별도로 남는다.

### Rolling Deployment와의 연결

Rolling Deployment는 여러 인스턴스를 순서대로 교체한다. 이때 일부 서버는 구버전, 일부 서버는 신버전인 시간이 생긴다.

로컬 세션이라면 사용자가 어느 버전 서버로 가느냐에 따라 세션이 보이기도 하고 사라지기도 한다. Sticky Session을 사용하더라도 교체 대상 서버가 내려가면 사용자는 다른 서버로 이동해야 한다.

공유 세션 저장소를 사용하면 여러 버전의 서버가 같은 세션을 조회할 수 있다. 대신 세션에 저장하는 객체의 직렬화 방식이나 속성 이름이 구버전과 신버전 사이에서 호환되는지 확인해야 한다. Stateless를 만든다고 해서 배포 호환성 문제가 자동으로 사라지는 것은 아니지만, 특정 인스턴스에 사용자 상태가 묶이는 문제는 줄어든다.

결국 서버에 상태가 많을수록 “서버를 하나 더 띄우는 일”이 단순한 복제가 아니게 된다. 상태를 옮기거나, 요청을 특정 서버에 계속 보내거나, 교체 전에 사용자를 정리해야 하기 때문이다.

## 9. Spring Boot 관점에서 보기

Spring Boot에서 세션 인증을 사용할 때는 크게 다음 두 가지를 구분하면 된다.

### 기본 세션: `HttpSession`

기본 설정에서는 `HttpSession`이 애플리케이션 서버의 세션 구현을 통해 동작하고, 설정에 따라 세션 데이터가 서버 메모리에 저장된다.

```java
HttpSession session = request.getSession(true);
session.setAttribute("userId", userId);

String userId = (String) session.getAttribute("userId");
```

EC2 한 대에서는 이 구조가 충분히 단순하고 편하다. 하지만 여러 대라면 서버마다 별도의 세션 공간을 가지게 되므로 Sticky Session이나 외부 세션 저장소가 필요해진다.

### Redis 기반: Spring Session Data Redis

Spring Session Data Redis를 사용하면 `HttpSession`이라는 애플리케이션 인터페이스는 유지하면서 실제 세션 데이터를 Redis에 저장할 수 있다.

```groovy
implementation 'org.springframework.session:spring-session-data-redis'
```

Redis 연결을 위한 Spring Data Redis 의존성과 Redis 접속 설정도 함께 필요하다. Spring Boot 버전과 구성 방식에 따라 자동 설정을 사용하거나 `@EnableRedisHttpSession`을 명시할 수 있다. 핵심은 어노테이션 자체가 아니라 다음 구조다.

```text
Controller / Spring Security
          ↓
      HttpSession
          ↓
 Spring Session
          ↓
       Redis
```

Spring Security와 함께 사용한다면 로그인 성공 시 세션이 생성되고, 이후 요청에서 Spring Security가 세션의 인증 정보를 읽는다. 이때 모든 EC2가 같은 Redis를 사용하도록 구성되어야 한다. 서버 하나만 다른 Redis를 바라보면 결국 같은 문제가 다시 발생한다.

코드 몇 줄로 바꿀 수 있어 보여도 실제 운영에서는 Redis 연결 실패 시 동작, TTL, 세션 직렬화 호환성, Redis HA, 접근 보안까지 함께 결정해야 한다. 그래서 이 선택은 단순한 라이브러리 교체가 아니라 아키텍처 선택에 가깝다.

## 10. 내가 이번에 이해한 내용

처음에는 세션 인증을 단순히 **“로그인 정보를 서버에 저장하는 방식”** 정도로 이해했다. 단일 서버에서 로그인하고 같은 서버가 계속 요청을 처리할 때는 실제로 그 정도 설명으로도 동작을 이해할 수 있었다.

하지만 서버가 여러 대가 되면 세션 저장 위치 자체가 아키텍처 문제가 된다는 것을 알게 되었다. 사용자가 가진 쿠키가 같아도 요청이 도착한 서버가 세션을 가지고 있지 않으면 인증이 실패할 수 있었다. 문제의 핵심은 쿠키가 아니라, 세션 상태가 특정 서버에 종속되어 있다는 점이었다.

그래서 인증 방식 선택은 단순히 Session과 JWT 중 무엇이 더 좋은지를 고르는 문제가 아니었다. 서버 확장 방식, 장애가 났을 때 사용자를 어떻게 처리할지, Blue-Green이나 Rolling 방식으로 배포할 수 있는지까지 연결된 문제였다.

Sticky Session은 기존 코드를 크게 바꾸지 않고 적용하기 좋지만, 사용자를 특정 서버에 계속 묶어 두는 방식이었다. Redis Session은 세션 인증의 장점을 유지하면서 여러 서버가 상태를 공유하도록 만들 수 있었고, JWT는 일반 요청에서 서버가 세션을 조회하지 않아도 되도록 만들었다. 대신 JWT는 토큰 탈취, 로그아웃, 강제 만료, Refresh Token 저장 전략을 직접 설계해야 했다.

Redis를 사용하는 이유도 단순히 캐시 목적만이 아니었다. 여러 서버가 하나의 상태를 공유하기 위한 저장소 역할을 할 수 있다는 것을 이해했다. 그만큼 Redis가 장애 나면 인증에 영향을 줄 수 있고, HA와 TTL, 비용과 운영까지 같이 고민해야 한다는 것도 함께 알게 되었다.

결국 중요한 것은 특정 기술을 사용하는 것보다 서비스 규모와 운영 구조에 맞는 방식을 선택하는 것이라고 느꼈다. 작은 서비스에서 Sticky Session으로 충분할 수 있고, 서버 주도 세션과 즉시 로그아웃이 중요하면 Redis Session이 더 명확할 수 있다. 여러 서버와 서비스가 토큰을 독립적으로 검증해야 한다면 JWT가 유리할 수 있지만, 그 경우에도 Refresh Token과 폐기 정책을 빼놓을 수 없다.

이번에 세션 인증을 공부하며 정리한 결론은 다음과 같다.

> 인증 방식은 로그인 구현 방식만의 문제가 아니다. 서버가 상태를 어디에 둘지, 장애와 배포를 어떻게 감당할지 결정하는 아키텍처 문제다.
