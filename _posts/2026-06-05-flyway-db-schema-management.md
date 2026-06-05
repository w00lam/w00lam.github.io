---
title: "Flyway를 활용한 DB 스키마 관리: ddl-auto=validate와 defer-datasource-initialization의 함정"
date: 2026-06-05
categories: [Database, Spring, JPA]
tags: [Flyway, DB Migration, Schema Management, Hibernate, ddl-auto, Spring Boot]
permalink: /posts/flyway-db-schema-management/
---

## 1. 왜 Flyway가 필요한가? 개발 환경과 배포 환경의 DB 스키마 관리

개발 초기 단계에서는 JPA의 `ddl-auto` 옵션을 `update`로 설정하여 엔티티 변경에 따라 데이터베이스 테이블을 자동으로 수정하는 편리함을 누릴 수 있습니다. 하지만 이러한 방식은 실제 **배포 환경에서는 매우 위험**할 수 있습니다.

예를 들어, 엔티티 필드명이 변경되거나 컬럼 타입이 수정될 때, Hibernate가 개발자의 의도와 다르게 스키마를 변경하거나 심지어 기존 데이터를 손상시킬 가능성이 있습니다. 이는 프로덕션 환경에서 치명적인 문제를 야기할 수 있습니다.

그래서 배포 환경에서는 보통 다음과 같이 `ddl-auto`를 `validate`로 설정합니다.

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
```

`validate` 옵션은 테이블을 생성하거나 수정하지 않습니다. 대신 현재 애플리케이션의 엔티티 정의와 실제 데이터베이스 스키마가 일치하는지 여부만을 검증합니다. 만약 일치하지 않으면 애플리케이션 시작 시 오류를 발생시켜 개발자에게 문제를 알립니다.

이는 배포 환경에서 Hibernate에게 테이블 생성을 맡기는 대신, **DB 스키마 변경을 명시적인 SQL 파일로 관리하는 방식이 훨씬 안전하고 예측 가능**하다는 철학에서 비롯됩니다. 이때 필요한 도구가 바로 **Flyway**입니다.

## 2. Flyway란 무엇인가? DB 스키마의 버전 관리 시스템

Flyway는 데이터베이스 스키마 변경 이력을 버전으로 관리하는 강력한 마이그레이션 도구입니다. 우리가 코드 변경 사항을 Git으로 관리하듯이, DB 스키마 변경 사항도 SQL 파일 형태로 버전 관리할 수 있게 해줍니다.

예를 들어, 다음과 같은 변경 이력을 파일로 남길 수 있습니다.

```text
V1__create_member_table.sql
V2__create_order_table.sql
V3__add_status_column_to_payment.sql
```

애플리케이션이 실행되면 Flyway는 데이터베이스에 접속하여 아직 적용되지 않은 SQL 마이그레이션 파일을 순서대로 실행합니다. 그리고 어떤 마이그레이션이 적용되었는지는 `flyway_schema_history`라는 내부 테이블에 기록하여 관리합니다.

> Flyway는 DB 스키마 변경을 버전 관리하고, 여러 환경(개발, 테스트, 운영)에 걸쳐 일관되게 적용하기 위한 도구입니다. 공식 설명에서도 Flyway는 데이터베이스 스키마를 쉽고 안정적으로 진화시키는 마이그레이션 도구라고 강조합니다.

## 3. Flyway 파일 위치 및 명명 규칙

Spring Boot 환경에서 Flyway를 사용하면, 기본적으로 `src/main/resources/db/migration` 경로에 있는 SQL 파일을 읽어들입니다.

```text
src/main/resources/db/migration
 ├── V1__create_member_table.sql
 ├── V2__create_order_table.sql
 └── V3__create_payment_table.sql
```

Flyway 파일명은 특정 규칙을 따릅니다. 기본 형식은 `V버전__설명.sql`입니다. 여기서 `V`는 버전(Version)을 의미하며, 버전 뒤에는 **언더스코어(`_`)가 두 개** 붙는다는 점을 주의해야 합니다.

*   **올바른 예**: `V1__init_schema.sql`
*   **잘못된 예**: `V1_init_schema.sql` (언더스코어 하나)

버전은 숫자뿐만 아니라 점(.)을 포함한 단위도 사용할 수 있어, 더 세분화된 버전 관리가 가능합니다.

```text
V1__init_schema.sql
V1.1__add_member_status.sql
V2__create_payment_table.sql
```

## 4. Spring Boot 설정 예시: `ddl-auto: validate`와 `flyway.enabled`

배포 환경에서 Flyway를 활용하기 위한 Spring Boot 설정은 다음과 같습니다.

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
    defer-datasource-initialization: false # 이 옵션이 핵심!

  flyway:
    enabled: true
```

여기서 핵심은 두 가지입니다.

*   `spring.jpa.hibernate.ddl-auto: validate`: Hibernate가 엔티티와 DB 스키마의 일치 여부만 검증하도록 합니다.
*   `spring.flyway.enabled: true`: 애플리케이션 시작 시 Flyway 마이그레이션이 자동으로 실행되도록 합니다.

Spring Boot 공식 문서에서도 Flyway나 Liquibase와 같은 상위 수준의 데이터베이스 마이그레이션 도구를 데이터베이스 초기화에 사용하는 것을 권장합니다.

## 5. `validate`와 Flyway의 관계: 대체재가 아닌 보완재

`validate`와 Flyway는 서로 대체 관계가 아닙니다. 오히려 상호 보완적인 역할을 수행합니다.

*   **Flyway**: SQL 마이그레이션 파일을 실행하여 DB 스키마를 생성하거나 변경하는 역할을 담당합니다.
*   **Hibernate `validate`**: 애플리케이션의 엔티티 정의와 실제 DB 스키마가 일치하는지 검증하는 역할을 담당합니다.

따라서 정상적인 애플리케이션 실행 순서는 다음과 같습니다.

![Flyway와 Hibernate Validate 실행 순서](/assets/images/2026-06-05-flyway-db-schema-management/flyway-hibernate-sequence.png)

1.  **Flyway가 migration SQL 실행**: DB 스키마를 최신 상태로 만듭니다.
2.  **DB 테이블 생성/변경 완료**: Flyway 작업이 성공적으로 마무리됩니다.
3.  **Hibernate가 `ddl-auto=validate`로 엔티티와 DB 스키마 검증**: Flyway가 만든 스키마와 엔티티가 일치하는지 확인합니다.
4.  **애플리케이션 실행**: 모든 검증이 통과되면 애플리케이션이 정상적으로 기동됩니다.

이 구조에서는 Hibernate가 DB 스키마를 직접 수정하지 않습니다. DB 변경은 Flyway가 전적으로 담당하고, Hibernate는 그 결과에 대한 검증 역할만 수행하여 안정성을 높입니다.

## 6. `defer-datasource-initialization`의 함정: 순서 문제

이번에 겪었던 문제의 핵심은 `spring.jpa.defer-datasource-initialization` 옵션이었습니다. `defer`는 '미루다', '연기하다'라는 뜻을 가지고 있습니다. 즉, 이 옵션은 데이터소스 초기화 작업을 뒤로 미룰 것인지 결정합니다.

만약 이 값이 `true`로 설정되어 있다면, 다음과 같은 문제 상황이 발생할 수 있습니다.

![defer-datasource-initialization=true 일 때 문제 상황](/assets/images/2026-06-05-flyway-db-schema-management/defer-true-problem.png)

1.  **Hibernate `validate` 실행**: 애플리케이션 시작 시 Hibernate가 스키마 검증을 시도합니다.
2.  **아직 Flyway가 테이블을 만들기 전**: `defer-datasource-initialization: true`로 인해 Flyway의 DB 초기화 작업이 지연됩니다.
3.  **Hibernate가 DB에 테이블이 없다고 판단**: 아직 Flyway가 스키마를 적용하기 전이므로, Hibernate는 엔티티에 해당하는 테이블이 없다고 판단합니다.
4.  **애플리케이션 실행 실패**: 스키마 불일치로 인해 애플리케이션이 기동되지 않습니다.

즉, `validate` 기능이 꺼진 것이 아니라, **검증이 너무 빨리 실행되어 Flyway의 작업보다 선행**하면서 발생한 순서 문제였던 것입니다.

## 7. `false`로 바꾸면 해결되는 이유: 올바른 실행 순서 보장

`defer-datasource-initialization`을 `false`로 설정하면 DB 초기화 작업을 뒤로 미루지 않습니다. 이로 인해 우리가 의도했던 올바른 실행 순서가 보장됩니다.

```yaml
spring:
  jpa:
    defer-datasource-initialization: false
```

![defer-datasource-initialization=false 일 때 해결 흐름](/assets/images/2026-06-05-flyway-db-schema-management/defer-false-solution.png)

1.  **Flyway migration 실행**: 애플리케이션 시작 시 Flyway가 먼저 DB 스키마 마이그레이션을 수행합니다.
2.  **테이블 생성 완료**: Flyway에 의해 필요한 테이블들이 모두 생성됩니다.
3.  **Hibernate `validate` 실행**: Flyway 작업이 완료된 후, Hibernate가 엔티티와 이미 생성된 DB 스키마를 검증합니다.
4.  **애플리케이션 실행**: 모든 검증이 통과되어 애플리케이션이 정상적으로 기동됩니다.

결론적으로 `ddl-auto=validate`는 여전히 활성화되어 있습니다. 다만, `defer-datasource-initialization: false` 설정을 통해 **Flyway가 먼저 테이블을 만들고, 그 다음 Hibernate가 검증하도록 실행 순서를 바로잡은 것**입니다.

## 8. 운영 시 주의사항: 마이그레이션 파일의 불변성

Flyway를 운영 환경에서 사용할 때 가장 중요한 원칙 중 하나는 **한 번 적용된 마이그레이션 파일은 수정하지 않는 것**입니다.

예를 들어, 이미 배포되어 적용된 `V1__create_payment_table.sql` 파일이 있다고 가정해봅시다. 이 파일을 나중에 수정하면 로컬 개발 환경과 운영 DB의 마이그레이션 `checksum`이 달라져 Flyway 오류가 발생할 수 있습니다.

이미 적용된 DB 변경을 수정해야 한다면, 기존 파일을 고치는 것이 아니라 **새로운 마이그레이션 파일을 추가**해야 합니다.

```text
V2__add_payment_status_column.sql
```

이처럼 변경 이력을 누적하는 방식으로 관리해야 데이터베이스 스키마의 일관성과 안정성을 유지할 수 있습니다.

## 9. 오늘의 마무리: 안정적인 DB 스키마 관리의 중요성

이번 경험을 통해 Flyway를 활용한 DB 스키마 관리의 중요성과 `ddl-auto=validate`, `defer-datasource-initialization` 옵션 간의 정확한 관계를 깊이 이해하게 되었습니다.

*   **Flyway**: DB 스키마 변경 이력을 SQL 파일로 명시적으로 관리하고, 여러 환경에 일관되게 적용하는 핵심 도구입니다.
*   **Hibernate `validate`**: 프로덕션 환경에서 엔티티와 실제 DB 스키마의 일치 여부를 검증하여 예상치 못한 스키마 변경을 방지하는 안전장치입니다.

이번 문제의 핵심은 `validate` 자체의 문제가 아니라, Flyway가 테이블을 만들기 전에 Hibernate `validate`가 먼저 실행되면서 발생한 **실행 순서 문제**였습니다. `defer-datasource-initialization: false` 설정을 통해 이 순서를 바로잡음으로써 안정적인 애플리케이션 기동을 확보할 수 있었습니다.

> **Flyway = DB 스키마 변경 적용**
> **Hibernate `validate` = 엔티티와 DB 스키마 검증**

이 두 가지 도구의 역할을 명확히 이해하고 올바르게 설정하는 것이, 복잡한 서비스 환경에서 데이터 무결성과 애플리케이션 안정성을 확보하는 데 필수적임을 다시 한번 깨달았습니다.

### References

*   [Flyway 공식 문서](https://flywaydb.org/documentation/)
*   [Spring Boot Reference Documentation - Database Initialization](https://docs.spring.io/spring-boot/docs/current/reference/html/howto.html#howto.data-access.initialize-a-database)
