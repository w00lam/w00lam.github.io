---
title: "재귀의 늪에서 탈출하기: 메모이제이션(Memoization)"
date: 2026-04-06
categories: [Algorithm, Java]
tags: [Memoization, DynamicProgramming, Recursion, Fibonacci]
permalink: /posts/recursion-memoization/
---

**"한 줄 요약: 이미 계산한 값은 기록해두자. 기억력은 곧 성능이다."**

## 1. 메모이제이션(Memoization)이란?

재귀 함수가 동일한 계산을 반복해야 할 때 이전에 계산한 결과를 메모리에 **기록(Caching)** 해 두었다가 다시 사용하는 기법입니다. 
* **핵심:** '중복 계산'을 제거해 실행 속도를 크게 끌어올린다.
* **조건:** 동일한 입력에 항상 같은 출력을 반환하는 '순수 함수' 구조에서 특히 잘 맞는다.

---

## 2. 코드 비교: 일반 재귀 vs 메모이제이션

### [Case A] 일반 재귀 (Native Recursion)
가장 직관적이지만 숫자가 조금만 커져도 시스템이 멈춥니다.
```java
public int fibo(int n) {
    if (n <= 1) return n;
    return fibo(n - 1) + fibo(n - 2); // 매번 처음부터 다시 계산
}
```

### [Case B] 메모이제이션 적용 (Memoized Recursion)

한 번 구한 값은 `memo` 배열에 저장하고 동일한 요청이 들어오면 다시 계산하지 않고 꺼내 씁니다.
```java
public class Fibonacci {
    // 계산된 값을 저장하기 위한 기록 저장소 (Memoization Table)
    static int[] memo = new int[100]; 

    public int fiboMemo(int n) {
        // 기본 케이스: 0과 1은 그대로 반환
        if (n <= 1) return n;
        
        // 1. 이미 기록된 값이 있다면 즉시 반환 (조기 종료 - 핵심 로직)
        if (memo[n] != 0) return memo[n];
        
        // 2. 기록이 없다면 계산 후 배열에 저장(기록)
        memo[n] = fiboMemo(n - 1) + fiboMemo(n - 2);
        
        return memo[n];
    }
}
```

---

## 3. 시간 복잡도 분석: $O(2^n)$ vs $O(n)$

일반 재귀와 메모이제이션의 성능 차이는 데이터가 커질수록 기하급수적으로 벌어집니다. '지수 시간'과 '선형 시간'만큼의 격차입니다.

| 구분 | 일반 재귀 (Native) | 메모이제이션 적용 (Memoized) |
| :--- | :--- | :--- |
| **시간 복잡도** | $O(2^n)$ | $O(n)$ |
| **특징** | 호출 트리가 기하급수적으로 증가 (중복 발생) | 각 숫자를 딱 한 번만 계산함 |
| **성능 체감** | $n=45$일 때 약 수십 초 소요 | $n=45$일 때 **0.001초 미만** |

---

## 4. 왜 메모이제이션을 사용해야 하는가?

1.  **중복 부분 문제(Overlapping Subproblems) 해결:** 피보나치에서 $f(3)$을 구하기 위해 $f(2)$, $f(1)$을 부르고 $f(4)$를 위해 다시 $f(3)$을 부르는 식의 낭비를 완벽히 제거합니다.
2.  **함수 호출 비용 절감:** 재귀는 호출될 때마다 스택 메모리를 사용합니다. 메모이제이션은 불필요한 스택 쌓기를 방지하여 **StackOverflow** 위험을 줄여줍니다.
3.  **효율적인 자원 관리:** 똑같은 답을 얻으려고 CPU를 100번 돌리던 것을 단 한 번으로 줄이면 시스템 전체의 신뢰성과 응답 속도가 올라갑니다.

---

## 5. 오늘의 회고: 기록(History)과 캐싱의 힘

### 메모이제이션에서 떠오른 안정 계수 정렬
이번에 **메모이제이션(Memoization)** 을 접하면서 지난번에 배운 **안정 계수 정렬(Stable Counting Sort)** 이 자연스럽게 떠올랐습니다. 두 알고리즘은 목적은 달라 보여도 그 바탕에는 **"기록을 통해 연산 비용을 지불한다"** 는 공통된 설계 방식이 깔려 있었습니다.

* **안정 계수 정렬:** 입력 데이터의 빈도와 위치를 미리 **기록**하여 비교 연산을 생략함.
* **메모이제이션:** 함수의 결과값을 미리 **기록**하여 중복 재귀 연산을 생략함.

### Space-Time Trade-off와 캐싱(Caching)
이 모든 과정은 **Space-Time Trade-off(시공간 효율성의 절충)** 를 실제로 구현한 셈입니다. 
안정 계수 정렬이 데이터의 순서 이력을 보존하고 정확한 위치를 계산하려고 보조 배열을 썼다면, 메모이제이션은 연산 이력을 보관하려고 일종의 **캐시(Cache)** 를 운용하는 셈입니다. 
"무언가를 미리 기록해두고 재활용한다"는 **캐싱의 원리**가 알고리즘 최적화의 핵심이라는 것을 깨달았습니다. 기록은 과거를 담아두는 데 그치지 않고, 앞으로 치를 연산 비용을 미리 정산해두는 투자에 가깝다는 것도 배웠습니다.

---

## References

* **GeeksforGeeks:** [Memoization (1D, 2D and 3D)](https://www.geeksforgeeks.org/memoization-1d-2d-and-3d/)
* **Introduction to Algorithms (CLRS):** Chapter 15. Dynamic Programming
* **Java Documentation:** [Performance of Recursive Methods](https://docs.oracle.com/javase/tutorial/java/javaOO/nested.html)
