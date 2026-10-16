---
title: "데이터베이스의 안전성과 일관성 — SQL Injection부터 복제 지연까지"
date: 2026-10-16
categories: [TIL, Backend, Database, Java]
tags: [Java, Spring Boot, Database, SQL, NoSQL, PostgreSQL, MongoDB, Security, TIL]
permalink: /posts/database-security-consistency-replication/
---

오늘은 SQL Injection을 예방하는 안전한 쿼리 작성 방법과 SQL·NoSQL 데이터베이스의 선택 기준을 학습했다. 이어서 MongoDB의 임베딩과 참조, 트랜잭션을 비교하고 PostgreSQL의 Primary와 Read Replica에서 발생할 수 있는 복제 지연도 살펴봤다. 모의면접에서는 맛잇온 음식점 탐색 서비스를 예로 들어 데이터베이스 선택과 읽기 경로를 설명했다.

처음에는 PreparedStatement를 사용하면 SQL Injection을 막을 수 있다고만 생각했다. 하지만 사용자 입력을 SQL 문자열에 먼저 이어 붙인 뒤 PreparedStatement를 만드는 것은 이미 쿼리 구조가 오염된 뒤다. 데이터베이스 종류도 이름만 보고 고를 수 없었다. 조회 조건, 데이터 관계, 변경 패턴, 일관성 요구를 먼저 확인해야 했다.

## SQL 문자열에 입력값을 직접 이어 붙이면 위험하다

사용자가 음식점 지역을 검색하는 API를 생각해 보자. 다음처럼 입력값을 SQL 문자열에 직접 붙이면 사용자가 입력한 값이 데이터가 아니라 SQL 문법의 일부로 해석될 수 있다.

```java
String sql = "SELECT id, name FROM restaurant WHERE region = '"
        + region
        + "'";
```

이 코드의 문제는 `region`에 어떤 값을 넣었는지가 아니라 쿼리의 구조와 입력값을 같은 문자열로 만든 데 있다. 입력 내용에 따라 WHERE 조건의 의미가 달라지거나 원래 의도하지 않은 SQL이 실행될 수 있다.

안전한 방식은 쿼리 구조를 먼저 정하고 값은 파라미터로 전달하는 것이다.

```java
String sql = "SELECT id, name FROM restaurant WHERE region = ?";

try (PreparedStatement statement = connection.prepareStatement(sql)) {
    statement.setString(1, region);

    try (ResultSet resultSet = statement.executeQuery()) {
        while (resultSet.next()) {
            // 음식점 결과 처리
        }
    }
}
```

PreparedStatement를 만드는 시점에는 SQL 코드가 이미 완성되어 있고 `region`은 값으로 바인딩된다. 따라서 입력에 SQL 문법이 포함되어도 데이터베이스는 이를 쿼리 구조가 아니라 하나의 값으로 다룬다. [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)도 Prepared Statement에서 SQL 코드를 먼저 정의하고 파라미터를 나중에 전달하는 방식을 설명한다.

`LIKE ?`를 사용할 때 검색어 양쪽에 `%`를 붙이면 부분 검색 범위가 넓어진다.

```java
String sql = "SELECT id, name FROM restaurant WHERE name LIKE ?";
statement.setString(1, "%" + keyword + "%");
```

이때 `%`가 검색 의미를 바꾸는 것과 입력값이 SQL 문법으로 실행되는 것은 다른 문제다. 전자는 와일드카드 검색의 범위이고 후자는 SQL Injection의 문제다.

## 값 바인딩으로 해결되지 않는 부분도 있다

사용자가 정렬 기준을 선택하는 음식점 목록 API를 생각하면 값 바인딩의 범위를 더 분명하게 볼 수 있다. `?`는 값에는 사용할 수 있지만 컬럼명이나 `ASC`, `DESC` 같은 정렬 방향을 그대로 바인딩하는 용도는 아니다. 정렬 필드와 방향은 허용 목록에서 선택한 값만 쿼리에 반영해야 한다.

```java
Map<String, String> allowedColumns = Map.of(
        "name", "name",
        "rating", "rating"
);

String sortColumn = Optional.ofNullable(allowedColumns.get(request.sort()))
        .orElseThrow(() -> new IllegalArgumentException("지원하지 않는 정렬 기준"));

String direction = "desc".equalsIgnoreCase(request.direction())
        ? "DESC"
        : "ASC";

String sql = "SELECT id, name, rating FROM restaurant "
        + "ORDER BY " + sortColumn + " " + direction;
```

여기서 문자열 결합 자체가 모두 위험한 것은 아니다. `sortColumn`은 클라이언트 입력을 그대로 사용하지 않고 코드에 정해 둔 컬럼명으로 변환했고 `direction`도 두 값 중 하나로 제한했다. 그 밖의 값은 파라미터 바인딩으로 전달한다.

JDBC의 PreparedStatement만 지켜야 하는 것도 아니다. JPQL과 Native Query에서도 값은 파라미터로 전달해야 하고 QueryDSL을 사용할 때도 타입이 정해진 표현식과 허용된 정렬 선택지를 사용해야 한다. ORM이나 쿼리 빌더를 쓴다는 사실만으로 문자열 결합이 안전해지는 것은 아니다.

입력 검증, 파라미터 바인딩, 인가는 서로 다른 역할을 가진다. DTO 검증은 지역명이나 정렬 값의 형식과 허용 범위를 확인한다. 바인딩은 입력값이 SQL 코드로 해석되지 않도록 한다. 관리자만 사용할 수 있는 음식점 수정 기능은 Spring Security의 `SecurityFilterChain` 같은 위치에서 인가한다. 인가 설정이 SQL Injection까지 막아 주는 것은 아니다.

DB 계정의 최소 권한도 Injection 자체를 차단하는 방법은 아니다. 다만 공격이 성공했을 때 피해 범위를 줄이는 방어선이다. 애플리케이션 계정에 슈퍼유저 권한이나 필요하지 않은 스키마 변경 권한을 주지 않는 식으로 적용한다. 서버의 상세 DB 오류를 그대로 응답하지 않는 것도 내부 구조와 쿼리 정보를 불필요하게 노출하지 않기 위한 조치다.

## SQL과 NoSQL은 데이터 모델과 조회 패턴으로 비교한다

관계형 데이터베이스는 테이블과 관계와 제약조건으로 데이터를 관리한다. [데이터베이스의 키 — 후보키의 최소성과 제약조건은 어떻게 연결될까?](/posts/database-key-minimality-constraints/)에서 정리한 기본키와 외래키처럼 데이터가 지켜야 할 규칙을 데이터베이스에 표현할 수 있다. 여러 조건을 조합한 검색과 정렬이 많고 관계 무결성이 중요한 음식점 탐색이라면 PostgreSQL 같은 관계형 모델을 먼저 검토할 이유가 있다.

조회 조건과 인덱스도 함께 봐야 한다. 지역, 음식 종류, 영업 여부처럼 필터가 다양하고 평점이나 거리와 같은 기준으로 정렬한다면 어떤 조회가 주로 사용되는지부터 확인해야 한다. [B-Tree와 B+Tree — 페이지 접근을 줄이면서 인덱스 검색은 어떻게 이루어질까?](/posts/b-tree-b-plus-tree-index-search/)에서 다룬 것처럼 인덱스는 검색 경로를 돕는 구조이지 데이터베이스 선택을 대신하는 답은 아니다.

NoSQL을 하나의 모델로 묶어 말하면 선택 기준이 흐려진다.

| 모델 | 잘 맞는 조회 관점 | 오늘 연결한 예 |
| --- | --- | --- |
| Key-Value | 키로 값을 정확하게 찾는 패턴 | 음식점 ID 기반 상세 데이터 캐시 |
| Document | 문서 단위로 함께 읽는 데이터 | MongoDB의 음식점 문서 |
| Wide-Column | 열 중심으로 분산 저장하고 읽는 패턴 | 대량 데이터를 특정 열 기준으로 조회하는 경우 |
| Graph | 여러 단계의 관계를 따라가는 탐색 | 음식점과 사용자·추천 관계 탐색 |

MongoDB는 문서형 데이터베이스의 사례다. NoSQL이라고 해서 스키마도 관계도 트랜잭션도 전혀 없는 것은 아니다. 스키마가 유연한 제품도 애플리케이션이나 데이터베이스에 검증 규칙을 둘 수 있고 MongoDB는 여러 문서에 걸친 트랜잭션도 지원한다. 반대로 SQL이 수직 확장만 가능하고 NoSQL이 항상 수평 확장된다고 말할 수도 없다. SQL도 복제본을 이용한 읽기 분산을 할 수 있으며 읽기 확장과 쓰기 확장은 서로 다른 문제다.

SQL Injection과 비슷한 경계는 NoSQL에도 있다. 클라이언트가 보낸 객체나 연산자를 검증 없이 MongoDB 필터에 넣으면 값이 아니라 `$ne` 같은 연산자로 해석될 수 있다. 검색어가 문자열이어야 한다면 문자열인지 먼저 확인하고 허용된 필드와 타입만 필터로 만든다. 쿼리 객체를 사용한다는 이유만으로 입력 검증을 생략할 수는 없다. [OWASP NoSQL Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NoSQL_Security_Cheat_Sheet.html)에서도 원시 쿼리 조각을 받지 말고 필드별 타입과 허용된 연산자를 검증하는 방향을 제시한다.

맛잇온의 음식점 검색을 바로 MongoDB로 옮겨야 한다고 판단하지 않았다. 음식점과 메뉴와 영상 사이의 관계, 주로 사용하는 필터와 정렬, 변경 패턴, 필요한 일관성 수준을 먼저 확인해야 한다. 이후 마이그레이션 비용과 운영 복잡도를 따지고 실제 조회를 측정해 선택해야 한다. Redis나 특정 NoSQL 제품을 원본 데이터베이스의 보편적인 대체재로 보는 것도 같은 이유로 조심해야 한다.

## MongoDB에서 임베딩과 참조를 나누는 기준

모의면접에서 음식점과 영상이 항상 함께 조회된다는 조건을 보고 처음에는 영상을 음식점 문서 안에 임베딩하겠다고 답했다. 자주 함께 읽는 데이터라는 점은 임베딩을 검토할 근거가 된다. 관계가 제한적이고 함께 변경되는 데이터라면 한 문서 안에 두었을 때 읽기 흐름이 단순해지고 단일 문서 변경은 원자적으로 처리할 수 있다.

하지만 영상 하나가 여러 음식점에 연결되고 영상 정보의 변경을 한 곳에서 관리해야 한다면 음식점마다 같은 영상을 복사하는 방식은 갱신 이상을 만들 수 있다. 한 문서만 고쳤는데 다른 음식점 문서에는 이전 정보가 남으면 데이터가 서로 달라진다. 이 조건에서는 영상 문서를 따로 두고 음식점에서 참조하는 편을 검토할 수 있다.

임베딩과 참조 중 하나가 항상 정답은 아니다. 조회 빈도와 문서 크기와 중복 허용 여부와 변경 주기와 일관성 요구를 함께 봐야 한다. 임베딩을 선택한다면 복사된 값이 최신 정보인지 아니면 특정 시점의 스냅샷인지 의미를 정하고, 중복 데이터의 동기화 방식도 설계해야 한다. [MongoDB Document Relationships](https://www.mongodb.com/docs/manual/applications/data-models-relationships/)는 함께 조회되는지와 데이터가 독립적으로 변경되는지에 따라 임베딩과 참조를 판단하는 관점을 제공한다.

MongoDB는 단일 문서 쓰기의 원자성을 제공하고 다중 문서 트랜잭션도 지원한다. 그렇다고 트랜잭션이 데이터 모델 설계를 대신해 주지는 않는다. 모델이 불필요한 중복을 만들고 매번 여러 문서를 갱신하도록 되어 있다면 트랜잭션을 추가하는 것만으로 변경 비용과 구조 문제가 사라지지 않는다. [MongoDB Transactions](https://www.mongodb.com/docs/manual/core/transactions/)에서 확인한 트랜잭션 지원과 문서 모델의 선택은 별개의 판단이다.

모의면접에서 “MongoDB는 문서 단위 트랜잭션이고 PostgreSQL은 행 단위 트랜잭션”이라고 말한 부분도 고쳤다. PostgreSQL 트랜잭션은 여러 SQL 명령을 하나의 all-or-nothing 작업으로 묶을 수 있고 여러 행과 테이블을 변경할 수 있다. 행 단위 락은 동시에 접근하는 작업을 제어하는 방식이지 트랜잭션의 범위를 뜻하지 않는다. 여러 데이터의 변경과 동시성 문제를 다룰 때는 [낙관적 락·비관적 락·아토믹 업데이트, 무엇을 선택해야 할까](/posts/lock-selection-criteria/)에서 정리한 것처럼 트랜잭션과 락을 서로 다른 층위에서 봐야 한다.

## PostgreSQL Primary와 Read Replica의 역할을 나누다

처음에는 음식점 데이터가 많아지면 Scale Up을 먼저 답했다. 하지만 모의면접의 조건은 관리자가 음식점 정보를 수정하고 일반 사용자가 음식점을 검색하는 서비스였다. 쓰기와 읽기의 경로를 나누면 Primary의 읽기 부하를 줄일 수 있으므로 관리자 쓰기는 Primary로 보내고 일반 검색은 Read Replica로 분산하는 방향으로 생각을 수정했다.

일반적인 Primary와 Standby 구성에서 쓰기와 최신 상태 확인은 Primary가 담당한다. Hot Standby는 읽기 전용 쿼리를 처리할 수 있고 Primary에서 만들어진 WAL을 Standby가 받아 적용한다. 그래서 Read Replica를 모든 읽기에 무조건 사용하는 것이 아니라 기능이 요구하는 최신성에 맞춰 선택해야 한다.

비동기 복제에서는 Primary에 반영된 변경이 Replica에 아직 도착하지 않을 수 있다. 관리자가 음식점 주소를 수정한 직후 화면을 다시 조회했는데 그 요청이 Replica로 가면 이전 주소가 보일 수 있다. 검색 목록처럼 짧은 지연을 허용할 수 있는 기능은 Replica를 검토할 수 있지만 수정 직후 최신 값을 확인하는 화면은 Primary를 사용하거나 복제 적용을 확인한 뒤 읽는 방식이 필요하다.

동기 복제는 커밋 응답에 복제 확인을 반영할 수 있지만 그만큼 응답을 기다리는 시간이 늘 수 있다. 어떤 Standby까지 확인하는지와 어떤 설정을 사용하는지에 따라 보장 범위도 달라진다. 따라서 “동기 복제면 모든 읽기 일관성이 자동으로 해결된다”고 정리하면 안 된다.

![PostgreSQL Primary와 Read Replica의 쓰기·읽기 경로 및 비동기 복제 지연을 보여 주는 구조도](/assets/images/2026-10-16-postgresql-replication/primary-replica-read-consistency.svg)

*그림 1. 관리자 쓰기는 Primary로 보내고 일반 검색은 Read Replica로 분산할 수 있다. 비동기 복제에서는 쓰기 직후 최신 값이 필요할 때 Primary를 선택하고 동기 복제는 커밋 응답이 복제 확인을 기다릴 수 있다.*

이 구조에서 읽기 분산과 쓰기 확장은 같은 문제가 아니다. Read Replica를 추가하면 읽기 요청을 나눌 수 있지만 쓰기 요청이 자동으로 여러 서버에 분산되는 것은 아니다. [PostgreSQL Log-Shipping Standby Servers](https://www.postgresql.org/docs/current/warm-standby.html)는 Standby가 Primary의 WAL을 받아 적용하고 Hot Standby에서 읽기 전용 쿼리를 처리하는 흐름을 설명한다.

Redis 캐시의 무효화 문제와 PostgreSQL 복제 지연도 구분해야 한다. 캐시는 애플리케이션이 저장한 값과 원본 데이터베이스 사이의 문제이고 복제 지연은 Primary의 변경이 Replica에 적용되는 시간의 문제다. 둘 다 오래된 값을 보여 줄 수 있지만 발생 계층과 해결 기준은 다르다.

## 오늘의 정리

SQL Injection을 막는 출발점은 사용자 입력을 SQL 문자열에 직접 붙이지 않는 것이다. 쿼리 구조를 먼저 정하고 값은 PreparedStatement와 JPQL과 Native Query의 파라미터 또는 QueryDSL의 타입이 정해진 표현식으로 전달한다. `LIKE`의 `%`는 검색 범위를 바꾸는 값일 뿐 SQL Injection과 같은 문제는 아니다. 컬럼명과 정렬 방향처럼 값 바인딩이 어려운 부분은 허용 목록으로 선택지를 제한한다.

입력 검증은 형식과 범위를 확인하고 바인딩은 코드와 데이터를 분리하며 인가는 기능에 접근할 권한을 확인한다. DB 계정의 최소 권한은 Injection을 막는 방법이 아니라 성공했을 때의 피해를 줄이는 방어다.

SQL과 NoSQL의 선택은 제품 이름이나 프레임워크로 결정하지 않는다. 데이터 관계와 조회 조건과 정렬과 변경 패턴과 일관성 요구를 확인하고 마이그레이션 비용과 운영 복잡도와 실제 성능 검증을 함께 고려한다. MongoDB에서는 자주 함께 읽히고 함께 변경되는 데이터라면 임베딩을 검토하고 여러 곳에서 공유되며 독립적으로 바뀌는 데이터라면 참조를 검토한다. 다중 문서 트랜잭션 지원이 모델 설계의 필요성을 없애 주는 것은 아니다.

PostgreSQL에서는 쓰기와 최신 상태 확인을 Primary에 두고 지연을 허용할 수 있는 일반 검색을 Read Replica로 분산하는 구조를 검토할 수 있다. 비동기 복제에서는 쓰기 직후 Replica가 이전 상태일 수 있으므로 기능별 읽기 일관성 요구를 먼저 정해야 한다. 오늘은 구현이나 부하 테스트를 수행한 것이 아니라 모의면접의 답변을 고치면서 안전한 쿼리와 데이터 모델과 읽기 경로를 같은 설계 기준으로 연결해 보았다.

### 참고 자료 (Sources)

* **gyoogle/tech-interview-for-developer:** [SQL Injection](https://github.com/gyoogle/tech-interview-for-developer/blob/master/Computer%20Science/Database/SQL%20Injection.md) — SQL Injection의 기본 공격 흐름을 확인
* **OWASP:** [SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html) — Prepared Statement, 파라미터 바인딩, 허용 목록, 최소 권한을 확인
* **OWASP:** [NoSQL Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NoSQL_Security_Cheat_Sheet.html) — NoSQL 입력 타입 검증과 연산자 주입 위험을 확인
* **gyoogle/tech-interview-for-developer:** [SQL과 NOSQL의 차이](https://github.com/gyoogle/tech-interview-for-developer/blob/master/Computer%20Science/Database/SQL%EA%B3%BC%20NOSQL%EC%9D%98%20%EC%B0%A8%EC%9D%B4.md) — SQL과 NoSQL의 기본 비교 범위를 확인
* **MongoDB Manual:** [Document Relationships](https://www.mongodb.com/docs/manual/applications/data-models-relationships/) — 임베딩과 참조를 조회 및 변경 패턴으로 판단하는 기준을 확인
* **MongoDB Manual:** [Transactions](https://www.mongodb.com/docs/manual/core/transactions/) — 단일 문서 원자성과 다중 문서 트랜잭션 지원을 확인
* **PostgreSQL Documentation:** [Transactions](https://www.postgresql.org/docs/18/tutorial-transactions.html) — 여러 SQL 명령을 all-or-nothing으로 묶는 트랜잭션 범위를 확인
* **PostgreSQL Documentation:** [Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html) — 락이 동시 접근을 제어하는 방식이며 트랜잭션 범위와 다른 개념임을 확인
* **PostgreSQL Documentation:** [Log-Shipping Standby Servers](https://www.postgresql.org/docs/current/warm-standby.html) — Primary와 Standby의 WAL 적용, Hot Standby, 읽기 전용 쿼리 흐름을 확인
