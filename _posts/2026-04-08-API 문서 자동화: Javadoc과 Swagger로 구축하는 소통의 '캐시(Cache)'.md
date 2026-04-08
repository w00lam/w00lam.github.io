---
title: "API 문서 자동화: Javadoc과 Swagger로 구축하는 소통의 '캐시(Cache)'"
date: 2026-04-08
categories: [Backend, Java]
tags: [Javadoc, Swagger, OpenAPI, Documentation, SpringBoot]
---

**"한 줄 요약: 문서화는 더 이상 노동이 아니다. 코드와 동기화된 문서는 팀의 연산 비용을 줄이는 최고의 최적화다."**

---

## 1. Javadoc vs Swagger: 무엇이 다른가?

두 도구 모두 문서화를 지원하지만 **'누구에게 무엇을 보여줄 것인가'** 에 따라 역할이 나뉩니다.

* **Javadoc (내부용):** Java 소스 코드에서 HTML 문서를 생성합니다. 주로 라이브러리 사용자나 동료 개발자에게 클래스, 메서드의 내부 구현 의도와 사용법을 전달합니다.
* **Swagger/OpenAPI (외부용):** RESTful API의 엔드포인트를 시각화합니다. 프론트엔드 개발자나 외부 API 연동자가 실제로 API를 호출해보고 응답 형식을 확인할 수 있는 인터랙티브한 UI를 제공합니다.

> 💡 **Javadoc에 대해 더 깊이 있는 인사이트**가 궁금하다면 아래 포스팅을 참고해보세요.
> [Javadoc - 코드를 제품으로 격상시키는 문서화의 기술](https://w00lam.github.io/posts/Javadoc-%EC%BD%94%EB%93%9C%EB%A5%BC-%EC%A0%9C%ED%92%88%EC%9C%BC%EB%A1%9C-%EA%B2%A9%EC%83%81%EC%8B%9C%ED%82%A4%EB%8A%94-%EB%AC%B8%EC%84%9C%ED%99%94%EC%9D%98-%EA%B8%B0%EC%88%A0/)

---

## 2. 문서 자동화는 어떻게 이루어지는가?

문서화가 '자동'으로 이루어지는 메커니즘은 **정적 분석**과 **런타임 스캔**으로 구분됩니다.

1. **Javadoc의 정적 분석:** `javadoc` 도구가 소스 파일(`.java`)을 직접 읽어 `/** ... */` 형태의 특수 주석을 파싱합니다. 코드를 실행하지 않고 텍스트를 분석하여 정적인 HTML 파일을 생성합니다.
2. **Swagger의 런타임/빌드 타임 스캔:** Spring Boot 환경에서는 `springdoc-openapi` 라이브러리가 애플리케이션 실행 시 컨트롤러(`@RestController`)와 DTO(`@Schema`)를 스캔합니다.
   * 리플렉션(Reflection)을 통해 어노테이션에 담긴 메타데이터를 추출하여 **OpenAPI Spec(JSON/YAML)**을 생성하고 이를 Swagger UI가 화면으로 렌더링합니다.

---

## 3. 핵심 어노테이션과 동작 원리

### [Javadoc] 코드에 생명력을 불어넣는 주석
```java
/**
 * 공연 좌석을 예약합니다.
 * @param reservationRequest 예약 요청 정보 (DTO)
 * @return 예약 완료된 티켓 정보
 * @throws OverCapacityException 잔여 좌석이 없을 경우 발생
 */
public ReservationResponse reserve(ReservationRequest request) { ... }
```
- **결과:** 메서드 서명(Signature)과 함께 파라미터 정보, 예외 상황이 문서화된 HTML이 생성됩니다.

### [Swagger] API의 얼굴을 만드는 어노테이션
```java
@Tag(name = "Reservation", description = "공연 예약 API")
@RestController
public class ReservationController {

    @Operation(summary = "좌석 예약", description = "특정 공연의 좌석을 예약하고 티켓을 발권합니다.")
    @PostMapping("/api/reserve")
    public ReservationResponse reserve(@RequestBody ReservationRequest request) { 
        // 로직 생략
    }
}
```

* **@Tag:** API 그룹을 묶어주는 역할을 합니다. Swagger UI 상단에 큰 카테고리로 노출되어 API를 구조적으로 파악하게 돕습니다.
* **@Operation:** 특정 엔드포인트의 목적을 설명합니다. UI에서 해당 API를 클릭했을 때 나타나는 제목과 상세 설명이 됩니다.
* **@RequestBody / @Parameter:** 입력 데이터 형식을 정의합니다. UI에서 실제 값을 입력해 'Try it out' 기능으로 API를 직접 테스트해 볼 수 있게 합니다.

---

## 4. 왜 Javadoc과 Swagger를 사용하는가?

1.  **Single Source of Truth (단일 진실 공급원):** 코드와 문서가 분리되면 코드가 변할 때 문서는 과거의 유물이 됩니다. 자동화를 통해 **코드 자체가 곧 문서**가 되도록 하여 동기화 오류를 원천 차단합니다.
2.  **협업의 마찰 감소 (Communication Caching):** 프론트엔드 개발자가 "이 API 응답 값이 뭐예요?"라고 물을 필요가 없습니다. 이미 Swagger라는 **'캐시'**에 최신 정보가 기록되어 있기 때문입니다.
3.  **신뢰성 있는 개발 환경:** Swagger UI에서 API를 직접 호출해보며 개발 서버의 상태를 즉각 확인하고 디버깅할 수 있는 샌드박스 환경을 제공합니다.
4.  **온보딩 비용 절감:** 새로 합류한 팀원이 Javadoc을 통해 시스템의 도메인 로직과 예외 처리 방식을 코드를 일일이 뜯어보지 않고도 빠르게 파악할 수 있습니다.

---

## 5. 오늘의 회고: 자동화는 나와 동료 개발자들에게 '배려'다

### Insight: 자동화된 기록의 가치
이번에 Javadoc과 Swagger를 정리하며 느낀 점은 **좋은 문서는 동료에 대한 가장 큰 배려**라는 것입니다. 수동으로 작성하는 문서는 시간이 지나면 관리되지 않는 부채가 되지만 자동화된 문서는 코드가 살아있는 한 함께 살아 숨 쉬는 강력한 자산이 됩니다.

지난 시간 배운 **Space-Time Trade-off** 관점에서 보면 문서를 자동화하기 위해 어노테이션을 달고 설정을 세팅하는 짧은 시간의 투자는 이후 프로젝트 내내 발생할 수 있는 수백 번의 질문과 오해를 제거하는 혁신적인 최적화입니다.

### 다짐
"나중에 문서 정리해야지"라는 말은 실현되기 어렵다는 것을 잘 알고 있습니다. 코드를 짤 때 Javadoc과 Swagger 어노테이션을 작성하는 것을 **'개발 완성'의 기본 기준**으로 삼겠습니다. 내가 만든 API가 나 없이도 스스로를 설명할 수 있도록 만드는 것 또한 진정한 프로 개발자의 자세임을 잊지 않겠습니다.

---

## 6. References

* **Main Post:** [Javadoc - 코드를 제품으로 격상시키는 문서화의 기술](https://w00lam.github.io/posts/Javadoc-%EC%BD%94%EB%93%9C%EB%A5%BC-%EC%A0%9C%ED%92%88%EC%9C%BC%EB%A1%9C-%EA%B2%A9%EC%83%81%EC%8B%9C%ED%82%A4%EB%8A%94-%EB%AC%B8%EC%84%9C%ED%99%94%EC%9D%98-%EA%B8%B0%EC%88%A0/)
* **Official Docs:** [Springdoc-openapi Documentation](https://springdoc.org/)
