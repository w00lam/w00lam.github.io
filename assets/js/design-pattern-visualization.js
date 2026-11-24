(function () {
  /* global InteractiveLayout */
  'use strict';

  const roots = document.querySelectorAll('[data-design-pattern-visualization]');

  const adapterSteps = [
    { title: '시작 · Target 계약 확인', from: 'Client', to: 'Payment', route: 'Client는 Target 계약에만 의존한다.', payload: ['Payment.pay(request)'], responsibility: '계약 확인', data: 'PaymentRequest', transform: '없음', active: ['client', 'target'], description: 'Client는 외부 SDK가 아니라 Payment라는 Target 계약을 바라본다.' },
    { title: '1단계 · Client가 Payment 호출', from: 'Payment Client', to: 'PaymentAdapter', route: 'Client의 호출은 PaymentAdapter가 구현한 Payment로 전달된다.', payload: ['Payment.pay(request)', 'orderId = ORD-100'], responsibility: '내부 요청 전달', data: 'PaymentRequest', transform: '아직 없음', active: ['client', 'target', 'adapter'], description: 'Client는 Adapter의 구체 클래스를 알지 못해도 Payment 계약을 통해 호출할 수 있다.' },
    { title: '2단계 · 외부 요청으로 변환', from: 'PaymentAdapter', to: 'External SDK', route: 'Adapter가 내부 요청을 SDK 요청으로 바꾼다.', payload: ['PaymentRequest → ExternalChargeRequest', 'orderId → orderNumber'], responsibility: '요청 변환', data: 'ExternalChargeRequest', transform: '내부 → 외부', active: ['adapter', 'adaptee'], description: 'Adapter는 필드 이름과 금액 타입을 외부 SDK가 이해하는 요청 형식으로 옮긴다.' },
    { title: '3단계 · Adaptee에 위임', from: 'PaymentAdapter', to: 'External SDK', route: 'Adapter가 외부 SDK의 charge()를 호출한다.', payload: ['sdk.charge(externalRequest)'], responsibility: '외부 기능 위임', data: 'ExternalChargeRequest', transform: '변환 완료', active: ['adapter', 'adaptee'], description: '외부 결제 기능을 실제로 수행하는 객체는 Adaptee인 ExternalPaymentSdk다.' },
    { title: '4단계 · 외부 응답 반환', from: 'External SDK', to: 'PaymentAdapter', route: '외부 SDK가 ExternalChargeResponse를 반환한다.', payload: ['success = true', 'approvalCode'], responsibility: '응답 수신', data: 'ExternalChargeResponse', transform: '외부 형식', active: ['adapter', 'adaptee'], description: 'Adapter는 SDK가 반환한 외부 응답을 받아 Client가 사용할 결과로 바꿀 준비를 한다.' },
    { title: '5단계 · 내부 응답으로 변환', from: 'PaymentAdapter', to: 'Payment Client', route: 'Adapter가 외부 응답을 PaymentResult로 바꾼다.', payload: ['ExternalChargeResponse → PaymentResult', 'approvalCode → transactionId'], responsibility: '응답 변환', data: 'PaymentResult', transform: '외부 → 내부', active: ['client', 'adapter'], description: 'Client는 외부 SDK의 응답 클래스가 아니라 PaymentResult를 받는다.' },
    { title: '6단계 · Target 결과 반환', from: 'PaymentAdapter', to: 'Payment Client', route: 'Client가 자신의 계약에 맞는 결과를 받는다.', payload: ['PaymentResult.approved = true', 'transactionId'], responsibility: '내부 결과 제공', data: 'PaymentResult', transform: '변환 종료', active: ['client', 'target', 'adapter'], description: 'Adapter의 핵심 책임은 인터페이스 호환, 변환, 위임이다. 결제 정책 전체를 대신하지 않는다.' }
  ];

  const singletonModes = {
    unsafe: [
      { title: '0단계 · instance = null', description: '공유 instance가 아직 없고 두 Thread가 접근할 수 있는 상태다.', a: '대기', b: '대기', instance: '참조 없음', monitor: '모니터 사용 안 함', objects: ['#1 · 없음', '#2 · 없음'], flow: '두 Thread가 null을 확인할 수 있다.', result: '서로 다른 객체가 만들어질 수 있다.' },
      { title: '1단계 · A가 null 확인', description: 'Thread A가 생성 조건을 확인했지만 아직 객체를 만들지는 않았다.', a: 'null 확인', b: '대기', instance: '참조 없음', monitor: '모니터 사용 안 함', objects: ['#1 · 없음', '#2 · 없음'], flow: 'A가 생성 구간에 진입할 수 있다.', result: 'B도 같은 구간에 들어갈 수 있다.' },
      { title: '2단계 · B도 null 확인', description: 'Thread B도 null을 읽었다. 두 Thread 모두 객체가 없다고 판단한 가능한 순서다.', a: '생성 예정', b: 'null 확인', instance: '참조 없음', monitor: '모니터 사용 안 함', objects: ['#1 · 없음', '#2 · 없음'], flow: 'A와 B가 모두 생성 조건을 통과했다.', result: '중복 생성 가능성이 생긴다.' },
      { title: '3단계 · A가 객체 #1 생성', description: 'Thread A가 객체 #1을 만들고 instance에 할당한다.', a: '#1 생성', b: '생성 예정', instance: '#1', monitor: '모니터 사용 안 함', objects: ['#1 · 생성', '#2 · 없음'], flow: 'instance → #1', result: 'A는 #1을 반환한다.' },
      { title: '4단계 · A가 #1 반환', description: 'Thread A는 자신이 만든 객체 #1을 반환한다.', a: '#1 반환', b: '생성 예정', instance: '#1', monitor: '모니터 사용 안 함', objects: ['#1 · 생성', '#2 · 없음'], flow: 'A → #1', result: 'B의 실행은 아직 끝나지 않았다.' },
      { title: '5단계 · B가 객체 #2 생성', description: 'B는 앞서 읽은 null 판단을 바탕으로 객체 #2를 생성할 수 있다. 이는 가능한 실행 순서 중 하나다.', a: '#1 반환 완료', b: '#2 생성', instance: '#2', monitor: '모니터 사용 안 함', objects: ['#1 · 생성', '#2 · 생성'], flow: 'instance → #2', result: '서로 다른 객체가 존재한다.' },
      { title: '6단계 · B가 #2 반환', description: '두 Thread가 서로 다른 객체를 반환받을 수 있다. null 확인과 생성이 원자적이지 않기 때문이다.', a: '#1 반환', b: '#2 반환', instance: '#2', monitor: '모니터 사용 안 함', objects: ['#1 · 생성', '#2 · 생성'], flow: 'A → #1 · B → #2', result: '생성 제한이 깨진 가능한 결과' }
    ],
    synchronized: [
      { title: '0단계 · instance = null', description: '공유 instance가 없고 synchronized 메서드에 처음 접근하는 상태다.', a: '대기', b: '대기', instance: '참조 없음', monitor: '모니터 비어 있음', objects: ['#1 · 없음', '#2 · 없음'], flow: '두 Thread가 모니터를 기다린다.', result: '한 번에 한 Thread만 확인·생성 구간에 진입한다.' },
      { title: '1단계 · A가 모니터 획득', description: 'Thread A가 임계 구역에 먼저 들어간다. B는 같은 모니터를 얻을 때까지 기다린다.', a: '모니터 획득', b: '대기', instance: '참조 없음', monitor: 'A가 잠금', objects: ['#1 · 없음', '#2 · 없음'], flow: 'A → 임계 구역', result: 'B는 생성 구간에 동시에 들어갈 수 없다.' },
      { title: '2단계 · A가 #1 생성', description: 'A가 null을 확인하고 객체 #1을 만든다.', a: '#1 생성', b: '모니터 대기', instance: '#1', monitor: 'A가 잠금', objects: ['#1 · 생성', '#2 · 없음'], flow: 'A → #1', result: 'instance → #1' },
      { title: '3단계 · A가 반환·해제', description: 'A가 #1을 반환하고 모니터를 해제한다.', a: '#1 반환', b: '모니터 대기', instance: '#1', monitor: '모니터 해제 예정', objects: ['#1 · 생성', '#2 · 없음'], flow: 'A → #1', result: 'B가 다음으로 모니터를 얻는다.' },
      { title: '4단계 · B가 모니터 획득', description: 'B가 임계 구역에 들어가지만 instance에는 이미 #1이 있다.', a: '#1 반환 완료', b: '모니터 획득', instance: '#1', monitor: 'B가 잠금', objects: ['#1 · 생성', '#2 · 없음'], flow: 'B → 임계 구역', result: 'B는 다시 null 여부를 확인한다.' },
      { title: '5단계 · B가 기존 #1 확인', description: 'B는 null이 아님을 확인하고 새 객체를 만들지 않는다.', a: '#1 반환 완료', b: '#1 확인', instance: '#1', monitor: 'B가 잠금', objects: ['#1 · 생성', '#2 · 없음'], flow: 'B → 기존 #1', result: '중복 생성이 일어나지 않는다.' },
      { title: '6단계 · B가 #1 반환', description: 'B도 동일한 객체 #1을 반환한다. 대신 이미 생성된 이후에도 호출마다 모니터 진입이 발생한다.', a: '#1 반환', b: '#1 반환', instance: '#1', monitor: '모니터 해제', objects: ['#1 · 생성', '#2 · 없음'], flow: 'A → #1 · B → #1', result: '동일 객체 반환' }
    ],
    dcl: [
      { title: '0단계 · instance = null', description: 'Double-Checked Locking은 바깥의 null 확인부터 시작한다.', a: '대기', b: '대기', instance: '참조 없음', monitor: '모니터 사용 안 함', objects: ['#1 · 없음', '#2 · 없음'], flow: '바깥 null 확인 전', result: '생성 전에는 두 번의 확인이 필요하다.' },
      { title: '1단계 · A와 B가 바깥 확인', description: '두 Thread 모두 바깥에서 null을 읽을 수 있지만, 실제 생성은 synchronized 블록 안에서 다시 확인한다.', a: '바깥 null 확인', b: '바깥 null 확인', instance: '참조 없음', monitor: '모니터 사용 안 함', objects: ['#1 · 없음', '#2 · 없음'], flow: 'A·B → 바깥 확인', result: '둘 다 락 진입을 시도할 수 있다.' },
      { title: '2단계 · A가 모니터 획득', description: 'A가 먼저 모니터를 얻고 블록 안의 두 번째 null 확인으로 들어간다.', a: '모니터 획득', b: '모니터 대기', instance: '참조 없음', monitor: 'A가 잠금', objects: ['#1 · 없음', '#2 · 없음'], flow: 'A → 임계 구역', result: '내부 확인 전에는 생성하지 않는다.' },
      { title: '3단계 · A가 내부 확인 후 생성', description: 'A가 내부에서도 null임을 확인하고 객체 #1을 생성해 volatile 필드에 공개한다.', a: '#1 생성', b: '모니터 대기', instance: '#1', monitor: 'A가 잠금', objects: ['#1 · 생성', '#2 · 없음'], flow: 'A → #1 · volatile 공개', result: '다른 Thread가 최신 참조를 볼 수 있다.' },
      { title: '4단계 · A가 해제 후 반환', description: 'A가 모니터를 해제하고 #1을 반환한다.', a: '#1 반환', b: '모니터 대기', instance: '#1', monitor: '모니터 해제', objects: ['#1 · 생성', '#2 · 없음'], flow: 'A → #1', result: 'B가 내부 확인을 이어 간다.' },
      { title: '5단계 · B가 내부에서 기존 #1 확인', description: 'B가 모니터를 얻은 뒤 두 번째 null 확인을 수행하고 이미 생성된 #1을 발견한다.', a: '#1 반환 완료', b: '#1 확인', instance: '#1', monitor: 'B가 잠금', objects: ['#1 · 생성', '#2 · 없음'], flow: 'B → 기존 #1', result: 'B는 새 객체를 만들지 않는다.' },
      { title: '6단계 · 이후 접근은 바깥 확인', description: '생성 이후에는 바깥 null 확인에서 기존 참조를 발견해 동기화 블록에 들어가지 않고 반환할 수 있다.', a: '#1 반환', b: '#1 반환', instance: '#1', monitor: '모니터 사용 안 함', objects: ['#1 · 생성', '#2 · 없음'], flow: 'A → #1 · B → #1', result: '생성 안전성과 락 진입 감소' }
    ]
  };

  const springScopes = {
    same: { scope: 'Container A · paymentService 정의', count: '1개', description: '같은 Context에서 같은 Bean 정의를 조회하면 Container가 캐시한 동일 인스턴스를 반환한다.', contexts: [{ name: 'ApplicationContext A', definitions: [{ name: 'paymentService', instances: ['PaymentService #1'], clients: ['Client A', 'Client B'] }] }] },
    definitions: { scope: 'Container A · paymentServiceA / paymentServiceB 정의', count: '2개', description: '같은 클래스라도 Bean 정의가 두 개면 각 정의가 자신의 인스턴스를 관리할 수 있다.', contexts: [{ name: 'ApplicationContext A', definitions: [{ name: 'paymentServiceA', instances: ['PaymentService #1'], clients: ['Client A'] }, { name: 'paymentServiceB', instances: ['PaymentService #2'], clients: ['Client B'] }] }] },
    contexts: { scope: 'Context A · Context B 각각의 paymentService 정의', count: '2개', description: '서로 다른 ApplicationContext는 각각 Bean을 관리하므로 같은 클래스의 인스턴스가 분리될 수 있다.', contexts: [{ name: 'ApplicationContext A', definitions: [{ name: 'paymentService', instances: ['PaymentService #1'], clients: ['Client A'] }] }, { name: 'ApplicationContext B', definitions: [{ name: 'paymentService', instances: ['PaymentService #2'], clients: ['Client B'] }] }] },
    jvms: { scope: 'JVM·서버별 paymentService 정의', count: '환경 수만큼', description: '서로 다른 JVM이나 서버에서는 각 환경의 Container가 Singleton Bean을 따로 관리한다.', contexts: [{ name: 'Server 1 · JVM 1', definitions: [{ name: 'paymentService', instances: ['PaymentService #1'], clients: ['Client A'] }] }, { name: 'Server 2 · JVM 2', definitions: [{ name: 'paymentService', instances: ['PaymentService #2'], clients: ['Client B'] }] }] }
  };

  const setText = (root, selector, value) => {
    const element = root.querySelector(selector);
    if (element) element.textContent = value;
  };

  const lockStepLayout = ({ root, steps, render, currentStep }) => {
    if (!window.InteractiveLayout) return;
    InteractiveLayout.lockHeights({
      root,
      renderStep: render,
      stepCount: steps.length,
      currentStep,
      slots: {
        progress: { selector: '.design-pattern-visualization__progress', variable: '--dpv-progress-height' },
        stage: { selector: '[class*="__adapter-stage"], [class*="__singleton-stage"]', variable: '--dpv-stage-height' },
        description: { selector: '.design-pattern-visualization__description', variable: '--dpv-description-height' }
      }
    });
  };

  const initAdapter = (root) => {
    let currentStep = 0;
    const controls = {
      previous: root.querySelector('[data-dpv-action="previous"]'),
      reset: root.querySelector('[data-dpv-action="reset"]'),
      next: root.querySelector('[data-dpv-action="next"]')
    };
    const render = (index = currentStep) => {
      const step = adapterSteps[index];
      root.dataset.dpvStep = String(index + 1);
      setText(root, '[data-dpv-step-title]', step.title);
      setText(root, '[data-dpv-step-count]', `${index + 1} / ${adapterSteps.length}`);
      setText(root, '[data-dpv-from]', step.from);
      setText(root, '[data-dpv-to]', step.to);
      setText(root, '[data-dpv-route]', step.route);
      setText(root, '[data-dpv-responsibility]', step.responsibility);
      setText(root, '[data-dpv-data]', step.data);
      setText(root, '[data-dpv-transform]', step.transform);
      setText(root, '[data-dpv-description]', step.description);
      const payload = root.querySelector('[data-dpv-payload]');
      payload.replaceChildren(...step.payload.map((item) => {
        const chip = document.createElement('span');
        chip.textContent = item;
        return chip;
      }));
      root.querySelectorAll('[data-dpv-actor]').forEach((actor) => {
        const active = step.active.includes(actor.dataset.dpvActor);
        actor.dataset.state = active ? 'active' : 'idle';
        const state = actor.querySelector('[data-dpv-actor-state]');
        state.textContent = active ? '현재 단계' : '대기';
      });
      controls.previous.disabled = index === 0;
      controls.reset.disabled = index === 0;
      controls.next.disabled = index === adapterSteps.length - 1;
    };
    const moveTo = (index) => { currentStep = Math.max(0, Math.min(index, adapterSteps.length - 1)); render(); };
    controls.previous.addEventListener('click', () => moveTo(currentStep - 1));
    controls.reset.addEventListener('click', () => moveTo(0));
    controls.next.addEventListener('click', () => moveTo(currentStep + 1));
    root.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); moveTo(currentStep - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); moveTo(currentStep + 1); }
      if (event.key === 'Home') { event.preventDefault(); moveTo(0); }
      if (event.key === 'End') { event.preventDefault(); moveTo(adapterSteps.length - 1); }
    });
    root.dataset.dpvInitialized = 'true';
    const lock = () => lockStepLayout({ root, steps: adapterSteps, render, currentStep });
    lock();
    root.classList.add('is-ready');
    if (window.InteractiveLayout) InteractiveLayout.watchResize(lock);
  };

  const initSingleton = (root) => {
    let mode = 'unsafe';
    let currentStep = 0;
    const controls = {
      previous: root.querySelector('[data-dpv-action="previous"]'),
      reset: root.querySelector('[data-dpv-action="reset"]'),
      next: root.querySelector('[data-dpv-action="next"]')
    };
    const render = (index = currentStep) => {
      const steps = singletonModes[mode];
      const step = steps[index];
      root.dataset.dpvStep = String(index + 1);
      root.dataset.dpvMode = mode;
      setText(root, '[data-dpv-step-title]', step.title);
      setText(root, '[data-dpv-step-count]', `${index + 1} / ${steps.length}`);
      setText(root, '[data-dpv-description]', step.description);
      setText(root, '[data-dpv-flow-summary]', step.flow);
      setText(root, '[data-dpv-result-summary]', step.result);
      setText(root, '[data-dpv-instance]', step.instance);
      setText(root, '[data-dpv-monitor-state]', step.monitor);
      root.querySelector('[data-dpv-thread="a"] [data-dpv-thread-state]').textContent = step.a;
      root.querySelector('[data-dpv-thread="b"] [data-dpv-thread-state]').textContent = step.b;
      root.querySelectorAll('[data-dpv-object]').forEach((object, objectIndex) => { object.textContent = step.objects[objectIndex]; });
      root.querySelector('[data-dpv-monitor]').dataset.state = step.monitor.includes('잠금') ? 'locked' : 'idle';
      controls.previous.disabled = index === 0;
      controls.reset.disabled = index === 0;
      controls.next.disabled = index === steps.length - 1;
    };
    const moveTo = (index) => { const steps = singletonModes[mode]; currentStep = Math.max(0, Math.min(index, steps.length - 1)); render(); };
    const lock = () => lockStepLayout({ root, steps: singletonModes[mode], render, currentStep });
    controls.previous.addEventListener('click', () => moveTo(currentStep - 1));
    controls.reset.addEventListener('click', () => moveTo(0));
    controls.next.addEventListener('click', () => moveTo(currentStep + 1));
    root.querySelectorAll('[data-dpv-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        mode = button.dataset.dpvMode;
        currentStep = 0;
        root.querySelectorAll('[data-dpv-mode]').forEach((item) => {
          const active = item.dataset.dpvMode === mode;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-selected', String(active));
        });
        lock();
      });
    });
    root.addEventListener('keydown', (event) => {
      const steps = singletonModes[mode];
      if (event.key === 'ArrowLeft') { event.preventDefault(); moveTo(currentStep - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); moveTo(currentStep + 1); }
      if (event.key === 'Home') { event.preventDefault(); moveTo(0); }
      if (event.key === 'End') { event.preventDefault(); moveTo(steps.length - 1); }
    });
    root.dataset.dpvInitialized = 'true';
    lock();
    root.classList.add('is-ready');
    if (window.InteractiveLayout) InteractiveLayout.watchResize(lock);
  };

  const initSpring = (root) => {
    const stage = root.querySelector('[data-dpv-spring-stage]');
    const render = (scopeKey) => {
      const scope = springScopes[scopeKey];
      setText(root, '[data-dpv-spring-scope]', scope.scope);
      setText(root, '[data-dpv-spring-count]', scope.count);
      setText(root, '[data-dpv-spring-description]', scope.description);
      stage.replaceChildren(...scope.contexts.map((context) => {
        const contextElement = document.createElement('section');
        contextElement.className = 'design-pattern-visualization__context';
        const heading = document.createElement('h4');
        heading.textContent = context.name;
        contextElement.append(heading);
        context.definitions.forEach((definition) => {
          const definitionElement = document.createElement('div');
          definitionElement.className = 'design-pattern-visualization__definition';
          const title = document.createElement('strong');
          title.textContent = `Bean 정의 · ${definition.name}`;
          definitionElement.append(title);
          definition.instances.forEach((instance) => {
            const instanceElement = document.createElement('span');
            instanceElement.className = 'design-pattern-visualization__instance';
            instanceElement.textContent = instance;
            definitionElement.append(instanceElement);
          });
          const clients = document.createElement('small');
          clients.textContent = `${definition.clients.join(' · ')}가 참조`;
          definitionElement.append(clients);
          contextElement.append(definitionElement);
        });
        return contextElement;
      }));
      root.querySelectorAll('[data-dpv-scope]').forEach((button) => {
        const active = button.dataset.dpvScope === scopeKey;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
      });
    };
    root.querySelectorAll('[data-dpv-scope]').forEach((button) => button.addEventListener('click', () => render(button.dataset.dpvScope)));
    root.dataset.dpvInitialized = 'true';
    render('same');
    root.classList.add('is-ready');
  };

  roots.forEach((root) => {
    if (root.dataset.dpvInitialized === 'true') return;
    const kind = root.dataset.designPatternKind;
    try {
      if (kind === 'adapter') initAdapter(root);
      if (kind === 'singleton') initSingleton(root);
      if (kind === 'spring') initSpring(root);
    } catch (error) {
      root.classList.add('is-failed');
      root.querySelectorAll('[data-dpv-action], [data-dpv-mode], [data-dpv-scope]').forEach((button) => { button.disabled = true; });
      console.error('Design pattern visualization initialization failed.', error);
    }
  });
})();
