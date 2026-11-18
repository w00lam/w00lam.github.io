---
title: "Radix Sort와 Counting Sort — 자릿수와 빈도로 정렬 과정을 다시 보기"
date: 2026-11-18
categories: [TIL, Algorithm, Java]
tags: [Java, Algorithm, Sorting, Radix Sort, Counting Sort, TIL]
permalink: /posts/sorting-algorithms-radix-counting/
---

[Bubble Sort부터 Quick Sort까지](/posts/sorting-algorithms-bubble-selection-insertion-quick/)와 [Merge Sort와 Heap Sort](/posts/sorting-algorithms-merge-heap/)를 공부하면서 비교 기반 정렬이 원소 사이의 대소 관계를 이용한다는 점을 정리했다. 오늘은 비교 대신 숫자의 자릿수와 등장 횟수를 이용하는 Radix Sort와 Counting Sort를 이어서 살펴봤다.

처음에는 Radix Sort의 기준을 소인수와 연결했고, Counting Sort의 누적합과 역순 순회가 왜 필요한지도 바로 설명하지 못했다. 배열의 실제 상태를 단계마다 적어 보면서 두 알고리즘이 각각 무엇을 기준으로 원소의 위치를 정하는지 다시 확인했다. 이번 글의 Java 전체 구현은 학습 기록에서 독립적으로 작성한 결과가 아니라, 학습한 흐름을 정리한 예시다.

## 1. 비교하지 않고 정렬하는 두 가지 방법

비교 기반 정렬은 보통 `arr[i] < arr[j]`처럼 원소 사이의 대소 관계를 확인한다. Counting Sort는 원소를 서로 비교하지 않고 값별 등장 횟수를 센다. Radix Sort는 숫자 전체를 한 번에 비교하지 않고 일의 자리, 십의 자리처럼 자릿수별로 정렬한다.

두 알고리즘은 서로 완전히 별개로 보이지만 구현에서는 연결된다. LSD Radix Sort는 각 자릿수의 정렬에 안정적인 Counting Sort를 사용할 수 있다. 그래서 오늘은 Radix Sort에서 자릿수의 방향과 안정성을 먼저 확인한 다음, 그 안에서 사용한 Counting Sort를 독립적인 알고리즘으로 다시 정리했다.

| 구분 | 정렬 기준 | 핵심 비용 |
| --- | --- | --- |
| 비교 기반 정렬 | 원소 사이의 대소 비교 | 비교 횟수와 교환·이동 |
| Counting Sort | 값별 등장 횟수와 범위 | 원소 수 `n`과 값의 범위 `k` |
| Radix Sort | 자릿수별 값 | 자릿수 `d`, 원소 수 `n`, 기수 `b` |

## 2. Radix Sort — 자릿수별로 정렬한다

### 2.1 LSD 방식의 흐름

Radix Sort는 숫자의 자릿수를 기준으로 정렬하는 비비교 정렬이다. 오늘 학습한 방식은 LSD(Least Significant Digit)다. 가장 낮은 자릿수인 일의 자리부터 높은 자리로 이동한다.

예를 들어 다음 배열을 보자.

`[42, 15, 31]`

일의 자리 값은 `2, 5, 1`이다. 일의 자리 기준으로 정렬하면 다음과 같다.

`[31, 42, 15]`

그 상태에서 십의 자리 값 `3, 4, 1`을 기준으로 다시 정렬한다.

`[15, 31, 42]`

일의 자리에서 바로 전체 숫자의 오름차순을 만든 것이 아니다. 낮은 자릿수에서 만든 순서를 다음 높은 자릿수 정렬의 입력으로 넘긴다. 이 과정을 필요한 마지막 자릿수까지 반복하면 전체 숫자가 정렬된다.

처음에는 Radix Sort가 소인수를 이용한다고 생각했지만, 정렬 기준은 소인수가 아니라 각 자릿수의 값이었다. `exp`가 `1`이면 일의 자리, `10`이면 십의 자리, `100`이면 백의 자리를 가리킨다.

### 2.2 안정 정렬이 필요한 이유

LSD Radix Sort에서 가장 헷갈렸던 부분은 “높은 자릿수가 같지 않은데 왜 이전 순서를 보존해야 할까?”였다. 핵심은 높은 자릿수 정렬에서 같은 값을 가진 원소끼리 비교할 때 이전 단계의 결과를 잃지 않는 것이다.

예를 들어 일의 자리 정렬 결과가 다음과 같다고 하자.

`[21, 31, 11]`

이 배열의 일의 자리 값은 `1, 1, 1`이다. 일의 자리 기준 정렬은 이미 완료된 상태이므로 결과는 그대로 `[21, 31, 11]`이어야 한다. 여기서 숫자 전체를 다시 비교해 `[11, 21, 31]`로 바꾸면 일의 자리 정렬 결과를 보존하지 못한다.

이제 동일한 정렬 키를 가진 원소를 구분해 보자.

| 입력 | 정렬 키 | 식별자 |
| --- | ---: | --- |
| `A` | 2 | 먼저 등장 |
| `B` | 1 | 가운데 등장 |
| `C` | 2 | 나중에 등장 |

키 기준 안정 정렬의 결과는 `B, A, C`다. `A`와 `C`는 키가 같지만 입력에서 `A`가 먼저 나왔다는 상대 순서는 그대로다. LSD Radix Sort에서 높은 자릿수를 처리할 때도 같은 높은 자릿수 안의 원소가 이런 식으로 이전 단계의 순서를 유지해야 한다.

따라서 “Radix Sort는 안정 정렬이다”라고만 외우면 부족하다. LSD에서 각 자릿수를 낮은 자리부터 처리하고, 각 단계의 정렬이 안정적이어야 이미 정리한 낮은 자릿수의 순서가 다음 단계에서 살아남는다.

### 2.3 자릿수별 정렬을 눈으로 확인하기

다음 시각화는 `[21, 12, 11, 22]`의 각 원소에 원래 인덱스를 붙여 보여 준다. 일의 자리에서는 `[21, 11, 12, 22]`가 되고, 십의 자리에서는 `[11, 12, 21, 22]`가 된다. 값만 보면 같은 자릿수의 원래 순서가 보이지 않지만, 원본 인덱스를 함께 보면 안정성이 어떤 결과를 보존하는지 확인할 수 있다.

{% include interactive/sort-visualization.html kind='radix' values='21,12,11,22' %}

*그림 1. LSD Radix Sort는 현재 자릿수와 자릿수별 결과, 각 원소의 원래 인덱스를 함께 보여 준다.*

일의 자리 정렬에서 `21`과 `11`은 둘 다 자릿수 값이 `1`이다. 입력에서 `21`이 먼저 나왔으므로 결과에서도 `21`이 `11`보다 앞선다. 십의 자리 정렬에서는 `12`와 `11`이 모두 십의 자리 값 `1`을 가지므로, 일의 자리 정렬에서 만들어 둔 `11 → 12`의 순서가 유지된다.

### 2.4 Java 구현에서 `exp`가 하는 일

자릿수는 다음 식으로 얻는다.

```java
int digit = (int) ((value / exp) % 10);
```

`372`의 십의 자리를 구할 때 `exp`는 `10`이다.

```java
for (long exp = 1; max / exp > 0; exp *= 10) {
    countingSort(arr, exp);
}
```

`max`가 `372`라면 반복되는 `exp`는 `1`, `10`, `100`이다. 처음에는 `10`, `100`만 세어 세 번의 처리를 두 번이라고 생각했지만, 일의 자리인 `exp = 1`에서 시작한다는 점을 다시 확인했다.

각 자릿수에서 사용하는 Counting Sort는 다음 순서로 동작한다.

1. 현재 자릿수의 빈도를 센다.
2. 빈도를 누적합으로 바꾼다.
3. 입력 배열을 뒤에서부터 순회하며 출력 배열에 배치한다.
4. 출력 배열을 원본 배열에 복사한다.

이 구현에서 `exp`는 자릿수 처리 방향을 결정하고, 입력 배열을 뒤에서부터 읽는 일은 Counting Sort의 안정 배치와 관련된다. 둘을 같은 이유로 설명하면 안 된다.

음수가 없는 정수 배열을 전제로 한 Java 예시는 다음과 같다.

```java
import java.util.Arrays;

public final class RadixSort {
    private RadixSort() {
    }

    public static void sort(int[] arr) {
        if (arr.length < 2) {
            return;
        }

        int max = Arrays.stream(arr).max().orElse(0);
        for (long exp = 1; max / exp > 0; exp *= 10) {
            countingSort(arr, exp);
        }
    }

    private static void countingSort(int[] arr, long exp) {
        int[] count = new int[10];
        int[] output = new int[arr.length];

        for (int value : arr) {
            int digit = (int) ((value / exp) % 10);
            count[digit]++;
        }

        for (int i = 1; i < count.length; i++) {
            count[i] += count[i - 1];
        }

        for (int i = arr.length - 1; i >= 0; i--) {
            int digit = (int) ((arr[i] / exp) % 10);
            output[--count[digit]] = arr[i];
        }

        System.arraycopy(output, 0, arr, 0, arr.length);
    }
}
```

`max / exp > 0`이 반복 조건이므로 `max = 372`에서는 `exp = 1`, `10`, `100`까지만 처리한다. `exp`를 `long`으로 둔 것은 자릿수 증가 과정의 정수형 오버플로 가능성을 줄이기 위해서다. 이 구현은 음수에서 자릿수 결과가 음수가 될 수 있으므로 `count`의 인덱스로 사용할 수 없다. 음수 보정은 뒤의 Counting Sort 절에서 별도로 다룬다.

### 2.5 시간·공간 복잡도와 적용 조건

원소 개수를 `n`, 처리할 자릿수 수를 `d`, 한 자릿수의 값 범위를 `b`라고 하면 LSD Radix Sort의 시간 복잡도는 다음과 같다.

`O(d(n + b))`

각 자릿수마다 원소 `n`개를 순회하고, 계수 배열 `b`개를 처리한다. 10진수에서 `b = 10`으로 고정하면 `O(dn)`으로 단순화할 수 있지만, 자릿수 `d`까지 없애고 무조건 `O(n)`이라고 말하면 조건을 빠뜨리게 된다.

출력 배열 `O(n)`과 계수 배열 `O(b)`가 필요하므로 보조 공간은 `O(n + b)`다. `b`가 10으로 고정된 구현에서는 `O(n)`으로 볼 수 있다.

Radix Sort가 언제나 비교 기반 정렬보다 빠른 것은 아니다. 데이터의 자릿수가 제한되어 있고 원소 수가 충분히 큰 정수 배열에서는 선택지가 될 수 있지만, 자릿수가 길거나 메모리 접근 비용과 구현 오버헤드가 커지면 결과가 달라진다. 음수가 없는 정수 배열을 기준으로 학습했기 때문에, 음수와 문자열을 처리하는 전체 확장 구현은 이번 글에서 다루지 않는다.

## 3. Counting Sort — 빈도에서 출력 위치까지

Radix Sort에서 자릿수별 정렬에 사용한 Counting Sort를 이번에는 독립적인 정렬 알고리즘으로 정리했다. Counting Sort는 원소끼리 비교하는 대신 각 값이 몇 번 등장했는지 기록하고, 그 기록으로 출력 위치를 계산한다.

### 3.1 빈도 배열을 만든다

입력 배열이 다음과 같다고 하자.

`arr = [2, 0, 2, 1, 3, 3]`

값 `0`은 한 번, `1`은 한 번, `2`는 두 번, `3`은 두 번 등장한다. 따라서 빈도 배열은 다음과 같다.

`count = [1, 1, 2, 2]`

`count`의 인덱스는 값이고, 인덱스에 저장된 숫자는 등장 횟수다. Java로는 입력 배열을 한 번 순회하면서 해당 값을 인덱스로 사용하면 된다.

```java
for (int value : arr) {
    count[value]++;
}
```

학습 초반에는 `count.length`만큼 반복하면서 입력 배열과 계수 배열을 비교하는 이중 반복문을 생각했다. 하지만 빈도를 세는 대상은 계수 배열이 아니라 입력 배열의 각 원소다. 그래서 `arr`를 순회하고 `count[arr[i]]++`를 실행하면 된다. 별도의 `if`도 필요하지 않다.

### 3.2 누적합으로 출력 위치를 계산한다

빈도 배열만 있으면 값이 몇 번 나왔는지는 알 수 있지만, 출력 배열의 어느 위치에 놓을지는 바로 알 수 없다. 빈도 배열을 누적합으로 바꾸면 값 이하의 원소가 몇 개인지 알 수 있다.

`[1, 1, 2, 2]`를 누적하면 다음과 같다.

`[1, 2, 4, 6]`

예를 들어 `count[2] = 4`라면 값이 `2` 이하인 원소가 모두 네 개라는 뜻이다. 값 `2`가 들어갈 수 있는 마지막 위치는 0 기반 인덱스 `3`이 된다.

누적합은 현재 위치에 이전 위치의 값을 더한다.

```java
for (int i = 1; i < count.length; i++) {
    count[i] += count[i - 1];
}
```

처음에는 현재 값과 다음 값을 더하거나, 계산한 결과를 배열에 저장하지 않는 식으로 생각했다. 또 마지막 인덱스에서 범위를 넘길 수 있다는 점도 놓쳤다. 반복문은 `i = 1`에서 시작하고, `count[i]`에 `count[i - 1]`을 더해 같은 배열에 저장한다.

### 3.3 뒤에서부터 출력 배열에 배치한다

누적합을 얻었으면 입력 배열의 마지막 원소부터 읽는다.

```java
for (int i = arr.length - 1; i >= 0; i--) {
    int value = arr[i];
    output[--count[value]] = value;
}
```

한 원소를 배치하는 순서는 다음과 같다.

1. 입력 배열을 뒤에서부터 순회한다.
2. 현재 값 `value`를 확인한다.
3. `count[value]`를 먼저 1 줄인다.
4. 감소한 값을 출력 배열의 0 기반 인덱스로 사용한다.
5. 해당 위치에 값을 배치한다.

`count[value]`는 누적합 단계에서 해당 값이 들어갈 마지막 위치보다 하나 큰 값이다. 그래서 `--count[value]`로 먼저 감소해야 출력 배열의 인덱스가 된다.

뒤에서부터 읽는 이유는 LSD 때문이 아니다. 자릿수를 일의 자리부터 처리하는 것은 Radix Sort의 순서이고, Counting Sort에서 입력 배열을 역순으로 읽는 것은 같은 키의 상대 순서를 보존하기 위한 배치 방식이다.

예를 들어 같은 키 `2`를 가진 `A`, `B`가 입력에서 `A → B` 순서로 나왔다고 하자. `count[2] = 2`일 때 뒤의 `B`를 먼저 처리하면 `output[1]`에 들어가고, 앞의 `A`는 `output[0]`에 들어간다. 결과는 `A → B`다. 같은 `--count[value]` 방식을 정방향으로 적용하면 `A`가 뒤쪽에 들어가고 `B`가 앞쪽에 들어가 `B → A`로 뒤집힌다.

다만 모든 Counting Sort가 무조건 역순 순회를 해야 하는 것은 아니다. 여기서 설명한 누적합의 끝 위치와 선감소 방식으로 안정성을 보장할 때 역순 순회가 필요하다.

### 3.4 빈도·누적합·배치를 단계별로 확인하기

다음 시각화는 입력 배열, `count` 배열, `output` 배열을 분리해 보여 준다. 입력 배열을 뒤에서부터 읽을 때 현재 원소를 강조하고, `count[value]`가 감소한 뒤 실제 출력 인덱스가 어디로 결정되는지 단계마다 기록한다.

{% include interactive/sort-visualization.html kind='counting' values='2,0,2,1,3,3' %}

*그림 2. Counting Sort는 빈도 계산, 누적합, 역순 배치, 원본 복사까지의 배열 상태를 복원 가능한 단계로 보여 준다.*

<script defer src="{{ '/assets/js/sort-visualization.js' | relative_url }}"></script>

이전 버튼을 누르면 현재 원소를 처리하기 전의 `count`와 `output`으로 돌아간다. 따라서 마지막 결과만 보고 위치를 추측하는 것이 아니라, `count[value]`가 어느 순간 감소했고 그 값이 왜 출력 인덱스가 됐는지 확인할 수 있다.

### 3.5 음수는 최솟값만큼 인덱스를 보정한다

일반적인 Counting Sort에서 값을 바로 배열 인덱스로 사용하면 음수에서 문제가 생긴다.

`arr = [-5, -2, 1]`일 때 최솟값은 `-5`다. 값에서 최솟값을 빼면 모든 인덱스가 0 이상이 된다.

| 값 | 보정 인덱스 `value - min` |
| ---: | ---: |
| `-5` | `0` |
| `-2` | `3` |
| `1` | `6` |

따라서 계수 배열의 크기는 `max - min + 1`이다. `count[value]` 대신 `count[value - min]`을 사용한다. 학습 중 `min = -2`, `value = 1`의 인덱스를 `1`이라고 생각했지만, 실제 계산은 `1 - (-2) = 3`이다. 이후 `min = -5`, `value = -2`에서 인덱스 `3`을 다시 확인했다.

값의 범위가 너무 크면 원소 수가 적어도 계수 배열이 커진다. 예를 들어 원소가 몇 개뿐인데 최댓값이 `1_000_000`이면 `0`부터 배열을 만들고 초기화하는 비용이 커진다. 정수 차이 계산의 오버플로와 과도한 배열 할당도 확인해야 하지만, 별도의 희소 구조나 최적화 기법으로 확장하지는 않았다.

### 3.6 Java 구현과 검증 범위

다음 예시는 음수와 빈 배열을 처리하고, 최솟값을 기준으로 계수 배열 인덱스를 보정한 안정적인 Counting Sort다.

```java
import java.util.Arrays;

public final class CountingSort {
    private CountingSort() {
    }

    public static void sort(int[] arr) {
        if (arr.length < 2) {
            return;
        }

        int min = Arrays.stream(arr).min().orElse(0);
        int max = Arrays.stream(arr).max().orElse(0);
        long range = (long) max - min + 1;

        if (range > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("값의 범위가 너무 큽니다.");
        }

        int[] count = new int[(int) range];
        int[] output = new int[arr.length];

        for (int value : arr) {
            int index = (int) ((long) value - min);
            count[index]++;
        }

        for (int i = 1; i < count.length; i++) {
            count[i] += count[i - 1];
        }

        for (int i = arr.length - 1; i >= 0; i--) {
            int value = arr[i];
            int index = (int) ((long) value - min);
            output[--count[index]] = value;
        }

        System.arraycopy(output, 0, arr, 0, arr.length);
    }
}
```

`System.arraycopy(output, 0, arr, 0, arr.length)`은 출력 배열의 결과를 원본 배열에 복사한다. 반복문으로도 같은 작업을 할 수 있지만, 이번에는 검증된 메서드로 의도를 짧게 표현했다.

이 코드의 흐름은 입력 범위 확인 → `count[k]`와 `output[n]` 생성 → 빈도 계산 → 누적합 → 역순 배치 → 원본 복사다. 학습 기록에서는 이 전체 코드를 빈 종이에서 독립적으로 작성하거나 실행한 것으로 확인되지 않았다. 이번 포스트를 작성하면서는 코드의 문법과 예제 입력의 결과를 별도로 확인해 글의 코드와 설명이 어긋나지 않도록 했다.

### 3.7 시간·공간 복잡도와 적용 조건

원소 수를 `n`, 최솟값부터 최댓값까지의 범위 크기를 `k`라고 하면 Counting Sort의 시간 복잡도는 `O(n + k)`다.

- 입력 배열을 순회해 빈도를 계산하는 비용: `O(n)`
- 계수 배열을 누적하는 비용: `O(k)`
- 입력 배열을 역순으로 배치하는 비용: `O(n)`
- 출력 배열을 원본에 복사하는 비용: `O(n)`

안정적인 출력 배열을 사용하는 구현에서는 `count[k]`와 `output[n]`이 필요하므로 보조 공간도 `O(n + k)`다. 빈도만 이용해 원본 배열을 덮어쓰는 단순한 구현과, 원소의 상대 순서를 보존하는 출력 배열 구현은 구분해야 한다.

Counting Sort가 모든 상황에서 비교 기반 정렬보다 빠르다고 말할 수는 없다. `n`에 비해 `k`가 작고 값이 정수로 제한된 데이터에서는 유리하지만, 값의 범위가 넓으면 계수 배열을 초기화하고 유지하는 메모리 비용이 커진다.

## 4. 두 알고리즘을 선택할 때 생각할 조건

Radix Sort와 Counting Sort는 모두 값의 표현 범위를 활용하지만 비용의 기준이 다르다.

| 알고리즘 | 시간 복잡도 | 유리한 조건 | 주의할 점 |
| --- | --- | --- | --- |
| Counting Sort | `O(n + k)` | 값의 범위 `k`가 작고 정수 데이터일 때 | 범위가 크면 계수 배열 비용 증가 |
| LSD Radix Sort | `O(d(n + b))` | 최대 자릿수 `d`와 기수 `b`가 제한될 때 | 각 자릿수에 안정 정렬을 반복 |
| Merge Sort | `O(n log n)` | 비교 정렬과 안정성이 필요할 때 | 출력용 추가 공간 필요 |
| Quick Sort | 평균 `O(n log n)` | 비교 기반 제자리 분할이 필요할 때 | 최악 `O(n²)`과 안정성 고려 |

학습에서는 원소가 100만 개이고 값이 `0~9`라면 Counting Sort를 선택할 수 있다고 봤다. 반대로 값의 범위가 크면 `k`가 커져 Counting Sort의 장점이 줄어든다. `0~999`처럼 자릿수가 제한된 큰 정수 데이터에서는 Radix Sort를 검토할 수 있지만, 두 알고리즘의 실제 속도는 구현과 메모리 접근 비용까지 함께 확인해야 한다.

실제 Java 개발에서는 학습 목적이 아니라면 표준 라이브러리를 먼저 검토한다. 배열은 `Arrays.sort()`, 리스트는 `List.sort()`처럼 검증된 API를 사용할 수 있다. 정렬이 데이터베이스 조회와 이어진다면 애플리케이션으로 전체 행을 가져와 정렬할지, `ORDER BY`와 필요한 범위 조회로 데이터베이스에서 정렬할지를 나눈다. `ORDER BY`가 언제나 더 빠르다고 단정할 수는 없으며 데이터 규모, 조회 조건, 네트워크 전송량과 메모리 사용량을 함께 봐야 한다.

## 5. 오늘의 정리

오늘은 Radix Sort와 Counting Sort를 단순히 “비교하지 않는 정렬”로 묶지 않고, 배열을 바꾸는 기준과 순서를 나눠 보았다.

- LSD Radix Sort는 일의 자리에서 높은 자리로 이동하며 각 자릿수를 안정적으로 정렬한다.
- 높은 자릿수가 같은 원소의 상대 순서를 유지해야 이전 낮은 자릿수의 정렬 결과가 보존된다.
- Radix Sort에서 `exp`는 자릿수 처리 방향을 나타내고, 입력 배열의 역순 순회는 Counting Sort의 안정 배치와 관련된다.
- Radix Sort의 시간 복잡도는 `O(d(n + b))`, 보조 공간은 `O(n + b)`다.
- Counting Sort는 빈도 배열을 만든 뒤 누적합으로 바꾸어 출력 위치를 계산한다.
- `output[--count[value]]`에서 감소 연산을 먼저 하는 이유는 누적합을 0 기반 인덱스로 바꾸기 위해서다.
- 같은 키의 상대 순서를 보존하려면 이 배치 방식에서 입력 배열을 뒤에서부터 읽어야 한다.
- Counting Sort의 시간·공간 복잡도는 안정적인 출력 배열 구현 기준 `O(n + k)`다.
- 음수는 최솟값을 빼서 0부터 시작하는 계수 배열 인덱스로 보정한다.

가장 크게 고친 이해는 두 가지다. 하나는 LSD라는 이름 때문에 원소 배열도 뒤에서 읽는다고 생각했던 부분이다. 자릿수를 낮은 자리부터 처리하는 것과 원소를 뒤에서부터 순회하는 것은 서로 다른 결정이다. 다른 하나는 Counting Sort의 누적합을 단순히 빈도 합계로만 본 부분이다. 누적합은 값 이하 원소의 개수이고, 감소 연산을 거치면 출력 배열의 위치가 된다.

이번 학습에서 개념과 코드의 흐름은 따라갔지만, 학습 기록상 Java 전체 구현을 독립적으로 작성한 것은 아니다. 다음에는 빈도 계산, 누적합, 역순 배치 코드를 보지 않고 다시 작성해 각 변수의 역할을 설명할 수 있는지 확인할 필요가 있다.

### 관련 글

- [안정 계수 정렬(Stable Counting Sort)의 원리와 역방향 순회](/posts/stable-counting-sort-reverse-traversal/) — 이전에 정리한 Counting Sort의 안정성과 역방향 순회를 이번 학습의 빈도·누적합 흐름과 연결했다.
- [Bubble Sort부터 Quick Sort까지 — 비교·교환·이동·분할은 어떻게 다를까?](/posts/sorting-algorithms-bubble-selection-insertion-quick/) — 원소 사이를 비교하는 정렬과 값의 범위를 이용하는 정렬의 차이를 비교했다.
- [Merge Sort와 Heap Sort — 정렬된 구간과 최대 힙으로 O(n log n) 만들기](/posts/sorting-algorithms-merge-heap/) — `O(n log n)` 비교 기반 정렬과 `O(n + k)`, `O(d(n + b))` 정렬을 선택 조건으로 함께 보았다.

### 참고 자료

- [Gyoogle — Sort_Radix.md](https://github.com/gyoogle/tech-interview-for-developer/blob/master/Algorithm/Sort_Radix.md) — LSD Radix Sort의 자릿수 처리와 안정적인 Counting Sort 구현 흐름을 확인했다.
- [Gyoogle — Counting Sort](https://gyoogle.dev/blog/algorithm/Counting%20Sort.html) — 빈도 배열, 누적합, 출력 배열 배치의 기본 흐름을 교차 확인했다.
- [Oracle Java SE 21 — Arrays API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Arrays.html) — 실제 애플리케이션에서 배열 정렬 표준 API를 검토할 때 참고했다.
- [Oracle Java SE 21 — List API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/List.html) — `List.sort()`의 안정성 계약과 표준 API 사용 판단을 확인할 때 참고했다.
- [Oracle Java Collections Algorithms](https://docs.oracle.com/javase/tutorial/collections/algorithms/index.html) — Java 컬렉션 정렬 API를 직접 구현한 알고리즘과 구분하는 데 참고했다.
