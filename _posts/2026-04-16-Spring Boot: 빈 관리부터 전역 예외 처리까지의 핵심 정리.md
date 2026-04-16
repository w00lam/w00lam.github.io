---
title: "Spring Boot: 빈 관리부터 전역 예외 처리까지의 핵심 정리"
date: 2026-04-16
categories: [Backend, Spring]
tags: [Spring, Bean, Validation, ExceptionHandling, Logging]
---

> **"스프링의 자동화 뒤에 숨겨진 원리를 이해하면, 더 견고한 아키텍처를 설계할 수 있습니다."**

스프링 부트의 빈 등록 원리, 의존성 주입의 우선순위, 그리고 클라이언트 친화적인 예외 처리 전략을 한 페이지에 정리했습니다.

---

## 1. Spring Bean 등록과 스캔의 원리
스프링은 어노테이션을 통해 객체의 생명주기를 관리합니다.

* **`@Component`의 계보:** `@Controller`, `@Service`, `@Repository`는 모두 내부에 `@Component`를 선언하고 있습니다. 덕분에 스프링의 **ComponentScan**이 이들을 빈으로 인식할 수 있습니다.
* **`@SpringBootApplication`:** 이 어노테이션이 선언된 위치를 시작점으로 하여 하위 패키지의 모든 컴포넌트를 스캔합니다.



---

## 2. 의존성 주입(DI) 전략
스프링에서 의존성을 주입하는 방식은 3가지가 있지만 **생성자 주입**이 가장 권장됩니다.

* **중복 빈 해결:** 동일한 부모를 가진 빈이 여러 개일 때 `@Primary`로 기본 빈을 정하거나 `@Qualifier`로 이름을 지정합니다. 
* **주의:** `@Qualifier`를 사용할 때는 주입할 빈을 명시해야 하므로 `@RequiredArgsConstructor`가 생성하는 기본 로직 대신 직접 생성자를 선언해야 하는 경우가 있습니다.

---

## 3. Bean Validation과 Java Beans의 역사
DTO에서 `@Valid`가 작동하고 `@Getter`가 필수적인 이유는 자바의 역사와 관련이 있습니다.

* **Java Beans 규약:** 자바 객체(Bean)는 필드 접근 시 `getXXX` 메서드를 사용한다는 관례가 있습니다. `@Valid` 과정에서 필드 값을 읽어올 때 이 Getter를 사용하기 때문에 DTO는 빈이 아님에도 불구하고 이 규약을 따릅니다.
* **정규식(`@Pattern`):** 복잡한 전화번호나 비밀번호 패턴은 직접 만들기보다 검증된 패턴을 검색하여 적용하는 것이 실무에서 더 효율적입니다.

---

## 4. 예외 처리 우선순위와 전역 처리
스프링은 예외 발생 시 가장 좁은 범위부터 확인합니다.

1. **`@ExceptionHandler`**: 컨트롤러 내부의 개별 처리 (우선순위 1)
2. **`@RestControllerAdvice`**: 프로젝트 전역 처리 (우선순위 2 - 사실상의 표준)
3. **Spring Default Error**: 기본 예외 처리기 (우선순위 3)



---

## 실전: 여러 개의 검증 에러 메시지 반환하기
`MethodArgumentNotValidException`이 발생했을 때 클라이언트에게 모든 필드의 에러 사유를 리스트로 반환하는 로직입니다.

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<List<String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        List<String> errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .toList();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }
}
```

## 로그(Log)를 써야 하는 이유
실무나 운영 환경에서 `System.out.println` 대신 `@Slf4j`를 사용하는 것은 선택이 아닌 **기본**입니다.

### 1. 풍부한 메타 정보 제공
`println`은 단순히 전달한 문자열만 출력하지만 로그는 한 줄에 다음과 같은 중요한 정보를 포함합니다.
* **발생 시각:** 정확히 언제 사건이 발생했는가?
* **로그 레벨:** 이 정보가 단순한 안내(INFO)인가 아니면 즉시 수정해야 할 에러(ERROR)인가?
* **쓰레드 이름:** 어떤 쓰레드가 이 작업을 수행 중인가? (멀티 쓰레드 환경에서 디버깅의 핵심)
* **클래스명:** 어느 파일의 어느 라인에서 로그가 찍혔는가?

### 2. 로그 레벨 관리와 유연성
상황에 따라 출력 범위를 조절할 수 있습니다.
* **DEBUG/TRACE:** 로컬 개발 환경에서 상세한 흐름을 파악할 때 사용.
* **INFO/WARN/ERROR:** 실제 서버 운영 환경에서 시스템 상태를 모니터링할 때 사용.
* 설정을 통해 서버를 재시작하지 않고도 특정 패키지의 로그 레벨만 변경하여 문제를 추적할 수 있습니다.

---

## 오늘의 회고: 에러 핸들링은 소통이다
커스텀 에러 핸들링은 단순히 기술적인 예외 처리를 구현하는 과정이 아닙니다. 그것은 **클라이언트와의 소통 방식**입니다.

* **500 Internal Server Error를 지양해야 하는 이유**
    * 서버 내부에서 무슨 일이 벌어졌는지 숨기는 것은 보안상 좋지만 클라이언트 입장에서는 "내가 뭘 잘못했는지" 알 길이 없어 답답함을 느낍니다.
* **400 Bad Request와 구체적인 메시지**
    * 사용자의 입력이 잘못되었다면 친절하게 알려주어야 합니다. "비밀번호는 8자 이상이어야 합니다"와 같은 구체적인 가이드를 제공함으로써 클라이언트가 스스로 문제를 해결할 수 있게 돕는 것이 백엔드 개발자의 배려이자 실력입니다.

---

**한 줄 정리:**
커스텀 에러 핸들링은 단순히 기술적인 구현을 넘어 클라이언트와의 소통 방식입니다. `500 Internal Server Error` 대신 구체적인 에러 메시지와 `400 Bad Request`를 반환함으로써 클라이언트가 스스로 문제를 해결할 수 있는 가이드를 제공해 봅시다!

---

## References
* [Spring Boot Reference Guide: Error Handling](https://docs.spring.io/spring-boot/docs/current/reference/html/web.html#web.servlet.spring-mvc.error-handling)
* [SLF4J User Manual](https://www.slf4j.org/manual.html)
* [RFC 7231: Hypertext Transfer Protocol (HTTP/1.1) - Status Codes](https://datatracker.ietf.org/doc/html/rfc7231#section-6)
* Robert C. Martin, *Clean Code: A Handbook of Agile Software Craftsmanship*
