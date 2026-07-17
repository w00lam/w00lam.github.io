---
title: "AI 에이전트의 Harness(하네스)에 대한 기술적 고찰"
date: 2026-05-22
categories: [AI, Agent, Harness]
tags: [AI, Agent, Harness, Orchestration, Runtime, Sandbox, Instructions, Tool, Workflow]
permalink: /posts/deep-dive-into-ai-agent-harness/
---

## 들어가면서

최근 AI IDE(Codex, Antigravity 등)를 쓰면서 AI 에이전트가 실제 코드를 수정하고 브랜치를 만들고 PR을 올리는 과정을 지켜보았다. 처음에는 이런 동작을 단순히 `AGENT.md` 파일이나 `system prompt`, 개인 지침(Instructions)의 결과물 정도로만 이해했다. 에이전트가 "무엇을 해야 할지"를 정의하는 것이 전부라고 생각했다. 그런데 복잡한 개발 워크플로우를 수행하는 모습을 보면서, 그 뒤에 훨씬 더 큰 실행 구조가 있다는 걸 알게 됐다. 이 글에서는 그 "실행 구조"의 핵심인 **Harness(하네스)**를 개발자 관점에서 깊이 있게 살펴본다.

## Harness: 단순한 지침을 넘어선 실행 계층

처음에는 Harness를 `AGENT.md` 같은 지침 파일의 연장선으로 보았다. `AGENT.md`는 에이전트의 행동 규칙(예: "commit 하지 말 것", "작업 전에 `git status` 확인할 것")을 정의하고, `system prompt`나 개인 지침은 특정 작업에 필요한 맥락과 목표를 준다. 이들이 에이전트의 행동에 큰 영향을 주는 건 분명하다. 하지만 에이전트가 실제로 파일을 수정하고 터미널 명령어를 실행하고 Git 워크플로우를 수행하는 것까지 이 지침만으로 설명되지는 않는다.

> 이전에 [AI 개발 환경을 공부하면서 헷갈렸던 개념들](/posts/ai-dev-environment-concepts/)이라는 글에서 Harness와 Instructions의 차이를 다음과 같이 정리한 바 있다.
>
> *   **Instructions(지침)**은 "에이전트가 어떻게 행동해야 하는가"
> *   **Harness(하네스)**는 "에이전트가 어떤 환경에서 실행되는가"
>
> 즉, Instructions는 "어떻게 행동할지"를 정의하지만, 실제 그 행동을 가능하게 하고 제어하는 것은 Harness의 역할이다.

Harness는 이런 지침들을 해석해서 실제 환경에서 에이전트가 작업을 수행하도록 돕는 **runtime/orchestration 계층**에 가깝다. "지침 자체는 실행되지 않는다"는 관점에서 보면, Instructions가 에이전트의 행동을 정의하는 **설계도**라면 Harness는 그 설계도를 바탕으로 실제 작업을 돌리는 **실행 엔진**이다.

## Harness의 구성 요소: 런타임 아키텍처

![AI 에이전트 하네스 아키텍처](/assets/images/2026-05-22-posting/ai-agent-harness-architecture-ko.png)


AI 에이전트의 Harness는 여러 계층으로 나뉜다. 각 계층은 에이전트가 작업을 수행하는 데 꼭 필요한 역할을 맡는다. 덕분에 에이전트는 복잡한 태스크를 통제된 환경에서 안정적으로 실행한다.

### 1. Instructions Layer (지침 계층)

*   **역할**: 에이전트의 행동 규칙, 목표, 제약 사항 등을 정의한다. `AGENT.md`, `system prompt`, 사용자 정의 지침 등이 여기에 해당한다. 에이전트가 "무엇을 해야 하는가"와 "어떻게 해야 하는가"에 대한 상위 수준의 가이드라인을 제공한다.

### 2. Tool Layer (도구 계층)

*   **역할**: 에이전트가 외부 시스템과 상호작용할 수 있도록 실제 도구들을 연결한다. `git`, `terminal`, `filesystem`, `browser`와 같은 도구들이 이 계층을 통해 에이전트에게 노출된다. 에이전트는 이 도구들을 사용하여 파일을 읽고 쓰고, 명령어를 실행하고, 웹 페이지를 탐색하는 등 실제 작업을 수행한다.

### 3. Sandbox Layer (샌드박스 계층)

*   **역할**: 에이전트의 실행 환경을 격리하고 제어한다. 에이전트가 접근할 수 있는 파일 시스템의 범위, 네트워크 접근 권한, 실행 가능한 명령어 등을 제한하여 보안과 안정성을 확보한다. **Sandbox는 "무엇을 못하게 할지"를 정의함으로써 에이전트의 잠재적인 위험 행동을 방지한다.**

### 4. Orchestration Layer (오케스트레이션 계층)

*   **역할**: 에이전트의 전체 워크플로우 실행을 제어하고 관리한다. 태스크 라우팅(task routing), 승인 흐름(approval flow), 재시도 로직(retry logic), 병렬 처리 등을 담당한다. 에이전트가 복잡한 다단계 태스크를 수행할 때, 각 단계를 어떻게 진행하고 실패 시 어떻게 대응할지 등을 이 계층에서 조율한다. Harness의 핵심적인 "runtime"이자 "workflow engine"이라고 할 수 있다.

### 5. Memory/Context Layer (메모리/컨텍스트 계층)

*   **역할**: 에이전트의 작업 상태, 실행 히스토리, 중간 결과물, 학습된 정보 등을 지속적으로 유지하고 관리한다. 이를 통해 에이전트는 장기적인 작업을 수행하거나, 이전의 실패 경험을 바탕으로 다음 행동을 결정하는 등 "context persistence"를 확보한다.

## Harness와 Sandbox의 구조적 차이

Sandbox와 Harness는 밀접하지만 역할에는 분명한 차이가 있다. **Sandbox는 주로 "무엇을 못하게 할지"에 초점을 맞춰 에이전트의 실행 환경을 제한한다.** 예를 들어 특정 디렉토리의 쓰기 권한을 없애거나 특정 네트워크 포트 접근을 막는 식이다. 에이전트의 오작동이나 악의적인 행동에서 시스템을 지키려면 이런 제한이 꼭 필요하다.

반면 **Harness는 "전체 실행 흐름을 어떻게 제어할지"에 초점을 맞춘다.** Sandbox가 만든 안전한 환경 위에서 에이전트가 Instructions를 바탕으로 Tool Layer로 실제 작업을 하고 Orchestration Layer가 그 과정을 조율하고 Memory/Context Layer가 상태를 유지하도록 하는, 전체 런타임 환경을 제공한다. 결국 Sandbox는 Harness의 한 구성 요소이고, Harness가 에이전트를 안전하게 실행하기 위한 **기반 환경**을 마련하는 셈이다.

## 실제 AI IDE에서의 Harness 작동 방식

AI IDE(Codex, Antigravity 등)에서 에이전트가 파일을 수정하고 브랜치를 만들고 PR을 올리고 셸 명령어를 실행하는 작업이 가능한 건 바로 이 다층 구조 덕분이다.

*   **파일 수정**: 에이전트는 Instructions Layer에서 "이 파일을 수정하라"는 지침을 받고 Tool Layer의 `filesystem` 도구로 Sandbox Layer가 허용하는 범위 안에서 파일을 읽고 쓴다.
*   **Git 워크플로우**: `git` 도구는 Tool Layer로 제공된다. 에이전트는 이걸로 브랜치 생성, 커밋, 푸시, PR 생성 같은 작업을 한다. 이때 Orchestration Layer는 `git` 명령어가 올바른 순서로 실행되고 필요하면 사용자 승인(approval flow)을 요청하도록 제어한다.
*   **셸 실행**: `terminal` 도구로 Sandbox Layer가 허용하는 범위 안에서 `shell` 명령어를 실행한다. 이 과정은 모두 Memory/Context Layer에 기록되어, 에이전트가 지금 작업 상태를 잊지 않고 다음 단계로 넘어가도록 돕는다.

이처럼 Harness는 에이전트가 단순한 텍스트 생성기를 넘어 실제 시스템과 상호작용하며 복잡한 개발 태스크를 수행하는 **"작업 가능한 시스템"**으로 기능하도록 만든다.

## 비공개된 Harness 내부 구현과 추론

대부분의 상용 AI 에이전트 서비스는 Harness의 내부 구현을 공개하지 않는다. 각 서비스의 핵심 경쟁력이자 보안과 직결되는 부분이라 그렇다. 그래도 우리는 `AGENT.md` 같은 지침 파일의 존재, 에이전트가 쓰는 도구의 종류와 권한(tool permission), 특정 작업에 붙는 사용자 승인 요청(approval flow), 샌드박스 환경의 동작 패턴(sandbox behavior) 같은 **외부 인터페이스와 행동 패턴**을 보고 내부 `orchestration/runtime` 구조를 어느 정도 추론할 수 있다.

예를 들어 에이전트가 특정 파일을 수정하기 전에 "이 파일을 수정해도 될까요?"라고 묻는다면, Harness의 Orchestration Layer에 `approval flow`가 구현돼 있다고 짐작할 수 있다. 에이전트가 어떤 명령어를 실행하려다 권한 오류를 낸다면, Sandbox Layer에서 그 명령어에 `execution restriction`이 걸려 있다는 뜻이다. 이렇게 밖에서 관찰한 것만으로도, 내부 코드는 못 보더라도 Harness가 `workflow engine`, `task routing`, `retry logic`, `context persistence`, `tool execution`, `sandbox isolation` 같은 메커니즘으로 에이전트의 작업을 조율한다는 걸 유추할 수 있다.

## 느낀 점

AI 개발 워크플로우를 파고들면서, AI 에이전트의 성능이 단순히 기반 모델의 지능(Intelligence)에만 달린 게 아니라는 걸 다시 느꼈다. 에이전트가 복잡한 현실 문제를 풀고 개발자의 의도를 정확히 반영하며 안전하고 효율적으로 작업하려면, **Harness의 설계와 구현이 모델 성능만큼이나 중요하다**.

앞으로 AI 에이전트 개발에서는 모델 성능을 끌어올리는 것만큼이나 에이전트가 도는 **런타임 환경(Harness)을 얼마나 더 견고하고 유연하고 안전하게 설계하느냐**가 중요한 고민이 된다. 운영체제(OS)가 하드웨어와 애플리케이션 사이에서 자원 관리와 프로세스 스케줄링을 맡듯이, Harness도 AI 에이전트와 실제 시스템 사이에서 "지능의 오케스트레이션"을 맡기 때문이다. 개발자로서 이 구조를 이해해 두는 일은 AI 에이전트의 잠재력을 끝까지 끌어내고, 나아가 새로운 형태의 AI 기반 시스템을 만드는 데 꼭 필요한 역량이 된다.

---

## References

*   [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)
*   [Code as Agent Harness](https://arxiv.org/abs/2605.18747)
*   [The Anatomy of an Agent Harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness)
*   [AI Agent Runtime: The Execution Layer Behind...](https://agentuity.com/ai-agent-runtime)
*   [What is AI Agent Orchestration? - IBM](https://www.ibm.com/think/topics/ai-agent-orchestration)
*   [AI 개발 환경을 공부하면서 헷갈렸던 개념들](/posts/ai-dev-environment-concepts/)
