---
title: "JWT 인증 필터에서 검증 책임을 분리한 이유"
date: 2026-06-29
categories: [Backend, Security]
tags: [JWT, Spring Security, Authentication, Refactoring, TIL]
permalink: /posts/why-split-jwt-validation-responsibilities/
---

JWT를 사용하는 프로젝트를 진행하면서 인증 필터(`OncePerRequestFilter` 등)를 구현할 기회가 많았습니다. 필터 내부에서는 클라이언트가 보낸 토큰이 유효한지 검증하고 문제가 없으면 Spring Security의 `SecurityContext`에 인증 객체를 설정합니다.

처음 코드를 작성할 때는 단순히 중복을 제거하고 코드를 짧게 만드는 데만 집중했습니다. 하지만 검증 로직이 늘어나면서 "왜 이 검증 단계들을 하나로 묶지 않고 굳이 잘게 쪼개어 관리해야 하는가?"라는 근본적인 의문이 생겼고, 팀원들과 깊게 대화하면서 설계 관점에서 크게 배웠습니다. 배운 내용을 TIL로 정리해 봅니다.

## 문제 상황

프로젝트에서 사용 중인 JWT 인증 필터의 검증 흐름은 대략 다음과 같았습니다.

```java
private void authenticate(String token) {
    TokenClaims claims;
    try {
        claims = jwtTokenProvider.parse(token);
    } catch (JwtException | IllegalArgumentException e) {
        // 서명·만료·위조 검증 실패: 인증을 설정하지 않고 진입점이 거부하도록 둔다.
        return;
    }

    if (!claims.isAccess() || claims.role() == null) {
        return;
    }

    if (accessTokenBlacklist.contains(claims.jti())) {
        return;
    }

    if (tokenInvalidationRegistry.isInvalidated(claims.memberId(), claims.issuedAt())) {
        return;
    }

    // SecurityContext에 인증 객체 설정
}
```

위 코드를 보면 토큰을 파싱한 뒤 `isAccess()`, `role()`, `Blacklist`, `Invalidation` 등 4가지 이상의 검증 조건이 꼬리를 물고 이어집니다.

## 처음에는 하나로 합쳐도 된다고 생각했다

필터 코드를 훑어보면서 제 머릿속에 가장 먼저 든 생각은 **"어차피 모든 검증이 파싱된 `claims` 데이터를 재료로 사용하는데, 굳이 줄줄이 if문으로 나열할 필요가 있을까? 하나의 메서드로 합쳐버리면 코드가 훨씬 깔끔해지지 않을까?"**였습니다.

예를 들어 다음과 같이 헬퍼 메서드를 만드는 식입니다.

```java
private boolean isValidClaims(TokenClaims claims) {
    return claims.isAccess()
            && claims.role() != null
            && !accessTokenBlacklist.contains(claims.jti())
            && !tokenInvalidationRegistry.isInvalidated(
                    claims.memberId(),
                    claims.issuedAt()
            );
}
```

이렇게 하면 호출하는 쪽인 `authenticate()` 메서드는 단 몇 줄로 깔끔하게 정리됩니다. 하지만 다시 찬찬히 뜯어보니 이 방식은 코드 줄 수는 줄어들지 몰라도 **각 검증 단계가 지닌 구체적인 도메인 맥락과 비즈니스 의미가 흐려지는 문제**가 있었습니다.

## 같은 claims를 사용해도 같은 책임은 아니다

가장 중요한 깨달음은 **`claims`는 검증에 쓰는 '재료(데이터)'일 뿐, 그것으로 판단하려는 '책임(역할)'은 전혀 다르다**는 점이었습니다. 데이터 모양새가 같다고 해서 그 데이터를 다루는 목적과 비즈니스 요구사항까지 하나로 묶이지는 않습니다.

각 검증 단계를 분리해서 살펴보면 서로가 해결하고자 하는 책임의 차이가 명확하게 보입니다.

![JWT 인증 필터의 검증 책임 분리](/assets/images/2026-06-29-why-split-jwt-validation-responsibilities/jwt_validation_flow.png)

---

## parse는 토큰 자체의 유효성을 검증한다

`jwtTokenProvider.parse(token)`은 JWT의 기술적 구조와 암호학적 정합성을 검증하는 단계입니다.

* 토큰의 포맷이 올바른 규격(Base64URL)을 갖추었는가?
* 서버만 알고 있는 비밀키(Secret Key)로 생성한 서명(Signature)이 올바른가?
* 토큰의 유효 기간(Expiration Time)이 경과하지 않았는가?
* 중간에 토큰 페이로드가 위변조되지 않았는가?

`parse()`가 성공했다는 것은 이 토큰이 **"우리 서버에서 신뢰할 수 있는 방식으로 정상 발급된 JWT가 맞다"**는 사실만을 증명합니다.

그러나 그 토큰을 현재 요청의 인증 수단으로 써도 되는지까지 판단하지는 않습니다. 기술적 검증이 끝났다고 해서 곧바로 비즈니스적으로 인증 가능한 토큰이라는 뜻은 아닙니다.

---

## Access Token 여부는 인증 수단으로 사용할 수 있는지 확인한다

서비스 운영 시 Access Token과 Refresh Token은 쓰임새와 설계 사상이 완전히 다릅니다.

* **Access Token**: 수명이 짧고, 매 API 요청마다 헤더에 실려 본인을 인증하는 데 쓰입니다.
* **Refresh Token**: 수명이 상대적으로 길고, 오직 Access Token을 재발급받는 엔드포인트에서만 사용됩니다.

Refresh Token 또한 우리 서버에서 정상적으로 발행한 JWT이므로 `parse()`를 수행하면 아무런 오류 없이 성공합니다. 하지만 누군가가 이 Refresh Token을 일반 API 요청 헤더에 담아 보냈다면, 이를 인증 수단으로 처리해 주어서는 안 됩니다.

따라서 `claims.isAccess()` 검증은 단순히 토큰이 정상인지 여부를 넘어 **"현재 요청 흐름에서 인증 수단으로 사용될 자격을 갖춘 토큰 타입인가?"**를 확인하는 독립적인 비즈니스 규칙 책임을 지닙니다.

---

## role은 인증 객체를 만들기 위한 최소 정보다

토큰 파싱이 성공했고 Access Token 타입이 맞더라도, 최종적으로 Spring Security의 `UsernamePasswordAuthenticationToken`이나 `Authentication` 인증 객체를 생성하려면 사용자의 권한 정보(`role`)가 필수적입니다. 권한 정보가 없으면 이후 스프링 시큐리티 인프라가 작동할 때 인가(Authorization) 처리를 진행할 수 없기 때문입니다.

`role`은 단순한 부가 메타데이터가 아니라 **인증 이후 인가 판단에 사용되는 핵심 정보**입니다. 그래서 토큰 내부에 권한 정보가 제대로 채워져 있는지를 별도로 체크하는 것은, **"이 토큰의 정보만으로 정상적인 스프링 시큐리티 인증 객체를 온전히 만들어낼 수 있는가?"**를 확인하는 객체 빌드 자격 검증 책임입니다.

---

## Blacklist는 로그아웃된 개별 토큰을 막는다

기본적으로 JWT 기반 Access Token은 서버가 상태를 갖지 않는(Stateless) 형태로 설계되지만 실무에서는 로그아웃 등의 이유로 특정 토큰을 강제로 만료시켜야 하는 요구사항이 생깁니다. 이 문제를 해결하려고 도입하는 것이 Blacklist 검증입니다.

로그아웃 시점에 해당 Access Token의 고유 식별자인 `jti`(JWT ID)를 추출하여 Redis 같은 인메모리 저장소에 Blacklist로 등록해 두고, 남은 유효 기간만큼 차단 정책을 적용합니다.

`accessTokenBlacklist.contains(claims.jti())` 검증은 토큰 자체의 구조적 결함이 아니라, **"서버의 운영 상태 및 정책에 의해 즉시 차단 처리된 개별 토큰인가?"**를 감지하는 책임을 갖습니다.

---

## Token Invalidation은 특정 시점 이전의 토큰을 막는다

`tokenInvalidationRegistry.isInvalidated(claims.memberId(), claims.issuedAt())` 검증은 개별 토큰 단위를 넘어, 특정 사용자(Member)를 기준으로 과거에 발급되었던 모든 토큰을 일괄 무효화하기 위해 사용합니다.

예를 들어 아래와 같은 보안 이벤트가 발생했을 때 필요합니다.
* 사용자가 "모든 기기에서 로그아웃" 버튼을 눌렀을 때
* 사용자가 비밀번호를 변경하여 기존 발급된 토큰들을 무효화해야 할 때
* 관리자에 의해 계정이 일시 정지되거나 보안 위협으로 특정 시점 이전 토큰을 전부 차단해야 할 때

Blacklist와 Token Invalidation은 결과적으로 토큰을 통과시키지 않는다는 동작은 같지만 **해결하려는 도메인 문제와 차단 범위가 명확히 다릅니다.**

| 구분 | 기준 | 차단 범위 |
| :--- | :--- | :--- |
| **Blacklist** | `jti` | 특정 토큰 1개만 정밀 차단 |
| **Token Invalidation** | `memberId` + `issuedAt` | 특정 시점 이전에 해당 사용자에게 발급된 토큰 전체 일괄 차단 |

결국 Blacklist는 개별 토큰의 로그아웃 상태를, Token Invalidation은 사용자 계정의 보안 상태와 일괄 만료 정책을 검증하는 서로 다른 비즈니스 책임을 맡습니다.

---

## 무조건 합치는 것보다 의미 단위로 나누는 것이 낫다

앞서 살펴본 것처럼 모든 검증 단계에는 저마다 뚜렷한 이유와 책임이 있습니다. 이를 하나의 거대한 `isValidClaims()`로 뭉뚱그려 버리면 다음과 같은 문제가 생깁니다.

1. **실패 원인 파악의 모호함**: 토큰 검증이 실패했을 때 디버깅이나 모니터링 로그를 남기기 어렵습니다. 만료된 토큰인지, 블랙리스트인지, 비밀번호 변경으로 무효화된 것인지 구분하기 어려워 유지보수 생산성이 떨어집니다.
2. **네트워크 I/O 비용의 결합**: 순수한 claims 내 필드 값 연산(메모리 연산)과 Redis나 RDB 조회가 필요한 정책 검증(I/O 연산)이 한곳에 뒤섞여 성능 튜닝이나 장애 격리가 곤란해집니다.
3. **수정 영향도의 전파**: 무효화 정책이나 블랙리스트 기술 스택이 바뀔 때 관련 없는 토큰 자체 검증 코드까지 함께 흔들립니다.

그렇다고 해서 모든 단계를 한 줄 한 줄 길게 늘어놓는 것 또한 필터의 가독성을 저해할 수 있습니다. 그래서 제가 선택한 타협안은 **서로 같은 성격과 책임을 공유하는 검증끼리 결합도를 높여 의미 단위로 묶어내는 것**이었습니다.

## 더 나은 타협안

비즈니스 및 인프라적 성격을 고려해 코드를 다음과 같이 개선해 보았습니다.

```java
private void authenticate(String token) {
    TokenClaims claims = parseTokenOrNull(token);
    if (claims == null) {
        return;
    }

    if (!canAuthenticate(claims)) {
        return;
    }

    if (isRevokedToken(claims)) {
        return;
    }

    setAuthentication(claims);
}

private TokenClaims parseTokenOrNull(String token) {
    try {
        return jwtTokenProvider.parse(token);
    } catch (JwtException | IllegalArgumentException e) {
        return null;
    }
}

private boolean canAuthenticate(TokenClaims claims) {
    // 토큰 자체의 속성값을 바탕으로 스프링 시큐리티 인증을 진행할 수 있는지 판단 (로컬 검증)
    return claims.isAccess() && claims.role() != null;
}

private boolean isRevokedToken(TokenClaims claims) {
    // 외부 저장소(Redis 등)의 상태를 기반으로 무효화 처리된 토큰인지 판단 (인프라/정책 검증)
    return accessTokenBlacklist.contains(claims.jti())
            || tokenInvalidationRegistry.isInvalidated(
                    claims.memberId(),
                    claims.issuedAt()
            );
}
```

이렇게 리팩토링해서 얻은 장점은 명확합니다.

* **가독성 향상**: `authenticate` 메서드의 메인 흐름이 파싱 -> 인증 자격 확인 -> 무효화 정책 확인 -> 인증 등록이라는 4단계로 한눈에 보입니다.
* **책임의 분리**: 단순 값 비교 수준의 검증(`canAuthenticate`)과 I/O를 수반하는 상태 정책 검증(`isRevokedToken`)이 논리적으로 격리되었습니다.
* **유지보수 용이성**: 만약 블랙리스트나 토큰 무효화 방식에 변경이 생겨도 `isRevokedToken` 메서드 내부만 손보면 되기 때문에 안심하고 수정할 수 있습니다.
* **유연한 확장**: 요구사항에 따라 `isRevokedToken` 내부를 `isBlacklisted()`와 `isInvalidated()`로 재차 나누어 정교한 모니터링 로그를 남기는 것도 매우 쉬워집니다.

---

## 정리

* **Claims는 검증에 필요한 데이터일 뿐, 그 자체가 검증 책임을 결정하지 않습니다.**
* 단순한 기술 정합성 검증(`parse()`), 애플리케이션 인증 조건 만족 여부(`isAccess()`, `role`), 그리고 비즈니스적 무효화 정책 검증(`Blacklist`, `Invalidation`)은 제각기 다른 레이어의 책임입니다.
* 코드 길이만 줄이려고 맹목적으로 검증을 병합하기보다, **같은 책임을 지닌 단위로 적절히 그룹화하고 격리하는 것**이 지속 가능한 백엔드 아키텍처를 만드는 열쇠임을 깊이 배웠습니다.

---

### 3줄 요약
1. JWT 파싱과 필드 검증, 외부 세션/스토어 조회로 이뤄지는 무효화 검증은 데이터(`claims`)를 공유할 뿐 해결하고자 하는 비즈니스 책임이 서로 다릅니다.
2. 모든 검증을 단 하나의 메서드로 합치면 코드 길이는 짧아질지언정, 실패 원인의 추적이 어렵고 관심사가 섞여 유지보수성이 저하됩니다.
3. 기술적 유효성, 로컬 데이터 정합성, 인프라 기반의 무효화 정책을 의미 단위의 메서드로 묶어서 분리하는 것이 디버깅과 변경에 유리한 설계입니다.
