---
title: "단일 Redis 장애에서 Sentinel까지: Primary-Replica와 자동 Failover 이해하기"
date: 2026-07-14
categories: [TIL, Backend, Redis]
tags: [Redis, Redis Sentinel, Primary Replica, High Availability, Failover, Spring Boot, Redisson, Distributed Lock, TIL]
permalink: /posts/redis-sentinel-high-availability/
---

Redis를 캐시나 분산 락에 사용하면서도 그동안은 Redis 프로세스가 정상적으로 동작한다는 전제를 당연하게 생각했다. 장애에 대비하려면 Replica를 두면 된다고 막연히 생각했고, Sentinel은 그 Replica를 관리하는 부가 기능 정도로 이해했다.

이번에 학습하며 생각이 달라졌다. Replica는 데이터를 복제하지만 스스로 장애를 판단해 Primary가 되지는 않는다. Sentinel은 그 빈자리를 채우지만, 비동기 복제의 데이터 유실 가능성까지 없애 주지는 않는다.

> **Redis Sentinel은 장애를 없애는 기술이 아니다. Primary 장애 감지, Replica 승격, 클라이언트의 새 Primary 발견을 자동화해 복구 시간, 즉 MTTR을 줄이는 고가용성 구조다.**

이 글에서는 설정값보다 이 구조가 필요해지는 이유와 Failover 이후에도 남는 한계를 중심으로 정리한다.

## 1. 단일 Redis 구조의 문제: SPOF

현재 프로젝트에서는 Redis를 다음 용도로 사용하고 있다.

- 상품 검색 캐시
- 인기 검색어 캐시
- 타임세일 주문 분산 락
- 쿠폰 발급 분산 락
- 검색 기록 저장

Redis가 한 대뿐이라면 이 노드는 **SPOF(Single Point of Failure), 즉 단일 장애점**이 된다. Redis 프로세스나 서버에 장애가 발생했다고 해서 상품 조회, 주문, 쿠폰 같은 서비스 전체가 반드시 모두 중단되는 것은 아니다. 그러나 Redis에 의존하는 기능은 다음과 같은 영향을 받을 수 있다.

- 캐시 조회 실패로 DB 부하와 응답 시간이 증가한다.
- 인기 검색어와 검색 기록 기능이 실패한다.
- 분산 락을 얻지 못해 타임세일 주문과 쿠폰 발급 요청을 거절한다.
- 장애 처리 정책이 불명확하면 정합성이 필요한 로직이 안전하지 않게 실행될 수 있다.

즉, Redis의 장애 범위는 Redis를 어디에 사용했는지에 따라 달라진다. **중요한 것은 Redis 장애가 서비스 전체 장애인지 아닌지를 단정하는 것이 아니라, Redis 의존 기능별 실패 방식을 미리 정하는 것**이다.

이전에 [Spring Cache의 Key 설계와 동기화 책임](/posts/spring-cache-design-sync-redistemplate/)을 정리했다면, 이번에는 그 캐시 저장소 자체에 장애가 생겼을 때 어떻게 복구 시간을 줄일지로 질문을 확장해 보았다.

![단일 Redis가 SPOF가 되어 Redis 의존 기능에 장애가 전파되는 구조](/assets/images/2026-07-14-redis-sentinel/single-redis-spof.png)

## 2. 데이터를 복제하는 Primary-Replica

단일 Redis에 데이터와 역할이 모두 모이는 문제를 줄이기 위해 먼저 떠올릴 수 있는 구조가 Primary-Replica 복제다.

- **Primary**: 쓰기를 처리하는 주 노드
- **Replica**: Primary의 데이터를 복제하는 보조 노드

예전 문서나 설정에서는 `Master-Slave`라는 표현을 볼 수 있지만, 이 글에서는 현재 권장되는 `Primary-Replica`를 사용한다. 다만 `sentinel monitor <master-name> ...`이나 `SENTINEL get-master-addr-by-name`처럼 Redis의 기존 설정과 명령에는 호환성과 역사적인 이유로 `master`라는 단어가 남아 있다.

일반적인 요청 흐름은 다음과 같다.

```text
쓰기 요청 ──> Primary ──비동기 복제──> Replica 1
                         └──────────> Replica 2
```

Primary가 쓰기를 담당하고 Replica가 데이터를 따라가므로, Primary 장애 시 Replica 중 하나를 새 Primary로 **승격할 후보**로 사용할 수 있다. 또한 최신성 요구가 낮은 읽기를 Replica로 보내 Primary의 읽기 부하를 분산할 수도 있다.

여기까지 보면 Replica만 추가하면 고가용성이 완성된 것처럼 보인다. 하지만 복제는 데이터를 하나 더 보관하는 문제를 해결했을 뿐, **누가 장애를 판단하고 역할을 바꿀 것인가**라는 문제는 해결하지 않았다.

## 3. Replica만으로 자동 복구할 수 없는 이유

Primary-Replica만 구성한 상태에서 Primary가 멈추면 Replica는 자동으로 “이제부터 내가 Primary다”라고 결정하지 않는다. 네트워크가 잠시 느린 것인지, Primary 프로세스가 정말 종료된 것인지, 여러 Replica 중 누구를 승격할 것인지 판단할 주체가 없기 때문이다.

운영자가 직접 처리한다면 다음 작업이 필요하다.

1. Primary 장애를 확인한다.
2. 승격할 Replica를 선택한다.
3. 해당 Replica를 Primary로 승격한다.
4. 나머지 Replica가 새 Primary를 복제하도록 재설정한다.
5. 애플리케이션의 연결 대상을 바꾼다.

Replica가 있다는 사실과 자동 Failover가 가능하다는 사실은 다르다. **Primary-Replica는 복제와 승격 후보를 제공하고, Sentinel은 장애 판단과 역할 전환을 자동화한다.**

## 4. Redis Sentinel이 담당하는 역할

Redis Sentinel의 역할은 크게 네 가지다.

| 역할 | 설명 |
| --- | --- |
| Monitoring | Primary와 Replica가 정상적으로 동작하는지 감시한다. |
| Notification | 감지한 장애 상태를 관리자나 다른 시스템에 알린다. |
| Automatic Failover | Replica 중 하나를 새 Primary로 승격하고 나머지 Replica를 재구성한다. |
| Configuration Provider | Sentinel을 지원하는 클라이언트에 현재 Primary 주소를 제공한다. |

여기서 중요한 점은 **Sentinel이 애플리케이션과 Redis 사이에서 모든 명령을 중계하는 프록시가 아니라는 것**이다. Spring Boot 애플리케이션의 Sentinel 지원 Redis 클라이언트는 Sentinel에 현재 Primary 주소를 묻고, 실제 데이터 명령은 해당 Redis Primary에 직접 보낸다. Failover가 발생하면 클라이언트는 Sentinel이 제공하는 새 주소를 발견해 재연결한다.

```text
1. Spring Boot ──현재 Primary 질의──> Sentinel
2. Sentinel ──Primary 주소 응답────> Spring Boot
3. Spring Boot ──GET/SET 명령──────> Redis Primary
```

기존 Primary의 IP가 새 Primary로 이동하는 것도 아니다. **노드의 역할과 주소 정보가 바뀌고, 클라이언트가 그 변경을 따라가는 구조**다. 따라서 사용하는 Lettuce, Jedis 같은 클라이언트가 Sentinel을 지원하고 재연결을 올바르게 처리하도록 구성되어 있어야 한다.

![Spring Boot가 Sentinel에서 현재 Primary 정보를 얻고 Redis에 직접 연결하는 구조](/assets/images/2026-07-14-redis-sentinel/primary-replica-sentinel.png)

## 5. Sentinel은 어떻게 장애를 판단할까

Sentinel도 한 대만 두면 그 Sentinel 자체가 SPOF가 된다. 한 Sentinel의 일시적인 네트워크 문제만으로 정상 Primary를 장애로 오판할 위험도 있다. 그래서 일반적으로 과반수를 명확히 구성하기 쉬운 홀수 개를 두며, 대표적인 구성이 3대다. Redis 공식 문서도 견고한 배치를 위해 최소 3개의 Sentinel을 서로 독립적으로 장애가 날 수 있는 서버나 VM에 두도록 권장한다.

Sentinel의 장애 판단에는 다음 개념이 등장한다.

- **SDOWN(Subjectively Down)**: Sentinel 한 대가 일정 시간 동안 Primary의 정상 응답을 받지 못해 주관적으로 장애라고 판단한 상태
- **ODOWN(Objectively Down)**: 다른 Sentinel에 의견을 묻고, 설정된 수만큼 장애 판단에 동의해 객관적 장애로 판단한 상태
- **quorum**: ODOWN 판단에 필요한 Sentinel의 동의 수

Sentinel 3대에 `quorum 2`를 설정했다면 두 Sentinel이 Primary를 사용할 수 없다고 판단해야 ODOWN이 될 수 있다.

하지만 **quorum 충족과 실제 Failover 승인은 같은 조건이 아니다.** Quorum은 장애를 ODOWN으로 판단하는 기준이다. 실제 Failover를 시작하려면 Sentinel 중 리더를 선출해야 하고, 이 리더는 Sentinel 전체의 과반수 표를 얻어 권한을 받아야 한다. 3대 구성에서는 일반적으로 두 표가 필요하다.

이 구분은 네트워크가 둘로 나뉜 상황에서 소수 쪽이 독자적으로 새 Primary를 만들어 두 Primary가 동시에 쓰기를 받는 위험을 줄인다.

## 6. Redis Sentinel Failover 전체 흐름

Primary 장애 이후의 흐름을 순서대로 정리하면 다음과 같다.

```text
1. Sentinel이 Primary의 응답 실패를 감지한다.
2. 개별 Sentinel이 SDOWN으로 판단한다.
3. 여러 Sentinel의 동의가 quorum을 충족하면 ODOWN이 된다.
4. Sentinel 사이에서 Failover를 수행할 리더를 선출한다.
5. 선택된 Replica를 새로운 Primary로 승격한다.
6. 나머지 Replica가 새로운 Primary를 복제하도록 재구성한다.
7. 클라이언트가 Sentinel을 통해 새로운 Primary 주소를 발견한다.
8. 애플리케이션이 새로운 Primary에 재연결한다.
```

Replica 선택에는 연결 상태, Primary와의 연결이 끊긴 시간, 복제 진행도, 우선순위 같은 정보가 고려된다. 따라서 단순히 “첫 번째 Replica”가 승격되는 것은 아니다.

또한 이 과정은 순간적으로 끝나지 않는다. 장애로 판단하기까지의 시간, Sentinel 간 합의와 리더 선출, Replica 승격, 클라이언트 재연결이 필요하다. 이 구간에는 Redis 요청이 잠시 실패하거나 지연될 수 있으므로 애플리케이션에는 적절한 timeout, 제한된 재시도, fallback 또는 명확한 실패 응답이 필요하다.

**Sentinel은 무중단을 보장하는 마법이 아니라 수동 복구 절차를 자동화해 MTTR을 줄이는 장치**라고 이해하는 편이 정확하다.

![Primary 장애 감지부터 Replica 승격과 Spring Boot 재접속까지의 Sentinel Failover 흐름](/assets/images/2026-07-14-redis-sentinel/sentinel-failover-flow.png)

## 7. 비동기 복제와 데이터 유실 가능성

Redis의 Primary-Replica 복제는 기본적으로 비동기다. Primary는 모든 Replica의 반영 완료를 기다린 뒤에만 성공을 응답하는 구조가 아니다. 이 때문에 다음과 같은 시간 차가 생길 수 있다.

```text
1. 클라이언트가 Primary에 데이터를 저장한다.
2. Primary가 저장 성공을 응답한다.
3. 해당 변경은 Replica에 아직 도착하지 않았다.
4. Primary 장애가 발생한다.
5. 변경을 받지 못한 Replica가 새 Primary로 승격된다.
6. 성공 응답을 받았던 일부 데이터가 새 Primary에는 없을 수 있다.
```

Sentinel은 가장 적절한 Replica를 골라 역할을 전환할 수 있지만, **Replica에 전달되지 않은 쓰기까지 복원하지는 못한다.** `WAIT` 명령이나 `min-replicas-to-write`, `min-replicas-max-lag` 같은 설정으로 위험 구간을 줄이는 선택지는 있지만, Redis의 비동기 복제를 강한 일관성과 완전한 무손실 복제로 바꾸는 것은 아니다. 가용성과 쓰기 허용 범위 사이의 trade-off도 생긴다.

따라서 Sentinel은 가용성을 높이지만 다음을 보장하지 않는다.

- 장애 직전 승인된 모든 쓰기의 보존
- 강한 데이터 일관성
- Failover 중 완전한 무중단

![비동기 복제가 완료되기 전 Failover가 발생해 일부 데이터가 유실될 수 있는 흐름](/assets/images/2026-07-14-redis-sentinel/async-replication-data-loss.png)

## 8. 캐시와 핵심 원본 데이터는 영향이 다르다

같은 데이터 유실이라도 Redis의 역할에 따라 영향은 크게 달라진다.

| Redis에 둔 데이터 | 유실 영향과 복구 기준 |
| --- | --- |
| 상품 검색 캐시 | MySQL의 원본을 다시 조회해 채울 수 있다. 일시적인 DB 부하 증가가 더 큰 문제일 수 있다. |
| 인기 검색어·랭킹 | 일정 구간의 집계가 부정확해질 수 있다. 재계산 가능 여부와 허용 오차를 정해야 한다. |
| 검색 기록 | Redis만 원본이라면 기록이 사라질 수 있다. 비즈니스 중요도에 따라 영속 저장이 필요하다. |
| 주문·결제·재고 원본 | 유실이 직접적인 비즈니스 장애가 된다. Redis만을 진실의 원천으로 두는 방식은 신중해야 한다. |

현재 프로젝트에서 Redis는 MySQL을 대신하는 원본 데이터베이스가 아니라 캐시와 분산 락을 위한 보조 저장소다. 주문, 결제, 재고 같은 핵심 상태는 RDB를 최종 기준으로 삼는 것이 일반적이다. 이 경계를 지키면 Redis 장애나 캐시 유실이 곧바로 거래 원본 유실로 이어지는 위험을 줄일 수 있다.

## 9. Redisson 분산 락에서도 남는 주의점

이전에 [동시성 제어 전략과 Redis 분산 락](/posts/concurrency-control-strategy/)을 정리했지만, 당시의 락 흐름도 Redis가 정상적으로 동작한다는 전제를 가진다. 현재 프로젝트의 Redisson 기반 정책은 다음과 같다.

- 타임세일 주문 락과 쿠폰 발급 락에 사용
- Wait Time 3초
- Lease Time 5초
- 락 획득 실패 또는 Redis 장애 시 Fail-Closed
- 클라이언트에 503 응답

Fail-Closed는 Redis 상태가 불확실할 때 주문이나 쿠폰 로직을 그대로 진행하지 않는다는 점에서 안전한 방향이다. 그러나 Sentinel을 추가했다고 락의 상호 배제가 모든 장애 상황에서 완전히 보장되는 것은 아니다.

예를 들어 Primary에 락 키가 만들어진 직후, 그 키가 Replica에 복제되기 전에 Primary가 장애를 일으킬 수 있다. 락 키가 없는 Replica가 새 Primary로 승격되면 다른 요청이 같은 락을 새로 획득할 여지가 생긴다. Redis 공식 분산 락 문서도 비동기 복제와 Failover 조합에서 이러한 경쟁 조건이 상호 배제를 위반할 수 있음을 설명한다.

즉, **Sentinel은 락 서버의 복구 시간을 줄이지만 분산 락을 강한 일관성 시스템으로 바꾸지는 않는다.** 현재의 503 정책과 함께 DB의 고유 제약, 조건부 갱신, 멱등성 같은 최종 방어선을 비즈니스 중요도에 맞게 검토해야 한다.

## 10. Replica 읽기와 Replication Lag

Replica를 여러 대 두는 목적은 두 가지로 나눌 수 있다.

1. Primary 장애 시 승격 후보를 확보한다.
2. 읽기 요청 일부를 분산한다.

다만 읽기 부하를 나눌 때는 **Replication Lag**, 즉 Primary의 변경이 Replica에 반영되기까지의 지연을 고려해야 한다.

```text
1. Primary에서 주문 상태를 PENDING에서 PAID로 변경한다.
2. 변경 직후 같은 주문을 Replica에서 조회한다.
3. Replica에는 아직 PENDING이 남아 있을 수 있다.
```

이 문제는 **Read-After-Write Consistency**, 즉 쓰기 직후 자신의 변경 결과를 읽을 수 있어야 하는가와 연결된다.

| 조회 성격 | 권장 대상 | 이유 |
| --- | --- | --- |
| 쓰기 직후 결과 확인 | Primary | 최신 쓰기를 바로 읽어야 한다. |
| 결제·주문·재고 상태 | Primary 우선 | 오래된 상태가 잘못된 비즈니스 판단으로 이어질 수 있다. |
| 약간의 지연을 허용하는 일반 조회 | Replica 가능 | 읽기 부하를 분산할 수 있다. |
| 통계·랭킹·분석성 조회 | Replica 활용 가능 | 최신성 허용 범위를 정할 수 있다면 분산 효과가 있다. |

Replica가 존재한다고 모든 읽기를 무조건 Replica로 보내는 것이 정답은 아니다. **읽기마다 필요한 최신성 수준을 먼저 정의한 뒤 라우팅해야 한다.**

![Primary의 최신 데이터 읽기와 Replication Lag이 있는 Replica 읽기 비교](/assets/images/2026-07-14-redis-sentinel/primary-vs-replica-read.png)

## 11. Sentinel과 Redis Cluster의 차이

Sentinel과 Redis Cluster는 모두 장애 대응과 관련이 있지만 해결 범위가 다르다.

| 구분 | Redis Sentinel | Redis Cluster |
| --- | --- | --- |
| 주목적 | 하나의 Primary-Replica 그룹의 고가용성 | 고가용성과 데이터 분산, 수평 확장 |
| Primary 수 | 한 그룹 기준 1대 | 여러 대 |
| 데이터 배치 | 모든 Replica가 Primary 전체 데이터를 복제 | 키를 해시 슬롯으로 나누어 여러 Primary에 분산 |
| 장애 대응 | Sentinel이 감지하고 Replica를 승격 | Cluster 내부에서 장애를 감지하고 Replica를 승격 |
| 확장 한계 | 단일 Primary의 용량과 쓰기 처리량 한계가 남음 | 여러 Primary로 데이터와 처리량을 분산 가능 |

**Sentinel은 데이터 크기에 따라 키를 여러 노드에 자동 분산하는 샤딩 기술이 아니다.** Primary 하나의 데이터 전체를 Replica가 복제하는 구조이므로, 데이터 용량이나 쓰기 처리량이 단일 Primary의 한계를 넘으면 Redis Cluster 또는 샤딩을 제공하는 관리형 서비스를 검토해야 한다.

반대로 데이터 규모가 작고 당장의 문제는 Primary 장애 후 수동 복구 시간이라면 Cluster가 항상 더 나은 출발점인 것도 아니다. Cluster는 더 많은 노드와 샤딩 제약, 운영 복잡도를 함께 가져오기 때문이다.

![전체 데이터를 복제하는 Redis Sentinel과 해시 슬롯으로 샤딩하는 Redis Cluster 비교](/assets/images/2026-07-14-redis-sentinel/sentinel-vs-cluster.png)

## 12. 현재 프로젝트에 적용한다면

현재 프로젝트 환경은 Spring Boot, Docker Compose, MySQL, Redis로 구성되어 있고 초기 운영은 단일 EC2를 전제로 한다. Redis는 캐시와 분산 락에 사용하며, 아직 데이터 용량과 처리량이 단일 Redis의 한계를 넘지 않는다.

이 조건에서는 기술적으로 가능한 가장 큰 구조보다 현재의 위험과 비용에 맞춘 단계적 선택이 현실적이다.

```text
로컬·개발 환경
└─ 단일 Redis

초기 운영에서 Redis 복구 시간이 중요해지는 시점
└─ Primary-Replica + Sentinel 또는 관리형 Redis 검토

데이터 용량·처리량이 단일 Primary 한계를 넘는 시점
└─ Redis Cluster 또는 샤딩 가능한 관리형 Redis 검토
```

초기 MVP에서는 비용과 운영 복잡도를 고려해 단일 Redis를 유지할 수도 있다. 이때도 Redis 장애 시 캐시 기능은 어떻게 우회할지, 분산 락 요청은 현재 정책처럼 503으로 닫을지, 경보와 복구 목표는 무엇인지 정해 두어야 한다.

가용성 요구가 커졌다면 Primary-Replica와 Sentinel을 검토할 수 있다. 다만 Primary, Replica, Sentinel 3대를 **모두 같은 EC2의 Docker 컨테이너로 실행하면 Redis 프로세스 하나의 장애에는 일부 대응해도 EC2 자체의 장애에는 함께 중단된다.** 이는 서버 수준의 고가용성이 아니다. Docker의 주소·포트 매핑 또한 Sentinel의 자동 발견에 영향을 줄 수 있으므로 실제 네트워크 구성을 검증해야 한다.

진정한 고가용성을 목표로 한다면 Redis 노드와 Sentinel을 독립적으로 장애가 날 수 있는 서로 다른 서버 또는 가용 영역에 분산해야 한다. 직접 운영할 인력과 비용까지 고려하면 AWS ElastiCache 같은 관리형 Redis도 함께 비교할 수 있다. 관리형 서비스 역시 어떤 Failover와 일관성 특성을 제공하는지 확인해야 하며, “관리형”이라는 이유만으로 애플리케이션의 장애 대응 설계가 사라지는 것은 아니다.

현재 프로젝트에 대한 결론은 다음과 같다.

> **지금 바로 Redis Cluster를 도입하기보다 단일 Redis의 장애 정책을 먼저 명확히 하고, 복구 시간 요구가 실제로 커질 때 서로 다른 장애 영역의 Sentinel 구성이나 관리형 Redis로 확장하는 편이 현실적이다.**

![단일 Redis에서 Sentinel과 Redis Cluster로 확장하는 단계별 운영 전략](/assets/images/2026-07-14-redis-sentinel/redis-operation-roadmap.png)

## 13. 핵심 요약

- 단일 Redis는 Redis 의존 기능의 SPOF가 될 수 있다.
- Primary-Replica는 데이터를 복제하고 승격 후보를 제공하지만 자동 Failover를 수행하지 않는다.
- Sentinel은 모니터링, 알림, 자동 Failover, 현재 Primary 정보 제공을 담당한다.
- `quorum`은 ODOWN 판단 기준이며, 실제 Failover에는 리더 선출과 Sentinel 과반수 승인이 필요하다.
- Sentinel은 Redis 트래픽을 중계하는 프록시가 아니다. 클라이언트가 Sentinel로 Primary를 발견한 뒤 Redis에 직접 연결한다.
- 비동기 복제 때문에 Failover 직전 일부 쓰기가 유실될 수 있다.
- Replica 읽기는 Replication Lag으로 오래된 값을 반환할 수 있다.
- Sentinel은 분산 락의 강한 정합성이나 데이터 샤딩을 보장하지 않는다.
- 한 EC2 안의 다중 컨테이너는 EC2 장애까지 견디는 고가용성 구성이 아니다.

## 14. 학습하며 바뀐 생각

처음에는 `Master-Slave`가 `Primary-Replica`라는 이름으로 바뀌었고, Replica를 추가하면 장애 대비가 된다는 정도로 생각했다. Sentinel도 Primary가 죽으면 Replica를 대신 띄워 주는 단순한 도구라고 보았다.

지금은 역할을 세 단계로 나누어 이해하게 됐다.

```text
Primary-Replica: 데이터를 복제하고 승격 후보를 만든다.
Sentinel: 장애를 합의해 판단하고 역할 전환을 자동화한다.
애플리케이션: 변경된 Primary를 발견하고 실패·지연에 대응한다.
```

무엇보다 고가용성은 노드를 여러 개 띄우는 모양만으로 완성되지 않았다. 같은 EC2에 컨테이너를 늘리는 것과 장애 영역을 분리하는 것은 다르고, Failover가 된다는 것과 모든 데이터가 보존된다는 것도 다르다.

**가용성, 일관성, 확장성은 하나의 기능으로 한꺼번에 해결되는 문제가 아니며 각각 어떤 수준이 필요한지 정해야 한다**는 점이 이번 학습에서 가장 크게 바뀐 생각이다.

## 15. 마무리

단일 Redis의 장애 문제는 Replica를 필요하게 만들고, Replica만으로 해결되지 않는 장애 판단과 역할 전환 문제는 Sentinel을 필요하게 만든다. 그러나 Sentinel을 추가한 뒤에도 비동기 복제의 데이터 유실, Replica 읽기의 최신성, Failover 중 짧은 요청 실패, 분산 락의 정합성 위험은 남는다. 데이터 샤딩과 수평 확장도 별도의 문제다.

결국 Redis 고가용성을 설계한다는 것은 “Sentinel을 몇 대 띄울까?”만 정하는 일이 아니다. Redis가 맡은 데이터의 성격, 허용 가능한 복구 시간과 유실 범위, 클라이언트 재연결 방식, 인프라 장애 영역을 함께 정하는 일이다.

> **Redis Sentinel은 장애를 제거하지 않는다. 장애가 발생했을 때 Primary 교체와 서비스 발견을 자동화해 더 빠르게 복구할 수 있도록 돕는다.**

### 함께 읽으면 좋은 글

- [Spring Cache: 캐시 Key 설계부터 동기화, RedisTemplate 동작 원리까지](/posts/spring-cache-design-sync-redistemplate/)
- [동시성 문제를 이해하면서 정리한 생각 — 왜 락이 필요할까](/posts/concurrency-control-strategy/)
- [락과 트랜잭션 경계 분리: 좌석 예약을 구현하며 배운 실무 패턴](/posts/lock-transaction-boundary/)
- [대용량 트래픽 처리는 서버를 늘리는 것부터 시작하지 않는다](/posts/high-traffic-backend-architecture/)

### 참고 자료

- [Redis 공식 문서: High availability with Redis Sentinel](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/)
- [Redis 공식 문서: Redis replication](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/)
- [Redis 공식 문서: Scale with Redis Cluster](https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/)
- [Redis 공식 문서: Distributed Locks with Redis](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)
