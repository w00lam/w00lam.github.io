---
title: "어제는 됐는데 오늘은 왜 안 될까? GitHub Pages 의존성 문제와 재현 가능한 빌드"
date: 2026-05-26
categories: [DevOps, CI/CD, Jekyll]
tags: [GitHub Pages, Jekyll, Chirpy, Dependency, Lockfile, Reproducible Build, Codespaces, CI/CD]
permalink: /posts/github-pages-dependency-reproducible-build/
---

## 들어가면서

개발을 하다 보면 "어제는 잘 됐는데 오늘은 왜 안 될까?"라는 질문에 직면할 때가 있습니다. 특히 CI/CD 환경에서 이런 문제가 발생하면 당황스럽기 마련입니다. 최근 GitHub Pages에 Chirpy 테마를 적용하여 기술 블로그를 운영하던 중, 저 역시 이와 같은 상황을 겪었습니다. 전날까지 정상적으로 배포되던 블로그가 갑자기 GitHub Actions에서 실패하기 시작한 것입니다. 이 글에서는 이 문제를 해결하는 과정을 통해 **의존성(Dependency)**, **락파일(Lockfile)**, 그리고 **재현 가능한 빌드(Reproducible Build)**의 중요성을 깊이 있게 이해하게 된 경험을 공유하고자 합니다.

## 문제의 시작: GitHub Actions 빌드 실패

제 GitHub Pages 블로그는 Jekyll과 Chirpy 테마를 기반으로 합니다. GitHub Actions를 통해 자동으로 빌드되고 배포되도록 설정되어 있었죠. 그런데 어느 날 갑자기 GitHub Actions 워크플로우가 실패했다는 알림을 받았습니다. 에러 로그를 확인해보니 `sass-embedded (1.100.0) 설치 실패`라는 메시지가 눈에 띄었습니다.

```
Run bundle install
...
Gem::Ext::BuildError: ERROR: Failed to build gem native extension.
...
An error occurred while installing sass-embedded (1.100.0), and Bundler cannot continue.
Make sure that `gem install sass-embedded -v '1.100.0' --source 'https://rubygems.org/'` succeeds before bundling.
```

처음에는 제 코드에 문제가 있나 싶었지만, 마지막으로 커밋한 이후로 블로그 콘텐츠를 수정한 적이 없었습니다. 즉, 제 코드 자체는 전혀 바뀌지 않았는데 빌드가 실패한 것입니다. 이 상황은 저를 혼란스럽게 만들었습니다.

## Dependency: 내 코드만으로 실행되지 않는 세상

모든 소프트웨어 프로젝트는 사실 내 코드만으로 실행되지 않습니다. 대부분의 경우, 우리는 다른 개발자들이 만들어 놓은 수많은 **외부 라이브러리(Dependency)**들을 가져와 사용합니다. 제 블로그 프로젝트의 경우에도 다음과 같은 의존성 체인을 가지고 있었습니다.

*   **Chirpy 테마**는 **Jekyll**에 의존합니다.
*   **Jekyll**은 Markdown을 HTML로 변환하거나 CSS를 처리하기 위해 **jekyll-sass-converter**와 같은 플러그인에 의존합니다.
*   **jekyll-sass-converter**는 다시 **sass-embedded**라는 Sass 컴파일러에 의존합니다.

이러한 의존성 체인 덕분에 우리는 복잡한 기능을 직접 구현할 필요 없이 효율적으로 개발할 수 있습니다. 하지만 동시에 의존성 관리가 중요해지는 이유이기도 합니다.

## 왜 같은 코드인데 어제는 성공하고 오늘은 실패할 수 있는가?

문제의 핵심은 여기에 있었습니다. 제 코드는 바뀌지 않았지만, **의존성들의 버전이 바뀌었을 가능성**이 있다는 것이죠. GitHub Actions 환경에서는 `bundle install` 명령이 실행될 때, `Gemfile`에 명시된 의존성들을 최신 버전으로 자동 설치하려는 경향이 있습니다. 만약 `Gemfile.lock` 파일이 없거나 최신 상태가 아니라면, `bundle install`은 `Gemfile`에 명시된 범위 내에서 최신 버전을 찾아 설치하게 됩니다.

이 과정에서 다음과 같은 문제들이 발생할 수 있습니다.

*   **최신 Dependency 자동 설치**: 의존성 라이브러리 개발자들은 버그 수정이나 기능 추가를 위해 지속적으로 새 버전을 릴리스합니다. `bundle install`은 기본적으로 이 최신 버전을 선호합니다.
*   **Dependency Resolution**: 여러 의존성들이 서로 다른 버전의 하위 의존성을 요구할 때, `bundle install`은 이 모든 요구사항을 만족하는 최적의 버전 조합을 찾아야 합니다. 이 과정이 복잡해지면 예상치 못한 버전 충돌이 발생할 수 있습니다.
*   **Version Drift (버전 불일치)**: 어제는 `sass-embedded`의 1.99.0 버전이 최신이었고 `jekyll-sass-converter`와 호환되었지만, 오늘은 1.100.0 버전이 릴리스되었고 이 버전이 특정 이유로 `jekyll-sass-converter`와 호환되지 않을 수 있습니다. 이렇게 시간이 지남에 따라 의존성 버전이 변경되어 발생하는 문제를 **버전 불일치(Version Drift)**라고 합니다.
*   **Environment Inconsistency (환경 불일치)**: 로컬 개발 환경에서는 특정 버전의 의존성이 설치되어 있었지만, CI/CD 환경에서는 다른 버전이 설치되면서 빌드 결과가 달라지는 현상입니다.

결국, 제 GitHub Actions 빌드 실패는 `jekyll-sass-converter`가 요구하는 `sass-embedded`의 버전과, `bundle install`이 설치하려던 `sass-embedded (1.100.0)` 버전 사이에 호환성 문제가 발생했기 때문이었습니다.

## 의존성 버전 불일치 (Dependency Version Drift) 시각화

![의존성 버전 불일치](/assets/images/2026-05-26-github-pages-dependency/dependency-version-drift.png)

## Gemfile vs Gemfile.lock: 재현 가능한 빌드의 핵심

이 문제를 해결하기 위해 **`Gemfile`**과 **`Gemfile.lock`**의 역할에 대해 다시 한번 깊이 생각하게 되었습니다.

*   **`Gemfile`**: 프로젝트가 필요로 하는 의존성(Gem)의 이름과 원하는 **버전 범위**를 정의합니다. 예를 들어, `gem 

`jekyll`, `~> 4.2`와 같이 특정 버전 이상을 허용하되 주 버전은 유지하는 방식으로 정의할 수 있습니다.
*   **`Gemfile.lock`**: `bundle install` 명령을 실행하면 생성되는 파일로, `Gemfile`에 명시된 의존성들을 바탕으로 **실제로 설치된 모든 의존성의 정확한 버전과 그 하위 의존성까지 기록**합니다. 이 파일은 프로젝트의 모든 의존성 트리를 고정(lock)하는 역할을 합니다.

`Gemfile.lock`의 존재는 "재현 가능한 빌드"를 가능하게 하는 핵심입니다. `Gemfile.lock`이 있으면 `bundle install`은 `Gemfile`을 해석하는 대신 `Gemfile.lock`에 기록된 정확한 버전의 의존성들을 설치하려고 시도합니다. 이 덕분에 어떤 환경에서든, 언제 빌드하든 항상 동일한 의존성 세트를 사용하여 빌드할 수 있게 됩니다.

제 경우, GitHub Actions 환경에서 `Gemfile.lock`이 제대로 관리되지 않거나, 혹은 제가 로컬에서 `bundle update`를 통해 `Gemfile.lock`을 갱신하지 않은 채 커밋하여 CI 환경과 버전 불일치가 발생했을 가능성이 높았습니다.

## 해결 과정: 버전 고정(Pinning)과 Lockfile 갱신

문제의 원인을 파악한 후, 해결 과정은 다음과 같았습니다.

1.  **`sass-embedded` 버전 확인**: 에러 로그에서 `sass-embedded (1.100.0)` 설치 실패를 확인했으므로, 이 버전이 문제의 원인임을 짐작했습니다. `jekyll-sass-converter`와 호환되는 안정적인 `sass-embedded` 버전을 찾아야 했습니다. 검색을 통해 `1.77.8` 버전이 널리 사용되고 안정적임을 확인했습니다.
2.  **`Gemfile`에 버전 고정**: `Gemfile`을 열어 `sass-embedded`의 버전을 `gem 'sass-embedded', '~> 1.77.8'`와 같이 명시적으로 고정했습니다. 이는 `1.77.8` 버전 이상이면서 `1.78.0` 미만의 버전을 사용하겠다는 의미입니다.
3.  **`bundle install` 실행**: 로컬 환경에서 `bundle install`을 실행했습니다. 이 명령은 `Gemfile`을 읽어 의존성 트리를 계산하고, `sass-embedded`의 고정된 버전을 포함하여 모든 의존성을 설치합니다. 그리고 이 과정에서 `Gemfile.lock` 파일이 새로 생성되거나 갱신됩니다. 이 `Gemfile.lock`에는 이제 `sass-embedded`의 `1.77.8` 버전이 정확히 명시됩니다.
4.  **GitHub Codespaces 활용**: 로컬에 Ruby/Jekyll 개발 환경이 제대로 구축되어 있지 않았기 때문에, GitHub Codespaces를 활용하여 이 작업을 진행했습니다. Codespaces는 클라우드 기반의 개발 환경을 제공하여, 로컬 설정에 대한 고민 없이 바로 작업에 착수할 수 있게 해주었습니다. 이는 **재현 가능한 환경(Reproducible Environment)**의 중요성을 다시 한번 느끼게 하는 경험이었습니다.
5.  **커밋 및 푸시**: 갱신된 `Gemfile`과 `Gemfile.lock` 파일을 커밋하고 GitHub 저장소에 푸시했습니다.
6.  **GitHub Actions 정상 동작**: 예상대로 GitHub Actions 워크플로우가 성공적으로 빌드되고 배포되었습니다.

## `bundle install`의 역할: 단순한 다운로드 그 이상

`bundle install`은 단순히 의존성 패키지를 다운로드하는 명령이 아닙니다. 그 역할은 훨씬 더 복잡하고 중요합니다.

*   **의존성 트리 계산**: `Gemfile`에 명시된 의존성들과 그 하위 의존성들 간의 복잡한 관계를 분석하여 완전한 의존성 트리를 계산합니다.
*   **설치 버전 결정**: 각 의존성에 대해 `Gemfile`의 버전 범위와 기존 `Gemfile.lock`의 정보를 바탕으로 설치할 정확한 버전을 결정합니다. 만약 `Gemfile.lock`이 없거나 `Gemfile`의 변경으로 인해 갱신이 필요하면, `Gemfile`의 범위 내에서 최신 호환 버전을 찾습니다.
*   **Lockfile 생성/갱신**: 이 모든 결정 사항을 `Gemfile.lock` 파일에 기록하여, 다음 빌드 시에는 동일한 의존성 세트가 사용되도록 보장합니다.

이러한 과정을 통해 `bundle install`은 프로젝트의 의존성 환경을 일관되게 유지하고, "재현 가능한 빌드"를 위한 기반을 마련합니다.

## Codespaces를 사용하면서 느낀 점

이번 문제 해결 과정에서 GitHub Codespaces를 사용한 것은 매우 효과적이었습니다. 로컬에 Ruby/Jekyll 환경을 직접 구축하고 관리하는 번거로움 없이, 클라우드에서 즉시 개발 환경을 띄워 작업할 수 있었습니다. 이는 **원격 개발 환경(Remote Development Environment)**의 강력함을 보여주었으며, 동시에 **재현 가능한 환경(Reproducible Environment)**의 중요성을 다시 한번 깨닫게 했습니다. Codespaces는 필요한 모든 도구와 의존성이 미리 설정된 환경을 제공함으로써, "내 컴퓨터에서는 되는데 네 컴퓨터에서는 안 되는" 문제를 원천적으로 방지하는 데 기여합니다.

## 느낀 점: 코드만큼 중요한 실행 환경의 일관성

이번 경험을 통해 저는 다음과 같은 중요한 교훈을 얻었습니다.

*   **CI/CD에서 중요한 것은 코드만이 아니라 실행 환경의 일관성**: 코드가 아무리 완벽해도, 이를 빌드하고 실행하는 환경이 일관되지 않으면 예상치 못한 문제가 발생할 수 있습니다. 특히 의존성 버전 관리는 CI/CD 파이프라인의 안정성에 직결됩니다.
*   **`Gemfile.lock`은 단순 생성 파일이 아니라 Reproducibility를 위한 중요한 구성 요소**: `Gemfile.lock`과 같은 락파일은 개발자가 의도적으로 관리해야 하는 중요한 파일입니다. 이 파일이 제대로 관리되지 않으면 "어제는 됐는데 오늘은 안 되는" 상황이 반복될 수 있습니다.
*   **"어제는 됐는데 오늘은 안 된다"는 문제는 Dependency/Environment 문제일 수 있다**: 이 문구는 개발자에게 익숙한 좌절의 표현이지만, 이제는 의존성 버전 불일치나 환경 불일치와 같은 근본적인 원인을 추적하는 단서가 될 수 있음을 알게 되었습니다.

최근 AI 에이전트의 런타임/오케스트레이션 개념을 공부하면서 **"재현 가능한 실행 환경(Reproducible Environment)"**이 얼마나 중요한지 깊이 느끼고 있었습니다. AI 에이전트가 복잡한 작업을 수행하기 위해서는 단순히 지침(Instructions)만으로는 부족하며, 안정적이고 예측 가능한 실행 환경(Harness)이 필수적입니다. 이번 GitHub Pages 의존성 문제 해결 경험은 이러한 "재현 가능한 환경"의 중요성이 소프트웨어 빌드 환경에서도 동일하게 적용된다는 것을 실제 사례를 통해 명확히 보여주었습니다. 결국, 어떤 시스템이든 안정적으로 동작하기 위해서는 코드뿐만 아니라 그 코드가 실행되는 환경까지도 철저하게 관리되어야 한다는 것을 다시 한번 깨닫게 된 소중한 경험이었습니다.

---

## References

*   [Jekyll 공식 문서](https://jekyllrb.com/)
*   [Bundler 공식 문서](https://bundler.io/)
*   [GitHub Actions 공식 문서](https://docs.github.com/en/actions)
*   [GitHub Codespaces 공식 문서](https://docs.github.com/en/codespaces)
*   [AI 개발 환경을 공부하면서 헷갈렸던 개념들](/posts/ai-dev-environment-concepts/)
