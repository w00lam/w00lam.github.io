---
title: ".env에 넣으면 안전할까? 비밀값 관리와 1Password·Bitwarden"
date: 2026-07-28
categories: [Security, Secret Management]
tags: [Secret, env, 1Password, Bitwarden, GitHub Actions, AWS, Security, TIL]
permalink: /posts/env-secret-management-1password-bitwarden/
---

팀 프로젝트에서 Kakao Local API와 YouTube Data API를 연동하면서 API 키를 발급받았다. 기능을 구현하는 것보다 먼저 막힌 부분은 의외로 단순했다. **이 값을 나머지 세 명에게 어떻게 전달해야 할까?**

처음 생각한 방법은 익숙했다. Slack으로 키를 전달하고, 각자 `.env` 파일이나 IntelliJ 환경 변수에 저장한다. `.env`는 `.gitignore`에 추가하고 운영 환경의 값은 별도로 설정한다. 소규모 프로젝트에서 빠르게 적용할 수 있는 현실적인 방식이다.

그런데 팀원이 프로젝트에서 빠지면 이미 복사한 키는 어떻게 회수할까? 누가 운영용 키를 봤는지 알 수 있을까? 키를 바꾸면 네 명의 로컬 환경과 배포 설정을 어떻게 함께 갱신할까? 질문이 늘면서 `.env`만으로는 해결되지 않는 영역이 보이기 시작했다.

> **`.env`는 소스 코드와 비밀값을 분리하는 방법이지, 비밀값의 안전한 공유와 접근 제어까지 해결하는 Secret Manager는 아니다.**

이번 글은 제품의 기능을 나열하기보다 비밀값을 생성하고 폐기할 때까지 팀이 무엇을 통제해야 하는지, 그리고 1Password와 Bitwarden을 어디에 활용할 수 있는지를 정리한 학습 기록이다.

---

## 1. 비밀값은 일반 설정과 무엇이 다른가

개발 프로젝트에서 **Secret(비밀값)**은 외부에 노출됐을 때 다른 사람이 시스템이나 데이터에 접근하거나, 우리 권한으로 작업할 수 있게 만드는 값이다. 외부 API Key, 데이터베이스 계정과 비밀번호, JWT 서명 키, OAuth Client Secret, AWS Access Key, SSH Private Key, Webhook Secret, 암호화 키, 서비스 계정 토큰 등이 여기에 해당한다.

환경 변수에 들어간다고 모두 Secret인 것은 아니다. 다음 값은 공개되더라도 곧바로 권한을 넘겨주지 않는 일반 설정일 수 있다.

```text
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=local
LOG_LEVEL=INFO
```

반면 다음 값은 노출되면 안 된다.

```text
KAKAO_REST_API_KEY=...
YOUTUBE_API_KEY=...
DB_PASSWORD=<secret>
JWT_SECRET=<secret>
```

둘을 구분하는 기준은 파일 형식이 아니라 **그 값을 가진 사람이 어떤 권한을 행사할 수 있는가**다.

## 2. 코드에 직접 쓰면 왜 문제가 될까

비밀값을 코드에 하드코딩하면 Git 커밋 기록에 장기간 남을 수 있다. 비공개 저장소라도 접근 권한이 있는 사람은 값을 볼 수 있고, 코드 리뷰 화면이나 테스트 출력에 노출될 수도 있다. 환경별 값을 나누기도 어렵고, 키를 교체할 때마다 코드를 수정하고 다시 배포해야 한다. 저장소를 공개로 전환하거나 다른 곳에 복제할 때 함께 유출될 위험도 있다.

특히 현재 파일에서 한 줄을 지웠다고 과거 커밋에서도 사라지는 것은 아니다. Git에 Secret이 올라갔다면 값이 이미 노출되었다고 보고 다음 순서로 대응하는 편이 안전하다.

1. 해당 키를 즉시 폐기하거나 회전한다.
2. 새 키를 발급한다.
3. 저장소 기록에서 값 제거가 필요한지 검토한다.
4. Secret Scanning 도구로 다른 노출이 없는지 확인한다.
5. 같은 키를 사용한 다른 환경도 점검한다.

Git 기록 정리는 필요한 조치일 수 있지만, 기록을 지우는 작업이 키 자체를 무효화하지는 않는다. 그래서 **기록 정리보다 키 폐기와 재발급이 먼저**다.

## 3. `.env`의 역할과 한계

`.env`는 분명 유용하다. 코드와 설정을 분리하고, 개발자마다 로컬 값을 다르게 둘 수 있으며, Spring Profile이나 Docker Compose와 연결하기 쉽다. 실제 값을 저장소에 올리지 않으면서 필요한 변수 이름은 `.env.example`로 공유할 수도 있다.

```text
# .env.example
KAKAO_REST_API_KEY=
YOUTUBE_API_KEY=
DB_USERNAME=
DB_PASSWORD=
JWT_SECRET=
```

실제 파일은 Git 추적에서 제외한다.

```gitignore
.env
.env.*
!.env.example
```

하지만 `.env`는 보통 로컬 디스크에 평문으로 남는다. 누군가는 팀원에게 최초 값을 전달해야 하고, 팀원이 이미 복사한 값을 원격으로 회수할 수도 없다. 누가 조회하거나 변경했는지 감사하기 어렵고, 키를 회전하면 각자의 파일을 다시 바꿔야 한다. 잘못된 로그, 악성 코드, 백업, 실수로 한 Git 커밋을 통해서도 노출될 수 있다.

> **`.gitignore`는 Git 저장소에 비밀값이 올라가는 것을 줄여줄 뿐, 로컬 파일의 암호화나 안전한 팀 공유를 보장하지는 않는다.**

환경 변수도 그 자체로 안전한 금고는 아니다. 코드 하드코딩보다 주입과 환경 분리가 쉽지만 디버그 로그, 오류 출력, 프로세스 정보, 컨테이너 설정 조회, CI/CD 로그, 잘못 열린 Actuator 같은 관리 엔드포인트를 통해 보일 수 있다. 환경 변수는 Secret을 애플리케이션에 **전달하는 방식**이고, 원본을 어디에 저장하고 누가 가져올지는 별도의 문제다.

![Slack과 개인 .env를 거치는 잘못된 비밀값 공유 흐름](/assets/images/2026-07-28-env-secret-management-1password-bitwarden/unsafe-secret-sharing.png)
> 채팅을 거쳐 개인 파일로 복사할수록 복사본은 늘고, 보유자 추적과 접근 회수는 어려워진다.

## 4. 안전한 관리는 Secret의 수명주기를 다룬다

Secret 관리의 핵심은 값을 한 번 숨겨 두는 것이 아니라 **생성·저장·배포·사용·교체·폐기까지의 수명주기를 통제하는 것**이다. OWASP도 Secret의 중앙 관리, 최소 권한, 감사, 자동화, 회전과 폐기를 함께 다루도록 권고한다.

안전한 관리 시스템에는 다음 속성이 필요하다.

* **중앙 저장**: 개인 PC, 채팅, 문서에 흩어진 값을 관리 가능한 위치로 모은다.
* **암호화**: 저장 중과 전송 중에 암호화를 적용한다. Base64는 누구나 되돌릴 수 있는 인코딩이지 암호화가 아니다.
* **최소 권한**: 개발자는 개발용 API Key, 배포 담당자는 필요한 배포 Secret, 애플리케이션은 실행에 필요한 값만 접근한다.
* **환경 분리**: `local`, `dev`, `staging`, `prod`를 나눈다. 개발자가 운영 DB 비밀번호를 기본으로 볼 이유는 없다.
* **감사 가능성**: 누가 언제 값을 조회하거나 수정했는지 확인할 수 있어야 한다.
* **회전**: 정기적으로 또는 유출 사고가 발생했을 때 값을 교체할 수 있어야 한다.
* **폐기와 접근 회수**: 역할이 바뀌거나 팀원이 나가면 권한을 제거한다. 이미 로컬에 복사된 값은 되가져올 수 없으므로 민감한 공유 Secret은 함께 회전한다.
* **자동화**: 사람이 매번 복사하지 않고 파이프라인과 애플리케이션이 필요한 값만 제한적으로 가져온다.

![Secret의 생성부터 폐기까지 이어지는 수명주기](/assets/images/2026-07-28-env-secret-management-1password-bitwarden/secret-lifecycle.png)
> Secret 관리는 저장으로 끝나지 않는다. 회전과 폐기까지 반복 가능한 절차가 있어야 한다.

## 5. Password Manager와 Secrets Manager는 초점이 다르다

이 둘을 구분하니 어떤 환경에 어떤 도구를 써야 하는지가 명확해졌다.

**Password Manager**는 주로 사람이 사용하는 자격 증명을 안전하게 보관하고 공유한다. Kakao Developers나 AWS Console 로그인 계정, 공용 테스트 계정, 팀 SaaS 계정, 소규모 프로젝트의 개발용 API Key가 대표적이다.

**Secrets Manager**는 애플리케이션, 서버, CI/CD 같은 비인간 주체가 값을 자동으로 가져가도록 관리한다. GitHub Actions가 배포 토큰을 조회하고, 운영 서버가 DB 비밀번호를 가져오며, 애플리케이션이나 배치 작업에는 필요한 Project만 읽는 Machine Account나 IAM Role을 주는 식이다. 회전과 감사도 중요한 기능이다.

> **Password Manager는 사람의 안전한 보관과 공유에 초점이 있고, Secrets Manager는 애플리케이션과 자동화 시스템의 제한적이고 추적 가능한 접근에 초점이 있다.**

다만 경계가 완전히 갈리지는 않는다. 1Password와 Bitwarden 모두 개발자와 자동화 시스템을 위한 Secret 관리 기능을 제공한다. 제품 이름보다 **누가 값을 사용하고, 어떤 권한과 감사 수준이 필요한지**를 먼저 봐야 한다.

## 6. 1Password: 사람의 사용성과 개발 흐름을 연결하는 선택

1Password는 개인과 팀의 로그인 정보 및 비밀값을 Vault 단위로 보관하고 공유하는 Password Manager다. 팀원에게 필요한 Vault만 허용할 수 있고, 브라우저와 데스크톱 앱을 통해 일상적인 계정 관리에 사용할 수 있다.

개발 흐름에서는 CLI와 Secret Reference를 사용할 수 있다. 예를 들어 평문 값 대신 참조를 둔 뒤 `op run`으로 실행 시점에 환경 변수로 주입할 수 있다. 사람 계정 대신 비인간 작업에는 특정 Vault로 접근 범위를 제한한 Service Account를 사용할 수 있다. 즉, 채팅으로 값을 전달하거나 실제 값이 담긴 `.env`를 장기간 유지하는 과정을 줄일 수 있다.

장점은 팀원이 보안 도구에 익숙하지 않아도 비교적 빠르게 정착할 수 있고, 일반 계정과 개발 Secret을 같은 생태계에서 관리하며 CLI와 자동화로 확장할 수 있다는 점이다. 반대로 팀 규모와 기능에 따라 비용이 들고 특정 SaaS에 대한 의존성이 생긴다. Vault를 너무 크게 설계하면 모든 사용자가 과도한 값을 볼 수도 있다. 도구를 도입해도 사용자가 값을 로컬에 복사하거나 로그로 출력하는 문제까지 자동으로 사라지는 것은 아니다.

## 7. Bitwarden: Password Manager와 개발용 Secret을 구분하는 선택

Bitwarden은 Password Manager와 Secrets Manager를 구분해 제공한다. Password Manager에서는 Organization과 Collection으로 팀 자격 증명을 나누고, Secrets Manager에서는 Secret을 Project로 구성한다. 애플리케이션이나 배포 파이프라인 같은 비인간 사용자는 Machine Account로 분리하고, 접근 가능한 Project와 읽기·쓰기 범위를 제한할 수 있다. CLI와 SDK를 통한 자동화도 지원한다.

오픈소스 생태계와 자체 호스팅 선택지가 있다는 점은 통제권을 중요하게 보는 팀에 매력적이다. 비용 효율성을 검토하기에도 좋다. 다만 Password Manager와 Secrets Manager는 플랜과 기능 범위가 다를 수 있으므로 도입 시점의 공식 문서를 확인해야 한다.

> **자체 호스팅은 보안이 자동으로 높아지는 방식이 아니라, 통제권과 함께 운영 책임까지 가져오는 방식이다.**

직접 호스팅하면 백업, 업데이트, 장애 대응, TLS, 접근 제어, 모니터링도 팀의 책임이 된다. 네 명 규모의 MVP에서는 이 운영 비용이 SaaS 비용보다 클 수 있다. 학습 자체가 목적이 아니라면 우선순위가 낮다고 판단했다.

## 8. 1Password와 Bitwarden을 어떻게 비교할까

공식 문서를 기준으로 보면 두 제품 모두 사람용 비밀번호 관리와 개발 워크플로 연동이 가능하다. 차이는 단순한 지원 여부보다 제품 구조와 팀이 중요하게 보는 운영 방식에 있다.

| 기준 | 1Password | Bitwarden |
| :--- | :--- | :--- |
| 주요 방향 | 사용자 경험과 팀 협업의 편의 | 비용 효율성, 오픈소스 생태계, 통제 가능성 |
| 사람용 비밀번호 관리 | 지원 | 지원 |
| 개발용 Secret 관리 | CLI, Secret Reference, Service Account 등 | 별도 Secrets Manager, Project, Machine Account, CLI·SDK 등 |
| 팀 공유 구조 | Vault 중심 | Password Manager는 Organization·Collection, Secrets Manager는 Project 중심 |
| 자체 호스팅 | 일반적인 핵심 선택지는 아님 | 선택 가능 |
| 도입 방식 | 빠른 팀 도입에 비교적 적합 | SaaS 또는 자체 호스팅 구성에 따라 달라짐 |
| 검토하기 좋은 상황 | 편의성과 관리 생산성을 중시 | 비용과 통제권을 중시 |

가격 숫자는 지역, 세금, 계약과 플랜에 따라 달라질 수 있어 이 글에서는 비교하지 않았다. 정성적으로 보면 1Password는 편리한 팀 운영에 비용을 지불하는 선택에 가깝고, Bitwarden은 비용 효율성과 통제권을 함께 검토하기 좋은 선택이다. 다만 Bitwarden 자체 호스팅은 인프라와 운영 인력의 비용까지 포함해 판단해야 한다.

## 9. 그렇다면 Slack으로 공유하면 안 될까

Slack으로 한 번 보냈다고 반드시 사고가 나는 것은 아니다. 문제는 일반 채팅이 Secret 전달을 위해 설계된 전용 시스템이 아니라는 데 있다. 메시지와 검색 기록에 오래 남고, 채널 참여자가 모두 값을 볼 수 있으며, 복사와 재전달을 통제하기 어렵다. 팀 이탈자의 과거 접근을 되돌릴 수 없고 키가 변경돼도 옛 메시지는 남는다. 연결된 봇과 앱, 워크스페이스 정책에 따라 노출 범위도 달라진다.

이미 보냈다면 다음처럼 처리한다.

1. 메시지를 삭제할 수 있는지 확인한다.
2. 민감도가 높은 키라면 새 키로 회전한다.
3. 새 키를 중앙 비밀값 관리 도구에 저장한다.
4. 기존 키를 폐기한다.
5. 팀원별 접근 권한을 다시 확인한다.
6. 이후에는 값 대신 저장 위치와 사용 방법만 안내한다.

```text
Kakao와 YouTube API Key는 팀 비밀값 관리 도구의
`masit-on / development` 항목에 저장했습니다.

실제 값은 채팅에 공유하지 않습니다.
각자 접근 권한을 확인한 뒤 로컬 `.env`에 설정해주세요.

운영용 키는 개발용 키와 별도로 관리하며,
운영 환경에는 배포 담당자와 CI/CD만 접근하도록 구성합니다.
```

## 10. 로컬·CI/CD·운영은 같은 방식으로 관리하지 않는다

### 로컬 개발

MVP 단계에서는 중앙 공유부터 적용하는 편이 현실적이다.

```text
1Password 또는 Bitwarden
        ↓
개발자가 필요한 값만 조회
        ↓
로컬 .env 또는 IntelliJ 환경 변수
        ↓
Spring Boot 실행
```

`.env`는 Git에 올리지 않고 `.env.example`에는 변수명만 둔다. 개발용과 운영용 키를 분리하고 가능하면 개인 또는 역할별 키를 쓴다. 로그에 환경 변수를 출력하지 않으며 팀원이 나가면 공유 Secret의 회전을 검토한다.

이후에는 1Password CLI나 Bitwarden Secrets Manager CLI를 통해 실제 값을 파일에 오래 두지 않고 실행 시점에 주입할 수 있다. 다만 네 명이 처음부터 CLI 구성에 매달리면 기능 개발보다 설정 비용이 커질 수 있다. 우선 중앙 저장과 권한 분리를 정착시키고 자동화는 다음 단계로 미루는 편이 낫다.

### GitHub Actions

GitHub Actions는 Organization, Repository, Environment 수준의 Secret을 제공한다. 개발·테스트와 운영 배포를 구분하고, 운영 배포 값은 Environment에 묶어 접근과 승인 규칙을 나누는 방향이 적합하다.

```yaml
env:
  YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY }}
```

Secret을 워크플로에서 `echo`하거나 디버깅을 위해 변형해 출력해서는 안 된다. GitHub의 자동 마스킹도 모든 변형된 값을 완전히 가린다고 보장하지 않는다. 장기적으로 AWS를 사용한다면 정적 Access Key를 저장하는 대신 GitHub Actions OIDC와 짧은 수명의 AWS IAM Role 자격 증명을 검토할 수 있다.

이전에 [CI/CD는 YAML 작성이 아니라 안정적인 배포와 복구를 설계하는 과정이었다](/posts/cicd-design-not-yaml/)에서 배포 흐름을 정리했고, [PR은 리뷰 요청이 아니라 배포 실패를 막는 첫 번째 검증 지점이다](/posts/pr-github-actions-ci/)에서는 GitHub Actions의 검증 시점을 살펴봤다. 당시에는 Actions에 값을 넣는 방법보다 Secret의 전체 수명주기까지는 깊게 생각하지 못했다.

### 운영 환경

운영에서는 사람이 Password Manager의 값을 복사해 서버에 붙여 넣는 방식보다 AWS Systems Manager Parameter Store, AWS Secrets Manager, HashiCorp Vault, 다른 클라우드의 Secret Manager 또는 1Password·Bitwarden의 개발자용 연동을 검토할 수 있다.

AWS Parameter Store의 `SecureString`은 KMS로 암호화하는 계층형 설정 저장에 적합하다. 자동 회전이나 더 세밀한 Secret 수명주기가 필요하면 AWS가 해당 용도로 안내하는 Secrets Manager가 더 맞다. 애플리케이션이나 IAM Role에는 필요한 경로와 Secret을 읽는 권한만 준다.

![로컬 개발, CI/CD, 운영 환경을 분리한 Secret 관리 구조](/assets/images/2026-07-28-env-secret-management-1password-bitwarden/secure-secret-architecture.png)
> 로컬은 사람의 접근, CI/CD는 제한된 배포 권한, 운영은 애플리케이션의 역할 기반 접근으로 나눈다.

이 구조는 이전에 정리한 [사용자의 요청은 AWS 내부에서 어떻게 처리될까?](/posts/how-aws-request-flow-works/)의 IAM과 애플리케이션 경계를 Secret 접근에도 적용한 것이다. JWT 서명 키 역시 같은 원칙이 필요하다. [JWT 인증 필터에서 검증 책임을 분리한 이유](/posts/why-split-jwt-validation-responsibilities/)에서 다룬 검증 책임과 별개로, 서명 키 자체는 코드 밖에서 환경별로 분리하고 접근을 제한해야 한다.

## 11. 현재 4인 팀에 적용할 단계

처음부터 복잡한 플랫폼을 만들면 MVP 개발 속도가 떨어진다. 그래서 다음 세 단계가 현실적이라고 판단했다.

### 1단계: 지금 바로 적용

* API Key를 Slack 평문으로 공유하지 않는다.
* 1Password 또는 Bitwarden에 팀용 저장 공간을 만든다.
* `masit-on-development`와 `masit-on-production`을 분리한다.
* 팀원은 개발용 Secret만 기본으로 접근한다.
* `.env.example`만 Git에 커밋하고 실제 `.env`는 제외한다.
* 개발용과 운영용 키를 분리한다.
* README에는 값이 아니라 설정 방법만 기록한다.

### 2단계: CI/CD 도입 시

* 빌드·테스트 값은 GitHub Actions Secret을 사용한다.
* 운영 배포 값은 GitHub Environment 기준으로 분리한다.
* 운영 배포 권한을 최소화하고 로그 노출을 막는다.
* 가능하면 장기 AWS Access Key 대신 OIDC를 검토한다.

### 3단계: 운영 안정화 이후

* AWS Parameter Store 또는 Secrets Manager를 도입한다.
* 애플리케이션은 IAM Role로 필요한 값만 읽는다.
* 회전 정책, 접근 감사, Secret Scanning을 적용한다.
* 사용하지 않는 Secret을 폐기하고 사고 대응 절차를 문서화한다.

> **처음부터 복잡한 Secret Management 플랫폼을 구축할 필요는 없다. 다만 Slack 평문 공유와 개인별 임의 보관에서 벗어나, 중앙 저장·권한 관리·환경 분리부터 적용해야 한다. 이후 CI/CD와 운영 환경이 생기면 자동화된 Secret 전달과 회전으로 확장하는 것이 현실적이다.**

## 12. 1Password와 Bitwarden 중 무엇을 선택할까

팀원이 보안 도구에 익숙하지 않고 빠른 정착, 사용자 경험, 계정과 개발 Secret의 통합 관리를 중시한다면 1Password가 더 적합할 수 있다. 비용 효율성, 오픈소스 생태계, 자체 호스팅 가능성, Password Manager와 Secrets Manager의 명시적인 분리를 중요하게 본다면 Bitwarden을 검토할 수 있다.

현재 같은 4인 사이드 프로젝트라면 이미 팀원이 쓰는 도구가 있는지부터 확인할 것이다. 없다면 무료 또는 체험 가능한 범위에서 네 명이 실제로 공유와 권한 설정을 해본 뒤 선택하는 편이 낫다. 자체 호스팅은 학습이 목적이 아니라면 MVP 우선순위에서 내린다.

> **편의성과 빠른 정착을 우선하면 1Password, 비용 효율성과 통제 가능성을 중시하면 Bitwarden을 검토할 수 있다. 하지만 어떤 제품을 고르더라도 권한을 나누지 않고 모든 Secret을 하나의 공유 공간에 넣는다면 안전한 관리라고 보기 어렵다.**

결국 제품보다 먼저 정할 것은 Slack 공유 금지, 환경 분리, 최소 권한, 유출 시 회전 같은 팀 규칙이다.

## 13. 비밀값 관리 체크리스트

* [ ] Secret을 코드에 직접 작성하지 않았는가?
* [ ] 실제 `.env`가 Git에서 제외되었는가?
* [ ] `.env.example`에는 실제 값이 없는가?
* [ ] 개발용과 운영용 Secret이 분리되어 있는가?
* [ ] Slack, Notion, 이메일에 실제 Secret이 남아 있지 않은가?
* [ ] 모든 팀원이 운영 Secret을 볼 수 있는 구조는 아닌가?
* [ ] 팀원이 나갈 때 접근 회수와 Secret 회전이 가능한가?
* [ ] 애플리케이션과 CI/CD 로그에 Secret이 출력되지 않는가?
* [ ] 더 이상 사용하지 않는 Secret을 폐기했는가?
* [ ] Secret이 Git에 올라갔을 때 대응 절차가 있는가?

## 14. 학습 후 느낀 점

처음에는 API 키를 코드에 넣지 않고 `.env`에 저장하면 관리가 끝난다고 생각했다. 하지만 `.env`는 저장소 유출을 줄이는 한 단계일 뿐이었다. 팀 프로젝트에서는 값을 어떻게 전달하고, 누가 접근하며, 팀원이 빠졌을 때 무엇을 회수하고, 유출되었을 때 어떻게 교체할지까지 함께 정해야 했다.

1Password와 Bitwarden도 단순한 비밀번호 보관 프로그램으로만 봤는데, 팀 자격 증명을 중앙에서 관리하고 개발 환경과 자동화 시스템까지 연결할 수 있었다. 그렇다고 처음부터 모든 연동을 적용하는 것이 답은 아니었다. 현재 프로젝트에서는 채팅 평문 공유 중단, Password Manager 중앙 관리, 개발·운영 분리, GitHub Actions Secret, 운영 단계의 AWS 전용 도구 순으로 개선하는 것이 보안과 생산성 사이의 현실적인 균형이라고 판단했다.

> **보안은 특정 도구 하나를 도입한다고 완성되는 것이 아니라, 비밀값을 다루는 팀의 규칙과 수명주기를 설계하는 과정이다.**

---

## 참고한 공식 문서

* [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
* [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
* [1Password Developer: Load secrets into scripts](https://developer.1password.com/docs/cli/secrets-scripts/)
* [1Password Developer: Service Accounts](https://developer.1password.com/docs/service-accounts/)
* [Bitwarden Secrets Manager Quick Start](https://bitwarden.com/help/secrets-manager-quick-start/)
* [Bitwarden Machine Accounts](https://bitwarden.com/help/machine-accounts/)
* [Bitwarden Secrets Manager CLI](https://bitwarden.com/help/secrets-manager-cli/)
* [GitHub Actions Secrets](https://docs.github.com/en/actions/concepts/security/secrets)
* [GitHub Actions Secure Use Reference](https://docs.github.com/en/actions/reference/security/secure-use)
* [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
* [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html)
