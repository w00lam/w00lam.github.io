---
title: "k6로 성능 테스트를 코드로 관리하기"
date: 2026-06-26
categories: [TIL, Testing, Backend]
tags: [k6, Performance Testing, Load Testing, Spring Boot, Backend, Optimization, TIL]
permalink: /posts/k6-performance-testing-code/
---

# k6로 성능 테스트를 코드로 관리하기

## 핵심 요약

이번에 k6를 공부하면서 가장 크게 느낀 점은 **기능 테스트와 성능 테스트는 확인하는 문제가 다르다**는 것이다.

기능 테스트는 API가 의도한 결과를 반환하는지 확인한다.
예를 들어 `/api/products` 요청을 보냈을 때 200 OK가 내려오고 상품 목록이 반환되는지 확인한다.

하지만 실제 서비스에서는 이것만으로 충분하지 않다.

사용자가 한 명일 때는 정상적으로 동작하던 API도, 동시에 많은 사용자가 접근하면 응답 시간이 느려지거나 실패율이 높아질 수 있다. 이때 문제가 되는 지점은 보통 컨트롤러 매핑이나 DTO 필드명이 아니라, DB 조회 성능, 인덱스 부족, N+1, 외부 API 지연, 캐시 미적용, 서버 리소스 부족 같은 운영 환경에 가까운 문제다.

k6는 이런 상황을 테스트하기 위한 부하 테스트 도구다. JavaScript로 테스트 시나리오를 작성하고, 가상 사용자 수, 테스트 시간, 응답 검증, 성능 기준을 코드로 관리할 수 있다.

---

## 문제 인식

Spring Boot에서 API를 구현하면 보통 단위 테스트나 통합 테스트를 작성한다.

예를 들어 상품 목록 조회 API가 있다면 다음과 같은 테스트를 작성할 수 있다.

```java
mockMvc.perform(get("/api/products"))
        .andExpect(status().isOk());
```

이 테스트는 API가 정상적으로 200 OK를 반환하는지, 곧 기능이 올바르게 동작하는지를 검증한다.

하지만 이 테스트만으로는 다음 질문에 답할 수 없다.

```text
동시에 100명이 요청해도 괜찮을까?
응답 시간은 어느 정도까지 유지될까?
요청이 많아지면 실패율이 올라가지 않을까?
상품 데이터가 많아졌을 때 검색 API는 여전히 빠를까?
```

결국 **API가 정상 동작한다는 것과 많은 사용자가 접근해도 안정적으로 동작한다는 것은 다른 문제**다.

처음에는 200 OK가 나오면 어느 정도 안심할 수 있다고 생각했지만 실제 서비스 관점에서는 응답 시간과 실패율도 중요한 품질 기준이라는 것을 알게 되었다.

![기능 테스트와 성능 테스트의 차이](/assets/images/2026-06-26-k6-performance-testing-code/functional_vs_performance_test.png)

---

## k6를 알게 된 배경

k6는 API에 부하를 주고 성능을 측정할 수 있는 도구다.

처음에는 단순히 “요청을 많이 보내는 도구” 정도로 생각했다.
하지만 공부해보니 k6의 핵심은 단순히 많은 요청을 보내는 것이 아니라 **성능 기준을 코드로 표현할 수 있다는 점**에 있었다.

예를 들어 다음과 같은 기준을 코드로 작성할 수 있다.

```text
10명의 가상 사용자가 30초 동안 요청한다.
각 응답은 200이어야 한다.
전체 요청 중 95%는 500ms 미만이어야 한다.
실패율은 1% 미만이어야 한다.
```

이렇게 작성하면 성능 테스트가 일회성 확인이 아니라 반복 가능한 검증 기준이 된다.

---

## 성능 테스트, 부하 테스트, 스트레스 테스트 차이

처음에는 성능 테스트, 부하 테스트, 스트레스 테스트가 비슷하게 느껴졌다.
하지만 목적이 조금씩 다르다.

### 성능 테스트

성능 테스트는 시스템이 얼마나 빠르고 안정적으로 응답하는지 확인하는 넓은 개념이다.

예를 들면 다음과 같은 것을 본다.

```text
응답 시간이 얼마나 걸리는가?
초당 몇 개의 요청을 처리할 수 있는가?
실패율은 어느 정도인가?
```

### 부하 테스트

부하 테스트는 예상되는 트래픽을 넣었을 때 시스템이 정상적으로 버티는지 확인하는 테스트다.

예를 들어 다음과 같은 상황이다.

```text
동시 사용자 100명
30초 동안 상품 목록 조회
p95 응답 시간 500ms 미만
실패율 1% 미만
```

말하자면 “우리 서비스가 예상 트래픽을 감당할 수 있는가?”를 확인한다.

### 스트레스 테스트

스트레스 테스트는 시스템의 한계 지점을 찾기 위한 테스트다.

예를 들어 가상 사용자를 100명, 300명, 500명, 1000명으로 점점 늘리면서 어느 순간부터 응답 시간이 급격히 증가하거나 실패율이 높아지는지 확인한다.

이 테스트의 목적은 단순한 통과가 아니라 다음을 파악하는 것이다.

```text
서버가 어느 지점부터 느려지는가?
DB가 먼저 병목이 되는가?
커넥션 풀이 부족해지는가?
CPU나 메모리가 먼저 한계에 도달하는가?
```

---

## k6의 핵심 개념

k6를 처음 사용할 때 알아야 할 개념은 다음과 같다.

| 개념                | 의미                     |
| ----------------- | ---------------------- |
| VU                | Virtual User, 가상 사용자   |
| duration          | 테스트 실행 시간              |
| check             | 개별 응답이 기대 조건을 만족하는지 확인 |
| threshold         | 전체 테스트 결과의 통과 기준       |
| http_req_duration | HTTP 요청 응답 시간          |
| http_req_failed   | HTTP 요청 실패율            |

![k6로 API 부하 테스트하는 구조](/assets/images/2026-06-26-k6-performance-testing-code/k6_load_test_structure.png)

---

## VU는 요청 수가 아니다

처음 헷갈렸던 부분은 `vus`였다.

```javascript
export const options = {
  vus: 10,
  duration: '30s',
};
```

처음에는 요청을 총 10번 보낸다는 의미로 착각할 수 있다.
하지만 `vus: 10`은 요청 수가 아니라 **가상 사용자 10명**을 의미한다.

이 설정을 풀어 쓰면 다음과 같다.

```text
10명의 가상 사용자가
30초 동안
default function 안의 요청을 반복 실행한다.
```

그러니 실제 요청 수는 서버 응답 속도에 따라 달라진다.

응답이 빠르면 한 VU가 더 많은 요청을 반복할 수 있고, 응답이 느리면 전체 요청 수는 줄어든다. 그래서 k6 결과를 볼 때는 VU 수만 보는 것이 아니라 요청 수, 응답 시간, 실패율, p95, p99 같은 지표를 함께 봐야 한다.

---

## check와 threshold의 차이

`check`와 `threshold`는 둘 다 검증처럼 보이지만 역할이 다르다.

### check

`check`는 각 응답이 기대한 조건을 만족하는지 확인한다.

```javascript
check(res, {
  'status is 200': (r) => r.status === 200,
});
```

이 코드는 방금 받은 응답의 상태 코드가 200인지 확인한다.

`check`는 개별 응답을 검증하는 셈이다.

### threshold

`threshold`는 전체 테스트 결과가 성능 기준을 만족하는지 판단한다.

```javascript
thresholds: {
  http_req_duration: ['p(95)<500'],
  http_req_failed: ['rate<0.01'],
}
```

이 설정은 다음을 의미한다.

```text
전체 요청 중 95%는 500ms 미만이어야 한다.
전체 요청 실패율은 1% 미만이어야 한다.
```

`threshold`는 테스트 전체의 합격 기준이다.

둘을 표로 비교하면 이렇다.

| 구분        | 확인하는 것                |
| --------- | --------------------- |
| check     | 이 응답이 정상인가?           |
| threshold | 전체 테스트가 성능 기준을 만족했는가? |

---

## 가장 단순한 k6 실습 코드

Spring Boot 서버가 `localhost:8080`에서 실행 중이고, 상품 목록 API가 있다고 가정한다.

```javascript
import http from 'k6/http';

export default function () {
  http.get('http://localhost:8080/api/products');
}
```

이 코드는 가장 단순한 k6 스크립트다.

실행은 다음과 같이 할 수 있다.

```bash
k6 run products-test.js
```

이 스크립트는 `/api/products` API에 요청을 보내고, k6가 응답 시간과 요청 수 같은 기본 지표를 측정한다.

---

## 가상 사용자와 테스트 시간 추가하기

이제 부하 테스트에 가깝게 가상 사용자 수와 테스트 시간을 추가한다.

```javascript
import http from 'k6/http';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  http.get('http://localhost:8080/api/products');
}
```

이 코드는 다음처럼 해석할 수 있다.

```text
10명의 가상 사용자가
30초 동안
/api/products API를 반복 호출한다.
```

---

## 응답 상태 코드 검증하기

성능 테스트라고 해서 기능 검증을 완전히 버리는 것은 아니다.
응답이 정상인지 확인하기 위해 `check`를 사용할 수 있다.

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const res = http.get('http://localhost:8080/api/products');

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
```

이제 각 응답의 상태 코드가 200인지 확인할 수 있다.

---

## 응답 시간과 실패율 기준 추가하기

성능 테스트에서 중요한 것은 단순히 성공했는지가 아니라 **얼마나 빠르게 성공했는가**다.

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('http://localhost:8080/api/products');

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
```

여기서 핵심은 `thresholds`다.

```javascript
thresholds: {
  http_req_duration: ['p(95)<500'],
  http_req_failed: ['rate<0.01'],
}
```

의미는 다음과 같다.

```text
전체 요청 중 95%는 500ms 미만이어야 한다.
전체 요청 실패율은 1% 미만이어야 한다.
```

이렇게 하면 성능 테스트의 성공 기준을 코드로 명확하게 남길 수 있다.

---

## 로그인 후 토큰을 사용하는 API 테스트

실제 서비스에서는 인증이 필요한 API도 많다.
이 경우 로그인 API를 먼저 호출하고, 응답으로 받은 accessToken을 Authorization 헤더에 넣어 다음 API를 호출할 수 있다.

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const loginPayload = JSON.stringify({
    email: 'test@example.com',
    password: 'password1234',
  });

  const loginHeaders = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const loginRes = http.post(
    'http://localhost:8080/api/auth/login',
    loginPayload,
    loginHeaders
  );

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'accessToken exists': (r) => !!r.json('accessToken'),
  });

  const accessToken = loginRes.json('accessToken');

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };

  const searchRes = http.get(
    'http://localhost:8080/api/products/search?keyword=keyboard',
    authHeaders
  );

  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
  });
}
```

이 코드는 다음 흐름을 테스트한다.

```text
1. POST /api/auth/login
2. 응답에서 accessToken 추출
3. Authorization 헤더에 Bearer 토큰 추가
4. GET /api/products/search?keyword=keyboard 호출
```

다만 이런 통합 시나리오가 느리게 나왔다면 바로 원인을 단정하면 안 된다.

로그인 API가 느린 것인지, JWT 발급이나 검증이 느린 것인지, 상품 검색 쿼리가 느린 것인지 알 수 없기 때문이다.

그래서 실무에서는 다음처럼 나눠서 테스트하는 것이 좋다.

```text
1. GET /api/products 단독 테스트
2. GET /api/products/search 단독 테스트
3. POST /api/auth/login 단독 테스트
4. 로그인 후 인증 API 호출 시나리오 테스트
```

이렇게 해야 병목이 발생한 위치를 좁히기 쉽다.

---

## 테스트 결과를 어떻게 해석할 수 있을까?

k6 결과에서 가장 먼저 볼 지표는 다음과 같다.

```text
http_req_duration
http_req_failed
checks
iterations
vus
```

`http_req_duration`은 요청 응답 시간이다.
특히 평균만 보는 것보다 `p95`, `p99`를 함께 보는 것이 좋다.

평균 응답 시간이 낮아도 일부 요청이 매우 느릴 수 있기 때문이다.

예를 들어 대부분 요청은 100ms 안에 끝나는데, 일부 요청만 3초가 걸린다면 평균만 봐서는 문제가 작아 보일 수 있다. 하지만 실제 사용자는 그 느린 요청을 경험할 수 있다.

`http_req_failed`는 요청 실패율이다.
응답 시간이 아무리 빨라도 500 에러가 많이 발생한다면 안정적인 API라고 보기 어렵다.

`checks`는 내가 작성한 검증 조건이 얼마나 통과했는지를 보여준다.
예를 들어 상태 코드 200 검증이 많이 실패했다면 API가 정상 응답을 유지하지 못했다는 의미다.

![k6 테스트 결과로 병목을 찾는 흐름](/assets/images/2026-06-26-k6-performance-testing-code/k6_bottleneck_troubleshooting.png)

---

## 응답 시간이 느릴 때 의심할 수 있는 원인

k6 테스트 결과 응답 시간이 느리게 나온다면 다음 지점을 의심할 수 있다.

### 1. DB 쿼리

혼자 요청할 때는 괜찮아 보이던 쿼리도 요청이 많아지면 병목이 될 수 있다.
특히 조회 API는 트래픽이 많아질수록 DB 부하가 커진다.

### 2. 인덱스 부족

검색 조건에 맞는 인덱스가 없다면 데이터가 많아질수록 조회 성능이 급격히 나빠질 수 있다.

예를 들어 상품 검색에서 `keyword`, `category`, `createdAt` 같은 조건을 자주 사용한다면 실제 쿼리와 실행 계획을 확인해야 한다.

### 3. N+1 문제

단건 조회에서는 크게 느껴지지 않던 N+1 문제가 목록 조회에서는 큰 병목이 될 수 있다.
상품 목록을 조회하면서 카테고리, 리뷰, 이미지 같은 연관 데이터를 반복 조회하면 요청 수가 늘어날수록 DB 쿼리도 같이 증가한다.

### 4. 외부 API 지연

결제, 배송, 인증처럼 외부 API를 호출하는 흐름은 외부 서비스 응답 시간에 영향을 받는다.
이 경우 타임아웃, 재시도, 비동기 처리, 보상 처리 전략도 함께 고려해야 한다.

### 5. 캐시 미적용

자주 조회되지만 자주 변경되지 않는 데이터라면 캐시 적용을 검토할 수 있다.
예를 들어 인기 검색어, 카테고리 목록, 인기 상품 목록처럼 반복 조회가 많은 데이터는 캐시를 통해 DB 부하를 줄일 수 있다.

### 6. 서버 리소스 부족

CPU, 메모리, DB 커넥션 풀, 스레드 풀 같은 리소스가 부족해도 응답 시간이 느려질 수   있다.
그래서 k6 결과만 보는 것이 아니라 서버 모니터링 지표도 함께 봐야 한다.

---

## 실제 프로젝트에 적용한다면 어디에 사용할 수 있을까?

내 프로젝트에 적용한다면 먼저 조회 트래픽이 많은 API부터 테스트해볼 수 있을 것 같다.

예를 들면 다음과 같다.

```text
GET /api/products
GET /api/products/search?keyword=...
GET /api/search/popular-keywords
POST /api/auth/login
```

특히 상품 검색 API는 데이터 수와 검색 조건에 따라 성능 차이가 커질 수 있다.
검색 조건이 많아질수록 인덱스를 제대로 타는지 확인해야 하고, 인기 검색어나 상품 목록처럼 반복 조회가 많은 API는 캐시 적용 전후로 성능 차이를 비교해볼 수도 있다.

또한 인증이 필요한 API라면 로그인 후 토큰을 사용한 시나리오도 작성해볼 수 있다.

다만 처음부터 복잡한 사용자 흐름 전체를 테스트하기보다 단일 API를 먼저 테스트하고 이후 통합 시나리오로 확장하는 것이 좋다고 느꼈다.

---

## 오늘 배운 점

오늘 k6를 공부하면서 가장 크게 배운 것은 **API 테스트의 관점이 하나가 아니라는 점**이다.

기능 테스트는 API가 올바른 응답을 반환하는지 확인한다.
하지만 성능 테스트는 많은 요청이 들어와도 응답 시간과 실패율이 기준 안에 들어오는지 확인한다.

즉, “API가 정상 동작한다”와 “API가 트래픽을 버틴다”는 다른 문제다.

k6는 이 차이를 코드로 확인할 수 있게 해준다.

특히 `vus`, `duration`, `check`, `threshold` 개념이 중요했다.

```text
vus는 가상 사용자 수
duration은 테스트 시간
check는 개별 응답 검증
threshold는 전체 테스트의 성능 통과 기준
```

처음에는 k6가 단순히 요청을 많이 보내는 도구라고 생각했지만 실제로는 성능 기준을 코드로 관리하고 반복 검증할 수 있게 해주는 도구에 가깝다고 느꼈다.

---

## 다음에 더 학습할 점

이번에는 가장 기본적인 k6 개념과 단순한 API 테스트를 학습했다.

다음에는 다음 내용을 더 학습해보고 싶다.

```text
1. stages나 scenarios를 사용해서 점진적으로 부하를 증가시키는 방법
2. 테스트 결과를 Grafana와 연결해서 시각화하는 방법
3. CI/CD에서 k6 테스트를 자동 실행하는 방법
4. 캐시 적용 전후의 응답 시간 비교
5. 인덱스 적용 전후의 검색 API 성능 비교
6. 실제 운영과 비슷한 사용자 시나리오 구성
```

성능 테스트는 한 번 실행하고 끝나는 작업이 아니라 기준을 정하고 반복해서 검증하는 과정이라는 점을 기억해야겠다.
