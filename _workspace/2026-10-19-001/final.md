---
title: "정규화 — 테이블을 나눈 뒤 어떤 규칙까지 지켜야 할까?"
date: 2026-10-19
categories: [TIL, Backend, Database, Java]
tags: [Java, Spring Boot, Database, Normalization, PostgreSQL, TIL]
permalink: /posts/database-normalization-rules/
---

이전에 Key를 공부하며 후보키의 유일성과 최소성 그리고 PK·FK·UNIQUE가 보장하는 범위를 정리했다. SQL JOIN에서는 나누어 저장한 데이터를 어떤 조건으로 연결할지 확인했다.

오늘은 그 앞단의 질문인 “데이터를 어떤 테이블에 나누어 저장해야 하는가?”를 학습했다. 10월 16일 SQL·NoSQL 학습에서 같은 영상 정보를 여러 곳에 복사하면 변경 사항을 모두 반영해야 한다는 문제를 다뤘는데 오늘은 이를 함수 종속성과 정규형을 기준으로 더 구체적으로 확인했다.

처음에는 테이블을 분리하고 외래키로 연결하면 필요한 규칙도 모두 보장될 것이라고 생각했다. 질문이 이어지면서 어떤 값이 다른 값을 결정하는지, 무엇을 묶어야 한 행을 식별할 수 있는지, 분해한 테이블을 다시 JOIN했을 때 원래 정보를 복원할 수 있는지, 원래의 업무 규칙도 각 테이블의 제약조건만으로 지킬 수 있는지를 따로 확인해야 한다는 점을 알게 됐다. 본문에서는 맛잇온을 떠올리며 만든 학습용 음식점·영상·유튜버 관계를 따라가 보겠다.

## 지역명을 반복해서 저장하면 세 가지 이상이 생긴다

음식점 테이블에 지역을 함께 저장한다고 하자.

`Restaurant`

| restaurant_id | restaurant_name | region_id | region_name |
| --- | --- | --- | --- |
| R01 | 맛잇온 강남점 | S01 | 강남 |
| R02 | 맛잇온 서초점 | S01 | 강남 |

같은 지역에 속한 음식점이 여러 개라면 `region_name`이 여러 행에 반복된다. 지역명이 바뀌었을 때 한 행만 수정하면 `region_id`가 S01인 행에 서로 다른 지역명이 남는다. 문제는 지역명을 복사했다는 사실 자체보다 하나의 지역이라는 사실을 여러 행에서 따로 관리하게 된 데 있다.

이 구조에서는 세 가지 이상을 확인할 수 있다. 아직 음식점이 없는 지역을 먼저 등록하고 싶어도 음식점 행에 지역 정보를 함께 넣도록 설계되어 있으면 지역만 독립적으로 저장하기 어렵다. 이것이 삽입 이상이다. 여러 음식점 행에 중복된 지역명 중 일부만 수정하면 같은 지역 ID에 서로 다른 이름이 남는 것은 갱신 이상이다. 지역의 마지막 음식점 행을 삭제했을 때 그 지역의 이름과 ID까지 함께 사라질 수 있는 것은 삭제 이상이다.

여기서 외래키 값인 `region_id`가 여러 음식점 행에 반복되는 것과 `region_name`이라는 같은 사실을 여러 행에서 관리하는 것은 구분해야 한다. 외래키의 반복은 여러 음식점이 같은 지역을 참조한다는 관계를 표현한다. 반면 지역명까지 음식점마다 복사하면 지역이라는 사실의 관리 위치가 여러 곳으로 늘어난다. 정규화를 중복되는 값을 전부 없애는 작업으로 이해하면 안 되는 이유다. 보통은 `Region(region_id, region_name)`을 따로 두고 `Restaurant`가 `region_id`를 참조하도록 분해한다.

처음에는 이 갱신 이상을 동시에 실행된 두 요청이 서로의 변경을 덮어쓰는 Lost Update와 비슷하게 생각했다. 둘 다 “수정한 값이 기대와 다르다”는 결과로 보일 수 있지만 원인은 다르다. 갱신 이상은 중복된 사실을 여러 행에서 관리하는 구조 때문에 생긴다. Lost Update는 서로 다른 작업이 같은 값을 읽은 뒤 각자의 결과를 저장하면서 먼저 반영된 변경을 덮어쓰는 동시성 문제다.

따라서 정규화가 동시성 문제까지 자동으로 해결하지는 않는다. 작업을 트랜잭션으로 묶었다는 사실만으로 모든 읽기 후 덮어쓰기 문제가 사라지는 것도 아니다. 어떤 카운터를 안전하게 갱신할지는 뒤의 즐겨찾기 사례에서 다시 확인했다.

## 함수 종속성과 후보키는 표본이 아니라 업무 규칙으로 판단한다

함수 종속성 `X → Y`는 같은 `X` 값이 하나의 `Y` 값을 결정한다는 뜻이다. 현재 데이터 몇 행에서 값이 우연히 겹치지 않는다는 이유만으로 함수 종속성이나 후보키를 확정하면 안 된다. 앞으로도 같은 규칙이 유지되는지 업무 의미를 먼저 물어야 한다.

오늘의 학습용 관계에서는 음식점 하나에 여러 영상이 연결될 수 있고 영상 하나도 여러 음식점과 연결될 수 있다고 가정했다. 영상 하나는 한 유튜버에 속한다. 같은 유튜버가 같은 음식점을 여러 영상에서 다룰 수 있다. 이 규칙에서 확인한 함수 종속성은 다음과 같다.

```text
restaurant_id → restaurant_name
video_id → video_title, youtuber_id
youtuber_id → youtuber_name
```

일반적인 음식점과 영상의 연결 행을 식별하는 후보키는 `(restaurant_id, video_id)`다. 음식점 하나에 영상이 여러 개일 수 있고 영상 하나가 여러 음식점에 연결될 수 있으므로 두 값을 함께 보아야 연결 행을 특정할 수 있다. 후보키의 유일성과 최소성을 업무 규칙으로 판단해야 한다는 점은 [데이터베이스 키 — 후보키의 최소성과 제약조건은 어떻게 연결될까?](https://w00lam.github.io/posts/database-key-minimality-constraints/)에서 정리한 내용과 이어진다.

나는 처음에 `(restaurant_id, youtuber_id)`도 영상까지 결정한다고 생각했다. 음식점과 유튜버가 정해지면 영상도 하나일 것이라고 단순화한 것이다. 하지만 같은 유튜버가 같은 음식점을 여러 영상에서 다룰 수 있다는 조건을 넣으면 다음 반례가 나온다.

| restaurant_id | youtuber_id | video_id |
| --- | --- | --- |
| R01 | Y01 | V101 |
| R01 | Y01 | V103 |

같은 `(R01, Y01)`에 영상이 두 개 있으므로 일반적인 연결 관계에서 다음 종속성은 성립하지 않는다.

```text
(restaurant_id, youtuber_id) → video_id
```

이 반례는 일반적인 음식점-영상 연결의 업무 규칙을 설명하기 위한 것이다. 뒤에서 다룰 BCNF 예제에서는 대표 영상이라는 별도의 유일성 규칙을 가정한다. 두 규칙을 하나의 예제에 섞으면 후보키와 정규형의 판단이 흔들리므로 먼저 관계를 분리해 두었다.

## 테이블을 나눌 때 1NF부터 3NF까지 확인했다

### 여러 카테고리를 한 칸에 넣지 않는 1NF

음식점의 카테고리를 `한식, 국밥, 점심`처럼 하나의 문자열에 모아 저장한다고 하자. 단순히 문자열에 쉼표가 들어갔다는 이유만으로 모든 문자열을 1NF 위반이라고 일반화할 수는 없다. 여기서는 서로 다른 카테고리 여러 개를 독립적으로 조회하고 관계로 관리해야 하는데 한 값처럼 저장한 업무 의미가 문제다.

카테고리를 독립적인 대상으로 다루려면 다음처럼 음식점과 카테고리와 연결 테이블로 나눌 수 있다.

```text
Restaurant(restaurant_id PK, restaurant_name)
Category(category_id PK, category_name)
RestaurantCategory(
    restaurant_id FK,
    category_id FK,
    PK(restaurant_id, category_id)
)
```

`RestaurantCategory`의 한 행은 음식점 하나와 카테고리 하나의 관계를 표현한다. `(restaurant_id, category_id)`를 복합 PK로 두면 같은 음식점과 카테고리의 연결을 중복해서 저장하지 않는다. 외래키는 참조 대상의 존재를 확인하고 복합 PK는 같은 연결의 중복을 막는다는 구분은 앞서 공부한 Key와도 연결된다.

### 복합 후보키 일부에만 종속하는 2NF

다음은 음식점과 영상의 연결에 음식점 이름과 영상 제목까지 함께 넣은 학습용 테이블이다.

```text
RestaurantVideoDetail(
    restaurant_id,
    video_id,
    restaurant_name,
    video_title
)

후보키: (restaurant_id, video_id)

restaurant_id → restaurant_name
video_id → video_title
```

음식점 이름을 아는 데 영상 ID까지 필요하지 않다. 영상 제목도 음식점 ID와 관계없이 영상 ID로 결정된다. 두 비주요 속성이 복합 후보키 전체가 아니라 그 일부에만 종속한다. 이 부분 함수 종속 문제는 2NF에서 확인한다.

개념 학습에서 나는 이 문제를 처음에 1NF 위반이라고 답했다. 한 칸에 여러 값을 저장하는 문제는 1NF에서 확인하지만 복합 후보키 일부에만 비주요 속성이 종속하는 문제는 2NF에서 확인한다. 기본키 하나만 바라보지 말고 후보키를 기준으로 판단해야 한다.

따라서 정보를 다음처럼 옮긴다.

```text
Restaurant(restaurant_id PK, restaurant_name)
Video(video_id PK, video_title)
RestaurantVideo(
    restaurant_id FK,
    video_id FK,
    PK(restaurant_id, video_id)
)
```

`Restaurant`는 음식점 ID로 음식점 이름을 관리하고 `Video`는 영상 ID로 영상 제목을 관리한다. `RestaurantVideo`에는 둘 사이의 연결만 남긴다. 테이블을 하나 더 만드는 데서 끝나는 것이 아니라 어떤 사실을 어느 테이블에서 관리할지 정하는 과정이다.

### 다른 비주요 속성을 거쳐 결정되는 3NF

이번에는 영상 테이블에 유튜버 이름까지 넣었다고 하자.

```text
Video(video_id, video_title, youtuber_id, youtuber_name)

video_id → youtuber_id
youtuber_id → youtuber_name
```

영상 ID가 유튜버 ID를 결정하고 유튜버 ID가 유튜버 이름을 결정한다. 영상마다 유튜버 이름을 저장하면 이름이 바뀔 때 여러 영상 행을 수정해야 한다. 유튜버라는 사실을 영상 테이블에 반복해서 넣은 구조다.

분해 결과에서 각 ID의 역할을 명확하게 표시하면 다음과 같다.

```text
YouTuber(youtuber_id PK, youtuber_name)
Video(video_id PK, video_title, youtuber_id FK)
```

`YouTuber`는 유튜버 ID와 이름을 관리한다. `Video`는 영상 ID와 제목을 관리하고 `youtuber_id`로 유튜버를 참조한다. 처음에는 “유튜버 테이블을 하나 더 만든다”는 분리 방향만 이해했지만 어떤 컬럼이 PK이고 어떤 컬럼이 FK인지까지 적어야 각 사실의 관리 위치가 드러난다는 점을 보완했다.

지역도 같은 방식으로 `restaurant_id → region_id → region_name`처럼 이어지는 사실을 `Restaurant`와 `Region`에 나누어 둘 수 있다. 한 테이블에 모든 이름을 반복해서 넣는 대신 결정하는 키가 있는 곳에서 한 번 관리한다.

![음식점·영상·유튜버 정보를 함수 종속성에 따라 분해한 구조도](/assets/images/2026-10-19-database-normalization/normalization-decomposition.svg)

*그림 1. 음식점과 영상의 연결은 연결 테이블에 두고 각 대상의 정보는 해당 대상을 식별하는 키가 있는 테이블에서 관리한다.*

## 3NF를 만족해도 BCNF를 위반할 수 있다

이 부분은 일반적인 `RestaurantVideo` 관계가 아니라 별도의 `RestaurantFeaturedVideo`에서 대표 영상 규칙을 가정한 학습용 예제다. 맛잇온의 확정된 서비스 정책이나 실제 스키마를 설명하는 것이 아니다.

다음 두 규칙을 가정한다.

- 한 영상은 한 유튜버에 속한다.
- 음식점과 유튜버의 조합마다 대표 영상은 하나만 선택한다.

```text
RestaurantFeaturedVideo(
    restaurant_id,
    youtuber_id,
    video_id
)

video_id → youtuber_id
(restaurant_id, youtuber_id) → video_id

후보키:
- (restaurant_id, youtuber_id)
- (restaurant_id, video_id)
```

주요 속성은 기본키로 선택한 컬럼만 뜻하지 않는다. 후보키 중 하나에 포함되는 속성도 주요 속성이다. 이 예제에서는 `restaurant_id`, `youtuber_id`, `video_id`가 각각 적어도 하나의 후보키에 포함된다.

3NF는 비자명 함수 종속 `X → A`에서 `X`가 슈퍼키이거나 `A`가 주요 속성이어야 한다. BCNF는 모든 비자명 함수 종속의 결정자 `X`가 슈퍼키여야 한다. 두 기준의 차이는 결정자가 슈퍼키인지와 종속되는 속성이 주요 속성인지까지 함께 보느냐에 있다.

`video_id → youtuber_id`를 보자. 이 관계에서 `video_id`만으로는 음식점까지 식별할 수 없으므로 전체 행을 식별하는 슈퍼키가 아니다. 하지만 `youtuber_id`는 후보키 `(restaurant_id, youtuber_id)`에 포함되는 주요 속성이다. 따라서 이 예제는 3NF를 만족하면서 BCNF를 위반한다.

처음에는 이행 종속처럼 보인다는 이유로 3NF와 BCNF를 모두 위반한다고 답했다. 하지만 정규형은 용어 하나로 판정하는 것이 아니었다. 후보키를 먼저 적고 주요 속성을 확인하자 `video_id → youtuber_id`의 종속 속성이 주요 속성이라는 점이 보였다. 그 근거로 3NF는 만족하지만 결정자 `video_id`가 슈퍼키가 아니므로 BCNF는 위반한다고 답을 고쳤다. 이 구분을 처음부터 능숙하게 설명한 것은 아니며 후보키와 주요 속성을 근거로 답하는 연습이 더 필요하다고 느꼈다.

## 데이터를 복원하는 일과 규칙을 보존하는 일은 다르다

앞의 대표 영상 예제를 다음처럼 분해해 보았다.

```text
Video(video_id PK, youtuber_id)

RestaurantFeaturedVideo(
    restaurant_id,
    video_id FK,
    PK(restaurant_id, video_id)
)
```

이때 확인할 질문은 두 가지다. 분해한 뒤 원래 정보를 정확하게 복원할 수 있는가? 원래의 업무 규칙을 분해된 각 테이블만으로 계속 강제할 수 있는가?

### 공통 속성으로 원래 행을 되돌릴 수 있는가

무손실 분해는 원래의 유효한 관계를 분해한 뒤 다시 JOIN했을 때 원래 행을 정확하게 복원하는 성질이다. 분해 과정에서 원래 없던 잘못된 조합이 추가되지 않는다는 의미도 포함한다.

이 예제에서는 두 테이블의 공통 속성인 `video_id`가 분해된 `Video`의 키다. `RestaurantFeaturedVideo.video_id`를 `Video.video_id`와 JOIN하면 연결 행에 해당하는 유튜버 ID를 되찾을 수 있다. 공통 속성이 한쪽 테이블의 키라는 점이 무손실 분해를 판단하는 근거다. 외래키가 선언되어 있다는 사실만으로 무손실이라고 결론 내리지는 않는다.

실제로 조회할 때 JOIN을 작성할 수 있다는 사실과 무손실 분해는 같은 말이 아니다. [SQL JOIN — 테이블을 연결하는 조건과 결과 행 수는 어떻게 결정될까?](https://w00lam.github.io/posts/sql-join-conditions-result-rows/)에서 확인한 것처럼 JOIN은 어떤 컬럼을 비교해 결과 행을 만들지 정하는 연산이다. 무손실 분해는 그 JOIN 결과가 원래 관계를 정확히 보존하는지에 관한 설계 성질이다.

### 분해 후에도 업무 규칙을 검사할 수 있는가

종속성 보존은 분해된 각 테이블에서 검사할 수 있는 함수 종속성들을 통해 원래의 함수 종속성을 지킬 수 있는지에 관한 성질이다. 여기서는 `video_id → youtuber_id`는 `Video`의 구조에서 확인된다. 하지만 다음 규칙은 분해 후 각 테이블의 PK·FK만으로 강제되지 않는다.

```text
(restaurant_id, youtuber_id) → video_id
```

다음과 같은 잘못된 신규 조합을 생각해 보자.

- `Video`에 `V101 → Y01`, `V103 → Y01`이 있다.
- 연결 테이블에 `(R01, V101)`, `(R01, V103)`을 모두 넣는다.
- 각 테이블의 PK와 FK는 만족한다.
- 하지만 JOIN하면 같은 `(R01, Y01)`에 대표 영상이 두 개 생긴다.

이 데이터는 대표 영상이 하나라는 원본 업무 규칙을 만족하던 관계에서 나온 유효한 상태가 아니다. 그런데 분해된 테이블의 개별 PK와 FK만으로는 이 위반을 막지 못한다. 외래키로 참조 대상이 존재하는지 검사하는 것과 음식점·유튜버 조합의 대표 영상이 하나인지 검사하는 것은 다른 규칙이다.

따라서 원래 정보를 JOIN으로 복원할 수 있다는 사실과 원래의 모든 업무 규칙을 개별 테이블에서 강제할 수 있다는 사실을 구분해야 한다. 규칙을 유지하려면 추가적인 제약 설계나 별도 검증이 필요할 수 있다. [UC Berkeley CS 186의 DB Design](https://cs186berkeley.net/notes/note13/)에서 설명하는 무손실 분해와 종속성 보존의 차이를 대표 영상 예제에 대입하면서 이 둘을 처음으로 분리해 보았다.

![대표 영상 관계를 Video와 연결 테이블로 분해했을 때 무손실 복원과 종속성 보존을 구분하는 구조도](/assets/images/2026-10-19-database-normalization/lossless-dependency-preservation.svg)

*그림 2. 원래 데이터를 복원할 수 있다는 사실과 원래의 모든 업무 규칙을 개별 테이블에서 강제할 수 있다는 사실은 다르다.*

## 조회 성능을 보고 반정규화의 갱신 책임까지 판단한다

정규화가 곧 조회 성능 향상을 뜻하지는 않는다. 여러 테이블의 정보를 함께 보여 주려면 JOIN이 필요하고 데이터가 커지면 JOIN 비용을 확인해야 한다. 그렇다고 JOIN이 있다는 이유만으로 바로 반정규화할 필요도 없다.

판단 순서는 실제 조회 조건과 느린 지점을 확인하는 데서 시작한다. 적절한 인덱스를 검토하고 `EXPLAIN ANALYZE`로 실행 계획을 비교할 수 있다. 반복 조회 결과를 별도로 저장하는 캐시가 더 맞는지 Redis를 검토할 수도 있다. JOIN이나 집계가 실제 병목이고 중복 값을 유지하는 비용을 감당할 수 있을 때 반정규화를 선택한다. 오늘 실행 계획을 측정하거나 성능 수치를 얻은 것은 아니므로 특정 방식이 더 빠르다고 결론 내리지는 않았다.

캐시와 반정규화도 같은 방식으로 보면 안 된다. Redis 캐시는 원본과 별도로 저장한 조회 결과이므로 무효화와 만료 정책이 필요하다. 같은 DB에 저장한 반정규화 값은 원본 변경과 같은 트랜잭션에서 함께 갱신하도록 설계할 수 있다. 두 방식 모두 일관성을 고민하지만 갱신 경로와 유지 방법은 다르다.

### 즐겨찾기 수를 저장한다면 카운터 갱신도 함께 설계해야 한다

`Restaurant`에 `favorite_count`를 저장하는 상황을 생각했다. 즐겨찾기 관계를 별도 `Favorite` 테이블에 저장하면서 조회를 빠르게 하려고 음식점에도 개수를 보관하는 반정규화 사례다. 이때는 컬럼 하나를 추가하는 것보다 그 값이 언제 바뀌어야 하는지까지 함께 정해야 한다.

Favorite 저장은 성공했는데 카운터 변경이 실패하면 관계 수와 카운터가 달라진다. 두 작업을 같은 트랜잭션으로 묶어 함께 커밋하거나 함께 롤백해야 한다.

서로 다른 정상 요청이 현재 카운터를 같은 값으로 읽고 각자 1을 더해 저장하면 Lost Update가 생길 수 있다. 애플리케이션에서 값을 읽어 더한 뒤 저장하는 대신 DB가 현재 값을 기준으로 증가시키는 연산을 사용한다.

```sql
UPDATE restaurant
SET favorite_count = favorite_count + 1
WHERE restaurant_id = :restaurantId;
```

이 UPDATE만 실행하면 중복 요청까지 자동으로 구분되는 것은 아니다. 같은 사용자가 같은 음식점을 두 번 즐겨찾기하는 관계 자체를 `Favorite`에서 막아야 한다. `(user_id, restaurant_id)`를 복합 PK로 두거나 `NOT NULL`과 복합 `UNIQUE`를 함께 사용해 중복 관계를 거절할 수 있다. 카운터는 실제로 새 `Favorite` 행이 삽입된 경우에만 증가시켜야 한다.

전체 흐름은 다음처럼 생각했다.

```text
같은 트랜잭션 안에서:
    Favorite 삽입을 시도한다.
    실제로 새 행이 삽입된 경우에만:
        DB에서 favorite_count를 1 증가시킨다.
    함께 커밋한다.
```

처음에는 중복 요청을 막기 위해 낙관적 락을 먼저 제안했다. 하지만 이 사례에서 핵심은 관계의 중복을 막는 제약조건과 삽입 성공 여부에 따른 카운터 증가였다. 원자적 증가 연산과 낙관적 락이 어떤 문제를 각각 다루는지는 [낙관적 락·비관적 락·아토믹 업데이트, 무엇을 선택해야 할까](https://w00lam.github.io/posts/lock-selection-criteria/)에서 정리한 내용과 연결된다.

기존 카운터가 5이고 같은 사용자의 같은 음식점 즐겨찾기 요청이 동시에 두 번 들어온다고 하자. 두 요청 중 하나만 새 `Favorite`를 삽입하고 다른 하나는 복합 PK 또는 `UNIQUE` 제약조건에 걸려야 한다. 새 행이 하나만 생겼으므로 카운터는 6이 된다. 카운터를 7로 만들지 않는 것은 UPDATE 문 하나의 힘이 아니라 중복 관계를 막는 제약조건과 삽입 성공 여부를 함께 확인한 결과다. PostgreSQL의 PK·복합 UNIQUE·FK가 서로 다른 규칙을 보장한다는 내용은 [PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)와도 이어진다.

## 오늘의 정리

정규화는 테이블을 많이 만드는 작업이라기보다 어떤 사실을 어디에서 관리할지 정하는 과정이었다. 지역명과 유튜버 이름처럼 하나의 키가 결정하는 사실은 그 키가 있는 테이블에서 관리하고 음식점과 영상처럼 여러 대상 사이의 관계는 연결 테이블에 둔다. 이때 한 칸에 여러 대상을 넣는 문제는 1NF에서 보고 복합 후보키 일부에만 종속하는 문제는 2NF에서 확인하며 다른 비주요 속성을 거쳐 결정되는 사실은 3NF에서 분리한다.

후보키와 함수 종속성은 현재 데이터의 모양보다 업무 규칙을 기준으로 판단해야 했다. 표본에서 한 번도 겹치지 않은 조합이라고 후보키가 되는 것은 아니며 같은 음식점과 유튜버가 여러 영상을 가질 수 있다는 반례 하나로 잘못된 종속성을 고칠 수 있었다. 대표 영상이라는 별도 가정에서는 후보키와 주요 속성을 확인한 뒤 3NF와 BCNF의 판정이 달라지는 이유도 이해했다.

테이블을 나눈 뒤에는 무손실성과 종속성 보존을 따로 확인해야 했다. 공통 속성이 한쪽 테이블의 키라서 원래 행을 JOIN으로 복원할 수 있어도 원래의 업무 규칙이 각 테이블의 PK·FK만으로 보존되는 것은 아니었다. 마지막으로 반정규화를 선택하면 조회 비용만 줄이는 것이 아니라 중복된 값의 갱신 책임도 함께 가져가야 한다는 점을 즐겨찾기 카운터 사례로 확인했다. [데이터베이스의 안전성과 일관성 — SQL Injection부터 복제 지연까지](https://w00lam.github.io/posts/database-security-consistency-replication/)에서 같은 영상 정보를 여러 곳에 복사할 때 생기는 변경 책임을 살펴봤다면 오늘은 관계형 모델에서 그 문제를 함수 종속성과 테이블 분해로 다시 확인한 셈이다.

### 참고 자료 (Sources)

* **gyoogle/tech-interview-for-developer:** [정규화(Normalization)](https://github.com/gyoogle/tech-interview-for-developer/blob/master/Computer%20Science/Database/%EC%A0%95%EA%B7%9C%ED%99%94%28Normalization%29.md) — 정규화의 목적과 1NF·2NF·3NF의 기본 흐름을 확인
* **Rensselaer Polytechnic Institute:** [Normalization](https://www.cs.rpi.edu/~sibel/csci4380/fall2018/course_notes/normalization.html) — 주요 속성의 의미와 3NF·BCNF의 판별 기준을 확인
* **UC Berkeley CS 186:** [DB Design](https://cs186berkeley.net/notes/note13/) — 무손실 분해와 종속성 보존의 차이 및 BCNF 분해의 성질을 확인
* **PostgreSQL Documentation:** [Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) — PK·복합 UNIQUE·FK가 보장하는 규칙과 연결 테이블의 중복 방지 방법을 확인
* **PostgreSQL Documentation:** [Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html) — 동시 UPDATE와 DB에서 현재 값을 기준으로 증가시키는 연산을 설명할 때 참고



<!-- HUMANIZE-SUMMARY
원본 글자수: 12,841자
윤문본 글자수: 12,841자
변경률: 생성 원고를 작성 단계에서 직접 윤문해 별도 원문 대비 수치화하지 않음
카테고리별 점검: A-1·A-2·A-7·A-8·C-7·C-11·D-1·H-1·I-1·J-2 핵심 패턴 잔존 여부를 자체 점검
자체검증: 6/6 통과
등급: A — S1 패턴을 남기지 않고 반복적인 접속어와 번역투를 줄였으며 블로그 장르와 학습자의 교정 과정을 유지했다.
주요 변경 하이라이트:
- “정규화는 중복되는 값을 전부 없애는 작업”이라는 단순화를 “반복되는 외래키 관계와 여러 곳에서 관리하는 같은 사실”의 차이로 교정
- 일반적인 음식점·영상 관계와 대표 영상의 BCNF 학습용 가정을 분리
- 무손실 분해와 종속성 보존을 JOIN 복원과 업무 규칙 강제라는 두 질문으로 나누어 설명
- 즐겨찾기 카운터에서 복합 제약조건·삽입 성공 여부·DB 증가 연산의 역할을 구분
-->
