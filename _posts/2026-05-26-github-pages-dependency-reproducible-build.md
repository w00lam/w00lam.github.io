---
title: "어제는 됐는데 오늘은 왜 안 될까? GitHub Pages 의존성 문제와 재현 가능한 빌드"
date: 2026-05-26
categories: [DevOps, CI/CD, Jekyll]
tags: [GitHub Pages, Jekyll, Chirpy, Dependency, Lockfile, Reproducible Build, Codespaces, CI/CD]
permalink: /posts/github-pages-dependency-reproducible-build/
---

## 들어가면서

개발을 하다 보면 "어제는 잘 됐는데 오늘은 왜 안 될까?"라는 상황을 만납니다. CI/CD 환경이라면 더 당황스럽습니다. 최근 GitHub Pages에 Chirpy 테마로 기술 블로그를 운영하다가 저도 이 상황을 겪었습니다. 전날까지 잘 배포되던 블로그가 갑자기 GitHub Actions에서 실패하기 시작한 것입니다. 이 글에서는 그 문제를 해결하면서 의존성(Dependency), 락파일(Lockfile), 재현 가능한 빌드(Reproducible Build)가 왜 중요한지 다시 짚어 본 과정을 정리합니다.

## 문제의 시작: GitHub Actions 빌드 실패

제 GitHub Pages 블로그는 Jekyll과 Chirpy 테마를 기반으로 하고, GitHub Actions로 자동 빌드·배포되도록 설정돼 있었습니다. 그런데 어느 날 워크플로우가 실패했다는 알림을 받았습니다. 에러 로그를 확인해보니 `sass-embedded (1.100.0) 설치 실패` 메시지가 눈에 띄었습니다.

```
Run bundle install
...
Gem::Ext::BuildError: ERROR: Failed to build gem native extension.
...
An error occurred while installing sass-embedded (1.100.0), and Bundler cannot continue.
Make sure that `gem install sass-embedded -v '1.100.0' --source 'https://rubygems.org/'` succeeds before bundling.
```

처음에는 제 코드가 문제인가 싶었지만, 마지막 커밋 이후로 블로그 콘텐츠를 손댄 적이 없었습니다. 코드는 그대로인데 빌드만 실패한 것입니다.

## Dependency: 내 코드만으로 실행되지 않는 세상

소프트웨어 프로젝트는 대개 내 코드만으로 돌아가지 않습니다. 다른 개발자들이 만들어 둔 수많은 **외부 라이브러리(Dependency)**를 가져와 쓰기 때문입니다. 제 블로그 프로젝트도 다음과 같은 의존성 체인 위에 놓여 있었습니다.

*   **Chirpy 테마**는 **Jekyll**에 의존합니다.
*   **Jekyll**은 Markdown을 HTML로 변환하거나 CSS를 처리하기 위해 **jekyll-sass-converter**와 같은 플러그인에 의존합니다.
*   **jekyll-sass-converter**는 다시 **sass-embedded**라는 Sass 컴파일러에 의존합니다.

이런 의존성 체인 덕분에 복잡한 기능을 직접 구현하지 않고도 효율적으로 개발할 수 있습니다. 대신 의존성 관리가 그만큼 중요해집니다.

## 왜 같은 코드인데 어제는 성공하고 오늘은 실패할 수 있는가?

문제의 핵심은 여기 있었습니다. 제 코드는 그대로였지만 의존성 버전은 바뀌었을 수 있다는 점입니다. GitHub Actions에서 `bundle install`이 실행되면 `Gemfile`에 명시된 의존성을 최신 버전으로 설치하려 합니다. `Gemfile.lock`이 없거나 최신 상태가 아니면, `Gemfile`이 허용하는 범위 안에서 가장 최신 버전을 찾아 설치합니다.

이 과정에서 다음과 같은 문제들이 발생할 수 있습니다.

*   **최신 Dependency 자동 설치**: 의존성 라이브러리 개발자들은 버그 수정이나 기능 추가를 위해 지속적으로 새 버전을 릴리스합니다. `bundle install`은 기본적으로 이 최신 버전을 선호합니다.
*   **Dependency Resolution**: 여러 의존성들이 서로 다른 버전의 하위 의존성을 요구할 때, `bundle install`은 이 모든 요구사항을 만족하는 최적의 버전 조합을 찾아야 합니다. 이 과정이 복잡해지면 예상치 못한 버전 충돌이 발생할 수 있습니다.
*   **Version Drift (버전 불일치)**: 어제는 `sass-embedded`의 1.99.0 버전이 최신이었고 `jekyll-sass-converter`와 호환되었지만, 오늘은 1.100.0 버전이 릴리스되었고 이 버전이 특정 이유로 `jekyll-sass-converter`와 호환되지 않을 수 있습니다. 이렇게 시간이 지남에 따라 의존성 버전이 변경되어 발생하는 문제를 **버전 불일치(Version Drift)**라고 합니다.
*   **Environment Inconsistency (환경 불일치)**: 로컬 개발 환경에서는 특정 버전의 의존성이 설치되어 있었지만, CI/CD 환경에서는 다른 버전이 설치되면서 빌드 결과가 달라지는 현상입니다.

제 빌드 실패도 `jekyll-sass-converter`가 요구하는 `sass-embedded` 버전과 `bundle install`이 설치하려던 `sass-embedded (1.100.0)` 사이의 호환성 문제였습니다.

## 의존성 버전 불일치 (Dependency Version Drift) 시각화

![의존성 버전 불일치](/assets/images/2026-05-26-github-pages-dependency/dependency-version-drift.png)

## Gemfile vs Gemfile.lock: 재현 가능한 빌드의 핵심

이 문제를 풀려면 **`Gemfile`**과 **`Gemfile.lock`**의 역할을 다시 정리해야 했습니다.

*   **`Gemfile`**: 프로젝트가 필요로 하는 의존성(Gem)의 이름과 원하는 **버전 범위**를 정의합니다. 예를 들어 `gem 'jekyll', '~> 4.2'`처럼 특정 버전 이상을 허용하되 주 버전은 유지하는 방식으로 적습니다.
*   **`Gemfile.lock`**: `bundle install`을 실행하면 생성되는 파일로, `Gemfile`에 명시된 의존성을 바탕으로 **실제로 설치된 모든 의존성의 정확한 버전과 그 하위 의존성까지 기록**합니다. 프로젝트의 모든 의존성 트리를 고정(lock)하는 역할을 합니다.

`Gemfile.lock`은 "재현 가능한 빌드"의 핵심입니다. 이 파일이 있으면 `bundle install`은 `Gemfile`을 다시 해석하지 않고 `Gemfile.lock`에 기록된 버전 그대로 설치합니다. 덕분에 어떤 환경에서 언제 빌드하든 항상 같은 의존성 세트를 씁니다.

제 경우 GitHub Actions에서 `Gemfile.lock`이 제대로 관리되지 않았거나, 로컬에서 `bundle update`로 `Gemfile.lock`을 갱신하지 않고 커밋해 CI 환경과 버전이 어긋났을 가능성이 높았습니다.

## 해결 과정: 버전 고정(Pinning)과 Lockfile 갱신

문제의 원인을 파악한 후, 해결 과정은 다음과 같았습니다.

1.  **`sass-embedded` 버전 확인**: 에러 로그의 `sass-embedded (1.100.0)` 설치 실패로 보아 이 버전이 원인이라고 짐작했습니다. `jekyll-sass-converter`와 호환되는 안정적인 버전을 찾아야 했고, 검색해 보니 `1.77.8` 버전이 널리 쓰이고 안정적이었습니다.
2.  **`Gemfile`에 버전 고정**: `Gemfile`을 열어 `sass-embedded`의 버전을 `gem 'sass-embedded', '~> 1.77.8'`와 같이 명시적으로 고정했습니다. 이는 `1.77.8` 버전 이상이면서 `1.78.0` 미만의 버전을 사용하겠다는 의미입니다.
3.  **`bundle install` 실행**: 로컬에서 `bundle install`을 실행했습니다. 이 명령은 `Gemfile`을 읽어 의존성 트리를 계산하고, 고정한 `sass-embedded`를 포함한 모든 의존성을 설치하면서 `Gemfile.lock`을 새로 생성하거나 갱신합니다. 이제 `Gemfile.lock`에는 `sass-embedded`의 `1.77.8` 버전이 정확히 명시됩니다.
4.  **GitHub Codespaces 활용**: 로컬에 Ruby/Jekyll 개발 환경이 제대로 갖춰져 있지 않아 GitHub Codespaces에서 작업을 진행했습니다. Codespaces는 클라우드 기반 개발 환경이라 로컬 설정을 고민할 것 없이 바로 작업에 착수할 수 있었습니다.
5.  **커밋 및 푸시**: 갱신된 `Gemfile`과 `Gemfile.lock` 파일을 커밋하고 GitHub 저장소에 푸시했습니다.
6.  **GitHub Actions 정상 동작**: 예상대로 GitHub Actions 워크플로우가 성공적으로 빌드되고 배포되었습니다.

## `bundle install`의 역할: 단순한 다운로드 그 이상

`bundle install`은 단순히 의존성 패키지를 내려받는 명령이 아닙니다. 하는 일이 생각보다 복잡하고 중요합니다.

*   **의존성 트리 계산**: `Gemfile`에 명시된 의존성들과 그 하위 의존성들 간의 복잡한 관계를 분석하여 완전한 의존성 트리를 계산합니다.
*   **설치 버전 결정**: 각 의존성에 대해 `Gemfile`의 버전 범위와 기존 `Gemfile.lock`의 정보를 바탕으로 설치할 정확한 버전을 결정합니다. 만약 `Gemfile.lock`이 없거나 `Gemfile`의 변경으로 인해 갱신이 필요하면, `Gemfile`의 범위 내에서 최신 호환 버전을 찾습니다.
*   **Lockfile 생성/갱신**: 이 모든 결정 사항을 `Gemfile.lock` 파일에 기록하여, 다음 빌드 시에는 동일한 의존성 세트가 사용되도록 보장합니다.

이렇게 `bundle install`은 프로젝트의 의존성 환경을 일관되게 유지하고, "재현 가능한 빌드"의 기반을 마련합니다.

## Codespaces를 사용하면서 느낀 점

이번에 GitHub Codespaces를 쓴 것은 효과가 좋았습니다. 로컬에 Ruby/Jekyll 환경을 직접 구축하고 관리하는 번거로움 없이, 클라우드에서 바로 개발 환경을 띄워 작업할 수 있었습니다. 필요한 도구와 의존성이 미리 설정돼 있어 "내 컴퓨터에서는 되는데 네 컴퓨터에서는 안 되는" 문제를 처음부터 막아 줍니다. 원격 개발 환경(Remote Development Environment)의 강점을 확인한 셈입니다.

## 느낀 점: 코드만큼 중요한 실행 환경의 일관성

이번 경험에서 얻은 교훈은 다음과 같습니다.

*   **CI/CD에서 중요한 것은 코드만이 아니라 실행 환경의 일관성**: 코드가 아무리 완벽해도, 이를 빌드하고 실행하는 환경이 일관되지 않으면 예상치 못한 문제가 발생할 수 있습니다. 특히 의존성 버전 관리는 CI/CD 파이프라인의 안정성에 직결됩니다.
*   **`Gemfile.lock`은 단순 생성 파일이 아니라 Reproducibility를 위한 중요한 구성 요소**: `Gemfile.lock`과 같은 락파일은 개발자가 의도적으로 관리해야 하는 중요한 파일입니다. 이 파일이 제대로 관리되지 않으면 "어제는 됐는데 오늘은 안 되는" 상황이 반복될 수 있습니다.
*   **"어제는 됐는데 오늘은 안 된다"는 문제는 Dependency/Environment 문제일 수 있다**: 이 문구는 개발자에게 익숙한 좌절의 표현이지만, 의존성 버전 불일치나 환경 불일치 같은 근본 원인을 추적하는 단서가 되기도 합니다.

마침 최근 AI 에이전트의 런타임/오케스트레이션 개념을 공부하며 **"재현 가능한 실행 환경(Reproducible Environment)"**이 왜 중요한지 들여다보던 참이었습니다. AI 에이전트도 지침(Instructions)만으로는 부족하고, 안정적이고 예측 가능한 실행 환경(Harness)이 있어야 복잡한 작업을 해냅니다. 이번 GitHub Pages 의존성 문제는 같은 원칙이 소프트웨어 빌드 환경에도 그대로 적용된다는 것을 실제 사례로 보여줬습니다. 어떤 시스템이든 안정적으로 동작하려면 코드뿐 아니라 그 코드가 실행되는 환경까지 철저히 관리해야 합니다.

---

## References

*   [Jekyll 공식 문서](https://jekyllrb.com/)
*   [Bundler 공식 문서](https://bundler.io/)
*   [GitHub Actions 공식 문서](https://docs.github.com/en/actions)
*   [GitHub Codespaces 공식 문서](https://docs.github.com/en/codespaces)
