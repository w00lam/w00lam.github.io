---
title: Java Scanner nextInt() 호출 후 nextLine() 무시 현상
date: 2026-03-20
categories: [Java, Troubleshooting]
tags: [Java, Scanner, InputBuffer]
---

## 1. 문제 상황

계산기 프로그램을 만들면서 사칙연산이 끝날 때마다 "더 계산하시겠습니까?"라는 질문을 뒤에 사용자의 입력에 따라 반복 여부를 결정하도록 설계했다. 하지만 코드를 실행해 보니 질문 출력 직후 입력을 기다리지 않고 바로 다음 루프로 넘어가 버리는 현상을 겪었다.


## 2. 원인 분석: 입력 버퍼의 잔여 개행 문자(\n)

이 현상은 `Scanner` 메서드들이 입력 버퍼를 처리하는 방식의 차이 때문에 발생한다고 한다.

* **`nextInt()` / `next()`**: 사용자가 입력한 숫자나 단어만 읽어들이고, 마지막에 누른 **엔터(\n)**는 버퍼에 그대로 남겨둔다.
* **`nextLine()`**: 버퍼에서 **엔터(\n)를 포함한 한 줄 전체**를 읽어 들인다.

앞선 단계에서 `nextInt()` 등이 남겨둔 엔터(\n)가 버퍼에 남아 있는 상태에서 `nextLine()`이 호출되면 이 메서드는 해당 엔터를 사용자의 입력으로 간주하여 즉시 읽고 실행을 마친다. 결과적으로 내가 설계했던 방향과는 어긋나게 된다.

## 3. 해결 및 개선 방법

### 방법 1: 버퍼 수동 비우기
`nextLine()`을 호출하기 전, 의미 없는 `sc.nextLine()`을 한 번 실행하여 버퍼에 남은 엔터를 강제로 소모시킨다. 가장 직관적인 해결책이라고 한다.

```java
System.out.print("더 계산하시겠습니까? (exit 입력 시 종료) ");
sc.nextLine(); // 버퍼에 남은 엔터(\n) 제거
choice = sc.nextLine(); // 정상적인 사용자 입력 대기
```

### 방법 2: 모든 입력을 nextLine()으로 통일 (개선안)
버퍼 꼬임 문제를 원천 차단하기 위해 모든 입력을 `nextLine()`으로 받고, 숫자가 필요한 경우에만 타입 변환(Parsing)을 거친다. 이 방법이 실무에서 더 권장된다고 하는데 잘 모르겠다.

```java
// 숫자를 바로 받지 않고 문자열로 받아 변환하여 버퍼 문제를 방지
int a = Integer.parseInt(sc.nextLine()); 
int b = Integer.parseInt(sc.nextLine());
char c = sc.nextLine().charAt(0);

System.out.print("더 계산하시겠습니까? (exit 입력 시 종료) ");
choice = sc.nextLine(); // 버퍼가 항상 비워져 있어 정상 동작
```

## 4. 요약 및 회고

- `Scanner`의 숫자 입력 메서드는 개행 문자(`\n`)를 버퍼에 남긴다.
- 입력을 제어할 때 흐름이 의도와 다르게 넘어간다면 입력 버퍼 상태를 의심해야 한다.
- 단순히 기능 구현에 그치지 않고 사용하는 함수가 내부적으로 데이터를 어떻게 처리하는지 이해하는 것이 정확한 디버깅의 시작임을 배웠다.

---

### 🔗 참고 자료 (Sources)
* **Oracle Java Documentation:** [Scanner.nextLine() Method](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Scanner.html#nextLine())
* **Java Language Specification:** [Chapter 3. Lexical Structure](https://docs.oracle.com/javase/specs/jls/se17/html/jls-3.html#jls-3.10.6)
* **Baeldung:** [Scanner skipping nextLine() issue](https://www.baeldung.com/java-scanner-skip-nextline)
