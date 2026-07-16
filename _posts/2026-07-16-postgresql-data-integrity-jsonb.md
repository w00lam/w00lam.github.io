---
title: "실무에서 PostgreSQL을 선택하는 이유: 데이터 정합성과 JSONB를 중심으로"
date: 2026-07-16
categories: [TIL, Backend, Database]
tags: [PostgreSQL, MySQL, JSONB, Transaction, MVCC, Data Integrity, GIN Index, Spring Boot, Backend, TIL]
permalink: /posts/postgresql-data-integrity-jsonb/
---

지금까지 Spring Boot 프로젝트에서 데이터베이스가 필요하면 자연스럽게 MySQL을 선택했다. 벤치마크를 비교해서 내린 결론은 아니었다. 이미 연결 방법과 설정에 익숙했고, 일반적인 CRUD 서비스를 만드는 데 부족함을 느끼지 못했기 때문이다.

그런데 실무 사례를 찾아볼수록 PostgreSQL을 선택하는 팀이 자주 보였다. 처음에는 단순히 PostgreSQL이 더 빠르거나 더 최신이기 때문이라고 생각했다. 공부해 보니 질문부터 잘못 잡고 있었다.

> **어느 데이터베이스가 더 우수한가보다, 우리 서비스가 어떤 데이터 규칙을 지켜야 하고 팀이 그 기능을 운영할 수 있는지가 먼저였다.**

이번 글에서는 PostgreSQL의 기능을 나열하지 않는다. 결제·포인트·재고처럼 잘못된 상태를 막아야 하는 서비스에서 PostgreSQL의 제약조건과 동시성 제어가 어떤 역할을 하는지, 쇼핑몰 상품 속성을 JSONB로 어떻게 보완할 수 있는지, 그리고 어떤 상황에서는 MySQL을 유지하는 편이 더 나은지 정리해 본다.

## 1. 익숙하다는 이유도 선택 기준이 될 수 있다

익숙함을 무조건 나쁜 기준이라고 생각하지는 않는다. 팀이 이미 MySQL의 백업, 복제, 장애 대응, 실행 계획 분석 방법을 알고 있다면 그 경험은 실제 운영 비용을 줄여 준다. 새로운 데이터베이스를 도입하면 SQL 문법만 배우는 것으로 끝나지 않는다.

- 커넥션 풀과 타임아웃을 다시 조정해야 한다.
- 격리 수준과 잠금 동작의 차이를 이해해야 한다.
- 슬로 쿼리와 실행 계획을 읽는 방법을 익혀야 한다.
- 백업 복구 절차와 장애 전환을 실제로 검증해야 한다.
- 기존 스키마와 쿼리를 마이그레이션해야 한다.

일반적인 CRUD가 중심이고 PostgreSQL 고유 기능이 필요하지 않다면 익숙한 MySQL은 충분히 합리적인 선택이다. 문제는 익숙함을 **유일한 기준**으로 둘 때다. 데이터 규칙이 복잡해지고 동시 요청이 늘어났는데도 “원래 MySQL을 썼으니까”라고만 답한다면 요구사항을 검토하지 않은 셈이 된다.

그래서 이번 학습의 질문을 “PostgreSQL이 MySQL보다 좋은가?”가 아니라 다음처럼 바꾸었다.

```text
서비스가 지켜야 할 데이터 규칙은 무엇인가?
→ DB에서 표현하면 더 안전한 규칙은 무엇인가?
→ 필요한 조회와 확장 기능은 무엇인가?
→ 팀이 감당할 학습·마이그레이션·운영 비용은 얼마인가?
```

## 2. 실무에서 PostgreSQL을 선택하는 이유

PostgreSQL이 실무에서 선택되는 이유는 하나로 압축하기 어렵다. 내가 이해한 공통점은 **데이터베이스를 단순 저장소보다 적극적인 설계 도구로 사용하기 좋다**는 점이다.

먼저 데이터 규칙을 타입과 제약조건으로 명확하게 표현할 수 있다. `NOT NULL`, `UNIQUE`, `FOREIGN KEY`, `CHECK` 같은 기본 제약조건뿐 아니라 부분 인덱스, 표현식 인덱스, 범위 타입과 배타 제약조건처럼 특정 문제를 DB 구조에 가깝게 표현할 선택지가 넓다.

트랜잭션과 동시성 제어도 중요한 이유다. PostgreSQL은 MVCC를 바탕으로 여러 트랜잭션이 동시에 접근할 때 각 문장이 어떤 데이터를 볼지 정하고, 필요할 때 행 잠금이나 더 높은 격리 수준을 선택할 수 있다. 이것이 동시성 문제를 자동 해결한다는 뜻은 아니다. 대신 조건부 UPDATE, `SELECT ... FOR UPDATE`, `SERIALIZABLE`과 재시도처럼 문제에 맞는 도구를 고를 수 있다.

JSONB와 다양한 인덱스도 선택 이유가 된다. 관계형 컬럼을 중심으로 설계하되 구조가 자주 달라지는 일부 속성만 JSONB로 담을 수 있다. B-tree만으로 풀기 어려운 검색에는 GIN, GiST, BRIN 등의 인덱스 유형을 검토할 수 있다. 데이터베이스 밖에 별도 저장소를 하나 더 도입하기 전에 PostgreSQL 안에서 요구사항을 만족할 여지가 커지는 것이다.

운영 생태계도 이미 넓다. AWS RDS for PostgreSQL, Aurora PostgreSQL-Compatible Edition, Google Cloud SQL for PostgreSQL 같은 관리형 서비스에서 백업, 복제, 모니터링, 장애 전환 기능을 제공한다. 직접 모든 운영 기능을 구축하지 않아도 시작할 수 있다는 점은 팀의 도입 장벽을 낮춘다.

다만 여기서 “PostgreSQL은 항상 MySQL보다 빠르고 안정적이다”라는 결론은 나오지 않는다. 성능은 쿼리, 인덱스, 데이터 분포, 동시 요청, 설정과 하드웨어에 따라 달라진다. PostgreSQL은 특정 요구사항을 표현할 도구가 풍부하고 그 도구를 적극 활용하는 설계에 잘 맞기 때문에 선택되는 것이다.

## 3. 정합성이 좋다는 말보다 중요한 것

“PostgreSQL은 데이터 정합성이 좋다”는 문장만으로는 기술 선택에 도움이 되지 않는다. 정합성은 제품 이름이 자동으로 보장하는 속성이 아니라, 지켜야 할 규칙을 스키마와 트랜잭션에 실제로 표현했을 때 얻는 결과다.

### 제약조건은 잘못된 상태를 저장하지 못하게 한다

- `NOT NULL`은 반드시 있어야 하는 값의 누락을 막는다.
- `UNIQUE`는 이메일, 주문 멱등성 키처럼 중복되면 안 되는 값을 막는다.
- `FOREIGN KEY`는 존재하지 않는 회원이나 상품을 참조하는 행을 막는다.
- `CHECK`는 수량, 금액, 상태 조합처럼 한 행이 만족해야 할 조건을 표현한다.

주문 수량이 1 이상이어야 한다면 요청 DTO에서만 검사하지 않고 테이블에도 다음 규칙을 둘 수 있다.

```sql
CREATE TABLE order_item (
    id          bigint PRIMARY KEY,
    order_id    bigint NOT NULL REFERENCES orders(id),
    product_id  bigint NOT NULL REFERENCES product(id),
    quantity    integer NOT NULL,
    CONSTRAINT ck_order_item_quantity
        CHECK (quantity >= 1)
);
```

애플리케이션 검증과 DB 제약조건은 중복이 아니라 역할 분담이다.

애플리케이션은 사용자가 입력한 값을 빠르게 검사해 “주문 수량은 1개 이상이어야 합니다”처럼 구체적인 오류를 돌려준다. DB는 다른 API, 배치, 관리자 도구, 데이터 마이그레이션처럼 예상하지 못한 경로에서 쓰기가 들어와도 잘못된 행을 거절한다. 전자는 좋은 사용자 경험을 위한 첫 번째 검증이고, 후자는 저장 상태를 지키는 최종 방어선이다.

![사용자 요청부터 애플리케이션 검증과 PostgreSQL 제약조건까지 이어지는 이중 방어 구조](/assets/images/2026-07-16-postgresql-data-integrity-jsonb/postgresql-dual-validation.png)

_애플리케이션 검증은 빠르고 친절한 오류를, 데이터베이스 제약조건은 어떤 쓰기 경로에도 적용되는 마지막 방어를 담당한다._

### 트랜잭션은 함께 성공해야 할 작업을 묶는다

주문 저장, 포인트 차감, 재고 감소가 하나의 데이터베이스에 있다면 이 작업들은 하나의 트랜잭션으로 묶을 수 있다. 중간 단계가 실패하면 전체를 롤백해 “포인트는 줄었는데 주문은 없는 상태”를 막는다.

하지만 `@Transactional`을 붙였다고 동시성 문제까지 모두 해결되는 것은 아니다. 두 트랜잭션이 같은 재고를 읽고 각각 차감 결과를 저장하면 갱신 손실이 생길 수 있다. 원자성과 동시성 제어를 구분해야 한다.

### 격리 수준, 행 잠금, MVCC는 함께 이해해야 한다

MVCC는 읽기와 쓰기가 불필요하게 서로를 막지 않도록 각 트랜잭션에 적절한 행 버전을 보여 주는 기반이다. PostgreSQL의 기본 격리 수준인 `READ COMMITTED`에서는 같은 트랜잭션 안에서도 각 SQL 문장이 시작할 때 커밋된 상태를 기준으로 본다. 더 일관된 스냅샷이 필요하면 `REPEATABLE READ`, 직렬 실행과 같은 결과가 필요하면 `SERIALIZABLE`을 검토할 수 있다.

충돌 가능성이 높은 특정 행을 명시적으로 보호해야 한다면 다음처럼 행 잠금을 사용할 수 있다.

```sql
SELECT stock
FROM product
WHERE id = :productId
FOR UPDATE;
```

이 방식은 같은 행을 변경하려는 다른 트랜잭션을 기다리게 한다. 대신 잠금 대기, 교착 상태, 트랜잭션 길이를 관리해야 한다. 단순 차감이라면 조회와 수정을 나누기보다 조건부 UPDATE가 더 작을 수 있다.

```sql
UPDATE product
SET stock = stock - :quantity
WHERE id = :productId
  AND stock >= :quantity;
```

수정된 행이 `1`이면 성공, `0`이면 재고 부족으로 판단할 수 있다. PostgreSQL은 이 설계를 구현할 수단을 제공하지만 어떤 수단을 고를지는 개발자의 몫이다. 동시성 전략은 이전에 정리한 [동시성 제어 전략](/posts/concurrency-control-strategy/)과 [포인트 결제 동시성 설계](/posts/point-payment-concurrency-design/)에서 더 자세히 다뤘다.

## 4. 결제·포인트·재고에서는 한 건의 오류도 크다

게시물 조회수가 잠시 어긋나는 문제와 결제 금액이나 재고가 어긋나는 문제의 무게는 다르다. 결제, 포인트, 재고, 주문 상태는 한 건만 잘못돼도 환불, 정산, 고객 응대, 재처리 비용으로 이어진다.

포인트가 10,000원인 사용자에게 7,000원 결제 요청 두 개가 동시에 들어왔다고 가정해 보자.

```text
요청 A: 잔액 10,000원 조회 → 차감 가능 판단
요청 B: 잔액 10,000원 조회 → 차감 가능 판단
요청 A: 잔액 3,000원 저장
요청 B: 잔액 3,000원 저장
```

두 요청이 모두 성공했다고 응답했는데 DB에는 3,000원이 남는다. PostgreSQL을 사용했다는 사실만으로 이 문제는 사라지지 않는다. 다음 설계가 함께 필요하다.

- 포인트 차감과 주문 저장을 묶는 트랜잭션 범위
- 잔액 조건을 포함한 원자적 UPDATE 또는 적절한 행 잠금
- 충돌 특성에 맞는 격리 수준
- 교착 상태나 직렬화 실패에 대한 짧고 제한된 재시도
- 네트워크 재요청을 구분하는 멱등성 키와 `UNIQUE`
- 실패 후 재처리와 보상 정책

PostgreSQL의 장점은 이 규칙을 제약조건, 트랜잭션, 잠금, 격리 수준으로 명시할 수 있다는 데 있다. 실제 정합성은 이 도구들을 요구사항에 맞게 조합하고 동시성 테스트로 검증할 때 만들어진다.

## 5. 트래픽과 장애는 PostgreSQL 하나로 해결되지 않는다

처음에는 PostgreSQL을 선택하면 트래픽 증가와 장애 대응도 자연스럽게 해결될 것이라고 생각했다. 하지만 운영 안정성은 데이터베이스 제품 하나보다 전체 구조에서 나온다.

![Spring Boot, Redis, PostgreSQL Primary, Read Replica, 백업과 모니터링이 함께 만드는 운영 구조](/assets/images/2026-07-16-postgresql-data-integrity-jsonb/postgresql-operational-architecture.png)

_안정적인 운영은 예방, 감지, 전환, 복구, 검증이 연결된 구조다. 캐시와 복제본도 각각 새로운 실패 조건을 만들기 때문에 운영 정책이 필요하다._

### Redis 캐시

반복 조회를 캐시에 두면 DB 부하와 응답 시간을 줄일 수 있다. 그러나 Redis는 PostgreSQL의 기능이 아니다. 캐시 무효화, TTL, 원본 DB 장애 시 동작, 캐시 장애 시 우회 정책을 애플리케이션 아키텍처에서 정해야 한다. Redis 자체의 고가용성은 [Redis Sentinel을 이용한 고가용성 설계](/posts/redis-sentinel-high-availability/)에서 따로 정리했다.

### Read Replica

읽기 트래픽을 복제본으로 분산할 수 있다. 다만 비동기 복제에서는 Primary에 방금 쓴 값이 Replica에 아직 반영되지 않은 복제 지연이 생길 수 있다. 주문 직후 주문 상세를 보는 것처럼 read-after-write 일관성이 필요한 조회는 Primary로 보내거나 지연을 감수할 정책이 필요하다.

### 자동 Failover

Primary 장애를 감지해 대체 인스턴스로 전환하면 복구 시간을 줄일 수 있다. 하지만 전환 과정의 짧은 연결 실패, DNS나 엔드포인트 갱신, 진행 중 트랜잭션의 재시도 가능 여부까지 애플리케이션이 고려해야 한다.

### 백업과 Point-in-Time Recovery

복제본은 백업을 대신하지 않는다. 잘못된 DELETE나 논리적 데이터 손상도 복제될 수 있기 때문이다. 정기 백업과 WAL 기반 시점 복구를 준비하고, 복구 파일이 존재하는지만 확인할 것이 아니라 별도 환경에 실제로 복원해 봐야 한다.

### 커넥션 풀과 모니터링

애플리케이션 인스턴스가 늘어날수록 DB 연결 수도 함께 늘어난다. 풀 최대값을 크게 잡는다고 처리량이 무한히 늘지 않는다. DB가 감당할 총 연결 수, 쿼리 대기 시간, 잠금 대기, 복제 지연, 디스크 사용량, 체크포인트와 장기 트랜잭션을 함께 관찰해야 한다.

정리하면 운영 안정성은 다음 순환으로 만들어진다.

> **예방 → 감지 → 전환 → 복구 → 검증**

이 관점은 [고트래픽 백엔드 아키텍처](/posts/high-traffic-backend-architecture/)에서 정리한 “병목을 측정한 뒤 필요한 계층을 확장한다”는 원칙과도 이어진다.

## 6. PostgreSQL을 직접 써 볼 이유: JSONB

PostgreSQL을 MySQL과 비슷하게만 사용하면 차이를 체감하기 어렵다. 새 프로젝트에서는 PostgreSQL의 강점을 실제 요구사항에 연결해 보기로 했다. 첫 대상은 쇼핑몰 상품의 가변 속성이다.

PostgreSQL에는 `json`과 `jsonb` 타입이 있다. 둘 다 유효한 JSON을 저장하지만 저장 방식이 다르다.

- `json`은 입력 텍스트를 그대로 보존한다. 공백, 키 순서, 중복 키도 입력 형태를 유지하며 처리할 때 다시 파싱한다.
- `jsonb`는 입력을 분해된 이진 형식으로 변환해 저장한다. 입력 비용이 조금 더 들고 공백이나 키 순서를 보존하지 않지만, 처리와 검색에 유리하며 인덱스를 지원한다. 중복 키가 들어오면 마지막 값만 남는다.

애플리케이션 데이터로 조회하고 조건 검색할 목적이라면 대체로 JSONB가 더 실용적이다. 반대로 원문 JSON의 공백과 키 순서까지 그대로 보존해야 한다면 `json`이나 별도 원문 저장을 검토해야 한다.

여기서 가장 중요한 점은 JSONB가 관계형 모델을 없애는 기능이 아니라는 것이다.

## 7. 상품 속성은 일반 컬럼과 JSONB로 나눈다

쇼핑몰 상품에는 모든 상품이 공통으로 가지며 정합성과 검색이 중요한 값이 있다.

- 상품 ID
- 상품명
- 가격
- 재고
- 카테고리
- 판매 상태

이 값들은 일반 컬럼으로 두는 편이 낫다. `NOT NULL`, `CHECK`, `FOREIGN KEY`, 인덱스를 명확하게 적용할 수 있고 타입도 고정할 수 있기 때문이다.

반면 카테고리마다 구조가 다른 부가 속성도 있다.

```json
{
  "color": "black",
  "size": ["M", "L", "XL"],
  "material": "cotton"
}
```

노트북이라면 같은 자리에 완전히 다른 키가 들어간다.

```json
{
  "screenSize": 15.6,
  "memory": "16GB",
  "storage": "512GB"
}
```

모든 가능한 속성을 하나의 테이블 컬럼으로 만들면 사용하지 않는 `NULL` 컬럼이 늘고, 새 속성이 생길 때마다 스키마 변경이 필요하다. 카테고리별 속성 테이블을 세밀하게 나누는 방법도 있지만, 속성이 자주 바뀌는 초기 단계에는 조인과 테이블 수가 빠르게 늘 수 있다.

이때 공통 필드는 관계형 컬럼으로, 카테고리별 부가 속성은 JSONB로 나누는 절충안을 사용할 수 있다.

```sql
CREATE TABLE product (
    id          bigint PRIMARY KEY,
    name        text NOT NULL,
    price       numeric(15, 2) NOT NULL CHECK (price >= 0),
    stock       integer NOT NULL CHECK (stock >= 0),
    category_id bigint NOT NULL REFERENCES category(id),
    status      text NOT NULL,
    attributes  jsonb NOT NULL DEFAULT '{}'::jsonb
);
```

![쇼핑몰 상품의 공통 필드는 일반 컬럼으로, 카테고리별 가변 속성은 JSONB로 분리한 구조](/assets/images/2026-07-16-postgresql-data-integrity-jsonb/postgresql-jsonb-product-attributes.png)

_가격·재고·판매 상태처럼 트랜잭션과 제약조건의 중심이 되는 값은 컬럼으로 유지하고, 상품마다 달라지는 설명형 속성만 JSONB로 보완한다._

JSONB에 넣지 말아야 할 값도 분명하다. 색상과 사이즈 조합별로 가격과 재고가 달라지는 SKU라면 하나의 JSONB 문서 안에 넣기보다 별도 `product_variant` 테이블로 분리하는 편이 안전하다. 주문이 참조하고 재고를 차감해야 하는 식별 가능한 비즈니스 개체이기 때문이다.

또 JSONB가 자유롭다는 말은 무검증을 뜻하지 않는다. 카테고리별 허용 키, 값 타입, 필수 속성은 애플리케이션에서 검증하고 필요하면 JSON Schema 검증이나 제한적인 DB `CHECK`를 검토해야 한다. 자주 조회하거나 정합성이 중요한 JSONB 키가 늘어난다면 일반 컬럼으로 승격할 시점인지 다시 판단해야 한다.

## 8. JSONB 검색과 인덱스는 쿼리 모양에 맞춘다

색상이 검정인 상품은 다음처럼 조회할 수 있다.

```sql
SELECT *
FROM product
WHERE attributes ->> 'color' = 'black';
```

`->>`는 JSONB 객체의 값을 텍스트로 꺼낸다. 이 조건을 자주 사용한다면 쿼리의 표현식과 같은 B-tree 표현식 인덱스가 직접적이다.

```sql
CREATE INDEX idx_product_attributes_color
ON product ((attributes ->> 'color'));
```

반면 JSONB 문서가 특정 키와 값을 포함하는지 여러 형태로 검색한다면 포함 연산자 `@>`와 GIN 인덱스를 함께 사용할 수 있다.

```sql
SELECT *
FROM product
WHERE attributes @> '{"color": "black"}'::jsonb;
```

```sql
CREATE INDEX idx_product_attributes_gin
ON product
USING GIN (attributes);
```

여기서 주의할 점이 있다. 전체 `attributes`에 만든 일반 GIN 인덱스가 앞의 `attributes ->> 'color' = 'black'` 조건을 자동으로 빠르게 만드는 것은 아니다. **인덱스는 실제 연산자와 쿼리 형태에 맞춰야 한다.**

GIN도 공짜가 아니다. 인덱스 공간을 사용하고 INSERT·UPDATE 때 유지 비용이 생긴다. JSONB 문서가 자주 바뀌면 쓰기 비용과 테이블 팽창도 관찰해야 한다. 먼저 실제 조회 패턴을 수집하고 `EXPLAIN (ANALYZE, BUFFERS)`로 실행 계획을 비교한 뒤 추가하는 편이 맞다. 인덱스를 추측이 아니라 실행 계획으로 확인하는 방법은 [MySQL 인덱스와 옵티마이저의 실행 계획](/posts/mysql-index-optimizer-explain/)에서 다룬 사고방식과 같다.

## 9. 그렇다면 MySQL은 부족한가

그렇지 않다. 현재 MySQL의 주력 트랜잭션 엔진인 InnoDB도 트랜잭션, MVCC 기반 일관된 읽기, 행 수준 잠금, 여러 격리 수준을 제공한다. `NOT NULL`, `UNIQUE`, `FOREIGN KEY`, 강제 적용되는 `CHECK` 제약조건과 네이티브 JSON 타입도 사용할 수 있다. 관리형 클라우드의 복제, 백업, 장애 전환 생태계도 충분히 성숙했다.

따라서 “정합성이 중요하면 PostgreSQL, 아니면 MySQL”처럼 나누는 것은 부정확하다. MySQL에서도 제약조건과 트랜잭션을 제대로 설계하면 정합성을 지킬 수 있고, PostgreSQL에서도 제약조건을 생략하고 잘못된 동시성 코드를 작성하면 데이터가 깨진다.

MySQL을 유지하는 편이 좋은 상황은 오히려 분명하다.

- 서비스가 일반적인 CRUD 중심이고 현재 기능으로 요구사항을 충분히 만족한다.
- 팀이 MySQL 실행 계획, 복제, 백업, 장애 대응 경험을 갖고 있다.
- 기존 인프라와 운영 도구가 MySQL을 기준으로 안정화돼 있다.
- PostgreSQL 고유 기능을 실제로 사용할 계획이 없다.
- 마이그레이션 위험과 학습 비용이 기대 효과보다 크다.

기술 선택에서 익숙함은 무시해야 할 감정이 아니라 유지보수성과 장애 대응 속도에 직접 영향을 주는 운영 자산이다.

## 10. 요구사항과 팀 경험이 선택 기준이다

![요구사항, 운영 경험, 도입 비용과 학습 목적을 따라 MySQL 유지와 PostgreSQL 도입을 판단하는 흐름](/assets/images/2026-07-16-postgresql-data-integrity-jsonb/mysql-postgresql-decision-flow.png)

_플로차트의 개별 답 하나가 결론을 정하는 것은 아니다. 여러 답을 모아 현재 팀과 서비스에 더 작은 위험을 만드는 쪽을 고르는 판단 보조 도구다._

결제와 재고 기능이 있다는 이유만으로 PostgreSQL을 도입할 필요는 없다. 팀 대부분이 MySQL에 익숙하고 PostgreSQL 운영 경험이 없다면 먼저 MySQL로 요구사항을 만족할 수 있는지 검토하는 편이 안전할 수 있다.

반대로 다음 조건이라면 작은 프로젝트부터 PostgreSQL을 도입할 이유가 충분하다.

- PostgreSQL을 학습하고 운영 경험을 쌓는 것이 프로젝트의 명확한 목표다.
- JSONB, 부분 인덱스, 표현식 인덱스 등 사용할 기능이 구체적이다.
- 신규 프로젝트라 마이그레이션해야 할 기존 데이터가 적다.
- 장애가 나도 영향 범위가 제한적이고 복구 훈련을 해 볼 수 있다.
- 장기적으로 PostgreSQL 운영 역량을 팀 자산으로 만들 계획이 있다.

그래서 새 쇼핑몰 프로젝트의 전체 데이터베이스를 PostgreSQL로 구성해 보기로 했다. 단순히 드라이버만 바꾸는 데 그치지 않고 다음을 직접 확인할 계획이다.

```text
1. 가격과 재고에 CHECK 제약조건을 적용한다.
2. 주문 멱등성 키에 UNIQUE를 적용한다.
3. 상품 공통 필드와 JSONB attributes를 분리한다.
4. JSONB 검색 쿼리별 실행 계획을 비교한다.
5. GIN 인덱스 적용 전후의 읽기·쓰기 비용을 측정한다.
6. 동시 재고 차감 테스트와 백업 복원 훈련을 수행한다.
```

## 11. 오늘의 결론

지금까지는 익숙하다는 이유만으로 MySQL을 선택했다. 이번 학습을 통해 익숙함 자체가 나쁜 기준은 아니지만, 생산성과 운영 안정성에 영향을 주는 여러 기준 중 하나라는 점을 알게 됐다.

PostgreSQL을 사용한다고 데이터 정합성이 자동으로 보장되지는 않는다. 제약조건을 스키마에 선언하고, 함께 성공해야 할 작업을 트랜잭션으로 묶고, 충돌 상황에 맞는 UPDATE·잠금·격리 수준을 고른 뒤 실패와 재시도까지 설계해야 한다.

JSONB도 관계형 모델을 없애는 만능 저장소가 아니다. 가격, 재고, SKU처럼 정합성과 관계가 중요한 값은 일반 컬럼과 별도 테이블에 두고, 상품마다 달라지는 부가 속성을 보완하는 용도로 사용할 때 장점이 선명해진다.

운영 안정성과 확장성 역시 PostgreSQL 하나가 만드는 결과가 아니다. 캐시, 복제, 자동 전환, 백업, 커넥션 관리, 모니터링과 복구 검증이 함께 작동해야 한다.

결국 MySQL과 PostgreSQL의 선택은 제품 서열이 아니라 다음 세 가지의 균형이다.

> **요구사항 + 팀의 운영 역량 + 학습 비용**

새 기술이 무조건 더 나은 선택은 아니다. 그렇다고 익숙함만으로 새로운 선택지를 닫아 두는 것도 좋은 기준은 아니다. 이번 프로젝트에서는 운영 위험이 작은 범위에서 PostgreSQL을 직접 사용해 보며 차이를 확인하려 한다. 첫 실습은 쇼핑몰 상품 데이터를 일반 컬럼과 JSONB로 나누어 저장하고, JSONB 검색과 GIN 인덱스 적용 전후의 실행 계획을 비교하는 것이다.

## References

- [PostgreSQL 공식 문서: Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL 공식 문서: Concurrency Control](https://www.postgresql.org/docs/current/mvcc.html)
- [PostgreSQL 공식 문서: Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [PostgreSQL 공식 문서: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL 공식 문서: JSON Types와 JSONB Indexing](https://www.postgresql.org/docs/current/datatype-json.html)
- [MySQL 8.4 공식 문서: InnoDB Transaction Model](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [MySQL 8.4 공식 문서: CHECK Constraints](https://dev.mysql.com/doc/refman/8.4/en/create-table-check-constraints.html)
- [MySQL 8.4 공식 문서: The JSON Data Type](https://dev.mysql.com/doc/refman/8.4/en/json.html)
- [AWS 공식 문서: Amazon RDS for PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [AWS 공식 문서: Amazon Aurora PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraPostgreSQL.html)
- [Google Cloud 공식 문서: Cloud SQL for PostgreSQL](https://cloud.google.com/sql/docs/postgres)
