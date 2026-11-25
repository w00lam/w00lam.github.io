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

  const templateSteps = {
    file: [
      { title: '1단계 · Client가 process() 호출', from: 'Client', to: 'FileProcessor', route: '선택한 객체의 process() 호출이 상위 클래스의 final 메서드로 들어간다.', payload: ['processor.process()'], call: 'FileProcessor.process()', owner: 'AbstractProcessor', result: '처리 시작 전', active: ['client', 'file'], description: 'Client가 FileProcessor를 선택해도 실행 순서를 직접 조합하지 않는다.' },
      { title: '2단계 · 상위 클래스의 Template Method 실행', from: 'FileProcessor', to: 'AbstractProcessor', route: '상속받은 final process()가 AbstractProcessor에 정의된 순서를 시작한다.', payload: ['final process()'], call: 'process()', owner: 'AbstractProcessor', result: '공통 흐름 진입', active: ['abstract', 'file'], description: 'process()는 하위 클래스가 오버라이딩할 수 없고, 상위 클래스가 전체 흐름을 관리한다.' },
      { title: '3단계 · 공통 초기화', from: 'AbstractProcessor', to: 'AbstractProcessor', route: '공통 구현 메서드 initialize()를 실행한다.', payload: ['initialize()'], call: 'initialize()', owner: 'AbstractProcessor', result: '초기화 완료', active: ['abstract'], description: '모든 Processor가 공유하는 준비 작업은 ConcreteClass에 반복해서 작성하지 않는다.' },
      { title: '4단계 · 하위 클래스의 세부 동작', from: 'AbstractProcessor', to: 'FileProcessor', route: '동적 바인딩으로 FileProcessor의 load()와 transform()이 실행된다.', payload: ['load() → 파일 읽기', 'transform() → 파일 데이터 변환'], call: 'load() · transform()', owner: 'FileProcessor', result: '파일 데이터 변환 완료', active: ['abstract', 'file'], description: '상위 클래스의 참조로 호출해도 실제 객체가 FileProcessor이므로 오버라이딩된 메서드가 실행된다.' },
      { title: '5단계 · Hook과 공통 검증', from: 'AbstractProcessor', to: 'FileProcessor', route: 'Hook Method shouldValidate()가 true를 반환해 공통 validate()를 실행한다.', payload: ['shouldValidate() = true', 'validate()'], call: 'shouldValidate() · validate()', owner: 'AbstractProcessor / FileProcessor', result: '검증 완료', active: ['abstract', 'file'], description: 'Hook Method는 하위 클래스가 선택적으로 흐름의 일부를 조정할 수 있게 한다. 파일 처리에서는 검증을 수행한다.' },
      { title: '6단계 · 공통 마무리와 결과', from: 'AbstractProcessor', to: 'Client', route: '공통 finish()가 실행되고 전체 처리 결과가 반환된다.', payload: ['finish()', '처리 완료'], call: 'finish()', owner: 'AbstractProcessor', result: 'FileProcessor 처리 완료', active: ['abstract', 'client'], description: '하위 클래스를 바꿔도 초기화와 마무리를 포함한 전체 실행 순서는 유지된다.' }
    ],
    api: [
      { title: '1단계 · Client가 process() 호출', from: 'Client', to: 'ApiProcessor', route: '선택한 객체의 process() 호출이 상위 클래스의 final 메서드로 들어간다.', payload: ['processor.process()'], call: 'ApiProcessor.process()', owner: 'AbstractProcessor', result: '처리 시작 전', active: ['client', 'api'], description: 'Client가 ApiProcessor를 선택해도 실행 순서를 직접 조합하지 않는다.' },
      { title: '2단계 · 상위 클래스의 Template Method 실행', from: 'ApiProcessor', to: 'AbstractProcessor', route: '상속받은 final process()가 AbstractProcessor에 정의된 순서를 시작한다.', payload: ['final process()'], call: 'process()', owner: 'AbstractProcessor', result: '공통 흐름 진입', active: ['abstract', 'api'], description: 'process()는 하위 클래스가 오버라이딩할 수 없고, 상위 클래스가 전체 흐름을 관리한다.' },
      { title: '3단계 · 공통 초기화', from: 'AbstractProcessor', to: 'AbstractProcessor', route: '공통 구현 메서드 initialize()를 실행한다.', payload: ['initialize()'], call: 'initialize()', owner: 'AbstractProcessor', result: '초기화 완료', active: ['abstract'], description: '모든 Processor가 공유하는 준비 작업은 ConcreteClass에 반복해서 작성하지 않는다.' },
      { title: '4단계 · 하위 클래스의 세부 동작', from: 'AbstractProcessor', to: 'ApiProcessor', route: '동적 바인딩으로 ApiProcessor의 load()와 transform()이 실행된다.', payload: ['load() → API 응답 읽기', 'transform() → API 데이터 변환'], call: 'load() · transform()', owner: 'ApiProcessor', result: 'API 데이터 변환 완료', active: ['abstract', 'api'], description: '상위 클래스의 참조로 호출해도 실제 객체가 ApiProcessor이므로 오버라이딩된 메서드가 실행된다.' },
      { title: '5단계 · Hook으로 검증 생략', from: 'AbstractProcessor', to: 'ApiProcessor', route: 'Hook Method shouldValidate()가 false를 반환해 validate()를 건너뛴다.', payload: ['shouldValidate() = false', 'validate() 생략'], call: 'shouldValidate()', owner: 'ApiProcessor', result: '선택 단계 생략', active: ['abstract', 'api'], description: 'Hook Method는 전체 순서를 바꾸지 않고 특정 단계의 실행 여부를 조정한다. API 처리에서는 공통 검증을 생략한다.' },
      { title: '6단계 · 공통 마무리와 결과', from: 'AbstractProcessor', to: 'Client', route: '공통 finish()가 실행되고 전체 처리 결과가 반환된다.', payload: ['finish()', '처리 완료'], call: 'finish()', owner: 'AbstractProcessor', result: 'ApiProcessor 처리 완료', active: ['abstract', 'client'], description: '하위 클래스를 바꿔도 초기화와 마무리를 포함한 전체 실행 순서는 유지된다.' }
    ]
  };

  const factorySteps = {
    email: [
      { title: '1단계 · ConcreteCreator 선택', from: 'Client', to: 'EmailCreator', route: '클라이언트가 사용할 ConcreteCreator를 선택한다.', payload: ['new EmailCreator()'], instance: '아직 생성되지 않음', result: 'Product 인터페이스 정의만 표시', active: ['emailCreator'], description: '클라이언트가 Creator를 선택하는 책임까지 Factory Method가 대신하지는 않는다.' },
      { title: '2단계 · Creator 인스턴스 생성', from: 'Client', to: 'EmailCreator', route: '선택한 ConcreteCreator 객체가 만들어진다.', payload: ['EmailCreator creator'], instance: 'EmailCreator 인스턴스', result: 'Creator 생성 완료', active: ['emailCreator'], description: '이제 클라이언트는 구체 Product를 직접 생성하지 않고 Creator의 공통 메서드를 호출할 수 있다.' },
      { title: '3단계 · 공통 메서드 호출', from: 'Client', to: 'NotificationCreator', route: 'Creator에 정의된 send()가 공통 처리 흐름을 시작한다.', payload: ['creator.send("hello")'], instance: 'EmailCreator 인스턴스', result: '공통 흐름 진입', active: ['creator', 'emailCreator'], description: 'send()는 Product를 사용하지만 구체 Product를 생성하는 코드와 분리되어 있다.' },
      { title: '4단계 · Factory Method 선택', from: 'NotificationCreator', to: 'EmailCreator', route: '동적 바인딩으로 EmailCreator.createNotification()이 실행된다.', payload: ['createNotification()'], instance: 'EmailCreator 인스턴스', result: '생성 메서드 선택', active: ['creator', 'emailCreator'], description: '상위 Creator의 코드가 호출해도 실제 Creator 타입의 Factory Method 구현이 선택된다.' },
      { title: '5단계 · ConcreteProduct 생성', from: 'EmailCreator', to: 'EmailNotification', route: 'Factory Method가 EmailNotification 객체를 생성한다.', payload: ['new EmailNotification()'], instance: 'EmailNotification 인스턴스', result: 'ConcreteProduct 생성 완료', active: ['emailCreator', 'emailProduct'], description: '이 단계에서 처음으로 실제 Product 인스턴스가 생긴다. 이전 단계에는 클래스 정의만 있었다.' },
      { title: '6단계 · Product 타입으로 반환', from: 'EmailCreator', to: 'Notification', route: '생성된 객체를 Notification 인터페이스 타입으로 반환한다.', payload: ['Notification notification'], instance: 'EmailNotification 인스턴스', result: 'Notification으로 반환', active: ['creator', 'emailCreator', 'product', 'emailProduct'], description: '참조 타입이 Notification이어도 실제 객체 타입은 EmailNotification으로 유지된다.' },
      { title: '7단계 · 공통 메서드에서 기능 사용', from: 'NotificationCreator', to: 'EmailNotification', route: 'send()가 Product 인터페이스의 notify()를 호출한다.', payload: ['notification.notify("hello")'], instance: 'EmailNotification 인스턴스', result: '공통 사용 흐름 실행', active: ['creator', 'product', 'emailProduct'], description: 'Creator의 공통 메서드는 Product 인터페이스를 통해 기능을 사용하므로 ConcreteProduct에 직접 의존하지 않는다.' },
      { title: '8단계 · 기능 실행 결과', from: 'EmailNotification', to: 'Client', route: 'EmailNotification의 실제 기능이 실행되어 결과를 출력한다.', payload: ['Email: hello'], instance: 'EmailNotification 인스턴스', result: 'Email: hello', active: ['emailProduct', 'client'], description: '새 알림 유형을 추가할 때 기존 Creator의 공통 사용 흐름은 유지하고 새로운 Product·Creator를 추가할 수 있다.' }
    ],
    sms: [
      { title: '1단계 · ConcreteCreator 선택', from: 'Client', to: 'SmsCreator', route: '클라이언트가 사용할 ConcreteCreator를 선택한다.', payload: ['new SmsCreator()'], instance: '아직 생성되지 않음', result: 'Product 인터페이스 정의만 표시', active: ['smsCreator'], description: '클라이언트가 Creator를 선택하는 책임까지 Factory Method가 대신하지는 않는다.' },
      { title: '2단계 · Creator 인스턴스 생성', from: 'Client', to: 'SmsCreator', route: '선택한 ConcreteCreator 객체가 만들어진다.', payload: ['SmsCreator creator'], instance: 'SmsCreator 인스턴스', result: 'Creator 생성 완료', active: ['smsCreator'], description: '이제 클라이언트는 구체 Product를 직접 생성하지 않고 Creator의 공통 메서드를 호출할 수 있다.' },
      { title: '3단계 · 공통 메서드 호출', from: 'Client', to: 'NotificationCreator', route: 'Creator에 정의된 send()가 공통 처리 흐름을 시작한다.', payload: ['creator.send("hello")'], instance: 'SmsCreator 인스턴스', result: '공통 흐름 진입', active: ['creator', 'smsCreator'], description: 'send()는 Product를 사용하지만 구체 Product를 생성하는 코드와 분리되어 있다.' },
      { title: '4단계 · Factory Method 선택', from: 'NotificationCreator', to: 'SmsCreator', route: '동적 바인딩으로 SmsCreator.createNotification()이 실행된다.', payload: ['createNotification()'], instance: 'SmsCreator 인스턴스', result: '생성 메서드 선택', active: ['creator', 'smsCreator'], description: '상위 Creator의 코드가 호출해도 실제 Creator 타입의 Factory Method 구현이 선택된다.' },
      { title: '5단계 · ConcreteProduct 생성', from: 'SmsCreator', to: 'SmsNotification', route: 'Factory Method가 SmsNotification 객체를 생성한다.', payload: ['new SmsNotification()'], instance: 'SmsNotification 인스턴스', result: 'ConcreteProduct 생성 완료', active: ['smsCreator', 'smsProduct'], description: '이 단계에서 처음으로 실제 Product 인스턴스가 생긴다. 이전 단계에는 클래스 정의만 있었다.' },
      { title: '6단계 · Product 타입으로 반환', from: 'SmsCreator', to: 'Notification', route: '생성된 객체를 Notification 인터페이스 타입으로 반환한다.', payload: ['Notification notification'], instance: 'SmsNotification 인스턴스', result: 'Notification으로 반환', active: ['creator', 'smsCreator', 'product', 'smsProduct'], description: '참조 타입이 Notification이어도 실제 객체 타입은 SmsNotification으로 유지된다.' },
      { title: '7단계 · 공통 메서드에서 기능 사용', from: 'NotificationCreator', to: 'SmsNotification', route: 'send()가 Product 인터페이스의 notify()를 호출한다.', payload: ['notification.notify("hello")'], instance: 'SmsNotification 인스턴스', result: '공통 사용 흐름 실행', active: ['creator', 'product', 'smsProduct'], description: 'Creator의 공통 메서드는 Product 인터페이스를 통해 기능을 사용하므로 ConcreteProduct에 직접 의존하지 않는다.' },
      { title: '8단계 · 기능 실행 결과', from: 'SmsNotification', to: 'Client', route: 'SmsNotification의 실제 기능이 실행되어 결과를 출력한다.', payload: ['SMS: hello'], instance: 'SmsNotification 인스턴스', result: 'SMS: hello', active: ['smsProduct', 'client'], description: '새 알림 유형을 추가할 때 기존 Creator의 공통 사용 흐름은 유지하고 새로운 Product·Creator를 추가할 수 있다.' }
    ]
  };

  const observerSteps = [
    { title: '1단계 · CREATED 상태의 Subject', status: 'CREATED', list: [], logs: [], active: ['subject'], registered: [], description: 'OrderSubject가 CREATED 상태로 존재한다. 아직 관찰자 목록은 비어 있다.' },
    { title: '2단계 · EmailObserver 등록', status: 'CREATED', list: ['EmailObserver'], logs: [], active: ['subject', 'email'], registered: ['email'], description: 'OrderSubject의 register()가 EmailObserver를 List<Observer>에 추가한다.' },
    { title: '3단계 · SmsObserver 등록', status: 'CREATED', list: ['EmailObserver', 'SmsObserver'], logs: [], active: ['subject', 'sms'], registered: ['email', 'sms'], description: '서로 다른 구현체를 같은 Observer 타입 목록에 저장할 수 있다.' },
    { title: '4단계 · 주문 상태를 PAID로 변경', status: 'PAID', list: ['EmailObserver', 'SmsObserver'], logs: [], active: ['subject'], registered: ['email', 'sms'], description: 'setStatus("PAID")가 상태를 먼저 바꾼다. 이 단계에서는 아직 관찰자의 update() 호출을 표시하지 않는다.' },
    { title: '5단계 · EmailObserver 알림', status: 'PAID', list: ['EmailObserver', 'SmsObserver'], logs: ['Email: PAID'], active: ['subject', 'email'], registered: ['email', 'sms'], description: 'notifyObservers()가 List 순서에 따라 EmailObserver.update("PAID")를 호출한다.' },
    { title: '6단계 · SmsObserver 알림', status: 'PAID', list: ['EmailObserver', 'SmsObserver'], logs: ['Email: PAID', 'SMS: PAID'], active: ['subject', 'sms'], registered: ['email', 'sms'], description: '같은 상태 변경에 등록된 다음 관찰자인 SmsObserver도 동기적으로 알림을 받는다.' },
    { title: '7단계 · SmsObserver 등록 해제', status: 'PAID', list: ['EmailObserver'], logs: ['Email: PAID', 'SMS: PAID'], active: ['subject', 'sms'], registered: ['email'], description: 'unregister(smsObserver)가 목록에서 SmsObserver 참조를 제거한다. 객체 자체가 사라지는 것은 아니다.' },
    { title: '8단계 · 주문 상태를 CANCELLED로 변경', status: 'CANCELLED', list: ['EmailObserver'], logs: ['Email: PAID', 'SMS: PAID'], active: ['subject'], registered: ['email'], description: '상태가 CANCELLED로 바뀌었지만 현재 목록에는 EmailObserver만 남아 있다.' },
    { title: '9단계 · EmailObserver만 알림', status: 'CANCELLED', list: ['EmailObserver'], logs: ['Email: PAID', 'SMS: PAID', 'Email: CANCELLED'], active: ['subject', 'email'], registered: ['email'], description: '현재 목록을 순회하므로 EmailObserver만 update("CANCELLED")를 실행한다.' },
    { title: '10단계 · 알림 완료', status: 'CANCELLED', list: ['EmailObserver'], logs: ['Email: PAID', 'SMS: PAID', 'Email: CANCELLED'], active: ['email'], registered: ['email'], description: 'SmsObserver는 객체로 남아 있지만 등록 해제되었으므로 CANCELLED 알림을 받지 않는다.' }
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
        stage: { selector: '[class*="__adapter-stage"], [class*="__singleton-stage"], [class*="__pattern-stage"]', variable: '--dpv-stage-height' },
        description: { selector: '.design-pattern-visualization__description', variable: '--dpv-description-height' }
      }
    });
  };

  const initTemplate = (root) => {
    let mode = 'file';
    let currentStep = 0;
    const controls = {
      previous: root.querySelector('[data-dpv-action="previous"]'),
      reset: root.querySelector('[data-dpv-action="reset"]'),
      next: root.querySelector('[data-dpv-action="next"]')
    };
    const render = (index = currentStep) => {
      const steps = templateSteps[mode];
      const step = steps[index];
      root.dataset.dpvStep = String(index + 1);
      root.dataset.dpvMode = mode;
      setText(root, '[data-dpv-step-title]', step.title);
      setText(root, '[data-dpv-step-count]', `${index + 1} / ${steps.length}`);
      setText(root, '[data-dpv-template-from]', step.from);
      setText(root, '[data-dpv-template-to]', step.to);
      setText(root, '[data-dpv-template-route]', step.route);
      setText(root, '[data-dpv-template-call]', step.call);
      setText(root, '[data-dpv-template-owner]', step.owner);
      setText(root, '[data-dpv-template-result]', step.result);
      setText(root, '[data-dpv-template-description]', step.description);
      const payload = root.querySelector('[data-dpv-template-payload]');
      payload.replaceChildren(...step.payload.map((item) => {
        const chip = document.createElement('span');
        chip.textContent = item;
        return chip;
      }));
      root.querySelectorAll('[data-dpv-template-actor]').forEach((actor) => {
        const active = step.active.includes(actor.dataset.dpvTemplateActor);
        actor.dataset.state = active ? 'active' : 'idle';
        const state = actor.querySelector('[data-dpv-actor-state]');
        state.textContent = active ? '현재 단계' : '대기';
      });
      controls.previous.disabled = index === 0;
      controls.reset.disabled = index === 0;
      controls.next.disabled = index === steps.length - 1;
    };
    const moveTo = (index) => { const steps = templateSteps[mode]; currentStep = Math.max(0, Math.min(index, steps.length - 1)); render(); };
    controls.previous.addEventListener('click', () => moveTo(currentStep - 1));
    controls.reset.addEventListener('click', () => moveTo(0));
    controls.next.addEventListener('click', () => moveTo(currentStep + 1));
    root.querySelectorAll('[data-dpv-template-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        mode = button.dataset.dpvTemplateMode;
        currentStep = 0;
        root.querySelectorAll('[data-dpv-template-mode]').forEach((item) => {
          const active = item.dataset.dpvTemplateMode === mode;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-selected', String(active));
        });
        render();
        lock();
      });
    });
    root.addEventListener('keydown', (event) => {
      const steps = templateSteps[mode];
      if (event.key === 'ArrowLeft') { event.preventDefault(); moveTo(currentStep - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); moveTo(currentStep + 1); }
      if (event.key === 'Home') { event.preventDefault(); moveTo(0); }
      if (event.key === 'End') { event.preventDefault(); moveTo(steps.length - 1); }
    });
    root.dataset.dpvInitialized = 'true';
    const lock = () => lockStepLayout({ root, steps: templateSteps[mode], render, currentStep });
    lock();
    root.classList.add('is-ready');
    if (window.InteractiveLayout) InteractiveLayout.watchResize(lock);
  };

  const initFactory = (root) => {
    let mode = 'email';
    let currentStep = 0;
    const controls = {
      previous: root.querySelector('[data-dpv-action="previous"]'),
      reset: root.querySelector('[data-dpv-action="reset"]'),
      next: root.querySelector('[data-dpv-action="next"]')
    };
    const render = (index = currentStep) => {
      const steps = factorySteps[mode];
      const step = steps[index];
      root.dataset.dpvStep = String(index + 1);
      root.dataset.dpvMode = mode;
      setText(root, '[data-dpv-step-title]', step.title);
      setText(root, '[data-dpv-step-count]', `${index + 1} / ${steps.length}`);
      setText(root, '[data-dpv-factory-from]', step.from);
      setText(root, '[data-dpv-factory-to]', step.to);
      setText(root, '[data-dpv-factory-route]', step.route);
      setText(root, '[data-dpv-factory-instance]', step.instance);
      setText(root, '[data-dpv-factory-result]', step.result);
      setText(root, '[data-dpv-factory-description]', step.description);
      const payload = root.querySelector('[data-dpv-factory-payload]');
      payload.replaceChildren(...step.payload.map((item) => {
        const chip = document.createElement('span');
        chip.textContent = item;
        return chip;
      }));
      root.querySelectorAll('[data-dpv-factory-actor]').forEach((actor) => {
        const active = step.active.includes(actor.dataset.dpvFactoryActor);
        actor.dataset.state = active ? 'active' : 'idle';
      });
      controls.previous.disabled = index === 0;
      controls.reset.disabled = index === 0;
      controls.next.disabled = index === steps.length - 1;
    };
    const moveTo = (index) => { const steps = factorySteps[mode]; currentStep = Math.max(0, Math.min(index, steps.length - 1)); render(); };
    controls.previous.addEventListener('click', () => moveTo(currentStep - 1));
    controls.reset.addEventListener('click', () => moveTo(0));
    controls.next.addEventListener('click', () => moveTo(currentStep + 1));
    root.querySelectorAll('[data-dpv-factory-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        mode = button.dataset.dpvFactoryMode;
        currentStep = 0;
        root.querySelectorAll('[data-dpv-factory-mode]').forEach((item) => {
          const active = item.dataset.dpvFactoryMode === mode;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-selected', String(active));
        });
        render();
        lock();
      });
    });
    root.addEventListener('keydown', (event) => {
      const steps = factorySteps[mode];
      if (event.key === 'ArrowLeft') { event.preventDefault(); moveTo(currentStep - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); moveTo(currentStep + 1); }
      if (event.key === 'Home') { event.preventDefault(); moveTo(0); }
      if (event.key === 'End') { event.preventDefault(); moveTo(steps.length - 1); }
    });
    root.dataset.dpvInitialized = 'true';
    const lock = () => lockStepLayout({ root, steps: factorySteps[mode], render, currentStep });
    lock();
    root.classList.add('is-ready');
    if (window.InteractiveLayout) InteractiveLayout.watchResize(lock);
  };

  const initObserver = (root) => {
    let currentStep = 0;
    let selectedObserver = 'email';
    const controls = {
      previous: root.querySelector('[data-dpv-action="previous"]'),
      reset: root.querySelector('[data-dpv-action="reset"]'),
      next: root.querySelector('[data-dpv-action="next"]')
    };
    const renderSelection = (step) => {
      const selectedName = selectedObserver === 'email' ? 'EmailObserver' : 'SmsObserver';
      const registered = step.registered.includes(selectedObserver);
      setText(root, '[data-dpv-observer-selection]', `${selectedName} · ConcreteObserver · ${registered ? '현재 등록됨' : '현재 등록되지 않음'}`);
      root.querySelectorAll('[data-dpv-observer-select]').forEach((button) => {
        button.classList.toggle('is-selected', button.dataset.dpvObserverSelect === selectedObserver);
      });
    };
    const render = (index = currentStep) => {
      const step = observerSteps[index];
      root.dataset.dpvStep = String(index + 1);
      setText(root, '[data-dpv-step-title]', step.title);
      setText(root, '[data-dpv-step-count]', `${index + 1} / ${observerSteps.length}`);
      setText(root, '[data-dpv-observer-status]', step.status);
      setText(root, '[data-dpv-observer-list]', step.list.length ? step.list.join(' · ') : '없음');
      setText(root, '[data-dpv-observer-description]', step.description);
      root.querySelectorAll('[data-dpv-observer-actor]').forEach((actor) => {
        const key = actor.dataset.dpvObserverActor;
        actor.dataset.state = step.active.includes(key) ? 'active' : 'idle';
        if (key !== 'subject') {
          const registered = step.registered.includes(key);
          actor.querySelector('[data-dpv-observer-state]').textContent = registered ? '등록됨' : '미등록';
        }
      });
      const log = root.querySelector('[data-dpv-observer-log]');
      log.replaceChildren(...(step.logs.length ? step.logs : ['아직 알림이 실행되지 않음']).map((item) => {
        const entry = document.createElement('li');
        entry.textContent = item;
        return entry;
      }));
      renderSelection(step);
      controls.previous.disabled = index === 0;
      controls.reset.disabled = index === 0;
      controls.next.disabled = index === observerSteps.length - 1;
    };
    const moveTo = (index) => { currentStep = Math.max(0, Math.min(index, observerSteps.length - 1)); render(); };
    controls.previous.addEventListener('click', () => moveTo(currentStep - 1));
    controls.reset.addEventListener('click', () => moveTo(0));
    controls.next.addEventListener('click', () => moveTo(currentStep + 1));
    root.querySelectorAll('[data-dpv-observer-select]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedObserver = button.dataset.dpvObserverSelect;
        renderSelection(observerSteps[currentStep]);
      });
    });
    root.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); moveTo(currentStep - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); moveTo(currentStep + 1); }
      if (event.key === 'Home') { event.preventDefault(); moveTo(0); }
      if (event.key === 'End') { event.preventDefault(); moveTo(observerSteps.length - 1); }
    });
    root.dataset.dpvInitialized = 'true';
    const lock = () => lockStepLayout({ root, steps: observerSteps, render, currentStep });
    lock();
    root.classList.add('is-ready');
    if (window.InteractiveLayout) InteractiveLayout.watchResize(lock);
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
      if (kind === 'template') initTemplate(root);
      if (kind === 'factory') initFactory(root);
      if (kind === 'observer') initObserver(root);
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
