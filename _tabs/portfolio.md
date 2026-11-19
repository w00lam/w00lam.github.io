---
icon: fas fa-briefcase
order: 5
permalink: /portfolio/
description: Java와 Spring 기반 백엔드 개발자의 프로젝트와 검증 기록입니다.
comments: false
toc: false
---

<div class="portfolio-page">
  <section class="portfolio-hero" id="portfolio-overview" aria-labelledby="portfolio-hero-title">
    <div class="portfolio-hero-copy">
      <p class="portfolio-eyebrow">JAVA / SPRING BACKEND DEVELOPER</p>
      <h2 id="portfolio-hero-title">동시성과 트랜잭션을 설계하고, 검증 가능한 백엔드를 만듭니다.</h2>
      <p class="portfolio-hero-lead">
        재요청과 외부 장애에도 상태 정합성을 지키도록 설계하고, 테스트와 부하 검증으로 확인합니다.
      </p>
      <div class="portfolio-project-links" aria-label="주요 링크">
        <a class="portfolio-button portfolio-button--light" href="#portfolio-projects-title">프로젝트 보기</a>
        <a class="portfolio-text-link" href="https://github.com/w00lam" target="_blank" rel="noopener">GitHub</a>
      </div>
    </div>
    <aside class="portfolio-hero-focus" aria-label="설계 포인트">
      <p class="portfolio-hero-focus-title">설계 포인트</p>
      <div class="portfolio-hero-focus-list">
        <div class="portfolio-hero-focus-item">
          <strong>동시성</strong>
          <span>경쟁 상태를 제어하는 흐름</span>
        </div>
        <div class="portfolio-hero-focus-item">
          <strong>정합성</strong>
          <span>트랜잭션과 외부 연동의 경계</span>
        </div>
        <div class="portfolio-hero-focus-item">
          <strong>검증</strong>
          <span>테스트와 부하로 동작 확인</span>
        </div>
      </div>
    </aside>
  </section>

  <nav class="portfolio-nav" aria-label="포트폴리오 섹션">
    <a href="#portfolio-projects-title">Projects</a>
    <a href="#portfolio-approach">How I Work</a>
    <a href="#portfolio-stack">Stack</a>
    <a href="#portfolio-capabilities">Capability</a>
    <a href="#portfolio-ai">AI Workflow</a>
    <a href="#portfolio-contact">Contact</a>
  </nav>

  <section class="portfolio-section portfolio-project-index" aria-labelledby="portfolio-projects-title">
    <div class="portfolio-section-heading">
      <div>
        <p class="portfolio-eyebrow">SELECTED PROJECTS</p>
        <h2 id="portfolio-projects-title">문제를 풀고 검증한 두 가지 기록</h2>
      </div>
    </div>

    <div class="portfolio-project-grid">
      <article class="portfolio-project-card portfolio-project-card--matisson">
        <div class="portfolio-project-card-media" aria-hidden="true">
          <div class="portfolio-project-card-brand">
            <span class="portfolio-project-symbol">02</span>
            <span class="portfolio-project-type">AI PLACE DISCOVERY</span>
          </div>
          <div class="portfolio-project-card-rail">
            <span>검증</span><i class="fas fa-arrow-right"></i><span>저장</span><i class="fas fa-arrow-right"></i><span>운영</span>
          </div>
        </div>
        <div class="portfolio-project-card-body">
          <div class="portfolio-project-card-meta">
            <span class="portfolio-card-kicker">TEAM PROJECT / 2026.07 - 현재</span>
            <span class="portfolio-project-status"><i class="fas fa-circle" aria-hidden="true"></i> 진행 중</span>
          </div>
          <h3>맛잇온</h3>
          <p>AI 맛집 자동 등록 과정에서 발생하는 중복과 부분 저장을 경계 설계로 방지한 서비스입니다.</p>
          <a class="portfolio-card-link" href="#matisson">케이스 스터디 보기 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
        </div>
      </article>

      <article class="portfolio-project-card portfolio-project-card--ticketing">
        <div class="portfolio-project-card-media" aria-hidden="true">
          <div class="portfolio-project-card-brand">
            <span class="portfolio-project-symbol">01</span>
            <span class="portfolio-project-type">CONCURRENT BOOKING</span>
          </div>
          <div class="portfolio-project-card-rail">
            <span>대기열</span><i class="fas fa-arrow-right"></i><span>좌석</span><i class="fas fa-arrow-right"></i><span>결제</span>
          </div>
        </div>
        <div class="portfolio-project-card-body">
          <span class="portfolio-card-kicker">PERSONAL PROJECT / 2025.11 - 2026.05</span>
          <h3>콘서트 티켓팅</h3>
          <p>좌석 경쟁과 결제 재요청을 Redis 분산 락과 멱등성으로 제어한 백엔드 프로젝트입니다.</p>
          <a class="portfolio-card-link" href="#concert-ticketing">케이스 스터디 보기 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
        </div>
      </article>
    </div>
  </section>



  <section class="portfolio-section portfolio-approach" id="portfolio-approach" aria-labelledby="portfolio-approach-title">
    <div class="portfolio-section-heading">
      <p class="portfolio-eyebrow">HOW I WORK</p>
      <h2 id="portfolio-approach-title">문제를 재현하고, 경계를 나누고, 결과를 검증합니다.</h2>
    </div>

    <div class="portfolio-approach-grid">
      <div class="portfolio-approach-copy">
        <p>
          특정 도메인에만 적용하는 원칙은 아닙니다. 기능을 시작할 때 문제를 재현할 조건을 정합니다.
          책임과 실패의 경계를 나눕니다. 변경 후에도 지켜야 할 조건은 검증 가능한 형태로 남깁니다.
        </p>
      </div>

      <div class="portfolio-signal-list">
        <article class="portfolio-signal-card">
          <span class="portfolio-card-kicker">01 / REPRODUCE</span>
          <h3>문제를 재현할 수 있는가?</h3>
          <p>정상 흐름만 확인하지 않습니다. 동시 요청과 재요청, 외부 의존성 실패처럼 문제가 드러나는 조건부터 정의합니다.</p>
        </article>
        <article class="portfolio-signal-card">
          <span class="portfolio-card-kicker">02 / BOUNDARY</span>
          <h3>실패가 번지는 경계는 어디인가?</h3>
          <p>요청, 도메인, 트랜잭션, 외부 시스템의 책임을 나눕니다. 한 단계의 실패가 전체 작업으로 번지지 않도록 하기 위해서입니다.</p>
        </article>
        <article class="portfolio-signal-card">
          <span class="portfolio-card-kicker">03 / INVARIANT</span>
          <h3>변경 후에도 지켜야 할 조건은 무엇인가?</h3>
          <p>중복 없음, 상태 정합성, 재시도 안전성처럼 서비스가 지켜야 할 조건을 테스트로 확인합니다.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="portfolio-section portfolio-stack" id="portfolio-stack" aria-labelledby="portfolio-stack-title">
    <div class="portfolio-section-heading">
      <div>
        <p class="portfolio-eyebrow">TECH STACK</p>
        <h2 id="portfolio-stack-title">설계와 검증을 위해 선택한 기술</h2>
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
        <p>상태를 저장하고 자원 경쟁을 제어합니다.</p>
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
        <p>변경 결과를 빠르게 확인하고 개선합니다.</p>
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
        <span class="portfolio-card-kicker">CODE / OOP</span>
        <h3>변경 이유가 드러나는 객체 설계</h3>
        <p>다형성과 책임을 분리해 조건문을 줄이고, 메서드 이름에 도메인의 의도를 담습니다.</p>
        <a class="portfolio-text-link" href="{{ '/posts/ood-polymorphism/' | relative_url }}">OOP 설계 기록 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
      </article>
      <article>
        <span class="portfolio-card-kicker">SPRING / LAYER</span>
        <h3>IoC/DI와 계층의 책임 분리</h3>
        <p>Controller/Service/Repository로 책임을 나누고, 상황에 따라 Facade와 전역 예외 처리의 경계도 설계합니다.</p>
        <a class="portfolio-text-link" href="{{ '/posts/spring-boot-bean-exception/' | relative_url }}">Spring 구조 기록 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
      </article>
      <article>
        <span class="portfolio-card-kicker">API / DATA</span>
        <h3>자원 상태와 데이터 접근을 분리</h3>
        <p>GET/POST/PUT/PATCH의 의미와 2xx/4xx 상태 코드를 API 계약에 명시합니다. JPA/QueryDSL/MySQL/Redis의 조회/캐시 경계도 설계합니다.</p>
        <a class="portfolio-text-link" href="{{ '/posts/api-spec-5-principles/' | relative_url }}">API 설계 기록 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
      </article>
      <article>
        <span class="portfolio-card-kicker">SECURITY / DELIVERY</span>
        <h3>인증부터 배포 후 확인까지</h3>
        <p>세션과 JWT의 트레이드오프를 비교하고, Security Filter와 Interceptor의 책임 경계를 구분합니다. PR/CI/배포 후 검증까지 하나의 흐름으로 연결합니다.</p>
        <a class="portfolio-text-link" href="{{ '/posts/session-to-jwt-auth/' | relative_url }}">인증 전환 기록 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
      </article>
    </div>
  </section>

  <div class="portfolio-project-sections">
  <section class="portfolio-project portfolio-project--matisson" id="matisson" aria-labelledby="matisson-title">
    <div class="portfolio-project-heading">
      <div>
        <p class="portfolio-eyebrow">PROJECT 02</p>
        <h2 id="matisson-title">맛잇온</h2>
        <p class="portfolio-project-lead">
          유튜버가 방문한 맛집을 지역, 음식 종류, 유튜버 기준으로 탐색하는 서비스입니다.
          백엔드와 인프라를 담당하고, 일부 프론트엔드 구현과 프로젝트 진행도 맡았습니다.
        </p>
        <a class="portfolio-text-link" href="https://masiton.click/restaurants" target="_blank" rel="noopener">서비스 열기 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      </div>
      <span class="portfolio-project-number" aria-hidden="true">02</span>
    </div>

    <div class="portfolio-project-meta portfolio-project-meta--in-progress">
      <div><span>DATE</span><strong>2026.07 ~ 진행 중</strong></div>
      <div><span>TEAM</span><strong>백엔드 4명</strong></div>
      <div><span>ROLE</span><strong>팀장 / 백엔드 / 인프라 / 프론트엔드 일부 / 일정/업무 조율</strong></div>
    </div>

    <div class="portfolio-requirements" aria-labelledby="matisson-requirements-title">
      <div class="portfolio-requirements-heading">
        <p class="portfolio-card-kicker">PROBLEM / REQUIREMENTS / API</p>
        <h3 id="matisson-requirements-title">탐색 기능의 흐름을 등록/검증/저장으로 나눴습니다.</h3>
      </div>
      <div class="portfolio-requirements-grid">
        <article>
          <span>문제 정의</span>
          <strong>흩어진 맛집 정보 탐색</strong>
          <p>유튜버가 방문한 맛집을 지역/음식 종류/유튜버 기준으로 찾을 수 있게 했습니다.</p>
        </article>
        <article>
          <span>핵심 기능</span>
          <strong>탐색/인증/제보/신고</strong>
          <p>지도와 검색 화면, 사용자 인증, 맛집 제보와 신고 기능을 제공합니다.</p>
        </article>
        <article>
          <span>API 책임</span>
          <strong>검증 결과와 저장 상태 분리</strong>
          <p>외부 검증과 중복 확인을 거친 뒤, 맛집 단위로 상태를 확정해 저장합니다.</p>
        </article>
        <article>
          <span>완료 조건</span>
          <strong>중복/부분 저장 없음</strong>
          <p>동일 맛집에 10회 요청을 보내도 중복 저장과 부분 저장이 없어야 합니다.</p>
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
        <h3>검증과 저장을 분리했습니다.</h3>
        <p>
          외부 API 검증은 요청 흐름에서 처리하고, DB 저장이 필요한 구간에만 트랜잭션을 적용했습니다.
          핵심 상태를 확정한 뒤 테스트와 후속 처리를 분리했습니다.
        </p>
        <ul>
          <li>Next.js 프론트엔드: 지도와 맛집 탐색 화면, 인증 흐름</li>
          <li>Spring Boot API: 맛집 검색, 인증, 제보, 신고 처리</li>
          <li>Docker / Terraform / AWS: 애플리케이션 실행/운영 환경 구성</li>
        </ul>
      </div>
      <div class="portfolio-decision-panel">
        <span class="portfolio-card-kicker">DECISION</span>
        <strong>한 건의 실패가 전체 등록을 막지 않도록</strong>
        <p>검증과 저장을 나누고, 맛집별 등록을 독립된 단위로 확인했습니다.</p>
      </div>
    </div>

    <div class="portfolio-infra-proof">
      <div class="portfolio-infra-proof-heading">
        <p class="portfolio-card-kicker">INFRASTRUCTURE EVIDENCE</p>
        <h3>애플리케이션과 실행 환경을 분리했습니다.</h3>
        <p>
          AWS 요청 흐름은 VPC 안에서 Public과 Private Subnet, ALB, EC2, RDS(PostgreSQL)로 분리했습니다.
          배포 흐름은 CI/CD, ECR, ASG와 Blue-Green 전환으로 나눠 정리했습니다.
        </p>
      </div>
      <figure class="portfolio-architecture-figure portfolio-architecture-figure--wide">
        <img src="{{ '/assets/images/2026-05-19-posting/aws-request-flow-vpc.png' | relative_url }}" alt="AWS VPC의 Public Subnet과 Private Subnet, ALB, EC2, RDS(PostgreSQL) 요청 흐름" loading="lazy">
        <figcaption>
          VPC 안에서 외부 요청과 PostgreSQL 데이터베이스 접근을 분리한 구조입니다.
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
        <h3>AI 자동 등록의 경계를 분리했습니다.</h3>
        <p>
          동일한 맛집에 요청이 동시에 들어오면 중복 등록이나 부분 저장이 발생할 수 있었습니다.
          외부 검증과 DB 저장을 분리했습니다. 맛집 단위의 저장만 하나의 작업으로 묶어 실패 범위를 좁혔습니다.
          저장 직전에 상태를 다시 확인했습니다.
        </p>
        <div class="portfolio-metric-grid">
          <div><strong>동시 요청</strong><span>같은 맛집 요청 10회 재현</span></div>
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
          <p class="portfolio-card-kicker">SCALE / PUBLIC READ</p>
          <h3>공개 조회 부하는 AI 등록 작업과 분리해 측정했습니다.</h3>
          <p>
            맛잇온은 좌석 선점이 핵심인 티켓팅 서비스와 달리, 공개 조회 경로와 AI 자동 등록 Worker를
            서로 다른 기준으로 검증했습니다. 운영 검증 참여자 전용 범위에서 <code>200 VU / 80 RPS</code> 부하 프로필을 실행해
            24,001개 표본에서 5xx 0%, dropped iteration 0건, 백엔드 CPU 약 14.73%를 관찰했습니다.
            이 수치는 공개 조회 부하의 결과이며, AI Worker의 실제 처리 용량을 의미하지 않습니다.
          </p>
          <a class="portfolio-text-link" href="https://github.com/team-youngkk/masit-on/blob/main/docs/08-planning/issue-190-operational-performance-result.md" target="_blank" rel="noopener">운영 부하 관찰 결과 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
        </div>
        <div class="portfolio-proof-panel">
          <span class="portfolio-card-kicker">OBSERVED CONDITION</span>
          <code>public_read_load = 200 VU / 80 RPS</code>
          <code>measured_samples = 24,001</code>
          <code>server_5xx = 0%</code>
          <code>dropped_iterations = 0</code>
          <code>backend_cpu_peak ≈ 14.73%</code>
          <span class="portfolio-proof-status"><i class="fas fa-check" aria-hidden="true"></i> public read load observed</span>
        </div>
      </article>

      <article class="portfolio-additional-case">
        <div>
          <p class="portfolio-card-kicker">EXTERNAL FAILURE / WIREMOCK</p>
          <h3>실제 API를 호출하지 않고도 외부 장애와 저장 경계를 검증했습니다.</h3>
          <p>
            Kakao와 YouTube 실 API는 quota, 비용, 외부 상태 변화 때문에 자동화 테스트에서 직접 호출하지 않았습니다.
            Testcontainers로 WireMock을 띄워 정상 응답, 빈 결과, 429 rate limit, 잘못된 JSON, 필수 필드 누락, 응답 지연(timeout)을 재현했습니다.
            외부 실패는 <code>EXTERNAL_SERVICE_ERROR</code>로 분류했습니다. 별도 PostgreSQL 통합 테스트에서는 정식 등록 이후 단계에 실패를 주입해 후보/맛집/크리에이터/영상/방문 데이터가 모두 0건으로 롤백되는 것까지 확인했습니다.
          </p>
          <div class="portfolio-project-links">
            <a class="portfolio-text-link" href="https://github.com/team-youngkk/masit-on/blob/main/src/test/java/com/masiton/external/ExternalVerificationWireMockFixtureIntegrationTest.java" target="_blank" rel="noopener">WireMock 장애 fixture <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
            <a class="portfolio-text-link" href="https://github.com/team-youngkk/masit-on/blob/main/src/test/java/com/masiton/acceptance/AdminRegistrationJourneyAcceptanceTest.java" target="_blank" rel="noopener">WireMock 관리자 등록 흐름 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
            <a class="portfolio-text-link" href="https://github.com/team-youngkk/masit-on/blob/main/src/test/java/com/masiton/orchestration/application/RegistrationUnitExecutionServiceTest.java" target="_blank" rel="noopener">외부 실패 분류 테스트 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
            <a class="portfolio-text-link" href="https://github.com/team-youngkk/masit-on/blob/main/src/test/java/com/masiton/ai/application/AiExtractionResultCommitServicePostgreSqlIntegrationTest.java" target="_blank" rel="noopener">저장 원자성 테스트 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
          </div>
        </div>
        <div class="portfolio-proof-panel">
          <span class="portfolio-card-kicker">CHECKED CONDITION</span>
          <code>test_external_calls = 0</code>
          <code>failure_fixtures = 429 + malformed + missing + timeout</code>
          <code>failure_code = EXTERNAL_SERVICE_ERROR</code>
          <code>rollback_core_entities = 0</code>
          <span class="portfolio-proof-status"><i class="fas fa-check" aria-hidden="true"></i> external boundary verified</span>
        </div>
      </article>

      <article class="portfolio-additional-case">
        <div>
          <p class="portfolio-card-kicker">SCALE / AI WORKER</p>
          <h3>AI 자동 등록은 요청 지연이 아니라 작업 수용과 backlog 소진을 기준으로 검증했습니다.</h3>
          <p>
            실제 Gemini, Kakao, YouTube quota를 사용하지 않는 격리 환경에서 관리자 AI 작업 200건을 초당 10건씩, 20초 동안 제출했습니다.
            제출 API는 200건 모두 수용했고 p95는 45.36ms, dropped iteration은 0건이었습니다. 이후 WireMock 외부 검증과 DB 저장을 포함한
            Worker 처리 구간은 p95 10.18ms/p99 11.88ms였지만, 단일 Worker의 5초 polling 정책 때문에 마지막 작업까지 1,007.7초가 걸렸습니다.
            모든 작업은 실패 없이 종료됐고, 동일 장소에 대한 199건은 <code>DUPLICATE_CONFLICT</code>로 차단되어 맛집, 크리에이터, 영상, 방문 데이터는 각각 한 건만 남았습니다.
          </p>
          <div class="portfolio-project-links">
            <a class="portfolio-text-link" href="https://github.com/team-youngkk/masit-on/blob/main/src/main/java/com/masiton/ai/application/AiExtractionWorkerService.java" target="_blank" rel="noopener">Worker 처리 경계 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
            <a class="portfolio-text-link" href="https://github.com/team-youngkk/masit-on/blob/main/src/test/java/com/masiton/ai/infrastructure/persistence/JdbcAiExtractionWorkerStoreIntegrationTest.java" target="_blank" rel="noopener">Worker 동시성/lease 검증 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
          </div>
        </div>
        <div class="portfolio-proof-panel">
          <span class="portfolio-card-kicker">CHECKED CONDITION</span>
          <code>submit_load = 200 jobs / 10 RPS / 20s</code>
          <code>submit_accepted = 200 / 200</code>
          <code>submit_p95 = 45.36ms</code>
          <code>worker_attempt_p95 = 10.18ms</code>
          <code>worker_attempt_p99 = 11.88ms</code>
          <code>queue_drain_single_worker_5s_polling = 1,007.7s</code>
          <code>terminal = SUCCEEDED 200 / FAILED 0</code>
          <code>core_resources = 1 / 1 / 1 / 1</code>
          <span class="portfolio-proof-status"><i class="fas fa-check" aria-hidden="true"></i> async capacity boundary observed</span>
        </div>
      </article>

      <article class="portfolio-additional-case">
        <div>
          <p class="portfolio-card-kicker">OPERATIONS / SECRETS</p>
          <h3>컨테이너 메타데이터에 노출되던 비밀값 주입 방식을 tmpfs 파일 주입으로 전환했습니다.</h3>
          <p>
            <code>docker run</code> 환경 변수로 전달한 비밀값이 <code>config.v2.json</code>에 평문으로 남아 <code>docker inspect</code>와 볼륨 스냅샷에서 읽히는 경로를 확인했습니다. 이후 환경 변수로 직접 전달하지 않고 tmpfs 파일로 주입해 실행 메타데이터와 영속 볼륨에 비밀값이 남지 않도록 했습니다.
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
          <p class="portfolio-card-kicker">OPERATIONS / RELEASE</p>
          <h3>배포 실패 시 백엔드와 프론트엔드가 서로 다른 버전으로 남지 않도록 교체 단위를 원자적으로 구성했습니다.</h3>
          <p>
            배포 루프에서 참조 파일을 먼저 바꾸면 이미지 하나의 pull이 실패했을 때 백엔드와 프론트엔드가 서로 다른 버전으로 서비스될 수 있었습니다. 그래서 두 이미지 참조를 임시 디렉터리에 먼저 staging하고, 모두 pull에 성공한 뒤 install 단계에서 한 번에 교체하도록 배포 경계를 나눴습니다.
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
        <p>검증, 저장, 후속 처리를 나누면서 실패 범위를 작게 만드는 일이 기능 구현만큼 중요하다는 점을 확인했습니다.</p>
      </div>
      <div>
        <p class="portfolio-card-kicker">NEXT ITERATION</p>
        <h3>AI Worker는 공개 조회와 다른 기준으로 용량을 확인합니다.</h3>
        <p>공개 조회는 RPS와 응답 시간으로, AI 자동 등록은 작업 수용률, terminal 실패율, backlog 소진 시간, 중복 리소스 수로 확인합니다. 실제 Gemini quota를 사용하기 전에는 이 격리 테스트 결과를 기준선으로 삼아 Worker 동시성, 재기동 복구, quota hard stop을 별도 게이트로 확인합니다.</p>
      </div>
    </div>
  </section>

  <section class="portfolio-project portfolio-project--ticketing" id="concert-ticketing" aria-labelledby="ticketing-title">
    <div class="portfolio-project-heading">
      <div>
        <p class="portfolio-eyebrow">PROJECT 01</p>
        <h2 id="ticketing-title">콘서트 티켓팅</h2>
        <p class="portfolio-project-lead">
          대기열 진입부터 좌석 예약과 결제까지 이어지는 콘서트 티켓팅 서비스를 백엔드 중심으로 구현했습니다.
          동일 좌석에 대한 동시 요청과 결제 재요청을 테스트로 재현하고, 중복과 정합성 문제를 해결했습니다.
        </p>
      </div>
      <span class="portfolio-project-number" aria-hidden="true">01</span>
    </div>

    <div class="portfolio-project-meta">
      <div><span>DATE</span><strong>2025.11 ~ 2026.05</strong></div>
      <div><span>TEAM</span><strong>1인 개발</strong></div>
      <div><span>ROLE</span><strong>백엔드</strong></div>
    </div>

    <div class="portfolio-requirements" aria-labelledby="ticketing-requirements-title">
      <div class="portfolio-requirements-heading">
        <p class="portfolio-card-kicker">PROBLEM / REQUIREMENTS / API</p>
        <h3 id="ticketing-requirements-title">한정된 좌석 서비스를 대기열/예약/결제 상태로 나눴습니다.</h3>
      </div>
      <div class="portfolio-requirements-grid">
        <article>
          <span>문제 정의</span>
          <strong>같은 좌석으로 몰리는 요청 경쟁</strong>
          <p>동일 좌석에 여러 요청이 동시에 들어와도 한 건만 예약을 확정해야 합니다.</p>
        </article>
        <article>
          <span>핵심 기능</span>
          <strong>대기열/TEMP_HOLD/결제</strong>
          <p>대기열 진입/순번 조회/입장부터 좌석 임시 점유와 결제 확정까지 이어지는 흐름입니다.</p>
        </article>
        <article>
          <span>API 책임</span>
          <strong>자원 상태와 재요청 분리</strong>
          <p>좌석 ID를 경쟁 자원으로 정의하고, reservationId로 기존 결제 여부를 먼저 확인합니다.</p>
        </article>
        <article>
          <span>완료 조건</span>
          <strong>확정 결과는 한 번만 반영</strong>
          <p>좌석 동시 요청 100/500회와 동일 결제 요청 100/500개 조건에서 중복 확정이 없어야 합니다.</p>
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

    <div class="portfolio-requirements portfolio-data-model" aria-labelledby="ticketing-data-model-title">
      <div class="portfolio-requirements-heading">
        <p class="portfolio-card-kicker">DATA MODEL / ERD</p>
        <h3 id="ticketing-data-model-title">좌석 경쟁과 결제 정합성을 관계와 제약으로 분리했습니다.</h3>
        <p>
          공연, 회차, 좌석을 예약의 기준 자원으로 두고, 예약 상태와 결제 상태를 별도 엔티티로 관리했습니다.
          포인트는 사용자 잔액과 충전/사용 이력을 나눠 기록하고, 예약/결제/포인트 차감은 하나의 커밋 경계에서 확정합니다.
        </p>
      </div>
      <div class="portfolio-requirements-grid">
        <article>
          <span>CONCERT → SEAT</span>
          <strong>공연/회차/좌석</strong>
          <p><code>concert_date_id</code> 아래 좌석을 묶고, 구역/행/번호 조합으로 같은 좌석 생성을 막습니다.</p>
        </article>
        <article>
          <span>USER → RESERVATION</span>
          <strong>예약 상태와 임시 점유</strong>
          <p><code>TEMP_HOLD</code>의 만료 시각을 기준으로 활성 예약을 판정하고 <code>CONFIRMED</code>/<code>CANCELED</code>/<code>EXPIRED</code>로 전이합니다.</p>
        </article>
        <article>
          <span>RESERVATION → PAYMENT</span>
          <strong>예약당 결제 한 건</strong>
          <p><code>payment.reservation_id</code>에 unique 제약을 두어 동일 예약의 결제 재요청을 한 건으로 수렴시킵니다.</p>
        </article>
        <article>
          <span>USER → POINT</span>
          <strong>잔액과 이력 분리</strong>
          <p><code>users.points</code> 잔액과 <code>POINTS</code>의 <code>CHARGE/USE</code> 이력을 결제 트랜잭션과 함께 관리합니다.</p>
        </article>
      </div>
      <div class="portfolio-project-links">
        <a class="portfolio-text-link" href="https://github.com/w00lam/concert-ticketing-server/blob/main/docs/erd.md" target="_blank" rel="noopener">ERD/테이블 명세 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
        <a class="portfolio-text-link" href="https://github.com/w00lam/concert-ticketing-server/blob/main/docs/database-schema-migrations.md" target="_blank" rel="noopener">스키마 마이그레이션 규칙 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      </div>
    </div>

    <div class="portfolio-queue-design">
      <div class="portfolio-queue-heading">
        <p class="portfolio-card-kicker">QUEUE DESIGN</p>
        <h3>대기열 순번을 Redis Sorted Set으로 관리했습니다.</h3>
        <p>
            사용자 토큰은 <code>userId</code>를 member로, 진입 시각은 score로 저장합니다. rank를 조회해 현재 위치를 보여주고, 입장시킬 때는 <code>ZPOPMIN</code>으로 가장 앞의 사용자를 꺼내 대기열에서도 제거합니다.
            한 테스트 프로세스의 8개 작업과 독립 JVM 2개의 dequeue worker에서도 같은 입장자가 중복으로 빠져나가지 않도록 Redis 원자 연산을 사용했습니다.
            API 응답 계약은 유지한 채, 두 애플리케이션 인스턴스 대상 HTTP 부하 측정은 k6/Grafana 실행 절차로 분리했습니다.
        </p>
      </div>
      <div class="portfolio-queue-grid">
        <article>
          <span>01 / ENQUEUE</span>
          <strong>진입 순서 기록</strong>
          <p><code>score = joinTimestamp</code>로 대기 순서를 정렬합니다. 1,000명의 순번을 검증했습니다.</p>
        </article>
        <article>
          <span>02 / RANK</span>
          <strong>현재 순번 조회</strong>
          <p><code>ZRANK + 1</code>로 사용자에게 1부터 시작하는 순번을 보여줍니다.</p>
        </article>
        <article>
          <span>03 / ADMIT</span>
          <strong>선두 사용자 원자 제거</strong>
          <p><code>ZPOPMIN</code>으로 다음 입장자를 꺼내고 대기열에서 제거합니다.</p>
        </article>
      </div>
      <div class="portfolio-queue-proof">
        <div class="portfolio-queue-proof-summary">
          <p class="portfolio-card-kicker">VERIFICATION SUMMARY</p>
          <strong>정합성과 성능을 분리해 확인했습니다.</strong>
        </div>
        <div class="portfolio-queue-proof-groups">
          <div class="portfolio-queue-proof-group">
            <div class="portfolio-queue-proof-group-heading">
              <span class="portfolio-card-kicker">CONSISTENCY / 대표값</span>
              <strong class="portfolio-queue-proof-primary"><code>multi_instance_duplicates = 0</code></strong>
              <span>독립 JVM 2개에서도 같은 입장자가 중복으로 빠지지 않았습니다.</span>
            </div>
            <div class="portfolio-queue-proof-support">
              <code>enqueue_users = 1,000</code>
              <code>rank_values = [1..1,000]</code>
              <code>dequeue_workers = 8</code>
              <code>dequeue_duplicates = 0</code>
              <code>queue_length_after_dequeue = 0</code>
              <code>application_instances = 2</code>
              <code>dequeue_per_instance = 500</code>
            </div>
          </div>
          <div class="portfolio-queue-proof-group">
            <div class="portfolio-queue-proof-group-heading">
              <span class="portfolio-card-kicker">PERFORMANCE / 대표값</span>
              <strong class="portfolio-queue-proof-primary"><code>http_dequeue_p95_ms = 3.97</code></strong>
              <span>두 애플리케이션 인스턴스에 HTTP 요청 1,000개를 보냈습니다.</span>
            </div>
            <div class="portfolio-queue-proof-support">
              <code>http_dequeue_requests = 1,000</code>
              <code>http_dequeue_throughput_per_second = 3,378.38</code>
              <code>http_dequeue_p99_ms = 4.88</code>
              <code>http_dequeue_failure_rate = 0%</code>
            </div>
          </div>
        </div>
        <span class="portfolio-proof-status"><i class="fas fa-check" aria-hidden="true"></i> rank, multi-JVM atomic dequeue, and HTTP performance verified</span>
      </div>
    </div>

    <div class="portfolio-case-grid">
      <div class="portfolio-case-copy">
        <p class="portfolio-card-kicker">ARCHITECTURE</p>
        <h3>좌석 요청의 경쟁을 제어하고 확정 상태를 분리했습니다.</h3>
        <p>
          중복 예약을 막고 확정된 상태만 남기는 것을 목표로 했습니다. 좌석 ID를 경쟁 자원으로 정의했습니다.
          예약, 결제, 포인트는 원자적으로 확정했습니다. 커밋 이후 알림과 통계 같은 후속 처리는 Kafka 이벤트로 분리했습니다.
        </p>
        <ul>
          <li>Redis: 대기열/좌석 조회 캐시/분산 락 처리</li>
          <li>MySQL: 예약/결제/포인트/좌석 데이터 저장</li>
          <li>Kafka: 예약 확정 이벤트 발행/Consumer 전달/실패 DLT 이관</li>
        </ul>
      </div>
      <div class="portfolio-decision-panel">
        <span class="portfolio-card-kicker">DECISION</span>
        <strong>커밋된 상태만 다음 단계로 전달하도록</strong>
        <p>좌석 경쟁과 확정 상태를 분리했습니다. Kafka는 예약 확정 이벤트 전달 실패를 2회 재시도한 뒤 <code>reservation-confirmed-dlt</code>로 이관하는 흐름까지 검증했습니다. 2회는 이번 검증 기준이며 운영 확정값은 아닙니다.</p>
      </div>
    </div>

    <div class="portfolio-proof-grid">
      <div class="portfolio-proof-copy">
        <p class="portfolio-card-kicker">TROUBLESHOOTING</p>
        <div class="portfolio-proof-highlight">
          <span class="portfolio-card-kicker">WITHOUT LOCK / CONTROL</span>
          <strong>동일 좌석 500회 요청에서 예약 3건이 발생했습니다.</strong>
          <code>without_lock_reservations_at_500 = 3</code>
        </div>
        <h3>재요청에도 결제/예약 상태를 한 번만 반영했습니다.</h3>
        <p>
          좌석 ID를 기준으로 요청 경쟁을 직렬화하고, Redis 락, 소유권 토큰, 만료 시간을 함께 관리했습니다.
          DB 트랜잭션과 락 해제 시점을 분리해 커밋 경계를 명확히 했습니다. reservationId로 기존 결제를 먼저 확인한 뒤
          새로운 결제에는 포인트, 예약, 결제를 하나의 트랜잭션으로 묶었습니다.
        </p>
        <div class="portfolio-metric-grid">
          <div><strong>같은 좌석 요청 100/500회</strong><span>락 적용 시 TEMP_HOLD 1건</span></div>
          <div><strong>결제 재요청 2회</strong><span>결제/포인트 차감 각 1건</span></div>
          <div><strong>동일 결제 요청 100/500개</strong><span>결제/포인트 차감 각 1건</span></div>
        </div>
      </div>
      <div class="portfolio-proof-panel">
        <span class="portfolio-card-kicker">CHECKED CONDITION</span>
        <code>same_seat_requests = [100, 500]</code>
        <code>successful_hold = 1</code>
        <code>active_reservations = 1</code>
        <code>payment_retry_effect = 1</code>
        <code>same_payment_requests = [100, 500]</code>
        <code>payment_records = 1</code>
        <code>point_deduction = 1</code>
        <span class="portfolio-proof-status"><i class="fas fa-check" aria-hidden="true"></i> idempotency verified</span>
      </div>
    </div>

    <div class="portfolio-project-links">
      <a class="portfolio-button" href="https://github.com/w00lam/concert-ticketing-server" target="_blank" rel="noopener">GitHub 레포 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-text-link" href="https://github.com/w00lam/concert-ticketing-server/blob/main/docs/Seat_Reservation_Concurrency_Report_2025_12_25.md" target="_blank" rel="noopener">동시성 보고서 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-text-link" href="https://github.com/w00lam/concert-ticketing-server/blob/main/src/test/java/kr/hhplus/be/server/integration/tokenqueue/TokenQueueIntegrationTest.java" target="_blank" rel="noopener">대기열 통합 테스트 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-text-link" href="https://github.com/w00lam/concert-ticketing-server/blob/main/src/test/java/kr/hhplus/be/server/integration/tokenqueue/TokenQueueMultiInstanceIntegrationTest.java" target="_blank" rel="noopener">독립 JVM 대기열 검증 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-text-link" href="https://github.com/w00lam/concert-ticketing-server/blob/main/docs/queue-k6-grafana-runbook.md" target="_blank" rel="noopener">k6/Grafana 부하 측정 절차 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-text-link" href="https://github.com/w00lam/concert-ticketing-server/blob/main/src/test/java/kr/hhplus/be/server/integration/infrastructure/event/KafkaReservationFailureIntegrationTest.java" target="_blank" rel="noopener">Kafka 실패/DLT 검증 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-text-link" href="https://github.com/w00lam/concert-ticketing-server/commit/f8b235a344ec3eedda6a916bd142ae3251a6a4c6" target="_blank" rel="noopener">멱등성 구현 커밋 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
    </div>

    <div class="portfolio-retrospective">
      <div>
        <p class="portfolio-card-kicker">LEARNED</p>
        <h3>락의 종류보다 자원/커밋/재시도 경계를 먼저 정의해야 했습니다.</h3>
        <p>Redis 락만 추가해서는 충분하지 않았습니다. 소유권 토큰, 만료, DB 트랜잭션, 결제 멱등성까지 함께 설계해야 정합성을 지킬 수 있었습니다.</p>
      </div>
      <div>
        <p class="portfolio-card-kicker">NEXT ITERATION</p>
        <h3>메시지 실패와 트래픽 변화를 운영 지표로 연결합니다.</h3>
        <p>로컬 환경에서 Kafka 재시도/DLT 처리와 두 애플리케이션 인스턴스의 HTTP 부하를 검증했습니다. 다음 단계에서는 이를 운영 환경 지표와 연결해 지연, 실패, 재처리 상태를 관찰할 계획입니다.</p>
      </div>
    </div>
  </section>
  </div>

  <section class="portfolio-section portfolio-ai" id="portfolio-ai" aria-labelledby="portfolio-ai-title">
    <div class="portfolio-section-heading">
      <p class="portfolio-eyebrow">AI-NATIVE WORKFLOW</p>
      <h2 id="portfolio-ai-title">AI가 프로젝트의 문맥을 놓치지 않도록 작업 방식을 설계했습니다.</h2>
    </div>

    <div class="portfolio-ai-intro">
      <div class="portfolio-ai-summary">
        <p>
          설계, 코드 작성, 테스트 생성, 디버깅, 문서화, 배포 자동화에 Claude Code와 Codex를 활용했습니다.
          팀 프로젝트에서는 Codex Agent Skill을 직접 설계하고 개발 과정에 적용했습니다.
        </p>
        <div class="portfolio-ai-tools" aria-label="사용한 AI 도구">
          <span><i class="fas fa-terminal" aria-hidden="true"></i> Claude Code</span>
          <span><i class="fas fa-code" aria-hidden="true"></i> Codex</span>
        </div>
        <a class="portfolio-ai-repository" href="https://github.com/team-11st-chat/11th-street" target="_blank" rel="noopener">
          내가 설계한 Skill을 팀 프로젝트에 적용한 저장소 보기 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
        </a>
      </div>

      <div class="portfolio-ai-why">
        <span class="portfolio-card-kicker">WHY I BUILT IT</span>
        <h3>일회성 프롬프트에만 의존하면 팀의 기준을 일관되게 유지하기 어려웠습니다.</h3>
        <p>
          같은 프로젝트를 여러 사람이 AI와 함께 진행하면 작업 결과와 판단 기준이 달라질 수 있습니다.
          AI가 매번 추측하지 않도록 프로젝트 규칙과 현재 Repository 상태를 먼저 확인하도록 했습니다.
          단계별 책임과 실행 조건은 Skill로 정의했습니다.
        </p>
      </div>
    </div>

    <div class="portfolio-ai-outcome">
      <span class="portfolio-card-kicker">OUTCOME</span>
      <strong>작업 전에 확인할 항목과 완료 조건을 통일해 팀 산출물의 기준을 맞췄습니다.</strong>
      <p>요구사항, 코드, 테스트, 리뷰를 한 흐름으로 묶고, AI가 만든 결과도 Repository와 실행 결과로 확인할 수 있게 했습니다.</p>
    </div>

    <div class="portfolio-ai-flow">
      <div class="portfolio-ai-flow-heading">
        <span class="portfolio-card-kicker">HOW IT WORKS</span>
        <strong>개발 산출물의 흐름을 AI Workflow로 연결했습니다.</strong>
      </div>
      <div class="portfolio-ai-pipeline" aria-label="Agent Skill 개발 흐름">
        <div><b>Requirements</b><small>목표/제약 확인</small></div>
        <i class="fas fa-arrow-right" aria-hidden="true"></i>
        <div><b>Domain</b><small>책임 경계 정리</small></div>
        <i class="fas fa-arrow-right" aria-hidden="true"></i>
        <div><b>Specification</b><small>동작/규칙 구체화</small></div>
        <i class="fas fa-arrow-right" aria-hidden="true"></i>
        <div><b>Issue</b><small>작업 단위 분해</small></div>
        <i class="fas fa-arrow-right" aria-hidden="true"></i>
        <div><b>Commit</b><small>변경 기록</small></div>
        <i class="fas fa-arrow-right" aria-hidden="true"></i>
        <div><b>PR / Review</b><small>검토/피드백</small></div>
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
          요구사항이 비어 있으면 질문합니다. Repository, 기존 산출물, 실행 결과를 확인한 뒤 다음 단계로 넘어갑니다.
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
      <a class="portfolio-text-link" href="https://github.com/team-11st-chat/11th-street/pull/98" target="_blank" rel="noopener">팀 적용 산출물 / 배포 헬스체크 롤백 PR <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-text-link" href="https://github.com/team-11st-chat/11th-street/commit/613dab07c1065360fdba6f7dab1dcba5afc7b9c3" target="_blank" rel="noopener">팀 적용 산출물 / 롤백 안정성 보강 커밋 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-text-link" href="https://github.com/team-11st-chat/11th-street/commit/ce1714355d7dd4c50a187971938b2d69e6fbff7e" target="_blank" rel="noopener">팀 적용 산출물 / 재검증 가능한 부하 결과 기록 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
    </div>
  </section>

  <section class="portfolio-contact" id="portfolio-contact" aria-labelledby="portfolio-contact-title">
    <p class="portfolio-eyebrow">CONTACT</p>
    <h2 id="portfolio-contact-title">정의한 문제를 직접 풀고 검증하며<br /> 그 결과를 다음 개선으로 이어갑니다.</h2>
    <p>더 자세한 기술 기록은 블로그와 GitHub에서 확인할 수 있습니다.</p>
    <div class="portfolio-project-links">
      <a class="portfolio-button portfolio-button--light" href="https://github.com/w00lam" target="_blank" rel="noopener">GitHub 방문 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-button portfolio-button--outline" href="mailto:woolam.dev@gmail.com">이메일 보내기 <i class="fas fa-envelope" aria-hidden="true"></i></a>
    </div>
  </section>
</div>
