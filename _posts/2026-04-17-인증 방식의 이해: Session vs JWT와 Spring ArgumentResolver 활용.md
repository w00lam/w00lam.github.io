---
title: "인증 방식의 이해: Session vs JWT와 Spring ArgumentResolver 활용"
date: 2026-04-17
categories: [Backend, Security]
tags: [Session, JWT, Spring, ArgumentResolver, Cookie]
---

> **"인증은 단순히 문을 여는 것이 아니라, 사용자가 누구인지 안전하고 효율적으로 증명하는 과정입니다."**

전통적인 세션 방식과 현대적인 JWT 방식의 차이를 이해하고 스프링 부트에서 이를 처리하는 효율적인 도구들을 정리해 봅니다.

---

## 1. Session vs JWT: 상태를 기억할 것인가 들고 다닐 것인가?

### Session 방식 (Stateful)
서버가 사용자의 로그인 상태를 **저장**하는 방식입니다. 
* **동작:** 로그인 성공 시 서버는 `Session ID`를 생성해 DB나 메모리에 저장하고 클라이언트에게 쿠키(JSESSIONID)로 전달합니다.
* **장점:** 서버가 통제권을 가집니다. 특정 사용자를 강제 로그아웃시키는 등 제어가 쉽습니다.
* **단점:** 사용자가 많아지면 서버 부하가 커지고 여러 서버를 운영할 때 세션 동기화 등 확장성 문제가 발생합니다.



### JWT 방식 (Stateless)
서버가 상태를 저장하지 않고 필요한 정보를 **토큰 자체**에 담아 클라이언트에게 주는 방식입니다.
* **동작:** 서버는 정보를 암호화한 토큰을 발급하고 저장하지 않습니다. 클라이언트는 요청마다 헤더에 이 토큰을 실어 보냅니다.
* **장점:** 서버가 무상태(Stateless)를 유지하므로 확장성이 뛰어나고 별도의 저장소가 필요 없습니다.
* **단점:** 토큰이 탈취되면 만료 전까지 제어가 어렵습니다. (이를 위해 **Refresh Token** 전략을 병행합니다.)



---

## 2. JWT의 3단계 구조
JWT는 `.`을 구분자로 세 부분으로 나뉩니다.

1.  **Header:** 토큰 유형과 사용할 알고리즘(HS256 등) 정보.
2.  **Payload:** 실제 담길 정보(Claim). 유저 ID, 권한, 만료 시간 등이 포함됩니다. (누구나 볼 수 있으므로 민감한 정보는 금지!)
3.  **Signature:** 서버의 비밀 키(Secret Key)로 만든 서명. 토큰의 위변조를 막는 핵심 장치입니다.

---

## 쿠키와 보안 설정 (Set-Cookie)
쿠키는 단순히 데이터를 담는 통이 아니라 보안 설정이 매우 중요합니다.

* **Secure:** HTTPS 통신일 때만 쿠키 전송.
* **HttpOnly:** JavaScript(`document.cookie`) 접근 차단 (XSS 공격 방지).
* **SameSite:** 타 도메인 요청 시 쿠키 전송 여부 결정 (CSRF 공격 방지).

---

## Spring ArgumentResolver: 데이터 바인딩의 마법
`@RequestParam`, `@PathVariable`처럼 파라미터에 값을 자동으로 채워주는 도구가 바로 **ArgumentResolver**입니다.

### 구현 4단계
1.  **인터페이스 구현:** `HandlerMethodArgumentResolver`를 상속받은 클래스 생성.
2.  **`supportsParameter()`:** "이 파라미터를 내가 처리해도 될까?"를 결정 (특정 어노테이션이나 타입 체크).
3.  **`resolveArgument()`:** 실제 주입할 객체를 생성하거나 가져오는 로직 작성.
4.  **WebMvcConfigurer 등록:** 설정 파일에 만든 리졸버를 추가.

---

## 의도가 명확한 코드 작성하기
`HttpServletRequest`를 통째로 쓰면 어떤 데이터를 쓸지 모호합니다. 하지만 어노테이션을 활용하면 의도가 명확해집니다.

* **`@RequestHeader`**: "헤더 값을 쓸게"
* **`@SessionAttribute`**: "세션에 저장된 특정 속성을 쓸게"

### JSESSIONID 란?
스프링에서 `HttpSession`을 사용할 때 생성되는 쿠키의 기본 이름입니다. 다른 애플리케이션의 쿠키와 겹치지 않게 하기 위한 스프링의 약속입니다.

---

## 오늘의 회고
세션은 '금고형'이라면 JWT는 '신분증형' 인증입니다. 상황에 맞는 트레이드오프를 선택하는 것이 중요함을 느꼈습니다. 또한, **ArgumentResolver**를 커스텀하게 구현할 수 있게 되면 컨트롤러 코드를 훨씬 더 깔끔하고 의도가 명확하게 관리할 수 있다는 점이 매력적이었습니다.

---

**References**
* [Introduction to JSON Web Tokens](https://jwt.io/introduction/)
* [Spring MVC Framework: HandlerMethodArgumentResolver](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/method/support/HandlerMethodArgumentResolver.html)
* [MDN Web Docs: Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
