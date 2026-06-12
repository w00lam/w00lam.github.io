---
title: "Spring Cache: 캐시 Key 설계부터 동기화, RedisTemplate 동작 원리까지"
date: 2026-06-12
categories: [Backend, Spring, Cache]
tags: [Spring, Redis, Cache, Spring Cache, RedisTemplate, CacheEvict, CachePut, TransactionalEventListener]
permalink: /posts/spring-cache-design-sync-redistemplate/
---

## 들어가면서

Spring 애플리케이션에서 성능 최적화를 이야기할 때 캐시는 빼놓을 수 없는 중요한 요소입니다. 특히 데이터베이스 부하를 줄이고 응답 속도를 향상시키는 데 큰 기여를 하죠. 하지만 단순히 `@Cacheable` 어노테이션을 붙이는 것만으로는 부족합니다. 캐시 키를 어떻게 설계할지, 데이터 변경 시 캐시를 어떻게 동기화할지, 그리고 내부적으로 RedisTemplate이 어떻게 동작하는지 깊이 이해해야만 안정적이고 효율적인 캐시 시스템을 구축할 수 있습니다.

이 글에서는 실제 Spring Boot 프로젝트에서 캐시를 설계하면서 마주쳤던 고민의 흐름을 따라가며, 캐시 Key 설계부터 캐시 동기화 책임, 그리고 RedisTemplate의 동작 원리까지 상세하게 다룹니다. 단순히 개념을 나열하기보다는, 왜 이렇게 설계하는 것이 유지보수성과 책임 분리 관점에서 좋은지 실무적인 관점으로 설명하고자 합니다.

## 로컬 캐시와 원격 캐시

캐시는 크게 **로컬 캐시**와 **원격 캐시**로 나눌 수 있습니다. 각각의 특징을 이해하는 것은 캐시 전략을 수립하는 데 중요합니다.

*   **로컬 캐시**: 애플리케이션 서버 내부에 데이터를 저장합니다. 대표적으로 Caffeine이나 `ConcurrentHashMap`을 활용한 캐시가 있습니다. 같은 JVM 안에서 동작하기 때문에 객체 참조 자체를 저장해도 문제가 없으며, 매우 빠른 접근 속도를 자랑합니다. 하지만 서버 인스턴스마다 독립적으로 캐시를 관리하므로, 여러 서버 인스턴스 간에 데이터 일관성을 유지하기 어렵다는 단점이 있습니다.

*   **원격 캐시**: 애플리케이션 서버와 별도의 캐시 저장소에 데이터를 저장합니다. Redis가 대표적인 원격 캐시 저장소입니다. 여러 서버 인스턴스가 동일한 캐시 데이터를 공유할 수 있어 데이터 일관성 문제를 해결할 수 있습니다. 하지만 네트워크 통신이 필요하므로 로컬 캐시보다는 접근 속도가 느리다는 특징이 있습니다.

이 글에서는 주로 원격 캐시 저장소인 Redis를 중심으로 캐시 설계와 동기화 전략을 다룹니다.

## 캐시 Key 네이밍 전략

캐시 Key는 캐시된 데이터를 식별하는 중요한 요소입니다. 의미를 명확하게 전달하고 충돌을 방지하기 위한 일관된 네이밍 전략이 필요합니다.

*   **콜론(:)으로 계층 구조 표현**: `user:1`, `product:category:electronics`와 같이 콜론을 사용하여 데이터의 계층 구조를 표현하면 가독성이 높아지고 관리하기 용이합니다.
*   **고정 Prefix 사용**: `user:`, `post:`와 같이 고정된 Prefix를 사용하여 Key의 역할을 명확히 구분합니다. 이는 Key 이름만 보고도 어떤 데이터에 대한 캐시인지 쉽게 이해할 수 있게 합니다.
*   **Key 이름만 보고 의미 이해 가능**: `post:123:viewCount`처럼 Key 이름만으로도 어떤 정보가 캐시되어 있는지 파악할 수 있도록 설계합니다.
*   **Key Prefix는 코드 상수로 관리**: 매직 스트링을 피하고, Key Prefix를 코드 내 상수로 관리하여 일관성을 유지하고 오타로 인한 오류를 방지합니다.

```java
public class CacheKey {
    public static final String USER_CACHE_PREFIX = "user:";
    public static final String POST_CACHE_PREFIX = "post:";
    public static final String PRODUCT_CACHE_PREFIX = "product:";
}
```

*   **같은 캐시 그룹(value)을 유지하되, Key Prefix로 데이터 범위 구분**: 예를 들어, `postCache`라는 캐시 그룹 안에서 게시글 ID로 조회하는 경우와 사용자 이름으로 조회하는 경우를 구분하기 위해 `postCache::id:1`과 `postCache::username:kim`처럼 Key Prefix를 활용할 수 있습니다.

## 캐시 Key 충돌 방지

캐시 Key 설계 시 가장 주의해야 할 부분 중 하나는 Key 충돌입니다. 예를 들어, `postId`가 `1`이고 `username`이 `"1"`인 경우가 있을 수 있습니다. 이때 단순히 `postCache::1`과 같이 Key를 사용하면 `postId`가 `1`인 게시글 캐시와 `username`이 `"1"`인 사용자 캐시가 충돌할 수 있습니다.

이를 방지하기 위해 Key에 추가적인 Prefix를 붙여 데이터의 타입을 명확히 구분해야 합니다.

```java
// @Cacheable(value = "postCache", key = "#postId") // 충돌 가능성
@Cacheable(value = "postCache", key = "'id:' + #postId")
public Post getPostById(Long postId) { ... }

// @Cacheable(value = "postCache", key = "#username") // 충돌 가능성
@Cacheable(value = "postCache", key = "'username:' + #username")
public Post getPostByUsername(String username) { ... }
```

위와 같이 `id:`와 `username:`과 같은 Prefix를 붙여주면, 실제 Redis에는 `postCache::id:1`과 `postCache::username:kim`과 같이 저장되어 Key 충돌을 효과적으로 방지할 수 있습니다.

## TTL 설계 기준

TTL(Time To Live)은 캐시 데이터가 유효하게 유지되는 시간을 의미합니다. TTL을 어떻게 설정하느냐에 따라 캐시 효율과 데이터 최신성이 크게 달라집니다.

*   **데이터 변경 주기가 길면 TTL을 길게**: 자주 변경되지 않는 데이터(예: 서비스 약관, 정적 설정 정보)는 TTL을 길게 설정하여 캐시 히트율을 높일 수 있습니다.
*   **조회가 잦고 변경이 적은 데이터일수록 캐싱 효율이 높음**: 이러한 데이터는 캐시의 이점을 극대화할 수 있으므로, 적절한 TTL 설정으로 성능 향상을 기대할 수 있습니다.
*   **TTL이 너무 짧으면 캐시 효율 감소**: 캐시 데이터가 너무 빨리 만료되면 매번 DB에서 데이터를 조회하게 되어 캐시의 의미가 퇴색됩니다.
*   **TTL이 너무 길면 데이터 최신성 저하**: 캐시 데이터가 너무 오래 유지되면 실제 데이터와 불일치가 발생할 수 있습니다. 특히 실시간성이 중요한 데이터의 경우 문제가 될 수 있습니다.

데이터의 특성과 서비스의 요구사항을 고려하여 적절한 TTL을 설정하는 것이 중요합니다. 필요에 따라 캐시 무효화 전략과 함께 TTL을 조절해야 합니다.

## 캐시 동기화 방법

데이터가 변경되었을 때 캐시를 최신 상태로 유지하는 것을 캐시 동기화라고 합니다. Spring Cache에서는 주로 `@CacheEvict`와 `@CachePut` 어노테이션을 사용하여 캐시를 동기화합니다.

*   `@CacheEvict`: 메서드가 성공적으로 실행된 후, 지정된 캐시를 삭제합니다. 다음 조회 시 DB에서 최신 데이터를 다시 읽어와 캐싱하게 됩니다. 주로 데이터 삭제나 변경 시 기존 캐시를 무효화할 때 사용됩니다.
    ```java
    @CacheEvict(value = "postCache", key = "'id:' + #postId")
    public void deletePost(Long postId) { ... }
    ```

*   `@CachePut`: 메서드가 성공적으로 실행된 후, 메서드의 반환 값을 지정된 캐시에 갱신합니다. 주로 데이터 생성이나 업데이트 시 최신 데이터를 캐시에 반영할 때 사용됩니다. `@Cacheable`과 달리 메서드를 항상 실행합니다.
    ```java
    @CachePut(value = "postCache", key = "'id:' + #result.id")
    public Post updatePost(Long postId, PostUpdateRequest request) { ... }
    ```

일반적인 수정/삭제 흐름에서는 `@CacheEvict`가 더 단순하고 안전한 방법으로 간주됩니다. `@CachePut`은 메서드의 반환 값을 캐시에 저장하므로, 반환 값이 캐시할 데이터와 일치해야 합니다. 반면 `@CacheEvict`는 단순히 캐시를 삭제하므로, 다음 조회 시점에 최신 데이터가 다시 캐시됩니다.

## 캐시 동기화 책임은 어디에 둘까?

캐시는 Redis, Caffeine, Spring Cache와 같은 **인프라 관심사**입니다. 따라서 도메인 로직과 캐시 동기화 로직이 섞이는 것은 좋지 않습니다. 순수 도메인 서비스가 `RedisTemplate`을 직접 알게 되면, 도메인 서비스가 비즈니스 규칙뿐만 아니라 캐시 저장소의 구현 방식까지 알게 되어 책임이 섞이게 됩니다. 이는 Redis 장애, 캐시 키 정책 변경, 캐시 전략 변경 등이 도메인 코드에 영향을 주게 만들고 테스트를 복잡하게 만듭니다.

**안 좋은 예시:**

```java
public class ProductDomainService {

    private final RedisTemplate<String, Object> redisTemplate;

    public ProductDomainService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void decreaseStock(Product product, int quantity) {
        product.decreaseStock(quantity);
        // 도메인 서비스가 RedisTemplate을 직접 사용하여 캐시 삭제
        redisTemplate.delete("product:" + product.getId());
    }
}
```

위 예시에서 `ProductDomainService`는 재고 감소라는 도메인 규칙과 Redis 캐시 삭제라는 인프라 관심사가 하나의 클래스에 섞여 있습니다. 결과적으로 도메인 서비스의 순수성이 저해되고, 캐시 기술 변경 시 도메인 코드까지 함께 수정해야 하는 문제가 발생합니다.

**더 나은 구조:**

캐시 동기화 책임은 유스케이스 흐름을 조율하는 **Application Service**나 **Facade**에서 트리거하고, 실제 Redis 조회·삭제·갱신은 **CacheService** 또는 **CacheAdapter**가 담당하는 구조가 좋습니다.

```java
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductCacheService productCacheService;

    @Transactional
    public void updateProduct(Long productId, ProductUpdateRequest request) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new IllegalArgumentException("Product not found"));

        product.update(request.name(), request.price());
        // Application Service에서 캐시 동기화 트리거
        productCacheService.evictProduct(productId);
    }
}

@Component
@RequiredArgsConstructor
public class ProductCacheService {

    private final RedisTemplate<String, Object> redisTemplate;

    public void evictProduct(Long productId) {
        // CacheService가 실제 Redis 캐시 삭제 담당
        redisTemplate.delete("product:" + productId);
    }
}
```

이렇게 분리하면 `Application Service`는 유스케이스 흐름을 담당하고, `ProductCacheService`는 캐시 저장소와 캐시 키 정책을 담당하게 됩니다. 도메인 객체나 도메인 서비스는 Redis의 존재를 몰라도 되기 때문에 비즈니스 로직의 순수성을 유지할 수 있으며, 각 계층의 책임이 명확해져 유지보수성과 테스트 용이성이 향상됩니다.

## 트랜잭션 커밋 이후 캐시 무효화

트랜잭션이 중요한 기능에서는 캐시 삭제 시점도 주의해야 합니다. 트랜잭션 내부에서 캐시를 먼저 삭제했는데 데이터베이스 반영이 롤백되면, 실제 데이터는 변경되지 않았지만 캐시는 삭제되는 **데이터 불일치**가 발생할 수 있습니다. 특히 결제, 주문, 재고처럼 정합성이 중요한 도메인에서는 이러한 불일치가 치명적인 문제를 야기할 수 있습니다.

따라서 이러한 경우에는 트랜잭션 커밋 이후에 캐시를 무효화하는 방식이 더 안전합니다. Spring에서는 `@TransactionalEventListener`를 사용하여 트랜잭션의 특정 단계(예: 커밋 이후)에서 이벤트를 처리할 수 있습니다.

```java
// ProductService 내에서 Product 업데이트 후 이벤트를 발행
@Service
@RequiredArgsConstructor
public class ProductService {
    private final ApplicationEventPublisher eventPublisher;
    // ...

    @Transactional
    public void updateProduct(Long productId, ProductUpdateRequest request) {
        // ... product update logic ...
        eventPublisher.publishEvent(new ProductUpdatedEvent(productId));
    }
}

// ProductUpdatedEvent
public record ProductUpdatedEvent(Long productId) { }

// 캐시 서비스에서 이벤트를 리스닝하여 캐시 무효화
@Component
@RequiredArgsConstructor
public class ProductCacheService {
    private final RedisTemplate<String, Object> redisTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleProductUpdatedEvent(ProductUpdatedEvent event) {
        redisTemplate.delete("product:" + event.productId());
    }
}
```

`@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`를 사용하면, `ProductUpdatedEvent`는 트랜잭션이 성공적으로 커밋된 후에만 `handleProductUpdatedEvent` 메서드를 호출하여 캐시를 무효화합니다. 만약 트랜잭션 도중 롤백이 발생하면 이벤트는 발행되지 않으므로, 캐시와 DB 간의 정합성을 안전하게 유지할 수 있습니다.

## RedisTemplate은 어떻게 Redis 명령을 실행할까?

`RedisTemplate`은 Spring이 제공하는 Redis용 클라이언트로, **Java 코드로 Redis 명령어를 대신 실행해주는 도구**입니다. 많은 개발자들이 `RedisTemplate`의 메서드를 호출하면 내부적으로 Redis 명령어로 컴파일된다고 오해하기도 하지만, 실제로는 그렇지 않습니다.

`RedisTemplate`의 메서드는 내부적으로 정해진 Redis 명령에 매핑되어 있습니다. 예를 들어 `opsForValue().set()`은 Redis의 `SET` 명령에 대응되고, `opsForValue().get()`은 `GET` 명령에 대응됩니다.

이때 Redis는 Java 객체를 그대로 저장할 수 없기 때문에, Spring은 **Serializer**를 통해 Key와 Value를 Redis가 이해할 수 있는 `byte[]` 형태로 변환합니다. 이 과정을 **직렬화(Serialization)**라고 합니다. 이전에 작성했던 [Redis 캐시에 객체를 저장할 때 직렬화가 필요한 이유](/posts/redis-cache-serialization/) 포스트에서 더 자세히 다루었으니 참고하시면 좋습니다.

![RedisTemplate 동작 흐름](/assets/images/2026-06-12-posting/redistemplate-workflow.png)

`RedisTemplate`은 다음 흐름으로 Redis 명령을 실행합니다.

1.  **메서드 호출**: `RedisTemplate`의 `opsForValue().set(`}],path:
", value)`)와 같은 메서드가 호출됩니다.
2.  **직렬화**: Key와 Value로 전달된 Java 객체는 설정된 `RedisSerializer` (예: `StringRedisSerializer`, `Jackson2JsonRedisSerializer`)를 통해 Redis가 이해할 수 있는 `byte[]` 형태로 직렬화됩니다.
3.  **커넥션 획득**: `RedisTemplate`은 `RedisConnectionFactory`를 통해 Redis 서버와의 커넥션(`RedisConnection`)을 얻습니다.
4.  **명령 실행**: 획득한 `RedisConnection`을 통해 직렬화된 Key와 Value, 그리고 매핑된 Redis 명령(예: `SET`)이 Redis 서버로 전송됩니다. 실제 네트워크 통신은 Lettuce나 Jedis와 같은 Redis 클라이언트 라이브러리가 담당합니다.
5.  **결과 역직렬화**: Redis 서버로부터 응답이 오면, `RedisConnection`은 이를 수신하고 `RedisSerializer`를 사용하여 `byte[]` 형태의 응답을 다시 Java 객체로 역직렬화합니다.
6.  **커넥션 반환**: 명령 실행이 끝나면 커넥션은 정리되거나 커넥션 풀로 반환되어 재사용됩니다.

즉, `RedisTemplate`은 개발자가 Java 객체를 다루듯이 Redis를 사용할 수 있도록, 내부적으로 **메서드 호출을 Redis 명령으로 매핑하고, 데이터를 직렬화/역직렬화하며, 커넥션을 관리하여 Redis 서버와 통신하는 역할**을 수행합니다.

## 공부/구현하면서 느낀 점

Spring Cache를 사용하면서 가장 중요하다고 느낀 점은 **캐시를 단순한 성능 최적화 도구가 아닌, 하나의 독립적인 인프라 계층으로 바라보는 시각**입니다. 처음에는 `@Cacheable` 어노테이션만으로 모든 것이 해결될 것이라 생각했지만, 캐시 Key 설계, 동기화 전략, 그리고 트랜잭션과의 연계 등 고려해야 할 부분이 많았습니다.

특히 도메인 로직과 캐시 로직의 분리는 유지보수성 측면에서 매우 중요하다고 생각합니다. 도메인 서비스가 캐시의 존재를 알지 못하게 함으로써 비즈니스 로직의 순수성을 유지하고, 캐시 기술 변경이나 정책 수정이 도메인 코드에 미치는 영향을 최소화할 수 있었습니다. 또한, 정합성이 중요한 상황에서는 트랜잭션 커밋 이후에 캐시를 무효화하는 전략을 통해 데이터 불일치 문제를 방지하는 것이 필수적임을 깨달았습니다.

`RedisTemplate`의 동작 원리를 이해하는 것은 캐시 관련 문제를 디버깅하고 최적화하는 데 큰 도움이 되었습니다. Java 객체가 Redis에 어떻게 저장되고 조회되는지 알게 되면서, 직렬화 예외나 예상치 못한 캐시 동작에 대한 이해도가 높아졌습니다. 이러한 깊이 있는 이해는 단순히 기능을 사용하는 것을 넘어, 시스템 전체의 안정성과 성능을 고려한 설계를 가능하게 합니다.

## 한 줄 정리

> Spring Cache는 단순한 어노테이션을 넘어, **캐시 Key 설계, 책임 분리, 트랜잭션 연계, 그리고 내부 동작 원리에 대한 깊은 이해를 바탕으로 안정적이고 효율적인 시스템을 구축해야 하는 인프라 계층**이다.

## References

*   [Spring Framework Documentation - Caching](https://docs.spring.io/spring-framework/reference/integration/cache.html)
*   [Spring Data Redis Documentation](https://docs.spring.io/spring-data/redis/docs/current/reference/html/#redis)
*   [Redis 캐시에 객체를 저장할 때 직렬화가 필요한 이유](/posts/redis-cache-serialization/)
