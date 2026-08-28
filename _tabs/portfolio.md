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
      <h2 id="portfolio-hero-title">문제를 재현하고 원인을 좁혀 해결합니다.</h2>
      <p class="portfolio-hero-description">
        현상을 바로 고치기보다 요청 흐름·데이터 경계·실행 환경을 나눠 재현 조건을 만들고,
        동시성·트랜잭션·테스트 실행 문제를 구조적으로 해결합니다.
      </p>
    </div>

    <div class="portfolio-hero-proof" aria-label="주요 검증 결과">
      <div>
        <span>FOCUS</span>
        <strong>Backend systems</strong>
      </div>
      <div>
        <span>PROOF</span>
        <strong>1,400 tests · 4m 32s</strong>
      </div>
      <div>
        <span>METHOD</span>
        <strong>재현 · 경계 · 검증</strong>
      </div>
    </div>
  </section>

  <nav class="portfolio-nav" aria-label="포트폴리오 섹션">
    <a href="#portfolio-approach">Approach</a>
    <a href="#portfolio-stack">Stack</a>
    <a href="#portfolio-ai">AI Native</a>
    <a href="#matisson">Project 01</a>
    <a href="#concert-ticketing">Project 02</a>
    <a href="#portfolio-contact">Contact</a>
  </nav>

  <section class="portfolio-section portfolio-approach" id="portfolio-approach" aria-labelledby="portfolio-approach-title">
    <div class="portfolio-section-heading">
      <p class="portfolio-eyebrow">APPROACH</p>
      <h2 id="portfolio-approach-title">동작보다 먼저, 설계의 근거를 남깁니다.</h2>
    </div>

    <div class="portfolio-approach-grid">
      <div class="portfolio-approach-copy">
        <p>
          문제를 해결했다는 말은 정상 동작만으로 완성되지 않습니다. 어떤 조건에서 문제가 재현되는지,
          어떤 경계에서 실패를 멈출지, 그리고 그 결과를 어떻게 검증했는지까지 설명할 수 있어야 합니다.
        </p>
      </div>

      <div class="portfolio-signal-list">
        <article class="portfolio-signal-card">
          <span class="portfolio-card-kicker">01 · REPRODUCE</span>
          <h3>동시성 재현</h3>
          <p>같은 좌석 10개 동시 요청과 결제 재요청을 테스트로 재현했습니다.</p>
        </article>
        <article class="portfolio-signal-card">
          <span class="portfolio-card-kicker">02 · BOUNDARY</span>
          <h3>실패 경계 분리</h3>
          <p>외부 검증과 DB 저장을 분리해 한 건의 실패가 전체 등록으로 번지지 않게 했습니다.</p>
        </article>
        <article class="portfolio-signal-card">
          <span class="portfolio-card-kicker">03 · VERIFY</span>
          <h3>실행 구조 개선</h3>
          <p>테스트 환경을 재사용해 1,400개 테스트를 8분 20초 이상에서 4분 32초로 줄였습니다.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="portfolio-section portfolio-stack" id="portfolio-stack" aria-labelledby="portfolio-stack-title">
    <div class="portfolio-section-heading portfolio-section-heading--inline">
      <div>
        <p class="portfolio-eyebrow">TECH STACK</p>
        <h2 id="portfolio-stack-title">문제를 해결할 때 사용한 기술</h2>
      </div>
      <p>프로젝트별 나열보다 역할과 책임을 기준으로 묶었습니다.</p>
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
        <p>변경을 빠르게 확인하고 반복합니다.</p>
        <div class="portfolio-stack-items">
          <span>Testcontainers</span><span>GitHub Actions</span>
        </div>
      </article>
    </div>
  </section>

  <section class="portfolio-section portfolio-ai" id="portfolio-ai" aria-labelledby="portfolio-ai-title">
    <div class="portfolio-section-heading">
      <p class="portfolio-eyebrow">AI-NATIVE WORKFLOW</p>
      <h2 id="portfolio-ai-title">프로젝트의 문맥을 AI가 놓치지 않도록 작업 방식을 설계했습니다.</h2>
    </div>

    <div class="portfolio-ai-intro">
      <div class="portfolio-ai-summary">
        <p>
          설계부터 코드 작성, 테스트 생성, 디버깅, 문서화, 배포 자동화까지 Claude Code와 Codex를 활용했습니다.
          그중 팀 프로젝트에서는 Codex Agent Skill을 직접 설계해 개발 과정에 적용했습니다.
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
          그래서 AI가 매번 추측하지 않고 프로젝트 규칙과 현재 Repository 상태를 먼저 확인하도록
          단계별 책임과 실행 조건을 Skill로 정의했습니다.
        </p>
      </div>
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
        <h3>각 단계의 책임을 계약처럼 나눴습니다.</h3>
        <p>
          Requirements, Domain, Specification, Issue, Commit, PR, Review, Repository Skill을 분리해
          공통 규칙은 따로 두었습니다. 각 Skill에는 역할, Trigger, 신뢰할 정보원, CLI 정책,
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
          어떤 판단과 변경이 어디에서 나왔는지 추적할 수 있도록 구성했습니다.
        </p>
      </article>
    </div>
  </section>

  <section class="portfolio-section portfolio-project-index" aria-labelledby="portfolio-projects-title">
    <div class="portfolio-section-heading portfolio-section-heading--inline">
      <div>
        <p class="portfolio-eyebrow">SELECTED PROJECTS</p>
        <h2 id="portfolio-projects-title">문제를 해결한 두 가지 기록</h2>
      </div>
      <p>프로젝트를 클릭하면 설계 판단과 검증 결과를 자세히 볼 수 있습니다.</p>
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
          <p>AI 맛집 자동 등록의 중복과 부분 저장을 경계 설계로 막은 서비스입니다.</p>
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
          외부 API 검증은 요청 흐름에서 처리하고 DB 저장은 필요한 구간만 트랜잭션으로 묶었습니다.
          핵심 상태를 먼저 확정한 뒤 테스트와 후속 처리를 별도 경계로 분리했습니다.
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
        <p>검증과 저장을 나누고, 맛집별 등록 단위를 독립적으로 확인했습니다.</p>
      </div>
    </div>

    <div class="portfolio-proof-grid">
      <div class="portfolio-proof-copy">
        <p class="portfolio-card-kicker">TROUBLESHOOTING</p>
        <h3>AI 자동 등록의 중복과 부분 저장을 경계 설계로 막았습니다.</h3>
        <p>
          동일 맛집에 요청이 동시에 들어오면 중복 등록이나 부분 저장이 생길 수 있었습니다.
          외부 검증과 DB 저장을 분리하고, 맛집 단위의 저장 경계를 하나의 작업으로 묶어 실패 범위를 좁혔습니다.
          최종 반영 직전에는 현재 상태를 다시 확인했습니다.
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

    <div class="portfolio-project-links">
      <a class="portfolio-button" href="https://github.com/w00lam" target="_blank" rel="noopener">GitHub 프로필 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-text-link" href="{{ '/posts/sdd-document-structure-design/' | relative_url }}">맛잇온의 팀 병렬 개발을 위한 SDD 설계 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
    </div>
  </section>

  <section class="portfolio-project portfolio-project--ticketing" id="concert-ticketing" aria-labelledby="ticketing-title">
    <div class="portfolio-project-heading">
      <div>
        <p class="portfolio-eyebrow">PROJECT 02</p>
        <h2 id="ticketing-title">콘서트 티켓팅 예약 시스템</h2>
        <p class="portfolio-project-lead">
          대기열 진입부터 좌석 예약, 결제까지 이어지는 콘서트 티켓팅 서비스를 백엔드 중심으로 구현했습니다.
          동일 좌석 동시 요청과 결제 재요청을 테스트로 재현하고, 중복·정합성 문제를 해결했습니다.
        </p>
      </div>
      <span class="portfolio-project-number" aria-hidden="true">02</span>
    </div>

    <div class="portfolio-project-meta">
      <div><span>DATE</span><strong>2025.11 - 2026.05</strong></div>
      <div><span>TEAM</span><strong>1인 개발</strong></div>
      <div><span>ROLE</span><strong>백엔드</strong></div>
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

    <div class="portfolio-case-grid">
      <div class="portfolio-case-copy">
        <p class="portfolio-card-kicker">ARCHITECTURE</p>
        <h3>좌석 요청의 경쟁을 제어하고 확정 상태를 분리했습니다.</h3>
        <p>
          중복 예약을 막고 확정된 상태만 남기는 것을 목표로 했습니다. 좌석 ID를 경쟁 자원으로 정의하고,
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
        <p>좌석 경쟁과 확정 상태를 분리하고, 후속 처리는 이벤트로 넘겼습니다.</p>
      </div>
    </div>

    <div class="portfolio-proof-grid">
      <div class="portfolio-proof-copy">
        <p class="portfolio-card-kicker">TROUBLESHOOTING</p>
        <h3>재요청에도 결제·예약 상태를 한 번만 반영했습니다.</h3>
        <p>
          좌석 ID 기준으로 경쟁을 직렬화하고 Redis 락·소유권 토큰·만료 시간을 함께 관리했습니다.
          DB 트랜잭션과 락 해제 시점을 분리해 커밋 경계를 명확히 했고, reservationId로 기존 결제를 먼저 확인한 뒤
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
        <code>payment_retry_effect = 1</code>
        <span class="portfolio-proof-status"><i class="fas fa-check" aria-hidden="true"></i> idempotency verified</span>
      </div>
    </div>

    <div class="portfolio-project-links">
      <a class="portfolio-button" href="https://github.com/w00lam/commerce-payment-system" target="_blank" rel="noopener">GitHub 레포 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-text-link" href="{{ '/posts/lock-transaction-boundary/' | relative_url }}">좌석 예약의 락과 트랜잭션 경계 분리 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
    </div>
  </section>

  <section class="portfolio-contact" id="portfolio-contact" aria-labelledby="portfolio-contact-title">
    <p class="portfolio-eyebrow">CONTACT</p>
    <h2 id="portfolio-contact-title">문제를 재현하고 원인을 좁혀 구조적으로 해결하는 개발자입니다.</h2>
    <p>더 자세한 기술 기록은 블로그와 GitHub에서 확인할 수 있습니다.</p>
    <div class="portfolio-project-links">
      <a class="portfolio-button portfolio-button--light" href="https://github.com/w00lam" target="_blank" rel="noopener">GitHub 방문 <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
      <a class="portfolio-button portfolio-button--outline" href="mailto:woolam.dev@gmail.com">이메일 보내기 <i class="fas fa-envelope" aria-hidden="true"></i></a>
    </div>
  </section>
</div>
