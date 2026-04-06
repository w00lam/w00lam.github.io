---
title: "재귀의 늪에서 탈출하기: 메모이제이션(Memoization)"
date: 2026-04-06
categories: [Algorithm, Java]
tags: [Memoization, DynamicProgramming, Recursion, Fibonacci]
---

**"한 줄 요약: 이미 계산한 값은 기록해두자. 기억력은 곧 성능이다."**

## 1. 메모이제이션(Memoization)이란?

재귀 함수가 동일한 계산을 반복해야 할 때 이전에 계산한 결과를 메모리에 **기록(Caching)** 해 두었다가 다시 사용하는 기법입니다. 
* **핵심:** '중복 계산'을 제거하여 실행 속도를 비약적으로 향상시킨다.
* **조건:** 동일한 입력에 대해 항상 동일한 출력을 반환하는 '순수 함수' 구조에서 빛을 발한다.

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

일반 재귀와 메모이제이션의 성능 차이는 데이터가 커질수록 기하급수적으로 벌어집니다. 이는 '지수 시간'과 '선형 시간'의 차이만큼이나 극단적인 효율의 격차를 보여줍니다.

| 구분 | 일반 재귀 (Native) | 메모이제이션 적용 (Memoized) |
| :--- | :--- | :--- |
| **시간 복잡도** | $O(2^n)$ | $O(n)$ |
| **특징** | 호출 트리가 기하급수적으로 증가 (중복 발생) | 각 숫자를 딱 한 번만 계산함 |
| **성능 체감** | $n=45$일 때 약 수십 초 소요 | $n=45$일 때 **0.001초 미만** |

---

## 4. 왜 메모이제이션을 사용해야 하는가?

1.  **중복 부분 문제(Overlapping Subproblems) 해결:** 피보나치에서 $f(3)$을 구하기 위해 $f(2)$, $f(1)$을 부르고 $f(4)$를 위해 다시 $f(3)$을 부르는 식의 낭비를 완벽히 제거합니다.
2.  **함수 호출 비용 절감:** 재귀는 호출될 때마다 스택 메모리를 사용합니다. 메모이제이션은 불필요한 스택 쌓기를 방지하여 **StackOverflow** 위험을 줄여줍니다.
3.  **효율적인 자원 관리:** 시간은 금입니다. 똑같은 답을 얻기 위해 CPU를 100번 돌릴 것을 단 1번으로 줄이는 것은 시스템 전체의 신뢰성과 응답 속도를 높이는 핵심입니다.

---

## 5. 오늘의 회고: 기록(History)과 캐싱의 힘

### Insight: 메모이제이션에서 발견한 안정 계수 정렬의 향기
이번 학습을 통해 **메모이제이션(Memoization)** 을 접하며 지난번에 배운 **안정 계수 정렬(Stable Counting Sort)** 이 강력하게 연상되었습니다. 두 알고리즘은 서로 다른 목적을 가진 듯 보이지만 그 기저에는 **"기록을 통해 연산 비용을 지불한다"** 는 공통된 설계 패러다임이 흐르고 있었습니다.

* **안정 계수 정렬:** 입력 데이터의 빈도와 위치를 미리 **기록**하여 비교 연산을 생략함.
* **메모이제이션:** 함수의 결과값을 미리 **기록**하여 중복 재귀 연산을 생략함.

### 🛠️ Space-Time Trade-off와 캐싱(Caching)
결국 이 모든 과정은 **Space-Time Trade-off(시공간 효율성의 절충)** 의 실현입니다. 
안정 계수 정렬이 데이터의 순서 이력을 보존하고 정확한 위치를 계산하기 위해 보조 배열을 썼다면 메모이제이션은 연산의 이력을 보관하기 위해 일종의 **캐시(Cache)** 를 운용하는 셈입니다. 
"무언가를 미리 기록해두고 재활용한다"는 **캐싱의 원리**가 알고리즘 최적화의 핵심이라는 것을 깨달았습니다. 기록은 단순히 과거를 담는 것이 아니라 미래에 발생할 막대한 연산 비용을 미리 정산해두는 가장 효율적인 투자임을 배웠습니다.

---

## 📚 References

* **GeeksforGeeks:** [Memoization (1D, 2D and 3D)](https://www.geeksforgeeks.org/memoization-1d-2d-and-3d/)
* **Introduction to Algorithms (CLRS):** Chapter 15. Dynamic Programming
* **Java Documentation:** [Performance of Recursive Methods](https://docs.oracle.com/javase/tutorial/java/javaOO/nested.html)
