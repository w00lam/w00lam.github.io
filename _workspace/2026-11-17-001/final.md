---
title: "Merge Sort와 Heap Sort — 정렬된 구간과 최대 힙으로 O(n log n) 만들기"
date: 2026-11-17
categories: [TIL, Algorithm, Java]
tags: [Java, Algorithm, Sorting, Merge Sort, Heap Sort, TIL]
permalink: /posts/sorting-algorithms-merge-heap/
---

[Bubble Sort부터 Quick Sort까지](/posts/sorting-algorithms-bubble-selection-insertion-quick/)를 공부하며 비교 기반 정렬이 배열을 바꾸는 방식을 구분해 봤다. 인접한 원소를 교환하는 방법, 최솟값의 위치를 선택하는 방법, 정렬된 영역에 원소를 삽입하는 방법, Pivot을 기준으로 구간을 나누는 방법은 모두 오름차순을 만들지만 처리 순서는 달랐다.

오늘은 입력이 커졌을 때 선택지로 볼 수 있는 Merge Sort와 Heap Sort를 이어서 살펴봤다. Merge Sort에서는 배열을 나누는 것과 정렬하는 일이 같은 단계가 아니라는 걸 확인했고 Heap Sort에서는 배열 인덱스가 완전 이진 트리의 부모·자식 관계로 읽히는 과정을 따라갔다. 초반에는 구간 경계와 재귀 호출 공간이 섞였다. 배열 상태를 단계마다 적어 보면서 차이를 정리했다.

## 1. 작은 정렬과 `O(n log n)` 정렬

Bubble Sort, Selection Sort, Insertion Sort는 작은 배열이나 학습용으로는 괜찮지만 입력이 커지면 `O(n²)` 시간이 문제가 된다. Quick Sort는 평균적으로 `O(n log n)`이지만 Pivot이 계속 한쪽으로 치우치면 최악의 경우 `O(n²)`이 된다.

Merge Sort와 Heap Sort는 최선·평균·최악의 시간 복잡도를 모두 `O(n log n)`으로 설명된다. 다만 같은 복잡도를 가진다고 해서 동작과 사용 조건이 같지는 않다.

- Merge Sort는 정렬된 두 구간을 병합하며 안정 정렬을 만들지만 임시 배열이 필요하다.
- Heap Sort는 최대 힙의 루트에서 최댓값을 꺼내며 배열 안에서 처리하지만 일반적으로 불안정 정렬이다.

복잡도 숫자만 외우지 않고 왜 `log n`과 `n`이 곱해지는지, 추가 공간과 안정성이 어디에서 생기는지까지 살펴봤다.

## 2. Merge Sort — 나눈 구간을 다시 병합한다

### 2.1 분할만으로 정렬이 끝나지 않는다

Merge Sort는 분할 정복으로 움직인다. 배열을 작은 구간으로 나누고 원소가 하나만 남을 때까지 재귀 호출한 뒤 정렬된 두 구간을 병합한다.

이번에 따라간 배열은 다음과 같다.

`[38, 27, 43, 3, 9, 82, 10]`

인덱스 `0..6`에서 `mid = (left + right) / 2`를 계산하면 첫 구간은 다음처럼 나뉜다.

- `0..3`
- `4..6`

처음에는 왼쪽 구간을 `0..2`라고 적었다. `mid`가 `3`이므로 왼쪽 구간에 `3`을 포함해야 했다. 식을 다시 대입해 `0..3`으로 바로잡았다. 이어서 `0..3`은 `0..1`과 `2..3`, `4..6`은 `4..5`와 `6..6`으로 나뉜다. `left >= right`가 되면 원소가 하나 이하인 구간이므로 재귀를 멈춘다.

분할하는 동안에는 배열 값의 순서가 바뀌지 않는다. 정렬은 단일 원소 구간을 만든 뒤 병합하는 과정에서 시작된다.

### 2.2 두 포인터로 정렬된 구간을 병합한다

두 구간이 이미 정렬됐다고 보고 각 구간의 첫 미사용 원소를 비교한다. 더 작은 값을 `buffer`에 담은 뒤 선택한 쪽 포인터만 한 칸 옮긴다. `bidx`는 `buffer`에 다음 값을 기록할 위치다.

예를 들면 `[38]`과 `[27]`을 병합하면 `27`을 먼저 넣고 오른쪽 포인터가 끝난다. 이어서 왼쪽에 남은 `38`을 `buffer`에 복사해 `[27, 38]`을 만든다.

`[27, 38]`과 `[3, 43]`을 병합할 때는 `3`, `27`, `38`을 차례로 선택한다. 왼쪽 구간이 소진된 뒤에는 비교를 계속하지 않고 오른쪽에 남은 `43`을 복사한다. `buffer`에 값을 추가하는 단계와 `buffer`를 원본 배열에 복사하는 단계는 같은 일이 아니다. `buffer`가 만들어지는 동안 원본 배열은 그대로이고 마지막 복사에서 현재 병합 구간이 바뀐다.

전체 병합 결과는 다음과 같다.

`[3, 9, 10, 27, 38, 43, 82]`

병합할 때 `i`는 왼쪽 구간, `j`는 오른쪽 구간을 가리킨다. `j`가 `3`에서 값을 사용했다면 `j++` 후에는 `4`가 된다. 오른쪽 구간의 경계가 `3`이므로 `j > right`가 되어 더 비교하지 않고 남은 왼쪽 원소를 처리한다. 포인터가 움직이는 방향을 처음엔 잘못 적었다. 현재 인덱스와 다음 인덱스를 나눠 쓰자 경계가 보였다.

### 2.3 Java 구현에서 `buffer`와 원본 배열을 구분한다

이번에는 별도의 `L`, `R` 배열을 만드는 구현 대신, 현재 병합 구간 크기의 `buffer`를 사용하는 Gyoogle의 `mergeSort.java`를 기준으로 살펴봤다.

~~~java
private static void mergeSort(int[] arr, int left, int right) {
    if (left >= right)
        return;

    int mid = (left + right) / 2;
    int i = left;
    int j = mid + 1;

    mergeSort(arr, left, mid);
    mergeSort(arr, mid + 1, right);

    int[] buffer = new int[right - left + 1];
    int bidx = 0;

    while (true) {
        if (arr[i] <= arr[j]) {
            buffer[bidx++] = arr[i++];
        } else {
            buffer[bidx++] = arr[j++];
        }

        if (i > mid || j > right)
            break;
    }

    while (i <= mid)
        buffer[bidx++] = arr[i++];

    while (j <= right)
        buffer[bidx++] = arr[j++];

    for (int k = 0; k < bidx; k++)
        arr[left + k] = buffer[k];
}
~~~

변수 역할은 이렇게 나눠 봤다.

- `left`, `right`: 현재 재귀 구간의 양 끝 인덱스
- `mid`: 왼쪽과 오른쪽 구간을 나누는 중간 인덱스
- `i`: 왼쪽 구간의 현재 원소
- `j`: 오른쪽 구간의 현재 원소
- `bidx`: `buffer`에 기록할 위치
- `buffer`: 현재 병합 구간의 정렬 결과를 임시로 담는 배열

주 비교 반복문이 끝난 뒤에도 한쪽 구간의 원소가 남을 수 있으므로 두 개의 `while`문으로 남은 값을 복사한다. 마지막 `for`문에서만 `buffer[k]`가 `arr[left + k]`에 반영된다. 분할과 병합을 설명하면서 임시 배열과 원본 배열을 섞지 않는 것이 중요했다.

### 2.4 시간·공간 복잡도와 안정성

배열을 매번 절반으로 나누므로 재귀 깊이는 `O(log n)`이다. 각 재귀 깊이에서 모든 원소를 한 번씩 병합하므로 해당 깊이의 작업량은 `O(n)`이다. 그래서 최선·평균·최악의 시간 복잡도는 모두 `O(n log n)`이다.

병합에는 현재 구간을 담을 `buffer`가 필요하다. 가장 큰 구간을 병합할 때는 `n`개의 원소를 담으므로 병합용 추가 공간은 `O(n)`이다. 재귀 호출 스택은 `O(log n)`이지만 `O(n)`인 `buffer`가 더 크므로 전체 보조 공간은 `O(n)`이다. 처음엔 재귀 깊이와 전체 추가 공간을 같은 것으로 착각했다. 스택과 버퍼를 따로 적으니 차이가 보였다.

Merge Sort는 동점인 경우 왼쪽 원소를 먼저 고르면 안정 정렬이 된다. 코드의 `arr[i] <= arr[j]` 조건이 이 역할을 맡는다. 왼쪽 구간에 `A(가격 5000)`, 오른쪽 구간에 `B(가격 5000)`이 있다면 `A`를 먼저 `buffer`에 넣어 원래 순서를 유지한다. 조건을 `<`로 바꾸면 동점에서 오른쪽 원소가 먼저 선택돼 안정성이 깨질 수 있다.

{% include interactive/sort-visualization.html kind='merge' values='38,27,43,3,9,82,10' %}

*그림 1. Merge Sort는 분할 구간과 정렬된 두 구간의 병합, `buffer` 작성, 원본 배열 반영을 단계별로 보여 준다.*

## 3. Heap Sort — 최대 힙에서 최댓값을 꺼낸다

### 3.1 완전 이진 트리를 배열로 표현한다

완전 이진 트리는 마지막 층을 제외한 층이 채워져 있고 마지막 층은 왼쪽부터 채워지는 트리다. 이 트리를 0 기반 배열로 옮기면 별도의 노드 객체 없이 인덱스로 부모와 자식을 계산한다.

인덱스 `i`의 관계는 이렇다.

- 왼쪽 자식: `2 * i + 1`
- 오른쪽 자식: `2 * i + 2`
- 부모: `(i - 1) / 2`

예를 들어 `i = 2`이면 왼쪽 자식은 `5`, 오른쪽 자식은 `6`이다. 인덱스 `5`의 부모는 `(5 - 1) / 2 = 2`다. 처음에는 `2`의 왼쪽 자식을 `3`이라고 적었다. 공식을 그대로 대입하니 `5`였다.

최대 힙은 부모 노드의 값이 자식보다 크거나 같은 구조다. 루트가 최댓값이라는 조건은 보장하지만 형제 노드 사이의 순서나 배열 전체의 정렬 순서까지 보장하지는 않는다. 최대 힙을 만들었다고 바로 정렬이 끝나는 것은 아니다.

### 3.2 `heapify`는 한 서브트리의 힙 조건을 복구한다

`heapify(array, heapSize, rootIndex)`에서 `heapSize`는 현재 힙에 포함할 원소 수이고 `rootIndex`는 복구를 시작할 노드의 인덱스다. `heapSize = 4`라면 유효한 힙 인덱스는 `0..3`이고 `4`는 마지막 인덱스가 아니라 원소 수다.

동작 순서는 이렇다.

1. 현재 부모를 최댓값 후보로 둔다.
2. 왼쪽 자식이 현재 힙 범위 안에 있고 후보보다 크면 후보를 왼쪽 자식으로 바꾼다.
3. 오른쪽 자식도 범위 안인지 확인하고 원래 부모가 아니라 현재까지의 최댓값 후보와 비교한다.
4. 후보가 부모와 다르면 두 값을 교환한다.
5. 값이 내려간 위치에서 `heapify`를 재귀 호출한다.
6. 부모가 가장 크면 교환하지 않고 종료한다.

오른쪽 자식을 부모와 바로 비교하면 왼쪽 자식과 오른쪽 자식 중 더 큰 값을 놓칠 수 있다. 왼쪽 자식이 먼저 후보가 되었다면 오른쪽 자식은 그 후보와 비교해야 세 값 중 최댓값을 고를 수 있다.

### 3.3 마지막 부모부터 최대 힙을 만든다

이번에 따라간 배열은 다음과 같다.

`[10, 230, 220, 550, 40, 60, 20]`

`7`개의 원소가 있으면 마지막 부모 인덱스는 `n / 2 - 1 = 2`다. 리프 노드에는 자식이 없으므로 `2 → 1 → 0` 순서로 아래 부모부터 `heapify`한다.

| 처리 인덱스 | 비교 | 교환 후 배열 |
| --- | --- | --- |
| `2` | `220`과 자식 `60`, `20` 비교 | `[10, 230, 220, 550, 40, 60, 20]` |
| `1` | `230`과 자식 `550`, `40` 비교 | `[10, 550, 220, 230, 40, 60, 20]` |
| `0` | `10`과 자식 `550`, `220` 비교 후 `1`에서 다시 확인 | `[550, 230, 220, 10, 40, 60, 20]` |

최대 힙을 만든 결과는 `[550, 230, 220, 10, 40, 60, 20]`이다. `550`이 루트에 올라왔지만 뒤쪽의 `60`, `20`, `40`이 전체적으로 정렬된 것은 아니다.

### 3.4 루트와 마지막 힙 원소를 바꾼다

최대 힙을 만든 다음에는 루트와 현재 힙의 마지막 원소를 교환한다. 루트에 있던 최댓값은 배열 뒤쪽의 정렬 완료 영역으로 이동한다. 그다음 힙 크기를 하나 줄인 뒤 `heapify(array, heapSize, 0)`으로 새 루트부터 힙 조건을 복구한다.

첫 번째 추출은 다음과 같다.

1. `550`과 마지막 원소 `20`을 교환한다.
2. 배열은 `[20, 230, 220, 10, 40, 60, 550]`이 된다.
3. 힙 크기를 `7`에서 `6`으로 줄인다. `550`이 있는 인덱스 `6`은 이제 정렬 완료 영역이다.
4. `heapify(array, 6, 0)`을 호출해 `20`을 `230`과 바꾸고 내려간 위치에서 다시 `40`과 비교한다.

이 과정을 계속하면 최댓값이 뒤에서부터 쌓이고 최종 배열은 다음과 같다.

`[10, 20, 40, 60, 220, 230, 550]`

추출할 때 전체 배열 길이를 계속 `heapify`에 넘기면 이미 정렬된 뒤쪽 원소까지 다시 힙에 들어간다. 그래서 현재 힙 크기를 전달해야 한다.

### 3.5 Java 구현과 메서드 역할

학습한 재귀 `heapify`를 기준으로 메서드 역할을 나누면 이렇게 된다.

- `heapSort()`: 최대 힙 구성과 최댓값 추출 순서를 제어한다.
- `heapify()`: 지정한 노드부터 아래 방향으로 힙 조건을 복구한다.
- `swap()`: 두 배열 원소의 위치를 바꾼다.

~~~java
public static void heapSort(int[] array) {
    int size = array.length;

    for (int rootIndex = size / 2 - 1; rootIndex >= 0; rootIndex--) {
        heapify(array, size, rootIndex);
    }

    for (int endIndex = size - 1; endIndex > 0; endIndex--) {
        swap(array, 0, endIndex);
        heapify(array, endIndex, 0);
    }
}

public static void heapify(int[] array, int heapSize, int rootIndex) {
    int largestIndex = rootIndex;
    int leftChildIndex = rootIndex * 2 + 1;
    int rightChildIndex = rootIndex * 2 + 2;

    if (leftChildIndex < heapSize
            && array[leftChildIndex] > array[largestIndex]) {
        largestIndex = leftChildIndex;
    }

    if (rightChildIndex < heapSize
            && array[rightChildIndex] > array[largestIndex]) {
        largestIndex = rightChildIndex;
    }

    if (largestIndex != rootIndex) {
        swap(array, rootIndex, largestIndex);
        heapify(array, heapSize, largestIndex);
    }
}

public static void swap(int[] array, int firstIndex, int secondIndex) {
    int temp = array[firstIndex];
    array[firstIndex] = array[secondIndex];
    array[secondIndex] = temp;
}
~~~

이번 학습에서 전체 `heapSort()`를 독립적으로 작성했다고 하지는 않는다. 기준 구현의 흐름과 `heapify`, `swap`의 역할을 따라가며 이해했고 특히 `heapify`에 넘기는 `heapSize`가 정렬 완료 영역을 제외한다는 점을 확인했다.

### 3.6 시간·공간 복잡도와 안정성

`heapify` 한 번은 트리의 높이만큼 내려갈 수 있으므로 `O(log n)`이다. 초기 최대 힙 구성은 부모 노드마다 `O(log n)`을 곱한 `O(n log n)`으로 끝나지 않는다. 리프에 가까운 노드가 많고 이 노드들은 내려갈 수 있는 높이가 작다. 노드마다 내려가는 높이를 합치면 bottom-up 힙 구성은 `O(n)`이 된다.

최댓값 추출은 최대 `n - 1`번 발생하고 매번 `O(log n)`의 `heapify`를 수행한다. 그래서 전체 시간 복잡도는 `O(n) + O(n log n) = O(n log n)`이고 최선·평균·최악 모두 `O(n log n)`이다.

여기서 사용한 구현은 원본 배열을 복사하지 않고 재귀 `heapify`를 사용한다. 재귀 깊이는 최대 `O(log n)`이므로 보조 공간은 `O(log n)`이다. 반복형 `heapify`라면 `O(1)`로 줄일 수 있지만 이번 학습 범위는 재귀 구현이다.

Heap Sort는 일반적으로 불안정 정렬이다. 루트와 마지막 원소를 교환하고 다시 힙을 복구하는 과정에서 같은 정렬 키를 가진 객체의 원래 상대 순서가 바뀐다. 같은 가격 상품의 순서를 보존해야 한다면 안정성을 보장하는 Merge Sort나 Java 표준 정렬 API를 먼저 검토해야 한다.

{% include interactive/sort-visualization.html kind='heap' values='10,230,220,550,40,60,20' %}

*그림 2. Heap Sort는 배열 원소를 완전 이진 트리로 함께 보여 주고 부모·자식 비교, 최댓값 후보, 현재 힙 영역과 정렬 완료 영역을 단계별로 표시한다.*

## 4. 여섯 가지 정렬을 함께 비교하기

| 알고리즘 | 핵심 동작 | 최선 | 평균 | 최악 | 대표 추가 공간 | 안정성 |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Bubble Sort | 인접 비교·교환 | `O(n)`* | `O(n²)` | `O(n²)` | `O(1)` | 안정 |
| Selection Sort | 최솟값 인덱스 선택 후 교환 | `O(n²)` | `O(n²)` | `O(n²)` | `O(1)` | 불안정 |
| Insertion Sort | 큰 원소 이동 후 key 삽입 | `O(n)` | `O(n²)` | `O(n²)` | `O(1)` | 안정 |
| Quick Sort | Pivot 기준 Partition과 재귀 | `O(n log n)` | `O(n log n)` | `O(n²)` | `O(log n)` 평균, `O(n)` 최악 | 불안정 |
| Merge Sort | 정렬된 구간 병합 | `O(n log n)` | `O(n log n)` | `O(n log n)` | `O(n)` | 안정 |
| Heap Sort | 최대 힙에서 최댓값 추출 | `O(n log n)` | `O(n log n)` | `O(n log n)` | `O(log n)`* | 불안정 |

`*` Bubble Sort의 최선은 `swapped` 조기 종료를 적용한 구현 기준이다. Heap Sort의 추가 공간은 이번에 확인한 재귀 `heapify` 기준이며 반복형 구현은 `O(1)`까지 줄일 수 있다.

Merge Sort와 Heap Sort는 둘 다 `O(n log n)`이지만 선택 기준은 다르다. 같은 키의 순서를 보존해야 하고 추가 배열을 사용한다면 Merge Sort가 자연스럽다. 원본 배열 안에서 처리하면서 일정한 최악 시간 복잡도를 원하고 안정성이 필요하지 않다면 Heap Sort를 고려한다. 작은 배열이나 거의 정렬된 입력에서는 Insertion Sort가 여전히 유리하고 Quick Sort는 평균 성능과 구현의 제자리 처리 특성을 보되 불균형 분할을 함께 봐야 한다.

## 5. Java/Spring 개발에서 어디에서 정렬할까

실제 Java 코드에서 정렬이 필요할 때마다 알고리즘을 직접 짤 필요는 없다. 객체 목록은 `List.sort(Comparator)`처럼 검증된 표준 API를 먼저 확인한다.

~~~java
products.sort(Comparator.comparing(Product::getPrice));
~~~

가격이 같은 상품의 순서까지 의미가 있다면 정렬의 안정성을 확인하거나 고유 ID를 보조 기준으로 둔다. 같은 키의 결과 순서를 명확하게 고정하려면 다음처럼 비교 기준을 추가한다.

~~~java
products.sort(
    Comparator.comparing(Product::getPrice)
              .thenComparing(Product::getId)
);
~~~

정렬 대상이 데이터베이스 조회 결과라면 애플리케이션 메모리에서 정렬할지, SQL의 `ORDER BY`와 페이징으로 데이터베이스에서 처리할지 먼저 나눠 본다. 행이 많은데 전부 가져온 뒤 Java에서 정렬하면 네트워크 전송량과 애플리케이션 메모리가 커질 수 있다. 반대로 이미 메모리에 올라와 있고 크기가 작은 목록이라면 표준 API로 정렬하는 편이 단순하다.

Heap 자료구조는 우선순위 큐와도 연결된다. 우선순위가 가장 높은 작업을 반복해서 꺼내야 하는 상황에서는 매번 전체 목록을 정렬하기보다 힙 기반 자료구조를 사용할 수 있다. 이번 글에서는 스케줄러를 직접 구현하거나 내부 자료구조까지 넓히지 않고 Heap Sort에서 확인한 “최댓값을 빠르게 꺼내는 구조”와의 연결만 정리했다.

## 6. 오늘의 정리

오늘은 Merge Sort와 Heap Sort를 같은 `O(n log n)`이라는 숫자만으로 판단하지 않았다.

- Merge Sort는 `left..mid`와 `mid+1..right`를 원소 하나까지 나눈 뒤, 두 정렬 구간의 포인터를 비교해 `buffer`에 담고 원본에 복사한다.
- Merge Sort의 `<=` 조건은 동점일 때 왼쪽 원소를 먼저 선택해 안정성을 유지한다.
- Merge Sort의 재귀 스택은 `O(log n)`이지만 병합 `buffer`까지 포함한 전체 추가 공간은 `O(n)`이다.
- Heap Sort는 0 기반 배열의 인덱스를 완전 이진 트리의 부모·자식 관계로 사용한다.
- `heapify`는 현재 힙 크기 안에서 부모와 두 자식 중 최댓값을 고르고 필요하면 내려간 위치에서 재귀 호출한다.
- Bottom-up 최대 힙 구성은 `O(n)`, 최댓값 추출을 포함한 전체 Heap Sort는 `O(n log n)`이다.
- Heap Sort는 제자리 처리에 가깝지만 같은 키의 원래 순서를 보장하지 않는 불안정 정렬이다.

가장 크게 바로잡은 부분은 “분할이 끝나면 Merge Sort도 정렬이 끝난다”는 생각과 “힙 크기는 배열의 마지막 인덱스다”라는 생각이었다. Merge Sort는 병합에서 정렬이 일어나고 Heap Sort에서 `heapSize`는 유효 인덱스의 끝보다 하나 큰 원소 수다. 코드의 결과만 보지 않고 현재 포인터와 활성 구간을 함께 적어 보니 두 알고리즘의 차이가 눈에 들어왔다.

## 참고 자료

- [Gyoogle — MergeSort.md](https://github.com/gyoogle/tech-interview-for-developer/blob/master/Algorithm/MergeSort.md)
- [Gyoogle — mergeSort.java](https://github.com/gyoogle/tech-interview-for-developer/blob/master/Algorithm/code/mergeSort.java)
- [Gyoogle — HeapSort.md](https://github.com/gyoogle/tech-interview-for-developer/blob/master/Algorithm/HeapSort.md)
- [Oracle Java SE 21 — Arrays.sort](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Arrays.html)
- [Oracle Java SE 21 — List.sort](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/List.html)

<!-- HUMANIZE-SUMMARY
original_chars: 12243
final_chars: 12130
change_rate: 24.8%
categories:
  A-10 "~할 수 있다" 남발: 6 -> 1
  H-1 문두 접속사 "따라서": 2 -> 0
  C-11 연결어미 뒤 쉼표: 27 -> 0
  E-2 진행형 "~고 있다": 0 -> 0
  S1 잔존 핵심 패턴: 0 -> 0
self_check:
  1_proper_names_numbers_dates_quotes_preserved: pass
  2_change_rate_under_30_percent: pass
  3_blog_genre_preserved: pass
  4_register_preserved: pass
  5_s1_zero_and_s2_within_limit: pass
  6_no_new_metaphor_or_claim: pass
grade: A
reason: S1 0건, 핵심 S2 1건, 변경률 24.8%, 자체검증 6/6 통과
highlights:
  - "오늘은 입력 크기가 커졌을 때 사용할 수 있는" -> "오늘은 입력이 커졌을 때 선택지로 볼 수 있는"
  - "처음에는 구간 경계와 재귀 호출 공간을 혼동했지만" -> "초반에는 구간 경계와 재귀 호출 공간이 섞였다"
  - "이 포인터 이동을 처음에는 잘못 적었지만" -> "포인터가 움직이는 방향을 처음엔 잘못 적었다"
  - "이번 학습에서 전체 heapSort()를 독립적으로 작성했다고 말하지는 않는다" -> "이번 학습에서 전체 heapSort()를 독립적으로 작성했다고 하지는 않는다"
-->
