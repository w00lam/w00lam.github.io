---
title: "데이터의 안전한 작별: Soft Delete와 유예 기간(Grace Period) 전략"
date: 2026-04-28
categories: [Backend, Database]
tags: [JPA, Hibernate, SoftDelete, GracePeriod, Batch, Scheduled]
---

> "삭제는 끝이 아니라 또 다른 상태로의 전이다. 사용자에게는 실수를 만회할 기회를, 시스템에는 정합성을 유지할 여유를 주어야 한다."

프로젝트를 리팩토링하면서 데이터를 즉시 물리적으로 삭제(Hard Delete)하는 방식 대신, 논리적으로 삭제(Soft Delete)하고 일정 기간 이후 자동으로 영구 삭제하는 전략을 적용했다. 단순히 데이터를 숨기는 것을 넘어, 데이터의 생애주기를 관리하는 관점에서 접근했다.

---

## 1. Soft Delete: 데이터의 흔적 남기기

소프트 딜리트는 데이터를 실제로 삭제하지 않고, 삭제된 상태로 표시만 하는 방식이다.

핵심은 비즈니스 로직에 삭제 조건을 직접 녹여내기보다, ORM 레벨에서 투명하게 처리하는 것이다.

* `@SQLDelete`: 삭제 요청 시 실제 DELETE가 아니라 UPDATE로 전환
* `@Where`: 조회 시 삭제된 데이터를 자동으로 제외

이 방식을 사용하면 서비스 로직에서는 별도의 분기 없이 자연스럽게 동작한다.

장점은 명확하다.

* 실수로 삭제한 데이터 복구 가능
* 데이터 간 참조 무결성 유지
* 변경 이력 추적 가능

---

## 2. 유예 기간(Grace Period): 삭제에도 시간 개념을 도입

단순히 삭제 여부를 boolean으로 관리하는 방식에는 한계가 있다.
삭제 시점을 기록하는 방식이 더 확장성이 높다.

그러므로 `deleted_at` 컬럼을 도입하자!

* `null` → 활성 상태
* 값 존재 → 삭제된 시점

이 구조를 사용하면 다음과 같은 정책이 가능해진다.

* 일정 기간 동안 복구 허용
* 이후 자동으로 영구 삭제

즉, 데이터에 "휴지통" 개념을 도입하는 셈이다.

---

### 엔티티 설계

```java
@Entity
@SQLDelete(sql = "UPDATE schedule SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
@Where(clause = "deleted_at IS NULL")
@Getter
@NoArgsConstructor
public class Schedule extends BaseTimeEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    // null이면 활성, 값이 있으면 삭제 시점
    private LocalDateTime deletedAt;
}
```

---

## 3. 자동 영구 삭제: Cleanup Job

유예 기간이 지난 데이터를 계속 보관하면 저장소 비용과 쿼리 성능에 영향을 줄 수 있다.
따라서 주기적으로 정리하는 작업이 필요하다.

스케줄러를 통해 일정 시간이 지난 데이터만 선별적으로 삭제한다.

---

### 스케줄러 구현

```java
@Component
@RequiredArgsConstructor
public class DataCleanupScheduler {

    private final ScheduleRepository scheduleRepository;

    // 매일 새벽 3시에 실행, 30일 지난 데이터 삭제
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void hardDeleteOldSchedules() {
        LocalDateTime retentionPeriod = LocalDateTime.now().minusDays(30);

        scheduleRepository.deleteByDeletedAtBefore(retentionPeriod);
    }
}
```

이 방식은 다음과 같은 장점을 가진다.

* 실시간 처리 부담 감소
* 배치 기반으로 안정적인 데이터 정리
* 운영 정책 변경 시 유연하게 대응 가능

---

## 4. 실무 적용 시 고려사항

### 1. Unique 제약 조건

소프트 딜리트된 데이터가 여전히 테이블에 존재하기 때문에,
예를 들어 `email` 컬럼에 Unique 제약이 있다면 재사용이 불가능해진다.

해결 방법:

* `(email, deleted_at)` 복합 인덱스 구성
* 또는 활성 데이터만 대상으로 하는 Partial Index (DB 지원 시)

---

### 2. 연관 데이터 처리 전략

부모 엔티티 삭제 시 연관 데이터 처리 정책을 명확히 해야 한다.

* 함께 Soft Delete
* Hard Delete 시점에 일괄 정리
* 또는 별도의 상태 관리

도메인 정책에 따라 결정해야 한다.

---

### 3. 조회 성능

`@Where`는 모든 조회 쿼리에 자동으로 조건이 추가된다.

* 데이터가 많아질수록 성능 영향 가능
* `deleted_at` 컬럼 인덱스 필수

---

## 회고

소프트 딜리트에 시간 개념을 더하면서 데이터의 생애주기를 보다 명확하게 다룰 수 있게 되었다.

단순히 데이터를 삭제하는 것이 아니라,

* 사용자에게는 복구 기회를 제공하고
* 시스템에는 안정적인 정리 메커니즘을 제공하는 구조

를 만들 수 있었다.

설계는 결국 트레이드오프의 문제다.

* 사용자 경험
* 데이터 정합성
* 시스템 성능

이 세 가지 사이에서 균형을 찾는 과정이 중요하다.

앞으로는 삭제 대기 중인 데이터를 사용자가 직접 복구할 수 있는 기능까지 확장해볼 계획이다.

---

## References & Project

* Hibernate Documentation - Soft Delete
* Spring Data JPA - Scheduling
* 자바 ORM 표준 JPA 프로그래밍 (김영한)
