---
title: "Bubble Sort부터 Quick Sort까지 — 비교·교환·이동·분할은 어떻게 다를까?"
date: 2026-11-16
categories: [TIL, Algorithm, Java]
tags: [Java, Algorithm, Sorting, Bubble Sort, Selection Sort, Insertion Sort, Quick Sort, TIL]
permalink: /posts/sorting-algorithms-bubble-selection-insertion-quick/
---

어제는 자료구조의 연산 비용을 공부하면서 같은 데이터라도 어떤 구조와 처리 순서를 선택하는지에 따라 비용이 달라진다는 점을 정리했다. 오늘은 그 흐름을 배열 정렬로 이어서 살펴봤다. Bubble Sort, Selection Sort, Insertion Sort, Quick Sort를 직접 구현해 보면서 값의 비교만 보는 것이 아니라 교환과 이동, 분할이 각각 어디에서 일어나는지 확인했다.

처음에는 Bubble Sort의 조건문을 조금 바꾸면 Selection Sort가 될 것이라고 생각했다. 하지만 Bubble Sort는 인접 원소를 비교하면서 바로 교환하고, Selection Sort는 미정렬 영역에서 최솟값의 인덱스를 찾은 뒤 한 번 교환한다. Insertion Sort에서는 현재 원소를 `key`로 보관한 뒤 큰 원소를 이동해야 했고, Quick Sort에서는 재귀 깊이와 전체 시간 복잡도를 같은 값처럼 설명하고 있었다. 오늘은 이 혼동을 구현과 배열 상태를 따라가며 고쳐 보았다.

오늘은 면접 질문과 점수를 기록하는 것이 아니라 정렬 알고리즘을 기술적으로 이해하는 데 집중했다. 완성된 코드만 나열하기보다 어떤 인덱스를 비교하고 언제 배열이 바뀌는지를 중심으로 정리한다.

## 1. 정렬을 구현할 때 먼저 구분한 것

네 알고리즘은 모두 배열을 오름차순으로 만들지만 배열을 다루는 방식은 서로 다르다.

- Bubble Sort: 인접한 두 원소를 비교하고 필요할 때 교환한다.
- Selection Sort: 미정렬 영역에서 최솟값의 인덱스를 찾고 정렬할 위치와 교환한다.
- Insertion Sort: `key`보다 큰 원소를 오른쪽으로 이동한 뒤 빈 위치에 `key`를 삽입한다.
- Quick Sort: Pivot을 기준으로 Partition한 뒤 부분 배열을 재귀적으로 정렬한다.

또 하나 구분해야 할 것은 시간 복잡도와 안정성이다. 안정 정렬은 값이 같은 원소들의 상대적인 순서를 유지하는 정렬이다. 값만 저장한 `int[]`에서는 같은 값의 순서를 눈으로 확인하기 어렵지만, 실제 객체를 정렬할 때는 어떤 정렬 기준을 사용하는지와 함께 고려해야 한다.

안정 정렬 여부가 시간 복잡도만으로 결정되는 것은 아니다. 예를 들어 Selection Sort는 비교 조건에 등호를 넣지 않아도 멀리 떨어진 원소를 교환하면서 동일한 값의 순서를 바꿀 수 있다. 반대로 Bubble Sort와 Insertion Sort는 같은 값에 대해 불필요한 이동이나 교환을 하지 않는 일반적인 구현에서 안정 정렬로 설명할 수 있다.

## 2. Bubble Sort — 인접 비교와 오른쪽 정렬 완료 영역

### 2.1 인접한 두 원소를 비교한다

Bubble Sort는 배열의 왼쪽부터 인접한 두 원소를 비교한다. 앞의 값이 뒤의 값보다 크면 둘을 교환한다. 한 번의 내부 반복이 끝나면 현재 미정렬 영역에서 가장 큰 값이 오른쪽 끝으로 이동한다.

예를 들어 `[5, 3, 4, 1, 2]`에서 처음 두 원소를 비교하면 `5 > 3`이므로 `[3, 5, 4, 1, 2]`가 된다. 다음에는 `5`와 `4`를 비교하고, 다시 교환하면서 큰 값이 계속 오른쪽으로 이동한다. 이 과정을 거치면 첫 번째 순회가 끝날 때 `5`가 배열의 마지막에 놓인다.

내부 반복문의 범위는 이미 정렬된 오른쪽 영역을 제외해야 한다.

~~~java
for (int j = 0; j < arr.length - i - 1; j++) {
    // arr[j]와 arr[j + 1]을 비교
}
~~~

마지막 인덱스에서 `j + 1`에 접근하면 안 되므로 `arr.length - i - 1`이라는 종료 조건이 중요하다.

### 2.2 `swapped`로 조기 종료한다

처음에는 Bubble Sort의 시간 복잡도를 입력 상태와 관계없이 항상 `O(n²)`라고만 적었다. 기본 구현은 그렇게 설명할 수 있지만, 한 번의 순회에서 교환이 발생하지 않았다면 배열은 이미 정렬된 상태다. `swapped`를 사용하면 이 경우 남은 순회를 생략할 수 있다.

~~~java
public static void bubbleSort(int[] arr) {
    for (int i = 0; i < arr.length - 1; i++) {
        boolean swapped = false;

        for (int j = 0; j < arr.length - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
                swapped = true;
            }
        }

        if (!swapped) {
            break;
        }
    }
}
~~~

이 코드에서 `swapped`는 전체 정렬이 끝났다는 뜻이 아니라 현재 순회에서 교환이 있었는지를 나타낸다. 한 번도 교환하지 않은 순회가 끝났을 때만 조기 종료 조건이 성립한다.

### 2.3 복잡도와 안정성

조기 종료를 적용한 Bubble Sort의 복잡도는 다음과 같다.

- 최선: `O(n)`
- 평균: `O(n²)`
- 최악: `O(n²)`
- 추가 공간: `O(1)`

최선의 경우는 이미 정렬된 배열이다. 첫 순회에서 비교만 하고 교환이 발생하지 않으므로 종료할 수 있다. 역순 배열처럼 교환이 많이 필요한 경우에는 평균·최악과 같이 `O(n²)`이 된다. 동일한 값을 교환하지 않는 위 구현은 안정 정렬이다.

{% include interactive/sort-visualization.html kind='bubble' values='5,3,4,1,2' %}

*그림 1. Bubble Sort는 비교와 교환을 분리해 보여 주고, 한 순회가 끝날 때 오른쪽 정렬 완료 영역을 확장한다.*

## 3. Selection Sort — 최솟값의 인덱스를 선택한다

### 3.1 Bubble Sort와 교환 시점이 다르다

Selection Sort도 미정렬 배열에서 작은 값을 앞으로 가져오지만, Bubble Sort처럼 인접 원소를 계속 교환하지 않는다. 현재 정렬할 위치를 `i`로 정하고 `i + 1`부터 끝까지 탐색하면서 최솟값이 있는 위치를 찾는다. 그 위치를 `minIndex`에 저장한 다음 탐색이 끝났을 때 `arr[i]`와 교환한다.

정렬 완료 영역은 왼쪽에서 오른쪽으로 커진다.

1. `0`번 위치에 들어갈 최솟값을 전체 배열에서 찾는다.
2. 최솟값을 `arr[0]`과 교환한다.
3. 이제 `0`번 위치를 정렬 완료 영역으로 둔다.
4. `1`번 위치에 들어갈 최솟값을 남은 영역에서 찾는다.

### 3.2 `minIndex`에는 값이 아니라 인덱스를 저장한다

Java 구현에서 가장 헷갈렸던 부분은 최솟값 자체와 최솟값의 위치를 섞은 것이다. `minIndex`에 `1`을 저장하면 “최솟값이 1이다”라는 뜻이 되어 버린다. Selection Sort에서 필요한 것은 현재 위치와 교환할 대상이므로 `1`이 있는 인덱스를 저장해야 한다.

~~~java
public static void selectionSort(int[] arr) {
    for (int i = 0; i < arr.length - 1; i++) {
        int minIndex = i;

        for (int j = i + 1; j < arr.length; j++) {
            if (arr[j] < arr[minIndex]) {
                minIndex = j;
            }
        }

        if (minIndex != i) {
            int temp = arr[i];
            arr[i] = arr[minIndex];
            arr[minIndex] = temp;
        }
    }
}
~~~

`j = i + 1`부터 탐색하는 이유는 `arr[i]`를 현재 최솟값 후보로 이미 포함했기 때문이다. 탐색이 끝난 뒤 `minIndex == i`이면 현재 위치가 이미 최솟값이므로 자기 자신과의 교환도 생략할 수 있다.

### 3.3 비교 횟수와 안정성

Selection Sort는 이미 정렬된 배열에서도 미정렬 구간 전체를 확인한다. 비교 횟수는 다음과 같다.

`(n - 1) + (n - 2) + ... + 1 = n(n - 1) / 2`

따라서 최선·평균·최악의 시간 복잡도가 모두 `O(n²)`이다. 교환은 각 위치에서 최대 한 번만 발생하므로 교환 횟수는 Bubble Sort보다 적을 수 있지만, 비교 횟수 자체는 정렬 상태에 따라 줄어들지 않는다. 추가 공간은 `O(1)`이다.

일반적인 Selection Sort는 불안정 정렬이다. 예를 들어 같은 값을 가진 원소에 식별자를 붙였을 때 최솟값을 먼 위치에서 앞으로 교환하면 같은 값들의 상대적인 순서가 달라질 수 있다. 비교문에 등호가 없다는 사실만으로 안정성을 판단할 수 없다.

{% include interactive/sort-visualization.html kind='selection' values='5,3,4,1,2' %}

*그림 2. Selection Sort는 `i`, `j`, `minIndex`를 분리해 최솟값을 탐색하고, 탐색이 끝난 뒤 필요한 경우 한 번 교환한다.*

## 4. Insertion Sort — `key`를 보관하고 원소를 이동한다

### 4.1 왼쪽 영역이 정렬되어 있다고 가정한다

Insertion Sort는 첫 번째 원소 하나를 정렬된 영역으로 취급한다. 두 번째 원소부터 현재 값을 `key`에 저장하고 왼쪽의 정렬된 영역을 뒤에서부터 확인한다. `key`보다 큰 원소는 오른쪽으로 한 칸 이동하고, 반복이 끝난 위치에 `key`를 삽입한다.

`[3, 5, 4, 1, 2]`에서 `4`를 `key`로 선택하면 다음처럼 진행된다.

1. `key = 4`, 비교 대상은 `arr[1] = 5`다.
2. `5 > 4`이므로 `5`를 오른쪽으로 이동한다.
3. `j`를 감소시켜 `3`과 `4`를 비교한다.
4. `3 > 4`가 아니므로 `j + 1` 위치에 `4`를 삽입한다.

이 과정은 인접 원소를 계속 교환하는 것이 아니다. 현재 원소를 별도로 보관하고 큰 원소들을 한 칸씩 밀어 공간을 만든 뒤 마지막에 한 번 삽입한다.

### 4.2 `j`와 삽입 위치를 구분한다

비교 조건은 `arr[j + 1] > key`가 아니라 `arr[j] > key`다. 지금 비교하는 값은 정렬 영역 안의 `arr[j]`이고, `key`는 배열의 현재 위치에서 따로 보관한 값이다.

~~~java
public static void insertionSort(int[] arr) {
    for (int i = 1; i < arr.length; i++) {
        int key = arr[i];
        int j = i - 1;

        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }

        arr[j + 1] = key;
    }
}
~~~

`j`가 `-1`이 될 수 있다는 점도 확인했다. 모든 왼쪽 원소가 `key`보다 크면 반복이 끝난 뒤 `j + 1`은 `0`이 된다. 따라서 `key`가 정렬된 영역의 가장 앞에 들어갈 수 있다.

### 4.3 입력 상태에 따른 복잡도

- 최선: `O(n)`
- 평균: `O(n²)`
- 최악: `O(n²)`
- 추가 공간: `O(1)`

이미 정렬된 배열에서는 각 원소를 한 번 확인하고 이동 없이 다음 원소로 넘어간다. 역순 배열에서는 매번 정렬 영역의 많은 원소를 오른쪽으로 이동해야 하므로 `O(n²)`이 된다. `arr[j] > key`처럼 같은 값은 이동시키지 않는 구현은 안정 정렬이다.

{% include interactive/sort-visualization.html kind='insertion' values='3,5,4,1,2' %}

*그림 3. Insertion Sort는 `key`를 별도로 보관하고, 큰 원소의 오른쪽 이동과 key 삽입을 서로 다른 단계로 표시한다.*

## 5. Quick Sort — Pivot과 Lomuto Partition

### 5.1 Partition 구현을 먼저 고정한다

Quick Sort는 Pivot을 기준으로 배열을 나누고 나뉜 구간을 다시 정렬한다. 그런데 Pivot 선택과 인덱스 이동 규칙에 따라 Partition 구현이 달라진다. Lomuto 방식과 Hoare 방식을 섞으면 Partition 반환값과 재귀 호출 범위가 맞지 않을 수 있으므로 이번 글에서는 Lomuto Partition 하나만 사용한다.

이번 구현은 현재 구간의 마지막 원소를 Pivot으로 선택한다. `i`는 Pivot보다 작은 원소를 모아 둘 왼쪽 경계이고, `j`는 `start`부터 `end - 1`까지 순회하는 비교 인덱스다.

1. `arr[end]`를 Pivot으로 선택한다.
2. `j`가 가리키는 값이 Pivot보다 작으면 `arr[i]`와 교환한다.
3. 작은 값을 왼쪽 그룹에 넣었으므로 `i`를 증가시킨다.
4. 반복이 끝나면 Pivot을 `arr[i]`와 교환한다.
5. `i`를 Partition 반환값으로 사용해 왼쪽 `[start, i - 1]`과 오른쪽 `[i + 1, end]`을 재귀 호출한다.

### 5.2 Java 구현

~~~java
public static void quickSort(int[] arr, int start, int end) {
    if (start >= end) {
        return;
    }

    int pivotIndex = partition(arr, start, end);
    quickSort(arr, start, pivotIndex - 1);
    quickSort(arr, pivotIndex + 1, end);
}

private static int partition(int[] arr, int start, int end) {
    int pivot = arr[end];
    int i = start;

    for (int j = start; j < end; j++) {
        if (arr[j] < pivot) {
            int temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
            i++;
        }
    }

    int temp = arr[i];
    arr[i] = arr[end];
    arr[end] = temp;
    return i;
}
~~~

`start >= end`는 정렬 대상 구간의 원소가 0개이거나 1개일 때 재귀를 끝내는 조건이다. `partition`이 `i`를 반환하므로 재귀 호출에서 Pivot 자체를 다시 포함하지 않는다. 이 경계가 코드와 시각화에서 일치해야 무한 재귀나 정렬되지 않은 구간이 생기지 않는다.

### 5.3 재귀 깊이와 전체 시간 복잡도를 나누어 본다

Quick Sort를 설명하면서 재귀 호출 깊이와 전체 시간 복잡도를 혼동했다. 균등하게 나뉘는 경우 한 단계에서 현재 구간을 한 번 순회하고 재귀 깊이가 `O(log n)`이므로 전체 시간은 `O(n log n)`이다. Pivot이 계속 최솟값이나 최댓값이 되어 한쪽 구간만 남으면 재귀 깊이가 `O(n)`까지 늘고 전체 시간은 `O(n²)`이 된다.

이번 구현은 배열 내부에서 교환하는 제자리 Partition을 사용하므로 별도의 배열 공간은 거의 필요하지 않다. 하지만 재귀 호출 스택은 필요하다.

- 평균적인 균형 분할: 추가 공간 `O(log n)`
- 최악의 불균형 분할: 추가 공간 `O(n)`

일반적인 제자리 Quick Sort는 불안정 정렬이다. Partition 과정에서 떨어져 있는 원소를 교환하면서 같은 값을 가진 객체의 상대적인 순서가 바뀔 수 있다. 또한 Pivot 선택을 개선하는 여러 방법이 있지만, 오늘은 학습한 Partition의 경계와 재귀 호출을 확인하는 데 집중하고 별도의 최적화 기법으로 확장하지 않았다.

학습 기록에서 Quick Sort의 초기 배열 값은 확인할 수 없었으므로, 시각화에는 요청에 허용된 예제 `[5, 3, 7, 2, 8, 1, 6]`을 사용했다. 배열 값은 예시이지만 Pivot 선택, 비교, 교환, 반환 인덱스와 재귀 순서는 위 Java 코드와 동일하다.

{% include interactive/sort-visualization.html kind='quick' values='5,3,7,2,8,1,6' %}

*그림 4. Quick Sort는 Lomuto Partition의 현재 구간, Pivot, `i`·`j`, 반환 인덱스와 다음 재귀 호출을 단계별로 보여 준다.*

<script defer src="{{ '/assets/js/sort-visualization.js' | relative_url }}"></script>

## 6. 네 가지 정렬 알고리즘 비교

| 알고리즘 | 핵심 동작 | 최선 | 평균 | 최악 | 추가 공간 | 안정성 |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Bubble Sort | 인접 비교·교환 | `O(n)`* | `O(n²)` | `O(n²)` | `O(1)` | 안정 |
| Selection Sort | 최솟값 인덱스 선택 후 교환 | `O(n²)` | `O(n²)` | `O(n²)` | `O(1)` | 불안정 |
| Insertion Sort | 큰 원소 이동 후 key 삽입 | `O(n)` | `O(n²)` | `O(n²)` | `O(1)` | 안정 |
| Quick Sort | Pivot 기준 Partition과 재귀 | `O(n log n)` | `O(n log n)` | `O(n²)` | `O(log n)` 평균, `O(n)` 최악 | 불안정 |

`*` Bubble Sort의 최선 `O(n)`은 `swapped` 조기 종료를 적용한 구현을 기준으로 한다. 조기 종료가 없는 기본 구현은 이미 정렬된 배열에서도 내부 반복을 모두 수행하므로 최선도 `O(n²)`로 설명한다.

네 알고리즘의 선택을 시간 복잡도 하나로 결정할 수는 없다. 데이터가 거의 정렬되어 있는지, 같은 값의 순서를 보존해야 하는지, 교환 횟수를 줄여야 하는지, 재귀 스택을 허용할 수 있는지까지 함께 봐야 한다. 작은 배열이나 학습 목적에서는 구현을 직접 읽고 설명할 수 있는지가 중요하고, 실제 애플리케이션에서는 표준 API와 데이터가 있는 위치를 먼저 검토한다.

## 7. 실제 Java 개발에서 정렬을 선택할 때

학습에서는 네 알고리즘을 직접 구현하면서 비교와 교환, 이동, 재귀 호출을 이해하는 것이 중요했다. 하지만 일반적인 Java 애플리케이션 코드에서 정렬이 필요하다고 직접 Bubble Sort나 Quick Sort를 작성하는 것이 항상 좋은 선택은 아니다.

배열이라면 `Arrays.sort()`를 우선 검토할 수 있다.

~~~java
int[] scores = {5, 3, 4, 1, 2};
Arrays.sort(scores);
~~~

Java 21 `Arrays` API는 기본형 배열과 객체 배열에 서로 다른 `sort` 메서드 계약과 구현 정보를 제공한다. 예를 들어 `int[]` 정렬에는 Dual-Pivot Quicksort 구현 정보가 문서에 적혀 있고, 객체 배열 정렬은 같은 값의 상대 순서를 바꾸지 않는 안정성 요구사항을 가진다. 따라서 “Java의 배열 정렬은 모두 Quick Sort다”처럼 말할 수 없다.

List는 `List.sort()`를 사용할 수 있다.

~~~java
List<Integer> scores = new ArrayList<>(List.of(5, 3, 4, 1, 2));
scores.sort(Comparator.naturalOrder());
~~~

`List.sort()`의 API 계약은 안정 정렬이다. 다만 안정성 보장이라는 계약과 구체적인 내부 알고리즘 이름은 구분해야 한다. Java 21 문서는 기본 구현이 배열로 옮겨 정렬한 뒤 ListIterator로 결과를 반영하고, 구현 정보로 안정적인 적응형 반복 정렬을 설명한다. 실제 List 구현이 어떤 경로를 사용하는지는 JDK와 구현체의 문서를 확인해야 한다.

정렬 대상이 데이터베이스 조회 결과라면 정렬 위치도 판단해야 한다. 데이터베이스에서 `ORDER BY`와 함께 필요한 범위만 조회할 수 있는데도 많은 행을 Java 메모리로 가져와 다시 정렬하면 네트워크 전송량과 메모리 사용이 늘어날 수 있다. 반대로 이미 메모리에 있고 크기가 작은 데이터라면 Java에서 정렬하는 편이 자연스러울 수 있다. 오늘은 데이터베이스 인덱스 최적화까지 확장하지 않고, 정렬을 어느 계층에서 수행할지 먼저 구분하는 데 그쳤다.

## 8. 인터랙티브 시각화는 배열 상태를 기록한다

네 시각화는 기존 블로그의 인터랙티브 흐름 카드가 사용하던 카드 배경, 테두리, 여백, 버튼, 단계 표시와 반응형 토큰을 기준으로 맞췄다. 정렬마다 화면을 새로 설계하지 않고 공통 렌더링과 조작을 사용하며 알고리즘별 단계 데이터 생성만 나누었다.

공통으로 다음 상태를 제공한다.

- 이전 단계, 처음부터, 다음 단계
- 현재 단계와 전체 단계 수
- 현재 비교 대상과 교환·이동 대상
- 정렬 완료 영역 또는 현재 재귀 구간
- 현재 인덱스와 `minIndex`, `key`, Pivot 같은 핵심 값
- 키보드의 왼쪽·오른쪽 방향키, Home, End 조작

상태를 매번 현재 배열에서 추측하지 않고 각 단계에 배열과 인덱스 상태를 함께 저장했다. 그래서 이전 단계로 돌아가면 배열 값뿐 아니라 강조 위치와 설명도 해당 시점으로 복원된다. 색상만으로 상태를 구분하지 않도록 배열 요소에 `비교`, `교환·이동`, `key`, `Pivot`, `정렬 완료` 텍스트를 함께 표시했다.

모바일에서는 배열 영역을 가로로 확인할 수 있고, 카드와 세부 상태는 좁은 화면에서 한 열 또는 두 열로 내려간다. 라이트 모드와 다크 모드의 기존 CSS 변수를 사용하며, 움직임은 상태 전환에 필요한 정도로만 두고 `prefers-reduced-motion: reduce`에서는 전환을 제거했다. JavaScript 초기화가 실패하거나 꺼져 있어도 정적 단계 목록과 본문의 설명·코드 예제는 남도록 구성했다.

## 9. 오늘의 정리

오늘은 네 정렬 알고리즘을 같은 “오름차순 만들기”로 뭉뚱그리지 않고 배열을 바꾸는 방식으로 나누어 보았다.

- Bubble Sort는 인접 원소를 비교하고 교환하며, `swapped`가 `false`이면 조기에 종료할 수 있다.
- Selection Sort는 미정렬 영역에서 최솟값의 인덱스를 찾은 뒤 정렬 위치와 교환한다. `minIndex`에는 값이 아니라 인덱스를 저장한다.
- Insertion Sort는 `key`를 별도로 보관하고 큰 원소를 오른쪽으로 이동한 다음 `arr[j + 1]`에 삽입한다.
- Quick Sort는 Pivot 선택과 Partition 구현을 먼저 고정해야 한다. 이번 글에서는 마지막 원소를 Pivot으로 사용하는 Lomuto Partition을 기준으로 했다.
- Quick Sort의 재귀 깊이와 전체 시간 복잡도는 같은 값이 아니다. 균형 분할에서는 각각 `O(log n)`, `O(n log n)`이고 불균형 분할에서는 `O(n)`, `O(n²)`까지 늘어난다.
- 안정 정렬 여부는 비교문에 등호가 있는지만으로 판단하지 않고, 동일한 값의 상대 순서가 교환 과정에서 유지되는지 확인해야 한다.
- 학습 목적에서는 직접 구현이 필요하지만, 실제 Java 개발에서는 `Arrays.sort()`와 `List.sort()`의 계약과 데이터가 있는 위치를 먼저 확인한다.

오늘 가장 크게 고친 이해는 “정렬 알고리즘은 비교 조건만 바꾸면 서로 변환된다”는 생각이었다. Bubble Sort의 인접 교환, Selection Sort의 최솟값 선택, Insertion Sort의 이동과 삽입, Quick Sort의 Partition은 비슷한 비교문을 사용하더라도 상태를 바꾸는 시점과 인덱스의 역할이 다르다. 배열의 한 단계가 어떻게 변하는지 설명할 수 있어야 코드를 외운 것이 아니라 알고리즘을 이해했다고 말할 수 있다.

### 관련 글

* [배열과 연결 리스트 — 접근과 삽입·삭제 비용은 어디에서 생길까?](/posts/array-linked-list-access-insert-delete-cost/) — 배열에서 값을 이동시키는 비용과 삽입 위치를 찾는 비용을 정렬의 이동·접근과 연결해 확인했다.
* [자료구조의 연산 비용과 처리 순서 — ArrayList부터 Stack·Queue와 Heap까지](/posts/data-structure-operation-cost-stack-queue-heap/) — 자료구조를 이름이 아니라 처리 순서와 연산 비용으로 비교한 앞선 학습 기록이다.
* [안정 계수 정렬(Stable Counting Sort)의 원리와 역방향 순회](/posts/stable-counting-sort-reverse-traversal/) — 비교 정렬과 다른 계수 정렬에서 안정성을 유지하는 방법을 확인했다.

### 참고 자료 (Sources)

* **Oracle Java 21:** [Arrays API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Arrays.html) — 기본형 배열과 객체 배열의 `sort` 메서드, 기본형 배열의 Dual-Pivot Quicksort 구현 정보를 확인했다.
* **Oracle Java 21:** [List API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/List.html) — `List.sort()`의 안정성 보장과 기본 구현의 정렬·반영 흐름을 확인했다.
* **Gyoogle:** [tech-interview-for-developer](https://github.com/gyoogle/tech-interview-for-developer) — Algorithm 섹션의 Bubble Sort, Selection Sort, Insertion Sort, Quick Sort 기본 동작과 복잡도를 교차 확인했다.

