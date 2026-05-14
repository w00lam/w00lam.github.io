---
title: "EntityGraph와 페이징을 같이 사용할 때 주의할 점"
date: 2026-05-08
categories: [Backend, JPA]
tags: [JPA, Hibernate, EntityGraph, Pagination, FetchJoin, N+1]
permalink: /posts/entitygraph-paging/
---

## 들어가면서

처음에는 단순히 이렇게 생각했다.

> “EntityGraph랑 Pageable 같이 쓰면 안 되는 거 아닌가?”

실제로 JPA를 공부하다 보면:

* fetch join + pagination 주의
* 컬렉션 fetch join 페이징 문제
* 메모리 페이징 발생 가능

같은 이야기를 자주 보게 된다.

그래서 처음에는
EntityGraph 자체가 페이징과 충돌한다고 생각했다.

그런데 흐름을 다시 따라가 보니,
문제의 본질은 조금 달랐다.

---

## 결론부터 정리하면

> EntityGraph 자체는 Pageable과 함께 사용할 수 있다

문제는:

> 컬렉션(ToMany)을 fetch 하는 순간 발생한다

즉,

* `ManyToOne`
* `OneToOne`

같은 ToOne 관계는 비교적 안전하다.

반면:

* `OneToMany`
* `ManyToMany`

같은 컬렉션 관계는 조심해야 한다.

---

## 왜 ToOne은 비교적 안전할까

예를 들어:

```text
Order → Member
```

이 관계를 join 하더라도:

* Order 1개
* Member 1개

보통 row 수가 크게 증가하지 않는다.

즉:

```sql
LIMIT 10 OFFSET 0
```

같은 페이징이 비교적 예상대로 동작한다.

---

## 그런데 ToMany는 상황이 달라진다

예를 들어 Todo와 Comment 관계를 보자.

```text
Todo1
 ├─ CommentA
 ├─ CommentB
 └─ CommentC
```

이 상태에서 컬렉션을 fetch join 하면
DB는 다음처럼 row를 만든다.

```text
Todo1 - CommentA
Todo1 - CommentB
Todo1 - CommentC
```

즉,

> 엔티티 1개가 row 여러 개로 늘어난다

---

## 여기서 페이징 문제가 발생한다

중요한 건 DB는:

> 엔티티 기준으로 페이징하지 않는다

DB는:

> “조인된 row 기준”으로 LIMIT/OFFSET을 수행한다

즉 이런 상황이 가능해진다.

---

### 기대

```text
Todo 10개 조회
```

---

### 실제

```text
Todo1 - CommentA
Todo1 - CommentB
Todo1 - CommentC
Todo2 - CommentA
Todo3 - CommentA
...
```

row 수 기준으로 잘려버리기 때문에:

* 실제 Todo 개수는 줄어들고
* 중복 데이터가 포함될 수 있다

![컬렉션 fetch join row 증가](/assets/images/2026-05-08-posting/jpa-fetchjoin-row-increase.png)

---

## DISTINCT로 해결되지 않는 이유

처음에는 이렇게 생각했다.

> “DISTINCT 쓰면 되는 거 아닌가?”

JPQL의 DISTINCT는:

* JPA 엔티티 중복 제거에는 도움을 준다

하지만 이미 DB에서:

```sql
LIMIT / OFFSET
```

으로 잘린 row 자체를 복구할 수는 없다.

즉:

* 중복 제거는 가능
* 잘려나간 데이터 복구는 불가능

---

## 그래서 실무에서는 어떻게 할까

실제로는 관계 종류에 따라 접근을 나누는 경우가 많다.

---

## ToOne 관계

```text
ManyToOne
OneToOne
```

이 경우는:

* fetch join
* EntityGraph

를 비교적 많이 사용한다.

---

## ToMany 관계

```text
OneToMany
ManyToMany
```

이 경우는 조금 더 신중하게 접근한다.

예를 들면:

* DTO 조회
* batch fetch
* count 집계 분리
* 별도 조회 전략

같은 방식들을 고려한다.

![ToOne vs ToMany pagination](/assets/images/2026-05-08-posting/toone-vs-tomany-pagination.png)

---

## 구현하면서 느낀 점

처음에는 단순히:

> “EntityGraph는 페이징이 안 된다”

정도로 이해했었다.

그런데 실제 문제는:

> 컬렉션 fetch join으로 인해 row 수가 증가하는 구조

에 있었다.

즉, 문제의 핵심은:

* EntityGraph 자체가 아니라
* “컬렉션 조인과 페이징의 조합”

이었다.

---

## 마무리

JPA를 공부하면서 느끼는 건
결국 SQL 동작 방식을 이해해야 한다는 점이다.

처음에는 JPA 기능 자체만 보게 되는데,
조금 깊게 들어가면 결국:

* row 수
* join 구조
* pagination 동작 방식

같은 SQL 레벨 개념으로 다시 돌아오게 된다.

그리고 이걸 이해하고 나니까
왜 실무에서 ToMany fetch 전략을 그렇게 조심하는지도 조금씩 보이기 시작했다.

---

## 한 줄 정리

> 페이징 문제의 핵심은 EntityGraph가 아니라, 컬렉션 fetch join으로 인해 row 수가 증가하는 구조에 있다.

---

## References

* [Hibernate ORM Documentation - Fetching](https://docs.hibernate.org/orm/current/userguide/html_single/Hibernate_User_Guide.html#fetching)
* [Spring Data JPA - EntityGraph](https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html#jpa.entity-graph)
* [JPA Pagination and Fetch Join 관련 참고](https://vladmihalcea.com/join-fetch-pagination-spring/)
