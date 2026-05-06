---
title: "Interceptor를 이해하면서 정리한 생각 — 요청 흐름은 어디서 제어되는가"
date: 2026-05-06
categories: [TIL, Backend, Spring]
tags: [Spring, Interceptor, HandlerInterceptor, Authentication, MVC]
---

## 들어가면서

이전에 Filter / Interceptor / AOP를 비교하면서
각 기술이 어디에서 동작하는지 정리했었다.

👉 [Filter vs Interceptor vs AOP — 어디서 무엇을 처리해야 할까](https://w00lam.github.io/posts/Filter-vs-Interceptor-vs-AOP-%EC%96%B4%EB%94%94%EC%84%9C-%EB%AC%B4%EC%97%87%EC%9D%84-%EC%B2%98%EB%A6%AC%ED%95%B4%EC%95%BC-%ED%95%A0%EA%B9%8C/)

그리고 최근에는 Filter를 더 깊게 보면서
“인증은 Controller 전에 이미 끝난다”는 흐름도 다시 정리했다.

👉 [Filter를 이해하면서 정리한 생각 — 인증은 어디서 시작되는가](https://w00lam.github.io/posts/Filter%EB%A5%BC-%EC%9D%B4%ED%95%B4%ED%95%98%EB%A9%B4%EC%84%9C-%EC%A0%95%EB%A6%AC%ED%95%9C-%EC%83%9D%EA%B0%81-%EC%9D%B8%EC%A6%9D%EC%9D%80-%EC%96%B4%EB%94%94%EC%84%9C-%EC%8B%9C%EC%9E%91%EB%90%98%EB%8A%94%EA%B0%80/)

이번에는 실제로 Interceptor를 구현하면서 느낀 점들을 정리해보려고 한다.

---

## 처음에는 Filter랑 크게 다르지 않다고 생각했다

처음 Interceptor를 봤을 때는 단순히 이렇게 생각했다.

* Filter → 요청 가로채기
* Interceptor → 이것도 요청 가로채기

그래서 사실상 비슷한 역할이라고 생각했다.

그런데 직접 구현해보니 차이가 꽤 명확했다.

---

## Interceptor는 “Spring MVC 내부”에서 동작한다

요청 흐름을 다시 보면:

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
```

여기서 중요한 건:

> Interceptor는 DispatcherServlet 이후에 동작한다

즉,

* 이미 Spring MVC 안으로 들어온 요청이고
* Controller 호출 직전 단계다

---

## 이미지로 보면 이런 느낌이다

![Interceptor 요청 흐름](/assets/images/2026-05-06-posting/interceptor-request-flow.png)

![Filter vs Interceptor 위치 비교](/assets/images/2026-05-06-posting/filter-interceptor-position.png)

---

## 그래서 할 수 있는 것들도 달라진다

Filter는 HTTP 요청 자체를 다룬다.

반면 Interceptor는:

* 어떤 Controller가 호출되는지 알고
* Handler 정보 접근 가능
* Spring Bean 활용 가능

즉,

> “Spring MVC 흐름 안에서 요청을 제어하는 역할”

에 더 가깝다.

---

## 구현하면서 가장 많이 사용한 곳

실제로 구현하면서 가장 자연스러웠던 건 로그인 체크였다.

예를 들면:

* 관리자 페이지 접근
* 로그인 여부 확인
* 특정 URL 접근 제한

---

## 구현 자체는 생각보다 단순했다

```java
@Component
public class LoginCheckInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

        HttpSession session = request.getSession(false);

        if (session == null || session.getAttribute("LOGIN_ADMIN") == null) {
            response.sendRedirect("/login");
            return false;
        }

        return true;
    }
}
```

핵심은 `preHandle()`이다.

여기서:

* `true` → Controller 진행
* `false` → 요청 중단

---

## 처음 구현하면서 헷갈렸던 부분

처음에는:

> “JWT도 Interceptor에서 처리하면 되는 거 아닌가?”

라는 생각도 했다.

그런데 구조를 다시 보니 차이가 보였다.

---

## 인증과 Interceptor는 결이 조금 다르다

처음에는:

> “JWT도 Interceptor에서 처리하면 되는 거 아닌가?”

라는 생각도 했다.

그런데 구조를 다시 보니 역할 차이가 명확했다.

JWT 인증은:

- Authorization Header 기반
- SecurityContext 생성
- 인증 자체를 처리

즉, 요청 입구(Filter)에서 끝내야 한다.

실제로 Spring Security도 구조적으로 보면  
Interceptor가 아니라 Filter 기반으로 동작한다.

인증은 요청이 Controller까지 도달하기 전에  
먼저 검증되어야 하기 때문이다.

반면 Interceptor는:

- 이미 Spring MVC 내부로 들어온 요청을 기준으로
- 접근 가능한지 확인하거나
- 추가 흐름을 제어하는 역할

에 더 가까웠다.

이 부분은 이전에 Filter와 Spring Security 흐름을 정리하면서
조금 더 자세히 다뤘다.

👉 [Filter를 이해하면서 정리한 생각 — 인증은 어디서 시작되는가](https://w00lam.github.io/posts/Filter%EB%A5%BC-%EC%9D%B4%ED%95%B4%ED%95%98%EB%A9%B4%EC%84%9C-%EC%A0%95%EB%A6%AC%ED%95%9C-%EC%83%9D%EA%B0%81-%EC%9D%B8%EC%A6%9D%EC%9D%80-%EC%96%B4%EB%94%94%EC%84%9C-%EC%8B%9C%EC%9E%91%EB%90%98%EB%8A%94%EA%B0%80/)

---

## 그래서 역할이 자연스럽게 나뉘었다

### Filter

* 인증
* 보안
* 요청 차단

---

### Interceptor

* 로그인 체크
* 권한 흐름 제어
* 요청 추적
* 공통 응답 처리

---

## WebMvcConfigurer에 등록해야 동작한다

Interceptor는 구현만 한다고 끝이 아니었다.

반드시 등록해야 한다.

```java
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final LoginCheckInterceptor loginCheckInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(loginCheckInterceptor)
                .addPathPatterns("/admin/**")
                .excludePathPatterns("/login", "/css/**");
    }
}
```

이 부분이 꽤 인상 깊었다.

왜냐하면:

> “어떤 요청에 적용할지”를 매우 세밀하게 제어할 수 있었기 때문이다.

---

## 구현하면서 느낀 점

처음에는 Interceptor를 단순한 “중간 처리기” 정도로 생각했다.

그런데 직접 적용해보니:

* Spring MVC 흐름 제어
* Controller 진입 제어
* 요청 정책 관리

같은 역할에 더 가까웠다.

그리고 Filter를 이해한 상태에서 보니까
왜 Interceptor가 DispatcherServlet 이후에 존재하는지도 자연스럽게 연결됐다.

---

## 마무리

이번에 Interceptor를 구현하면서 느낀 건 하나였다.

> “공통 로직”도 어디에서 처리하느냐에 따라 의미가 완전히 달라진다

* Filter → 요청 입구
* Interceptor → MVC 흐름 제어
* AOP → 비즈니스 로직 내부

이 구조를 이해하고 나니까
Spring 요청 흐름 자체가 훨씬 명확하게 보이기 시작했다.

---

## 한 줄 정리

> Interceptor는 요청을 막는 기술이라기보다, Spring MVC 흐름을 제어하는 기술에 더 가깝다.

---

## References

* https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/handlermapping-interceptor.html
* https://docs.spring.io/spring-framework/reference/web/webmvc.html
* [Spring Security를 적용하면서 정리한 생각 — 인증은 어떻게 유지되는가](https://w00lam.github.io/posts/Filter%EB%A5%BC-%EC%9D%B4%ED%95%B4%ED%95%98%EB%A9%B4%EC%84%9C-%EC%A0%95%EB%A6%AC%ED%95%9C-%EC%83%9D%EA%B0%81-%EC%9D%B8%EC%A6%9D%EC%9D%80-%EC%96%B4%EB%94%94%EC%84%9C-%EC%8B%9C%EC%9E%91%EB%90%98%EB%8A%94%EA%B0%80/)
* [Filter vs Interceptor vs AOP — 어디서 무엇을 처리해야 할까](https://w00lam.github.io/posts/Filter-vs-Interceptor-vs-AOP-%EC%96%B4%EB%94%94%EC%84%9C-%EB%AC%B4%EC%97%87%EC%9D%84-%EC%B2%98%EB%A6%AC%ED%95%B4%EC%95%BC-%ED%95%A0%EA%B9%8C/)
* [Filter를 이해하면서 정리한 생각 — 인증은 어디서 시작되는가](https://w00lam.github.io/posts/Filter%EB%A5%BC-%EC%9D%B4%ED%95%B4%ED%95%98%EB%A9%B4%EC%84%9C-%EC%A0%95%EB%A6%AC%ED%95%9C-%EC%83%9D%EA%B0%81-%EC%9D%B8%EC%A6%9D%EC%9D%80-%EC%96%B4%EB%94%94%EC%84%9C-%EC%8B%9C%EC%9E%91%EB%90%98%EB%8A%94%EA%B0%80/)
