---
title: "Binary Search와 Hash Table — 정렬된 범위를 줄이고 키로 버킷을 찾는 과정"
date: 2026-11-19
categories: [TIL, Algorithm, Java]
tags: [Java, Algorithm, Binary Search, Hash Table, TIL]
permalink: /posts/binary-search-hash-table/
---

[Radix Sort와 Counting Sort](/posts/sorting-algorithms-radix-counting/)를 정리하면서 데이터의 값과 위치를 다루는 방법을 살펴봤다. 오늘은 값을 찾는 두 가지 방식을 이어서 공부했다. Binary Search는 정렬된 범위에서 비교할 대상을 줄이고, Hash Table은 키를 해시 함수에 통과시켜 버킷을 찾는다.

둘 다 “빠르게 찾는다”는 설명으로 시작하기 쉽지만, 전제가 다르다. Binary Search는 정렬된 순서와 범위 갱신이 필요하고, Hash Table은 해시 함수와 충돌 처리, 실제 키 비교가 필요하다. 학습 기록에서는 개념과 예제의 흐름을 확인했지만, 두 자료구조의 전체 Java 구현을 보지 않고 독립적으로 작성하고 실행한 단계까지는 도달하지 못했다. 이번 글도 그 범위를 넘어서 숙달했다고 표현하지 않고, 헷갈렸던 지점을 다시 정리하는 데 초점을 맞춘다.

## 1. Binary Search — 정렬된 범위를 절반씩 줄인다

### 1.1 순차 탐색과 이진 탐색의 차이

순차 탐색은 배열의 앞에서부터 원소를 하나씩 비교한다. 원하는 값이 마지막에 있거나 배열에 없으면 모든 원소를 확인해야 한다. 데이터가 `n`개라면 최악의 경우 시간 복잡도는 `O(n)`이다.

이진 탐색은 정렬된 배열의 가운데 원소를 기준으로 탐색 범위를 나눈다. `arr[mid]`가 target보다 작으면 target은 오른쪽에 있을 수 있고, 크면 왼쪽에 있을 수 있다. 한 번의 비교로 절반에 가까운 영역을 다음 탐색에서 제외할 수 있기 때문에 탐색 자체는 `O(log n)`으로 줄어든다.

여기서 정렬 조건은 단순한 전제가 아니다. 예를 들어 정렬되지 않은 `[40, 10, 30, 20, 50]`에서 target `40`을 찾는다고 하자. 가운데 값 `30`이 target보다 작다는 이유만으로 오른쪽을 선택하면 `40`을 포함한 왼쪽 영역을 버리게 된다. 정렬된 배열에서는 값의 크기와 위치가 같은 방향을 가리키지만, 정렬되지 않은 배열에서는 그렇지 않다.

정렬 비용과 탐색 비용도 구분해야 한다. 정렬된 데이터를 한 번만 찾는다면 정렬에 드는 비용이 이진 탐색으로 얻는 이점보다 클 수 있다. 반대로 같은 데이터에서 여러 번 찾는다면 한 번 정렬한 뒤 반복해서 `O(log n)` 탐색을 하는 선택이 의미가 생긴다.

### 1.2 `left`, `right`, `mid`, `target`

오늘은 양 끝을 포함하는 구간 `[left, right]`을 사용했다. 처음에는 배열 전체가 범위이므로 `left = 0`, `right = arr.length - 1`이다. 이때 `mid`는 다음처럼 계산한다.

```java
int mid = left + (right - left) / 2;
```

`(left + right) / 2`라고 써도 작은 배열에서는 같은 결과가 나오지만, 두 인덱스의 합이 정수 범위를 넘을 가능성을 줄이려면 위 식이 안전하다. `left`와 `right`가 현재 탐색 범위를 나타내고, `mid`는 이번 비교 위치, `target`은 찾으려는 값이다.

```java
static int binarySearch(int[] arr, int target) {
    int left = 0;
    int right = arr.length - 1;

    while (left <= right) {
        int mid = left + (right - left) / 2;

        if (arr[mid] == target) {
            return mid;
        } else if (arr[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return -1;
}
```

`arr[mid]`가 target보다 작다면 `mid`와 그 왼쪽은 이미 비교했다. 따라서 `left = mid + 1`로 다음 범위를 시작해야 한다. 반대로 `arr[mid]`가 더 크면 `right = mid - 1`로 갱신한다. `mid`를 다시 포함하면 같은 원소를 반복해서 비교하거나 범위가 줄지 않을 수 있다.

target이 배열에 없을 때도 이 규칙은 그대로 동작한다. 비교할 수 있는 범위가 사라져 `left > right`가 되면 반복문을 종료하고 `-1`을 반환한다. 빈 배열에서는 처음부터 `right = -1`이므로 반복문에 들어가지 않는다.

다음 시각화에서 `[2, 4, 6, 8, 10, 12, 14]`와 target `10`을 단계별로 확인할 수 있다. `mid = 3`에서 `8`을 비교한 뒤 `[4, 6]`만 남기고, `mid = 5`에서 `12`를 비교한 뒤 `[4, 4]`로 줄인다. 마지막에는 인덱스 `4`의 `10`을 찾는다.

{% include interactive/algorithm-visualization.html kind='binary' values='2,4,6,8,10,12,14' %}

*그림 1. Binary Search는 이미 비교한 `mid`와 반대쪽 영역을 제외하면서 탐색 범위를 줄인다.*

### 1.3 시간·공간 복잡도

탐색 범위가 매번 절반 수준으로 줄어들기 때문에 Binary Search의 시간 복잡도는 최선의 경우 `O(1)`, 평균과 최악의 경우 `O(log n)`이다. target이 첫 번째 `mid`에 바로 있으면 최선의 경우가 되고, 계속 범위를 줄인 끝에 찾거나 실패하면 `O(log n)`이 된다.

반복문 구현은 추가 호출 스택을 사용하지 않으므로 공간 복잡도가 `O(1)`이다. 재귀 구현은 호출이 깊어질 때 스택 프레임이 쌓여 `O(log n)`의 공간을 사용한다. 재귀가 코드상 간결해 보일 수 있어도 공간을 적게 사용하는 방식은 아니다.

### 1.4 중복 값과 탐색 경계

중복된 값이 있는 배열에서 일반 Binary Search는 “target을 찾았다”는 사실만 보장할 뿐, 첫 번째나 마지막 위치를 보장하지 않는다. 같은 값이 여러 위치에 있으면 어느 `mid`에서 먼저 발견되는지에 따라 반환 인덱스가 달라질 수 있다.

오늘 연결한 Lower Bound는 목적이 다르다. target 이상인 값이 처음 나타나는 위치를 찾도록, 값을 발견해도 바로 끝내지 않고 경계를 더 왼쪽으로 조정한다. 일반 탐색이 “일치하는 원소가 있는가”를 확인한다면, 경계 탐색은 “조건을 만족하는 첫 위치가 어디인가”를 찾는다. 이름이 비슷해도 종료 조건과 결과의 의미를 구분해야 한다.

Java의 `Arrays.binarySearch()`도 정렬된 배열을 전제로 한다. 중복 값이 있을 때 특정 첫 위치를 반환한다고 기대할 수 없고, 값을 찾지 못했을 때는 삽입 위치를 바탕으로 한 음수 값을 반환한다. 단순히 정렬된 배열에서 값을 찾을 때는 표준 API를 사용할 수 있지만, 첫 등장 위치처럼 경계가 목적이라면 그 요구에 맞는 탐색을 별도로 작성해야 한다.

## 2. Hash Table — 키에서 버킷으로 이동한다

### 2.1 해시 테이블의 기본 흐름

배열에서 특정 데이터를 찾으려면 값이나 키를 앞에서부터 비교해야 할 수 있다. Hash Table은 키를 해시 함수에 넣고, 그 결과를 이용해 저장 위치를 정한다. 기본 흐름은 다음과 같다.

`Key → Hash Function → Hash Value → Bucket Index → Bucket → Entry`

여기서 `Hash Value`와 `Bucket Index`를 항상 같은 것으로 생각하면 안 된다. 해시 함수가 만든 정수 해시값을 그대로 쓰지 않고, 버킷 개수로 나눈 나머지나 별도의 보정 과정을 거쳐 인덱스로 바꿀 수 있기 때문이다. 버킷에는 실제 키와 값이 들어 있는 `Entry`가 저장된다.

조회할 때는 해시값만 계산하고 끝나지 않는다. 먼저 버킷을 찾은 다음, 그 버킷 안의 엔트리를 순회하며 원본 키를 비교할 수 있다. 서로 다른 키가 같은 버킷으로 들어갈 수 있기 때문에 해시값만으로 키의 동일성을 판단해서는 안 된다.

### 2.2 충돌과 동일 키 갱신

서로 다른 키가 같은 버킷 인덱스로 매핑되는 현상을 Hash Collision이라고 한다. 충돌이 생겼다고 해서 기존 데이터가 바로 덮어써지는 것은 아니다. 오늘은 Separate Chaining 방식처럼 하나의 버킷에 여러 엔트리를 연결하고, 실제 키를 비교하는 흐름을 중심으로 확인했다.

다음 두 상황은 겉으로 비슷해 보여도 결과가 다르다.

1. 같은 키로 다시 저장하면 기존 엔트리의 값을 갱신한다.
2. 다른 키가 같은 버킷에 들어오면 별도의 엔트리를 추가한다.

예를 들어 `apple`이 이미 있는 상태에서 `apple → 300`을 저장하면 엔트리 수는 늘지 않고 값 `100`이 `300`으로 바뀐다. 반면 `elppa`가 같은 버킷에 들어오더라도 원본 키가 다르므로 `apple`의 값을 덮어쓰지 않는다. 버킷 인덱스가 같다는 사실과 키가 같다는 사실은 별개의 판단이다.

### 2.3 `equals()`와 `hashCode()`

Java 객체를 키로 사용할 때는 `equals()`와 `hashCode()`의 계약을 함께 봐야 한다.

- `equals()`가 `true`인 두 객체는 같은 `hashCode()`를 반환해야 한다.
- `hashCode()`가 같다고 해서 `equals()`가 `true`인 것은 아니다.

두 번째 관계가 뒤집히지 않는 이유가 바로 충돌이다. 서로 다른 객체가 같은 해시값을 가질 수 있으므로, 해시값이 같은 뒤에도 실제 키 비교가 필요하다. 객체의 주소가 아니라 논리적으로 같은 데이터인지 판단하는 `equals()`와, 버킷을 빠르게 찾기 위한 `hashCode()`를 같은 역할로 보면 안 된다.

### 2.4 문자열 해시와 버킷 인덱스

문자열을 직접 해시할 때는 각 문자를 순서대로 반영할 수 있다. 학습 기록에서 확인한 두 가지 예시는 다음과 같다.

```java
static int additiveHash(String key) {
    int hash = 0;
    for (int i = 0; i < key.length(); i++) {
        hash += key.charAt(i);
    }
    return hash;
}

static int polynomialHash(String key) {
    int hash = 0;
    for (int i = 0; i < key.length(); i++) {
        hash = hash * 31 + key.charAt(i);
    }
    return hash;
}
```

문자 코드의 합만 더하는 방식에서는 순서 정보가 사라진다. `AB`와 `BA`는 둘 다 `65 + 66 = 131`이므로 같은 해시값을 만든다. `A`의 문자 코드가 `65`라는 점도 다시 확인했다. 반면 다항식 방식은 매 반복에서 기존 해시에 `31`을 곱한 뒤 현재 문자를 더하므로 `AB`와 `BA`의 계산 중간값이 달라진다. 반복문이 마지막 문자를 건너뛰는 것이 아니라, 모든 문자를 같은 식으로 처리한다.

문자열 해시가 만든 `int` 값은 오버플로로 음수가 될 수 있다. 이 값을 배열 인덱스로 바로 사용하면 범위를 벗어난다. 버킷 수가 양수라는 전제에서 다음처럼 `Math.floorMod()`로 유효한 인덱스를 계산할 수 있다.

```java
static int bucketIndex(String key, int bucketCount) {
    if (bucketCount <= 0) {
        throw new IllegalArgumentException("버킷 수는 0보다 커야 합니다.");
    }

    int hash = polynomialHash(key);
    return Math.floorMod(hash, bucketCount);
}
```

음수에 `%`를 적용하면 결과도 음수가 될 수 있다. `Math.abs(hash)`로 처리하는 방법도 `Integer.MIN_VALUE`에서는 양수로 바뀌지 않으므로 항상 안전하지 않다. 이 부분은 해시값 계산과 버킷 인덱스 계산을 분리해서 생각해야 하는 이유이기도 하다.

### 2.5 학습용 고정 배열 구현에서 확인한 것

학습 기록의 구현은 일반적인 `HashMap` 전체를 재현한 코드가 아니라, 고정된 배열로 해시 충돌과 문자열 등장 횟수를 확인하는 예제였다. 주요 변수의 의미는 다음과 같다.

```java
static final int HASH_SIZE = 1000;
static final int HASH_LEN = 400;
static final int HASH_VAL = 17;

static int[][] data = new int[HASH_SIZE][HASH_LEN];
static int[] length = new int[HASH_SIZE];
static String[][] s_data = new String[HASH_SIZE][HASH_LEN];
```

`data[bucket][i]`는 해당 버킷 안에서 문자열이 등장한 횟수, `length[bucket]`은 버킷에 저장된 서로 다른 문자열의 개수, `s_data[bucket][i]`는 비교를 위한 원본 문자열을 가리킨다. 이미 존재하는 문자열이 다시 나오면 `data`의 횟수를 늘리고, 처음 보는 문자열이면 `s_data`에 추가한 뒤 `length`를 증가시키는 흐름이다.

고정 배열의 크기도 구현의 조건이다. 하나의 버킷에 서로 다른 문자열이 `401`개 모이면 인덱스 `400`을 사용하려는 순간 `ArrayIndexOutOfBoundsException`이 발생할 수 있다. `HASH_SIZE = 1000`, `HASH_LEN = 400`이라는 숫자만으로 모든 입력을 안전하게 처리한다고 말할 수 없다. Java `int` 오버플로는 예외를 던지지 않고 값이 순환할 수 있다는 점도 함께 확인했다.

다음 시각화는 실제 `String.hashCode()`가 아니라 문자 코드 합계를 5로 나눈 학습용 해시 함수를 사용한다. `apple`과 `elppa`는 문자 구성은 같고 순서만 달라서 이 함수에서는 같은 버킷 `0`으로 들어간다. 실제 해시 함수와 Java `HashMap`의 동작을 그대로 보여 주는 화면은 아니다.

{% include interactive/algorithm-visualization.html kind='hash' values='apple:100|elppa:400|apple:300|apple:get|elppa:get' %}

*그림 2. 같은 버킷에 들어온 다른 키를 연결하고, 동일 키는 기존 값을 갱신한 뒤 다시 조회한다.*

시각화의 단계는 다음 순서다.

1. `apple → 100`을 빈 버킷에 추가한다.
2. `elppa → 400`을 같은 버킷에서 `apple`과 비교한 뒤 별도 엔트리로 연결한다.
3. `apple → 300`을 저장할 때 기존 키를 찾아 값만 갱신한다.
4. `apple`을 조회해 `300`을 반환한다.
5. `elppa`를 조회해 `400`을 반환한다.

화면의 버킷 크기는 충돌 과정을 보기 위한 `5`이고, 문자열의 문자 코드 합계를 `5`로 나눈 나머지를 인덱스로 사용한다. 따라서 이 화면을 Java 문자열 해시의 성능이나 실제 `HashMap`의 내부 배열 크기로 해석하면 안 된다.

### 2.6 시간 복잡도와 `HashMap`의 차이

해시가 버킷에 고르게 분산된다는 가정에서 평균적인 삽입과 조회는 `O(1)`로 설명할 수 있다. 하지만 충돌이 한 버킷에 집중되면 버킷 내부에서 여러 키를 비교해야 하므로 최악의 경우 `O(n)`까지 늘어날 수 있다. 문자열 키라면 해시를 계산하는 비용과 키가 같은지 비교하는 비용도 입력 문자열 길이와 함께 생각해야 한다.

Java `HashMap`은 해시 테이블 기반의 `Map`으로, 키의 순서를 보장하지 않는다. 저장 공간이 부족해지면 용량을 늘리고 다시 분배하는 리사이징을 수행하며, 충돌이 집중되는 경우에는 내부 구조를 바꾸어 탐색 비용을 줄이는 동작도 지원한다. 오늘 확인한 고정 배열 예제와 `HashMap`의 차이는 “해시 테이블”이라는 이름만 같다고 같은 수준의 구현인 것은 아니라는 점이다.

## 3. Binary Search와 Hash Table을 어디에 연결할까

두 방식 모두 조회에 사용되지만, 데이터에 요구하는 조건이 다르다.

| 상황 | 먼저 생각할 방식 | 이유와 주의점 |
| --- | --- | --- |
| 정렬된 배열에서 값의 위치를 찾음 | Binary Search | 순서가 유지되어야 하고 범위 갱신이 정확해야 한다. |
| 정렬 없이 ID로 반복 조회함 | HashMap | 키를 버킷으로 보내 평균 `O(1)` 조회를 기대할 수 있지만 충돌과 메모리를 고려해야 한다. |
| 영속 데이터에서 조건·정렬·범위 조회가 필요함 | 데이터베이스 인덱스와 쿼리 | 애플리케이션 메모리로 전체 데이터를 가져올지, DB가 인덱스와 `WHERE`·`ORDER BY`를 활용할지 나눠 판단한다. |

백엔드에서 데이터베이스의 B-tree 인덱스를 이진 탐색과 완전히 같은 것으로 보면 안 된다. 정렬된 키를 이용한다는 점은 연결되지만, 데이터베이스 인덱스는 디스크·페이지·동시성·쿼리 계획까지 포함하는 별도의 저장 구조다. 애플리케이션에서 전체 행을 가져와 Binary Search를 수행하는 것이 항상 좋은 선택은 아니다.

반대로 요청 처리 중 반복해서 사용하는 작은 조회 데이터라면 `HashMap`이 자연스러운 선택일 수 있다. 예를 들어 사용자 ID와 권한 목록을 요청 범위에서 빠르게 확인할 때는 키 조회가 중요하다. 다만 데이터가 커지거나 여러 프로세스가 공유해야 하거나 영속성이 필요하면 DB나 캐시의 역할을 함께 나눠야 한다. Binary Search와 Hash Table 중 하나가 항상 더 우수한 것이 아니라, 정렬된 순서가 필요한지, 정확한 키 조회가 필요한지, 데이터가 어디에 존재하는지를 먼저 봐야 한다.

## 4. 오늘의 정리

오늘은 Binary Search와 Hash Table을 모두 조회 알고리즘으로만 외우지 않고, 탐색 범위를 줄이는 방식과 키를 버킷으로 보내는 방식을 나눠 보았다.

- Binary Search는 정렬된 데이터에서 `left`, `right`, `mid`로 현재 구간을 관리한다.
- 이미 비교한 `mid`는 `mid + 1` 또는 `mid - 1`로 다음 범위에서 제외한다.
- `left > right`가 되면 target을 찾지 못한 것이므로 `-1`을 반환한다.
- 반복문은 추가 공간 `O(1)`, 재귀 방식은 호출 스택 때문에 `O(log n)`을 사용한다.
- 중복 값이 있을 때 일반 Binary Search는 첫 번째 위치를 보장하지 않으며, Lower Bound는 첫 조건 만족 위치를 찾는 별도의 목적을 가진다.
- Hash Table은 해시값과 버킷 인덱스를 이용하지만, 최종적으로는 원본 키를 비교해야 할 수 있다.
- 충돌한 다른 키는 별도 엔트리로 저장하고, 같은 키를 다시 저장하면 기존 값을 갱신한다.
- `equals()`가 true인 객체는 같은 `hashCode()`를 가져야 하지만, 같은 해시값이 같은 키를 뜻하지는 않는다.
- 해시값이 음수가 될 수 있으므로 버킷 인덱스는 `Math.floorMod(hash, bucketCount)`처럼 계산해야 한다.
- 평균 `O(1)` 조회는 해시가 잘 분산된다는 조건에 기대며, 충돌이 몰리면 최악의 비용이 커질 수 있다.

가장 크게 고친 이해는 두 가지다. Binary Search에서는 `mid`를 다시 포함해야 안전하다고 생각했지만, 이미 비교한 위치를 포함하면 범위가 줄지 않을 수 있었다. Hash Table에서는 해시값이 같으면 같은 키라고 생각했지만, 같은 해시값은 충돌의 시작점일 뿐 실제 키 비교가 남아 있었다.

이번 학습으로 전체 구현을 완벽하게 숙달했다고 말하기는 어렵다. 다음에는 Binary Search 반복문을 직접 작성하면서 누락된 target과 중복 값의 경계를 확인하고, 고정 배열이 아닌 작은 체이닝 예제를 직접 구현해 같은 키 갱신과 다른 키 충돌을 구분해 볼 필요가 있다.

### 관련 글

- [안정 계수 정렬(Stable Counting Sort)의 원리와 역방향 순회](/posts/stable-counting-sort-reverse-traversal/) — 정렬된 데이터가 필요한 Binary Search를 앞선 정렬 학습과 연결하고, 배열의 순서를 보존하는 방법을 다시 확인했다.
- [Merge Sort와 Heap Sort — 정렬된 구간과 최대 힙으로 O(n log n) 만들기](/posts/sorting-algorithms-merge-heap/) — 비교 기반 정렬의 결과를 탐색 전제와 연결해 볼 수 있다.
- [Binary Search Tree와 Hash Search — 탐색 비용은 어떻게 달라질까?](/posts/binary-search-tree-hash-search-cost/) — 순서 기반 탐색과 해시 기반 탐색의 차이를 자료구조 관점에서 이어서 볼 수 있다.

### 참고 자료

- [Gyoogle — Binary Search](https://gyoogle.dev/blog/algorithm/Binary%20Search.html) — 정렬 조건, 탐색 범위 갱신, 중복 값 경계 탐색을 확인했다.
- [Gyoogle — Hash Table](https://gyoogle.dev/blog/algorithm/Hash%20Table.html) — 충돌, 해시 함수, 고정 배열 기반 학습 구현의 흐름을 확인했다.
- [Oracle Java SE 21 — Arrays API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Arrays.html) — `Arrays.binarySearch()`의 표준 API를 확인했다.
- [Oracle Java SE 21 — Object API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html) — `equals()`와 `hashCode()`의 계약을 확인했다.
- [Oracle Java SE 21 — HashMap API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html) — Java `HashMap`의 해시 테이블 구조와 용량 확장 관련 설명을 확인했다.
- [Oracle Java SE 21 — Math API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Math.html) — 음수 해시값에서 `Math.floorMod()`를 사용하는 근거를 확인했다.
