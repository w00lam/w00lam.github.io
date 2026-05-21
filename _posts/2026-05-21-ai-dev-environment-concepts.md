---
title: "AI 개발 환경을 공부하면서 헷갈렸던 개념들"
date: 2026-05-21
categories: [AI, Development]
tags: [AI, Agent, Harness, Instructions, AgentOS, Workflow, Codex, Antigravity]
permalink: /posts/ai-dev-environment-concepts/
---

## 들어가면서

최근 Codex와 Antigravity 기반 AI 개발 환경들을 사용하면서, AI 개발 workflow 자체에 대한 관심이 생겼다. 처음에는 Harness, Instructions, Agent OS, AGENT.md 같은 개념들을 거의 비슷한 의미라고 생각했다. 특히 AGENT.md 같은 규칙 파일도 Harness의 일부라고 생각했는데, 실제로 공부해보니 둘은 역할 자체가 달랐다. 마치 복잡한 기술 개념들이 그러하듯, AI 에이전트 환경도 그 내부 동작 원리를 파고들수록 새로운 관점이 열렸다.

---

## Harness와 Instructions의 차이

![Harness vs Instructions](/assets/images/2026-05-21-posting/harness-vs-instructions.png)

내가 이해한 기준으로는:

- **Instructions(지침)**은 "에이전트가 어떻게 행동해야 하는가"
- **Harness(하네스)**는 "에이전트가 어떤 환경에서 실행되는가"

의 차이에 가까웠다.

예를 들어 AGENT.md에서는:
- commit 하지 말 것
- main 브랜치에서 작업하지 말 것
- 작업 전에 git status 확인할 것
- 작은 diff 유지할 것

같은 **행동 규칙**을 정의한다.

반면 Harness는:
- 어떤 파일에 접근 가능한지
- git 권한이 어디까지 허용되는지
- terminal command 실행이 가능한지
- sandbox 안에서 동작하는지

같은 **실행 환경 자체를 제어**한다. 이는 마치 샌드박스 환경이 프로세스의 실행 범위를 제한하고 통제하는 것과 유사한 역할을 한다.

즉:

- **Instructions**는 "어떻게 행동할지" (What to do)
- **Harness**는 "어디까지 허용되는지" (Where and how far it can go)

를 담당한다는 차이를 이해하게 되었다.

---

## AI 도구들도 모두 같은 역할이 아니었다

처음에는 Codex, Antigravity, Gemini 기반 환경 같은 AI 개발 도구들도 결국 비슷할 거라고 생각했다. 하지만 실제로 사용해보면서, 각 도구마다 강점이 다르다는 걸 느끼게 되었다. 마치 다양한 소프트웨어 도구들이 각자의 강점을 가지듯이, AI 도구들도 각자의 역할이 있었다.

예를 들어 Codex는:
- repository 기반 작업
- 여러 파일 수정
- 구조적인 코드 변경
- diff 생성
- workflow 기반 작업

같은 비교적 복합적인 작업 흐름에 강한 느낌이었다.

반면 Antigravity 기반 환경은:
- 단순한 수정
- 빠른 iteration
- 가벼운 작업
- IDE 기반 상호작용

쪽에서 더 가볍게 사용할 수 있는 느낌이었다.

결국 AI를 단순히 "더 좋은 모델 하나"로 보는 게 아니라, 각 workflow에 맞게 역할을 나누는 게 중요하다는 걸 느끼게 되었다.

---

## Agent OS를 보면서 느낀 점

처음에는 Agent OS도 하나의 AI 실행 도구라고 생각했다. 하지만 실제로는:
- product
- standards
- specs

같은 프로젝트 컨텍스트를 구조화하는 역할에 더 가까웠다.

즉 Agent OS는:
- AI 모델 자체도 아니고
- Harness 자체도 아니라

AI가 프로젝트를 안정적으로 이해할 수 있도록 만드는 "프로젝트 컨텍스트 아키텍처"에 가까웠다.

---

## 느낀 점

AI 개발 workflow를 공부하면서, 중요한 건 단순히 모델 성능만이 아니라는 걸 느끼게 되었다. 오히려:
- 어떤 실행 환경(Harness)에서 동작하는지
- 어떤 행동 규칙(Instructions)을 가지는지
- 어떤 프로젝트 컨텍스트를 제공하는지
- 어떤 workflow에 연결되는지

가 실제 개발 경험에 더 큰 영향을 주고 있었다.

특히 여러 AI 도구들을 사용하면서, 앞으로는 하나의 AI만 사용하는 것이 아니라, 상황에 따라 적절한 역할을 분리해서 사용하는 방향으로 발전할 것 같다는 생각이 들었다.

---

## References


