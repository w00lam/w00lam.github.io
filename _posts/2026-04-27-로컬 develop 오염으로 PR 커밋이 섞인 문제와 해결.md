---
title: "로컬 develop 오염으로 PR 커밋이 섞인 문제와 해결"
date: 2026-04-27
categories: [TIL, Git]
tags: [Git, Branch, PullRequest, CherryPick, Workflow]
---

## 문제 상황

기능별로 브랜치를 나눠 PR을 생성하는 과정에서 의도하지 않은 커밋이 포함되는 문제가 발생했다.

* 모든 PR의 base는 `develop`
* 하지만 특정 PR에 이전 작업의 커밋과 변경 파일이 함께 포함됨
* 예: `feature/common-response` PR에 `common-enums` 관련 변경이 같이 노출

---

## 원인 분석

문제의 핵심은 브랜치 전략이 아니라
**로컬 `develop` 브랜치의 상태**였다.

다음과 같은 흐름이 있었다.

```bash
git checkout develop
git merge feature/common-enums   # 로컬에만 merge

git checkout -b feature/common-response
```

이 경우 상태는 다음과 같이 나뉜다.

```text
origin/develop
   └─ 실제 기준이 되는 develop

local develop
   └─ feature/common-enums 커밋이 포함된 상태

feature/common-response
   └─ local develop 기준으로 분기됨
```

즉, 새 브랜치가 **이미 이전 feature 커밋을 포함한 상태에서 생성된 것**이다.

---

## PR에서 커밋이 섞여 보인 이유

PR은 다음 기준으로 비교된다.

```text
base: develop (origin/develop)
compare: feature/common-response
```

하지만 `feature/common-response`에는
로컬에서 merge된 `common-enums` 커밋이 포함되어 있었기 때문에

👉 GitHub는 이를 "새로운 변경"으로 인식

결과적으로 PR에 불필요한 변경 사항이 함께 표시되었다.

---

## 해결 방법

### 1. 기존 브랜치 백업

```bash
git checkout feature/common-response
git branch backup/common-response
```

---

### 2. 원격 develop 기준으로 clean 브랜치 생성

```bash
git fetch origin
git checkout -b feature/common-response-clean origin/develop
```

---

### 3. 필요한 커밋만 cherry-pick

```bash
git cherry-pick <커밋_HASH>
```

---

### 4. 기존 PR 브랜치에 강제 반영

```bash
git push --force-with-lease origin feature/common-response-clean:feature/common-response
```

* PR 브랜치 이름 유지
* 불필요한 커밋 제거

---

## 예방 방법

### 1. 로컬 develop을 항상 원격 기준으로 동기화

```bash
git checkout develop
git fetch origin
git reset --hard origin/develop
```

또는:

```bash
git pull origin develop
```

---

### 2. 로컬 develop에 feature 브랜치 직접 merge 금지

```bash
git checkout develop
git merge feature/common-enums   # 지양
```

👉 feature → develop 병합은 반드시 PR을 통해 수행

---

### 3. 새 브랜치는 항상 origin/develop 기준으로 생성

```bash
git fetch origin
git checkout -b feature/common-response origin/develop
```

---

### 4. PR 전 커밋 범위 확인

```bash
git log --oneline origin/develop..HEAD
```

* 현재 작업과 무관한 커밋이 있다면 정리 필요

---

## 핵심 정리

* 문제의 본질은 브랜치 생성 위치가 아니라 **오염된 로컬 develop**
* 로컬에서 merge된 커밋은 원격과 다른 히스토리를 만든다
* 이 상태에서 브랜치를 생성하면 이전 작업이 함께 포함된다
* 해결은 `origin/develop` 기준으로 브랜치를 재구성하고 cherry-pick
* 예방은 **모든 병합을 PR 기반으로 일원화**하는 것

---

## 한 줄 정리

> 브랜치 문제처럼 보였지만, 실제 원인은 로컬 develop의 히스토리 오염이었다.
