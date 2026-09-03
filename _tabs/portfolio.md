---
icon: fas fa-briefcase
order: 5
permalink: /portfolio/
comments: false
toc: false
---

<div class="portfolio-page">
  <section class="portfolio-hero" id="portfolio-overview" aria-labelledby="portfolio-hero-title">
    <div class="portfolio-hero-copy">
      <p class="portfolio-eyebrow">BACKEND DEVELOPER · PORTFOLIO</p>
      <h2 id="portfolio-hero-title">기록하고 배운 내용을 실제 문제에 적용하는 백엔드 개발자입니다.</h2>
      <p class="portfolio-hero-lead">
        Java·Spring Boot를 중심으로 동시성, 트랜잭션, 인증, 배포 경계를 설계하고
        테스트 결과로 동작을 확인합니다.
      </p>
    </div>
  </section>

  <nav class="portfolio-nav" aria-label="포트폴리오 섹션">
    <a href="#portfolio-approach">Approach</a>
    <a href="#portfolio-principles">Principles</a>
    <a href="#portfolio-stack">Stack</a>
    <a href="#portfolio-capabilities">Capability</a>
    <a href="#matisson">Project 01</a>
    <a href="#concert-ticketing">Project 02</a>
    <a href="#portfolio-ai">AI Native</a>
    <a href="#portfolio-delivery">Delivery</a>
    <a href="#portfolio-contact">Contact</a>
  </nav>

  <section class="portfolio-section portfolio-evidence" id="portfolio-principles" aria-labelledby="portfolio-evidence-title">
    <div class="portfolio-section-heading">
      <div>
        <p class="portfolio-eyebrow">WORKING PRINCIPLES</p>
        <h2 id="portfolio-evidence-title">어떤 프로젝트에서도 같은 질문으로 문제를 좁힙니다.</h2>
      </div>
    </div>

    <div class="portfolio-evidence-grid">
      <article>
        <span class="portfolio-card-kicker">01 · PROBLEM</span>
        <h3>재현 가능한 문제 정의</h3>
        <p>사용자·비즈니스 맥락과 실패 조건을 먼저 정리해 해결할 문제의 범위를 좁힙니다.</p>
      </article>
      <article>
        <span class="portfolio-card-kicker">02 · DECISION</span>
        <h3>책임에 맞는 기술 선택</h3>
        <p>도메인 경계와 데이터 흐름을 보고 저장·캐시·메시징·인증의 역할을 나눕니다. 선택한 이유도 기록합니다.</p>
      </article>
      <article>
        <span class="portfolio-card-kicker">03 · VERIFICATION</span>
        <h3>완료 조건을 명시</h3>
        <p>테스트·수동 검증·부하 테스트 중 상황에 맞는 방법을 골라 성공 조건과 결과를 기록합니다.</p>
      </article>
      <article>
        <span class="portfolio-card-kicker">04 · OPERATION</span>
        <h3>운영까지 연결</h3>
        <p>배포·로그·모니터링·장애 대응도 구현 뒤에 붙는 일이 아니라 설계의 일부로 봅니다.</p>
      </article>
    </div>
  </section>

  <section class="portfolio-section portfolio-approach" id="portfolio-approach" aria-labelledby="portfolio-approach-title">
    <div class="portfolio-section-heading">
      <p class="portfolio-eyebrow">APPROACH</p>
      <h2 id="portfolio-approach-title">동작보다 먼저 설계의 근거를 남깁니다.</h2>
    </div>

    <div class="portfolio-approach-grid">
      <div class="portfolio-approach-copy">
        <p>
          특정 도메인에만 쓰는 원칙은 아닙니다. 기능을 시작할 때 문제를 재현할 조건을 정합니다.
          책임과 실패의 경계를 나눕니다. 변경 후에도 지켜야 할 조건은 검증 가능한 형태로 남깁니다.
        </p>
      </div>

      <div class="portfolio-signal-list">
        <article class="portfolio-signal-card">
          <span class="portfolio-card-kicker">01 · REPRODUCE</span>
          <h3>문제를 재현할 수 있는가?</h3>
          <p>정상 흐름만 보지 않습니다. 동시 요청·재요청·외부 의존성 실패처럼 문제가 드러나는 조건부터 정합니다.</p>
        </article>
        <article class="portfolio-signal-card">
          <span class="portfolio-card-kicker">02 · BOUNDARY</span>
          <h3>실패가 번지는 경계는 어디인가?</h3>
          <p>요청·도메인·트랜잭션·외부 시스템의 책임을 나눕니다. 한 단계의 실패가 전체 작업으로 번지지 않게 하기 위해서입니다.</p>
        </article>
        <article class="portfolio-signal-card">
          <span class="portfolio-card-kicker">03 · INVARIANT</span>
          <h3>변경 후에도 지켜야 할 조건은 무엇인가?</h3>
          <p>중복 없음·상태 정합성·재시도 안전성처럼 서비스가 지켜야 할 조건을 테스트로 확인합니다.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="portfolio-section portfolio-stack" id="portfolio-stack" aria-labelledby="portfolio-stack-title">
    <div class="portfolio-section-heading">
      <div>
        <p class="portfolio-eyebrow">TECH STACK</p>
        <h2 id="portfolio-stack-title">문제를 해결할 때 사용한 기술</h2>
      </div>
    </div>

    <div class="portfolio-stack-grid">
      <article class="portfolio-stack-card">
        <span class="portfolio-stack-index">01</span>
        <h3>Application</h3>
        <p>요청 흐름과 도메인 로직을 구현합니다.</p>
        <div class="portfolio-stack-items">
          <span>Spring Boot</span><span>Next.js</span><span>Nginx</span>
        </div>
      </article>
      <article class="portfolio-stack-card">
        <span class="portfolio-stack-index">02</span>
        <h3>Data &amp; Messaging</h3>
        <p>상태를 저장하고 경쟁을 제어합니다.</p>
        <div class="portfolio-stack-items">
          <span>PostgreSQL</span><span>MySQL</span><span>Redis</span><span>Kafka</span>
        </div>
      </article>
      <article class="portfolio-stack-card">
        <span class="portfolio-stack-index">03</span>
        <h3>Infrastructure</h3>
        <p>실행 환경과 배포 구조를 구성합니다.</p>
        <div class="portfolio-stack-items">
          <span>Docker</span><span>Terraform</span><span>AWS</span>
        </div>
      </article>
      <article class="portfolio-stack-card">
        <span class="portfolio-stack-index">04</span>
        <h3>Verification</h3>
        <p>변경 결과를 빠르게 확인하고 다시 개선합니다. 1,400개 테스트 실행 시간도 8분 20초 이상에서 4분 32초로 줄였습니다.</p>
        <div class="portfolio-stack-items">
          <span>Testcontainers</span><span>GitHub Actions</span>
        </div>
      </article>
    </div>
  </section>

  <section class="portfolio-section portfolio-capabilities" id="portfolio-capabilities" aria-labelledby="portfolio-capabilities-title">
    <div class="portfolio-section-heading">
      <div>
        <p class="portfolio-eyebrow">BACKEND CAPABILITIES</p>
        <h2 id="portfolio-capabilities-title">기술 이름보다 책임과 선택을 보여줍니다.</h2>
      </div>
    </div>

    <div class="portfolio-capability-grid">
      <article>
        <span class="portfolio-card-kicker">CODE · OOP</span>
        <h3>변경 이유가 드러나는 객체 설계</h3>
        <p>다형성과 책임을 분리해 조건문을 줄입니다. 메서드 이름으로 도메인의 의도도 드러냅니다.</p>
        <a class="portfolio-text-link" href="{{ '/posts/ood-polymorphism/' | relative_url }}">OOP 설계 기록 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
      </article>
      <article>
        <span class="portfolio-card-kicker">SPRING · LAYER</span>
        <h3>IoC/DI와 계층의 책임 분리</h3>
        <p>Controller·Service·Repository로 책임을 나눕니다. 상황에 따라 Facade와 전역 예외 처리의 경계도 선택합니다.</p>
        <a class="portfolio-text-link" href="{{ '/posts/spring-boot-bean-exception/' | relative_url }}">Spring 구조 기록 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
      </article>
      <article>
        <span class="portfolio-card-kicker">API · DATA</span>
        <h3>자원 상태와 데이터 접근을 분리</h3>
        <p>GET·POST·PUT/PATCH의 의미와 2xx·4xx 상태를 계약에 남깁니다. JPA·QueryDSL·MySQL·Redis의 조회·캐시 경계도 설계합니다.</p>
        <a class="portfolio-text-link" href="{{ '/posts/api-spec-5-principles/' | relative_url }}">API 설계 기록 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
      </article>
      <article>
        <span class="portfolio-card-kicker">SECURITY · DELIVERY</span>
        <h3>인증부터 배포 후 확인까지</h3>
        <p>세션과 JWT의 트레이드오프를 비교합니다. Security Filter와 Interceptor의 위치도 구분합니다. PR·CI·배포 후 검증까지 하나의 흐름으로 살핍니다.</p>
        <a class="portfolio-text-link" href="{{ '/posts/session-to-jwt-auth/' | relative_url }}">인증 전환 기록 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
      </article>
    </div>
  </section>

  <section class="portfolio-section portfolio-project-index" aria-labelledby="portfolio-projects-title">
    <div class="portfolio-section-heading">
      <div>
        <p class="portfolio-eyebrow">SELECTED PROJECTS</p>
        <h2 id="portfolio-projects-title">문제를 해결한 두 가지 기록</h2>
      </div>
    </div>

    <div class="portfolio-project-grid">
      <article class="portfolio-project-card portfolio-project-card--matisson">
        <div class="portfolio-project-card-media" aria-hidden="true">
          <div class="portfolio-project-card-brand">
            <span class="portfolio-project-symbol">01</span>
            <span class="portfolio-project-type">AI PLACE DISCOVERY</span>
          </div>
          <div class="portfolio-project-card-rail">
            <span>검증</span><i class="fas fa-arrow-right"></i><span>저장</span><i class="fas fa-arrow-right"></i><span>운영</span>
          </div>
        </div>
        <div class="portfolio-project-card-body">
          <span class="portfolio-card-kicker">PROJECT 01 · 2026.07 - 2026.08</span>
          <h3>맛잇온</h3>
          <p>AI 맛집 자동 등록에서 생기는 중복과 부분 저장을 경계 설계로 막은 서비스입니다.</p>
          <a class="portfolio-card-link" href="#matisson">케이스 스터디 보기 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
        </div>
      </article>

      <article class="portfolio-project-card portfolio-project-card--ticketing">
        <div class="portfolio-project-card-media" aria-hidden="true">
          <div class="portfolio-project-card-brand">
            <span class="portfolio-project-symbol">02</span>
            <span class="portfolio-project-type">CONCURRENT BOOKING</span>
          </div>
          <div class="portfolio-project-card-rail">
            <span>대기열</span><i class="fas fa-arrow-right"></i><span>좌석</span><i class="fas fa-arrow-right"></i><span>결제</span>
          </div>
        </div>
        <div class="portfolio-project-card-body">
          <span class="portfolio-card-kicker">PROJECT 02 · 2025.11 - 2026.05</span>
          <h3>콘서트 티켓팅 예약 시스템</h3>
          <p>좌석 경쟁과 결제 재요청을 Redis 분산락과 멱등성으로 제어한 백엔드 프로젝트입니다.</p>
          <a class="portfolio-card-link" href="#concert-ticketing">케이스 스터디 보기 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
        </div>
      </article>
    </div>
  </section>

  <section class="portfolio-project portfolio-project--matisson" id="matisson" aria-labelledby="matisson-title">
    <div class="portfolio-project-heading">
      <div>
        <p class="portfolio-eyebrow">PROJECT 01</p>
        <h2 id="matisson-title">맛잇온</h2>
        <p class="portfolio-project-lead">
          유튜버가 방문한 맛집을 지역·음식 종류·유튜버별로 탐색하는 서비스입니다.
          백엔드·인프라 개발과 일부 프론트엔드 구현, 프로젝트 진행 관리를 맡았습니다.
        </p>
      </div>
      <span class="portfolio-project-number" aria-hidden="true">01</span>
    </div>

    <div class="portfolio-project-meta">
      <div><span>DATE</span><strong>2026.07 - 2026.08</strong></div>
      <div><span>TEAM</span><strong>백엔드 4명</strong></div>
      <div><span>ROLE</span><strong>백엔드 · 인프라 · 프론트엔드 일부 · 진행 관리</strong></div>
    </div>

    <div class="portfolio-requirements" aria-labelledby="matisson-requirements-title">
      <div class="portfolio-requirements-heading">
        <p class="portfolio-card-kicker">PROBLEM · REQUIREMENTS · API</p>
        <h3 id="matisson-requirements-title">사용자 탐색 문제를 등록·검증·저장 요구사항으로 나눴습니다.</h3>
      </div>
      <div class="portfolio-requirements-grid">
        <article>
          <span>문제 정의</span>
          <strong>흩어진 맛집 정보 탐색</strong>
          <p>유튜버가 방문한 맛집을 지역·음식 종류·유튜버 기준으로 찾을 수 있도록 했습니다.</p>
        </article>
        <article>
          <span>핵심 기능</span>
          <strong>탐색·인증·제보·신고</strong>
          <p>지도와 검색 화면, 사용자 인증, 맛집 제보와 신고 처리를 제공합니다.</p>
        </article>
        <article>
          <span>API 책임</span>
          <strong>검증 결과와 저장 상태 분리</strong>
          <p>외부 검증·중복 확인을 거친 뒤 맛집 단위로 상태를 확정해 저장합니다.</p>
        </article>
        <article>
          <span>완료 조건</span>
          <strong>중복·부분 저장 없음</strong>
          <p>동일 맛집 10회 요청에서도 중복 저장과 부분 저장이 없어야 합니다.</p>
        </article>
      </div>
    </div>

    <div class="portfolio-system-visual portfolio-system-visual--matisson" aria-label="맛잇온 처리 흐름">
      <div class="portfolio-system-label">REQUEST BOUNDARY</div>
      <div class="portfolio-flow">
        <div class="portfolio-flow-node"><strong>외부 검증</strong><span>중복 확인</span></div>
        <i class="fas fa-arrow-right portfolio-flow-arrow" aria-hidden="true"></i>
        <div class="portfolio-flow-node"><strong>애플리케이션</strong><span>상태 확정</span></div>
        <i class="fas fa-arrow-right portfolio-flow-arrow" aria-hidden="true"></i>
        <div class="portfolio-flow-node"><strong>DB 저장</strong><span>맛집 단위 커밋</span></div>
      </div>
    </div>

    <div class="portfolio-case-grid">
      <div class="portfolio-case-copy">
        <p class="portfolio-card-kicker">OVERVIEW</p>
        <h3>요청을 검증하고 저장 경계를 분리했습니다.</h3>
        <p>
          외부 API 검증은 요청 흐름에서 처리했습니다. DB 저장만 필요한 구간에 트랜잭션을 걸었습니다.
          핵심 상태를 확정한 뒤 테스트와 후속 처리는 따로 다뤘습니다.
        </p>
        <ul>
          <li>Next.js 프론트엔드: 지도·맛집 탐색 화면과 인증 흐름</li>
          <li>Spring Boot API: 맛집 검색·인증·제보·신고 처리</li>
          <li>Docker / Terraform / AWS: 애플리케이션 실행·운영 환경 구성</li>
        </ul>
      </div>
      <div class="portfolio-decision-panel">
        <span class="portfolio-card-kicker">DECISION</span>
        <strong>한 건의 실패가 전체 등록을 막지 않도록</strong>
        <p>검증과 저장을 나눴습니다. 맛집별 등록 단위는 독립적으로 확인했습니다.</p>
      </div>
    </div>

    <div class="portfolio-infra-proof">
      <div class="portfolio-infra-proof-heading">
        <p class="portfolio-card-kicker">INFRASTRUCTURE EVIDENCE</p>
        <h3>애플리케이션뿐 아니라 실행 환경도 경계를 나눠 구성했습니다.</h3>
        <p>
          AWS 요청 흐름은 VPC와 Public·Private Subnet, ALB, EC2, RDS로 나눴습니다.
          배포 흐름은 CI/CD·ECR·ASG와 Blue-Green 전환 관점에서 따로 정리했습니다.
        </p>
      </div>
      <figure class="portfolio-architecture-figure portfolio-architecture-figure--wide">
        <img src="{{ '/assets/images/2026-05-19-posting/aws-request-flow-vpc.png' | relative_url }}" alt="AWS VPC의 Public Subnet과 Private Subnet, ALB, EC2, RDS 요청 흐름" loading="lazy">
        <figcaption>
          VPC 안에서 외부 요청과 데이터베이스 접근을 분리한 구조입니다.
          <a class="portfolio-text-link" href="{{ '/posts/how-aws-request-flow-works/' | relative_url }}">구성 기록 보기 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
        </figcaption>
      </figure>
      <div class="portfolio-infra-proof-secondary">
        <figure class="portfolio-architecture-figure">
          <img src="{{ '/assets/images/2026-07-01-cicd-design-not-yaml/blue_green_deployment.png' | relative_url }}" alt="로드 밸런서가 Blue 환경에서 Green 환경으로 트래픽을 전환하는 Blue-Green 배포 흐름" loading="lazy">
          <figcaption>Health Check 통과 후 운영 트래픽을 Blue에서 Green으로 전환합니다.</figcaption>
        </figure>
        <figure class="portfolio-architecture-figure">
          <img src="{{ '/assets/images/2026-05-20-posting/deployment-automation-autoscaling-flow.png' | relative_url }}" alt="GitHub Actions와 ECR을 거쳐 ASG의 EC2 인스턴스로 배포하는 흐름" loading="lazy">
          <figcaption>CI/CD에서 만든 이미지를 Registry와 Auto Scaling 환경으로 전달합니다.</figcaption>
        </figure>
      </div>
    </div>

    <div class="portfolio-proof-grid">
      <div class="portfolio-proof-copy">
        <p class="portfolio-card-kicker">TROUBLESHOOTING</p>
        <h3>AI 자동 등록의 중복과 부분 저장을 경계 설계로 막았습니다.</h3>
        <p>
          동일 맛집에 요청이 동시에 들어오면 중복 등록이나 부분 저장이 발생할 수 있었습니다.
          외부 검증과 DB 저장을 분리했습니다. 맛집 단위의 저장만 하나의 작업으로 묶어 실패 범위를 좁혔습니다.
          반영하기 직전에 상태를 다시 확인했습니다.
        </p>
        <div class="portfolio-metric-grid">
          <div><strong>동시 요청</strong><span>같은 맛집 10회 재현</span></div>
          <div><strong>실패 격리</strong><span>맛집별 등록 단위로 분리</span></div>
          <div><strong>반복 검증</strong><span>최종 반영 전 상태 재확인</span></div>
        </div>
      </div>
      <div class="portfolio-proof-panel">
        <span class="portfolio-card-kicker">CHECKED CONDITION</span>
        <code>same_place_requests = 10</code>
        <code>duplicate_saved = false</code>
        <code>partial_saved = false</code>
        <span class="portfolio-proof-status"><i class="fas fa-check" aria-hidden="true"></i> boundary verified</span>
      </div>
    </div>

    <div class="portfolio-additional-cases">
      <article class="portfolio-additional-case">
        <div>
          <p class="portfolio-card-kicker">OPERATIONS · SECRETS</p>
          <h3>컨테이너 메타데이터에 남는 비밀값을 tmpfs 주입으로 전환했습니다.</h3>
          <p>
            <code>docker run</code> 환경 변수로 전달한 비밀값이 <code>config.v2.json</code>에 평문으로 남아
            <code>docker inspect</code>와 볼륨 스냅샷에서 읽히는 경로를 확인했습니다. 환경 변수를 그대로 전달하지 않고
            tmpfs 파일로 주입해 실행 메타데이터와 영속 볼륨에 비밀값이 남지 않게 했습니다.
          </p>
          <a class="portfolio-text-link" href="{{ '/posts/env-secret-management-1password-bitwarden/' | relative_url }}">비밀값 관리 기록 보기 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
        </div>
        <div class="portfolio-proof-panel">
          <span class="portfolio-card-kicker">CHECKED CONDITION</span>
          <code>before_docker_inspect_secret = readable</code>
          <code>after_docker_inspect_secret = absent</code>
          <code>after_volume_snapshot_secret = absent</code>
          <span class="portfolio-proof-status"><i class="fas fa-check" aria-hidden="true"></i> secret exposure blocked</span>
        </div>
      </article>

      <article class="portfolio-additional-case">
        <div>
          <p class="portfolio-card-kicker">OPERATIONS · RELEASE</p>
          <h3>배포 실패 때 백엔드·프론트엔드 혼합 버전이 남지 않도록 원자성을 확보했습니다.</h3>
          <p>
            배포 루프에서 참조 파일을 먼저 바꾸면 이미지 하나의 pull이 실패했을 때 백엔드와 프론트엔드가 서로 다른 버전으로
            서비스될 수 있었습니다. 두 이미지 참조를 임시 디렉터리에 먼저 staging했습니다. 모두 pull에 성공한 뒤 install 단계에서
            한 번에 교체하도록 배포 경계를 다시 나눴습니다.
          </p>
          <a class="portfolio-text-link" href="{{ '/posts/cicd-design-not-yaml/' | relative_url }}">배포 전략 기록 보기 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
        </div>
        <div class="portfolio-proof-panel">
          <span class="portfolio-card-kicker">CHECKED CONDITION</span>
          <code>staged_image_refs = backend + frontend</code>
          <code>pull_all_succeeded_before_install = true</code>
          <code>mixed_version_after_failure = false</code>
          <span class="portfolio-proof-status"><i class="fas fa-check" aria-hidden="true"></i> release boundary verified</span>
        </div>
      </article>
    </div>

    <div class="portfolio-project-links">
      <a class="portfolio-button" href="https://github.com/w00lam" target="_blank" rel="noopener">GitHub 프로필 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-text-link" href="{{ '/posts/sdd-document-structure-design/' | relative_url }}">팀 개발 기록 보기 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
    </div>

    <div class="portfolio-retrospective">
      <div>
        <p class="portfolio-card-kicker">LEARNED</p>
        <h3>외부 API 호출과 내부 DB 저장은 같은 트랜잭션으로 볼 수 없었습니다.</h3>
        <p>검증·저장·후속 처리를 나누면서 실패 범위를 작게 만드는 일이 기능 구현만큼 중요하다는 점을 확인했습니다.</p>
      </div>
      <div>
        <p class="portfolio-card-kicker">NEXT ITERATION</p>
        <h3>API 계약과 운영 지표를 더 앞단에 둡니다.</h3>
        <p>다음 단계에서는 핵심 요청·응답 스키마를 문서화합니다. 등록 성공률과 외부 검증 실패율도 배포 후에 확인하도록 확장할 계획입니다.</p>
      </div>
    </div>
  </section>

  <section class="portfolio-project portfolio-project--ticketing" id="concert-ticketing" aria-labelledby="ticketing-title">
    <div class="portfolio-project-heading">
      <div>
        <p class="portfolio-eyebrow">PROJECT 02</p>
        <h2 id="ticketing-title">콘서트 티켓팅 예약 시스템</h2>
        <p class="portfolio-project-lead">
          대기열 진입부터 좌석 예약, 결제까지 이어지는 콘서트 티켓팅 서비스를 백엔드 중심으로 구현했습니다.
          동일 좌석 동시 요청과 결제 재요청을 테스트로 재현했습니다. 중복·정합성 문제도 해결했습니다.
        </p>
      </div>
      <span class="portfolio-project-number" aria-hidden="true">02</span>
    </div>

    <div class="portfolio-project-meta">
      <div><span>DATE</span><strong>2025.11 - 2026.05</strong></div>
      <div><span>TEAM</span><strong>1인 개발</strong></div>
      <div><span>ROLE</span><strong>백엔드</strong></div>
    </div>

    <div class="portfolio-requirements" aria-labelledby="ticketing-requirements-title">
      <div class="portfolio-requirements-heading">
        <p class="portfolio-card-kicker">PROBLEM · REQUIREMENTS · API</p>
        <h3 id="ticketing-requirements-title">한정 좌석 서비스를 대기열·예약·결제 상태로 분리했습니다.</h3>
      </div>
      <div class="portfolio-requirements-grid">
        <article>
          <span>문제 정의</span>
          <strong>같은 좌석에 몰리는 경쟁</strong>
          <p>동일 좌석에 여러 요청이 동시에 들어와도 한 명만 예약을 확정해야 합니다.</p>
        </article>
        <article>
          <span>핵심 기능</span>
          <strong>대기열·TEMP_HOLD·결제</strong>
          <p>대기열 진입·순번 조회·입장부터 좌석 임시 점유와 결제 확정까지 이어집니다.</p>
        </article>
        <article>
          <span>API 책임</span>
          <strong>자원 상태와 재요청 분리</strong>
          <p>좌석 ID를 경쟁 자원으로 삼습니다. reservationId로 기존 결제 여부를 먼저 확인합니다.</p>
        </article>
        <article>
          <span>완료 조건</span>
          <strong>확정 결과는 한 번만 반영</strong>
          <p>좌석 10회·동시 결제 5개·결제 재요청 2회 조건에서 중복 확정이 없어야 합니다.</p>
        </article>
      </div>
    </div>

    <div class="portfolio-system-visual portfolio-system-visual--ticketing" aria-label="콘서트 티켓팅 처리 흐름">
      <div class="portfolio-system-label">STATE CONFIRMATION</div>
      <div class="portfolio-flow">
        <div class="portfolio-flow-node"><strong>대기열</strong><span>진입 제어</span></div>
        <i class="fas fa-arrow-right portfolio-flow-arrow" aria-hidden="true"></i>
        <div class="portfolio-flow-node"><strong>좌석 락</strong><span>경쟁 직렬화</span></div>
        <i class="fas fa-arrow-right portfolio-flow-arrow" aria-hidden="true"></i>
        <div class="portfolio-flow-node"><strong>예약</strong><span>상태 확정</span></div>
        <i class="fas fa-arrow-right portfolio-flow-arrow" aria-hidden="true"></i>
        <div class="portfolio-flow-node"><strong>결제</strong><span>멱등 처리</span></div>
      </div>
    </div>

    <div class="portfolio-queue-design">
      <div class="portfolio-queue-heading">
        <p class="portfolio-card-kicker">QUEUE DESIGN</p>
        <h3>대기열 순번은 Redis Sorted Set의 정렬 순서로 보장했습니다.</h3>
        <p>
          사용자 토큰은 <code>userId</code> member로 저장합니다. 진입 시각은 score로 씁니다.
          rank 조회로 현재 위치를 보여줍니다. 입장시킬 때는 <code>ZPOPMIN</code>으로 가장 앞의 사용자를 꺼내면서 대기열에서도 제거합니다.
          여러 애플리케이션 인스턴스에서 같은 입장자가 중복으로 빠져나가지 않도록 Redis 원자 연산을 사용했습니다.
        </p>
      </div>
      <div class="portfolio-queue-grid">
        <article>
          <span>01 · ENQUEUE</span>
          <strong>진입 순서 기록</strong>
          <p><code>score = joinTimestamp</code>로 대기 순서를 정렬합니다.</p>
        </article>
        <article>
          <span>02 · RANK</span>
          <strong>현재 순번 조회</strong>
          <p><code>ZRANK + 1</code>로 사용자에게 1부터 시작하는 순번을 보여줍니다.</p>
        </article>
        <article>
          <span>03 · ADMIT</span>
          <strong>앞사람 원자 제거</strong>
          <p><code>ZPOPMIN</code>으로 다음 입장자를 꺼내고 대기열에서 제거합니다.</p>
        </article>
      </div>
      <div class="portfolio-queue-proof">
        <span class="portfolio-card-kicker">CHECKED CONDITION</span>
        <code>enqueue_users = 3</code>
        <code>rank_before_dequeue = [1, 2, 3]</code>
        <code>queue_length_after_dequeue = 2</code>
        <code>next_user_after_dequeue = user2</code>
        <span class="portfolio-proof-status"><i class="fas fa-check" aria-hidden="true"></i> queue order verified</span>
      </div>
    </div>

    <div class="portfolio-case-grid">
      <div class="portfolio-case-copy">
        <p class="portfolio-card-kicker">ARCHITECTURE</p>
        <h3>좌석 요청의 경쟁을 제어하고 확정 상태를 분리했습니다.</h3>
        <p>
          중복 예약을 막고 확정된 상태만 남기는 것을 목표로 했습니다. 좌석 ID를 경쟁 자원으로 정의했습니다.
          예약·결제·포인트는 원자적으로 확정했습니다. 커밋 이후 알림·통계 같은 후속 처리는 Kafka 이벤트로 분리했습니다.
        </p>
        <ul>
          <li>Redis: 대기열·좌석 조회 캐시·분산락 처리</li>
          <li>MySQL: 예약·결제·포인트·좌석 데이터 저장</li>
          <li>Kafka: 예약 확정 이벤트와 후속 처리 연결</li>
        </ul>
      </div>
      <div class="portfolio-decision-panel">
        <span class="portfolio-card-kicker">DECISION</span>
        <strong>커밋된 상태만 다음 단계로 전달하도록</strong>
        <p>좌석 경쟁과 확정 상태를 분리했습니다. 후속 처리는 이벤트로 넘겼습니다.</p>
      </div>
    </div>

    <div class="portfolio-proof-grid">
      <div class="portfolio-proof-copy">
        <p class="portfolio-card-kicker">TROUBLESHOOTING</p>
        <h3>재요청에도 결제·예약 상태를 한 번만 반영했습니다.</h3>
        <p>
          좌석 ID 기준으로 경쟁을 직렬화하고 Redis 락·소유권 토큰·만료 시간을 함께 관리했습니다.
          DB 트랜잭션과 락 해제 시점을 분리해 커밋 경계를 명확히 했습니다. reservationId로 기존 결제를 먼저 확인한 뒤
          새로운 결제에는 포인트·예약·결제를 하나의 트랜잭션으로 묶었습니다.
        </p>
        <div class="portfolio-metric-grid">
          <div><strong>같은 좌석 10회</strong><span>TEMP_HOLD 성공 1건</span></div>
          <div><strong>결제 재요청 2회</strong><span>결제·포인트 차감 각 1건</span></div>
          <div><strong>동시 결제 5개</strong><span>확정 예약·포인트 차감 각 1건</span></div>
        </div>
      </div>
      <div class="portfolio-proof-panel">
        <span class="portfolio-card-kicker">CHECKED CONDITION</span>
        <code>same_seat_requests = 10</code>
        <code>successful_hold = 1</code>
        <code>active_reservations = 1</code>
        <code>payment_retry_effect = 1</code>
        <span class="portfolio-proof-status"><i class="fas fa-check" aria-hidden="true"></i> idempotency verified</span>
      </div>
    </div>

    <div class="portfolio-project-links">
      <a class="portfolio-button" href="https://github.com/w00lam/concert-ticketing-server" target="_blank" rel="noopener">GitHub 레포 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-text-link" href="https://github.com/w00lam/concert-ticketing-server/blob/main/docs/Seat_Reservation_Concurrency_Report_2025_12_25.md" target="_blank" rel="noopener">동시성 보고서 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-text-link" href="https://github.com/w00lam/concert-ticketing-server/blob/main/src/test/java/kr/hhplus/be/server/integration/tokenqueue/TokenQueueIntegrationTest.java" target="_blank" rel="noopener">대기열 통합 테스트 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-text-link" href="https://github.com/w00lam/concert-ticketing-server/commit/f8b235a344ec3eedda6a916bd142ae3251a6a4c6" target="_blank" rel="noopener">멱등성 구현 커밋 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
    </div>

    <div class="portfolio-retrospective">
      <div>
        <p class="portfolio-card-kicker">LEARNED</p>
        <h3>락의 종류보다 자원·커밋·재시도 경계를 먼저 정의해야 했습니다.</h3>
        <p>Redis 락만 추가해서는 충분하지 않았습니다. 소유권 토큰, 만료, DB 트랜잭션, 결제 멱등성까지 함께 설계해야 정합성을 지킬 수 있었습니다.</p>
      </div>
      <div>
        <p class="portfolio-card-kicker">NEXT ITERATION</p>
        <h3>메시지 실패와 트래픽 변화를 운영 지표로 연결합니다.</h3>
        <p>다음 단계에서는 Kafka 재시도·DLT 처리와 부하 테스트 기준을 함께 운영해 지연, 실패, 재처리 상태를 수치로 관찰할 계획입니다.</p>
      </div>
    </div>
  </section>

  <section class="portfolio-section portfolio-ai" id="portfolio-ai" aria-labelledby="portfolio-ai-title">
    <div class="portfolio-section-heading">
      <p class="portfolio-eyebrow">AI-NATIVE WORKFLOW</p>
      <h2 id="portfolio-ai-title">AI가 프로젝트의 문맥을 놓치지 않게 작업 방식을 설계했습니다.</h2>
    </div>

    <div class="portfolio-ai-intro">
      <div class="portfolio-ai-summary">
        <p>
          설계부터 코드 작성, 테스트 생성, 디버깅, 문서화, 배포 자동화까지 Claude Code와 Codex를 활용했습니다.
          팀 프로젝트에서는 Codex Agent Skill을 직접 설계해 개발 과정에 적용했습니다.
        </p>
        <div class="portfolio-ai-tools" aria-label="사용한 AI 도구">
          <span><i class="fas fa-terminal" aria-hidden="true"></i> Claude Code</span>
          <span><i class="fas fa-code" aria-hidden="true"></i> Codex</span>
        </div>
        <a class="portfolio-ai-repository" href="https://github.com/team-11st-chat/11th-street" target="_blank" rel="noopener">
          실제 Skill이 적용된 저장소 보기 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
        </a>
      </div>

      <div class="portfolio-ai-why">
        <span class="portfolio-card-kicker">WHY I BUILT IT</span>
        <h3>일회성 프롬프트에만 의존하면 팀의 기준을 유지하기 어려웠습니다.</h3>
        <p>
          같은 프로젝트를 여러 사람이 AI와 함께 진행하면 작업 결과와 판단 기준이 달라질 수 있습니다.
          AI가 매번 추측하지 않도록 프로젝트 규칙과 현재 Repository 상태를 먼저 확인하게 했습니다.
          단계별 책임과 실행 조건은 Skill로 정의했습니다.
        </p>
      </div>
    </div>

    <div class="portfolio-ai-outcome">
      <span class="portfolio-card-kicker">OUTCOME</span>
      <strong>작업 전에 확인할 항목과 완료 조건을 통일해 팀 산출물의 형식을 맞췄습니다.</strong>
      <p>요구사항·코드·테스트·리뷰를 한 흐름으로 묶었습니다. AI가 만든 결과도 Repository와 실행 결과로 확인할 수 있게 했습니다.</p>
    </div>

    <div class="portfolio-ai-flow">
      <div class="portfolio-ai-flow-heading">
        <span class="portfolio-card-kicker">HOW IT WORKS</span>
        <strong>개발 산출물의 흐름을 AI Workflow에 연결했습니다.</strong>
      </div>
      <div class="portfolio-ai-pipeline" aria-label="Agent Skill 개발 흐름">
        <div><b>Requirements</b><small>목표·제약 확인</small></div>
        <i class="fas fa-arrow-right" aria-hidden="true"></i>
        <div><b>Domain</b><small>책임 경계 정리</small></div>
        <i class="fas fa-arrow-right" aria-hidden="true"></i>
        <div><b>Specification</b><small>동작·규칙 구체화</small></div>
        <i class="fas fa-arrow-right" aria-hidden="true"></i>
        <div><b>Issue</b><small>작업 단위 분해</small></div>
        <i class="fas fa-arrow-right" aria-hidden="true"></i>
        <div><b>Commit</b><small>변경 기록</small></div>
        <i class="fas fa-arrow-right" aria-hidden="true"></i>
        <div><b>PR · Review</b><small>검토·피드백</small></div>
      </div>
    </div>

    <div class="portfolio-ai-detail-grid">
      <article>
        <span class="portfolio-card-kicker">SKILL CONTRACT</span>
        <h3>각 단계의 책임을 분리했습니다.</h3>
        <p>
          Requirements, Domain, Specification, Issue, Commit, PR, Review, Repository Skill을 나눴습니다.
          공통 규칙은 따로 뒀습니다. 각 Skill에 역할, Trigger, 신뢰할 정보원, CLI 정책,
          Success Criteria를 정의했습니다.
        </p>
      </article>
      <article>
        <span class="portfolio-card-kicker">GUARDRAILS</span>
        <h3>추측하기보다 확인을 먼저 하도록 했습니다.</h3>
        <p>
          요구사항이 비어 있으면 질문합니다. Repository·기존 산출물·실행 결과를 확인한 뒤 다음 단계로 넘어갑니다.
          검증되지 않은 정보는 사실로 단정하지 않고 열린 질문이나 가정으로 남깁니다.
        </p>
      </article>
      <article>
        <span class="portfolio-card-kicker">TRACEABILITY</span>
        <h3>요구사항부터 리뷰까지 이어지게 했습니다.</h3>
        <p>
          Requirements → Domain → Specification → Issue → Commit → Pull Request → Review의 연결을 유지해
          어떤 판단과 변경이 어디에서 나왔는지 추적합니다.
        </p>
      </article>
    </div>

    <div class="portfolio-project-links">
      <a class="portfolio-text-link" href="https://github.com/team-11st-chat/11th-street/pull/98" target="_blank" rel="noopener">배포 헬스체크 롤백 PR <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-text-link" href="https://github.com/team-11st-chat/11th-street/commit/613dab07c1065360fdba6f7dab1dcba5afc7b9c3" target="_blank" rel="noopener">롤백 안정성 보강 커밋 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-text-link" href="https://github.com/team-11st-chat/11th-street/commit/ce1714355d7dd4c50a187971938b2d69e6fbff7e" target="_blank" rel="noopener">재검증 가능한 부하 결과 기록 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
    </div>
  </section>

  <section class="portfolio-section portfolio-delivery" id="portfolio-delivery" aria-labelledby="portfolio-delivery-title">
    <div class="portfolio-section-heading">
      <div>
        <p class="portfolio-eyebrow">PUBLIC ARTIFACTS · DELIVERY</p>
        <h2 id="portfolio-delivery-title">설명은 링크와 실행 결과로 확인할 수 있어야 합니다.</h2>
      </div>
    </div>

    <div class="portfolio-artifact-grid">
      <article>
        <span class="portfolio-card-kicker">RUNNING SITE</span>
        <h3>현재 포트폴리오</h3>
        <p>실제 페이지에서 프로젝트 설명과 연결된 산출물을 확인할 수 있습니다.</p>
        <a class="portfolio-text-link" href="https://w00lam.github.io/portfolio/" target="_blank" rel="noopener">포트폴리오 열기 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      </article>
      <article>
        <span class="portfolio-card-kicker">SOURCE</span>
        <h3>사이트 저장소</h3>
        <p>Jekyll 페이지·콘텐츠·스타일의 변경 이력과 커밋 흐름을 확인할 수 있습니다.</p>
        <a class="portfolio-text-link" href="https://github.com/w00lam/w00lam.github.io" target="_blank" rel="noopener">GitHub 저장소 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      </article>
      <article>
        <span class="portfolio-card-kicker">CI · DEPLOY</span>
        <h3>Push에서 GitHub Pages까지</h3>
        <p>master push를 기준으로 Jekyll 빌드와 Pages 배포가 이어지는 workflow를 공개했습니다.</p>
        <a class="portfolio-text-link" href="https://github.com/w00lam/w00lam.github.io/blob/master/.github/workflows/jekyll.yml" target="_blank" rel="noopener">배포 workflow <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      </article>
      <article>
        <span class="portfolio-card-kicker">PROJECT EVIDENCE</span>
        <h3>설계·테스트·변경 기록</h3>
        <p>티켓팅 프로젝트의 동시성 보고서, 통합 테스트, 멱등성 구현 커밋을 케이스 스터디에 연결했습니다.</p>
        <a class="portfolio-text-link" href="#concert-ticketing">티켓팅 근거 보기 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
      </article>
    </div>
  </section>

  <section class="portfolio-contact" id="portfolio-contact" aria-labelledby="portfolio-contact-title">
    <p class="portfolio-eyebrow">CONTACT</p>
    <h2 id="portfolio-contact-title">기록하고 배운 내용을 실제 문제에 적용합니다.</h2>
    <p>더 자세한 기술 기록은 블로그와 GitHub에서 확인할 수 있습니다.</p>
    <div class="portfolio-project-links">
      <a class="portfolio-button portfolio-button--light" href="https://github.com/w00lam" target="_blank" rel="noopener">GitHub 방문 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-button portfolio-button--outline" href="mailto:woolam.dev@gmail.com">이메일 보내기 <i class="fas fa-envelope" aria-hidden="true"></i></a>
    </div>
  </section>
</div>
