(function () {
  'use strict';

  const roots = document.querySelectorAll('[data-linux-visualization]');

  const setText = (root, selector, value) => {
    const element = root.querySelector(selector);
    if (element) element.textContent = value;
  };

  const setActiveButtons = (root, selector, value, dataKey) => {
    root.querySelectorAll(selector).forEach((button) => {
      const active = button.dataset[dataKey] === value;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
  };

  const commonSlots = {
    progress: { selector: '.linux-visualization__progress', variable: '--linux-progress-height' },
    stage: { selector: '.linux-visualization__stage', variable: '--linux-stage-height' },
    description: { selector: '.linux-visualization__description', variable: '--linux-description-height' }
  };

  const installStepControls = ({ root, getSteps, render, getCurrentStep, setCurrentStep, lock }) => {
    const controls = {
      previous: root.querySelector('[data-linux-action="previous"]'),
      reset: root.querySelector('[data-linux-action="reset"]'),
      next: root.querySelector('[data-linux-action="next"]')
    };

    const moveTo = (index) => {
      const steps = getSteps();
      const nextIndex = Math.max(0, Math.min(index, steps.length - 1));
      setCurrentStep(nextIndex);
      render(nextIndex);
    };

    if (controls.previous) controls.previous.addEventListener('click', () => moveTo(getCurrentStep() - 1));
    if (controls.reset) controls.reset.addEventListener('click', () => moveTo(0));
    if (controls.next) controls.next.addEventListener('click', () => moveTo(getCurrentStep() + 1));

    root.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveTo(getCurrentStep() - 1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveTo(getCurrentStep() + 1);
      }
      if (event.key === 'Home') {
        event.preventDefault();
        moveTo(0);
      }
      if (event.key === 'End') {
        event.preventDefault();
        moveTo(getSteps().length - 1);
      }
    });

    root.dataset.linuxInitialized = 'true';
    lock();
    root.classList.add('is-ready');
    if (window.InteractiveLayout) window.InteractiveLayout.watchResize(lock);
  };

  const initPipe = (root) => {
    const pipeSteps = [
      {
        title: '1단계 · 명령어와 연결 구조 확인',
        active: ['shell'],
        stdin: '터미널에서 명령어 입력',
        stdout: 'grep 결과를 Pipe로 보낼 준비',
        data: 'grep "ERROR" app.log | wc -l',
        result: '아직 출력되지 않음',
        description: 'Shell은 명령어를 해석하고 grep과 wc를 Pipe로 연결할 실행 구조를 준비한다.'
      },
      {
        title: '2단계 · app.log 읽기',
        active: ['log', 'grep'],
        stdin: 'grep이 app.log를 읽음',
        stdout: '일치하는 줄을 찾는 중',
        data: 'INFO · WARN · ERROR · INFO · ERROR',
        result: '파일의 각 줄을 검사',
        description: 'grep 프로세스가 app.log의 내용을 입력으로 받아 ERROR가 포함된 줄을 검사한다.'
      },
      {
        title: '3단계 · grep의 stdout',
        active: ['log', 'grep'],
        stdin: 'app.log의 각 줄',
        stdout: 'ERROR Connection failed\nERROR Request failed',
        data: 'ERROR Connection failed\nERROR Request failed',
        result: '일치한 줄 2개',
        description: 'grep은 일치한 두 줄을 표준 출력으로 내보낸다. 이 출력이 다음 명령어의 입력으로 이어진다.'
      },
      {
        title: '4단계 · Pipe가 wc의 stdin으로 연결',
        active: ['grep', 'pipe', 'wc'],
        stdin: 'ERROR가 포함된 2줄',
        stdout: 'wc가 줄 수를 계산',
        data: 'ERROR Connection failed\nERROR Request failed',
        result: 'wc -l 계산 준비',
        description: 'Pipe는 grep의 stdout을 wc의 stdin으로 연결한다. 명령어 문자열을 순서대로 실행하는 기능이 아니라 파일 디스크립터 사이의 연결이다.'
      },
      {
        title: '5단계 · wc가 줄 수 집계',
        active: ['pipe', 'wc'],
        stdin: '2개의 입력 줄',
        stdout: '2',
        data: '줄바꿈 기준으로 집계',
        result: '2',
        description: 'wc -l은 ERROR라는 단어의 개수가 아니라 grep 결과로 전달된 줄바꿈의 개수를 계산한다.'
      },
      {
        title: '6단계 · Terminal에 결과 출력',
        active: ['wc', 'terminal'],
        stdin: 'wc의 계산 결과',
        stdout: 'Terminal',
        data: '2',
        result: 'Terminal에 2 출력',
        description: '마지막 명령어인 wc의 표준 출력은 별도 Redirection이 없으므로 Terminal에 표시된다. stderr는 이 Pipe에 자동으로 들어오지 않는다.'
      }
    ];

    const makeRedirectionSteps = (mode) => {
      const append = mode === 'append';
      const operator = append ? '>>' : '>';
      const fileState = append ? '기존 1줄을 유지하고 2줄 추가' : '기존 내용을 비우고 2줄 저장';
      return [
        {
          title: '1단계 · Redirection 대상 확인',
          active: ['shell'],
          stdin: '터미널에서 명령어 입력',
          stdout: `grep 결과를 error.log${append ? ' 뒤에 추가' : '에 기록'}`,
          data: `grep "ERROR" app.log ${operator} error.log`,
          result: '기존 error.log · 1줄',
          description: `Shell은 ${operator}를 확인하고 grep의 stdout을 Terminal이 아닌 error.log로 연결할 준비를 한다.`
        },
        {
          title: `2단계 · error.log ${append ? '추가 모드로 열기' : '비우고 열기'}`,
          active: ['shell', 'error'],
          stdin: 'Redirection 설정',
          stdout: append ? '기존 내용 뒤에 기록' : '기존 파일 내용을 0바이트로 만들고 기록',
          data: append ? '기존 로그 1줄' : '기존 로그 → 비움',
          result: append ? '기존 1줄 유지' : '기존 내용 삭제',
          description: append ? '>>는 파일을 추가 모드로 연다. 파일이 없으면 생성할 수 있고 기존 내용은 유지한다.' : '>는 출력 파일을 쓰기 위해 열 때 기존 일반 파일의 내용을 비운다.'
        },
        {
          title: '3단계 · grep이 ERROR 줄 검색',
          active: ['log', 'grep'],
          stdin: 'app.log의 각 줄',
          stdout: `일치한 2줄 → error.log ${operator}`,
          data: 'ERROR Connection failed\nERROR Request failed',
          result: '파일로 전달할 2줄',
          description: 'grep이 검색을 수행하고 결과를 stdout으로 낸다. Shell이 미리 설정한 Redirection이 그 stdout의 목적지를 error.log로 바꾼다.'
        },
        {
          title: `4단계 · error.log에 ${append ? '추가' : '저장'}`,
          active: ['grep', 'error'],
          stdin: 'grep 결과 2줄',
          stdout: 'error.log',
          data: 'ERROR Connection failed\nERROR Request failed',
          result: fileState,
          description: `Pipe와 달리 다음 명령어의 stdin으로 넘기지 않고 출력 대상을 파일로 바꾼다. ${operator}의 차이는 기존 파일을 유지하는지 여부다.`
        },
        {
          title: '5단계 · Terminal은 명령어 결과를 직접 받지 않음',
          active: ['error'],
          stdin: 'grep의 출력이 파일로 이동',
          stdout: 'error.log',
          data: fileState,
          result: `${append ? '기존 1줄 + 새 2줄' : '새 2줄'} 저장 완료`,
          description: '명령어의 표준 출력이 파일로 연결되었으므로 Terminal에는 grep 결과가 표시되지 않는다. 표준 오류(stderr)는 별도의 Redirection을 사용하지 않는 한 그대로 분리되어 있다.'
        }
      ];
    };

    let mode = 'pipe';
    let currentStep = 0;
    const getSteps = () => (mode === 'pipe' ? pipeSteps : makeRedirectionSteps(mode));
    const render = (index = currentStep) => {
      const steps = getSteps();
      const step = steps[index];
      currentStep = index;
      root.dataset.linuxStep = String(index + 1);
      setText(root, '[data-linux-step-title]', step.title);
      setText(root, '[data-linux-step-count]', `${index + 1} / ${steps.length}`);
      setText(root, '[data-linux-command]', mode === 'pipe' ? 'grep "ERROR" app.log | wc -l' : `grep "ERROR" app.log ${mode === 'append' ? '>>' : '>'} error.log`);
      setText(root, '[data-linux-stdin]', step.stdin);
      setText(root, '[data-linux-stdout]', step.stdout);
      setText(root, '[data-linux-data]', step.data);
      setText(root, '[data-linux-result]', step.result);
      setText(root, '[data-linux-description]', step.description);
      setText(root, '[data-linux-stderr]', '일반 Pipe 연결에 포함되지 않음');

      root.querySelectorAll('[data-linux-pipe-node]').forEach((node) => {
        const active = step.active.includes(node.dataset.linuxPipeNode);
        node.dataset.state = active ? 'active' : 'idle';
        const state = node.querySelector('[data-linux-pipe-node-state]');
        if (state) state.textContent = active ? '현재 단계' : node.dataset.linuxPipeNode === 'error' && mode === 'pipe' ? '사용하지 않음' : '대기';
      });

      const controls = {
        previous: root.querySelector('[data-linux-action="previous"]'),
        reset: root.querySelector('[data-linux-action="reset"]'),
        next: root.querySelector('[data-linux-action="next"]')
      };
      if (controls.previous) controls.previous.disabled = index === 0;
      if (controls.reset) controls.reset.disabled = index === 0;
      if (controls.next) controls.next.disabled = index === steps.length - 1;
    };
    const lock = () => {
      if (window.InteractiveLayout) {
        window.InteractiveLayout.lockHeights({ root, renderStep: render, stepCount: getSteps().length, currentStep, slots: commonSlots });
      } else {
        render(currentStep);
      }
    };

    root.querySelectorAll('[data-linux-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        mode = button.dataset.linuxMode;
        currentStep = 0;
        setActiveButtons(root, '[data-linux-mode]', mode, 'linuxMode');
        lock();
      });
    });

    installStepControls({ root, getSteps, render, getCurrentStep: () => currentStep, setCurrentStep: (value) => { currentStep = value; }, lock });
  };

  const initVonNeumann = (root) => {
    const steps = [
      { title: '초기 상태', pc: '100', ir: '비어 있음', mar: '—', mdr: '—', acc: '0', c: '0', access: '없음', instruction: '비어 있음', activeCells: [], activeParts: [], activeRegisters: [], reason: '프로그램 시작 전 상태다.', description: 'PC는 첫 번째 명령어의 주소 100을 가리킨다. 아직 IR에는 현재 명령어가 들어오지 않았다.' },
      { title: '1단계 · LOAD A Fetch', pc: '101', ir: '비어 있음', mar: '100', mdr: 'LOAD A', acc: '0', c: '0', access: '주소 100 · Instruction', instruction: 'LOAD A', activeCells: ['100'], activeParts: ['bus'], activeRegisters: ['PC', 'MAR', 'MDR'], reason: 'PC가 가리킨 100번지에서 명령어를 가져오고 PC를 101로 옮긴다.', description: 'PC가 가리키는 메모리 주소를 MAR에 넣고, 해당 명령어가 MDR을 거쳐 CPU로 전달된다.' },
      { title: '1단계 · LOAD A Decode', pc: '101', ir: 'LOAD A', mar: '100', mdr: 'LOAD A', acc: '0', c: '0', access: '명령어 해석', instruction: 'LOAD A', activeCells: ['100'], activeParts: ['control'], activeRegisters: ['IR'], reason: 'Control Unit이 IR의 LOAD A를 해석한다.', description: 'IR은 현재 해석하거나 실행할 명령어를 보관하고, Control Unit은 A의 값을 읽어 Accumulator에 넣을 흐름을 결정한다.' },
      { title: '1단계 · LOAD A Execute', pc: '101', ir: 'LOAD A', mar: 'A', mdr: '3', acc: '3', c: '0', access: '주소 A · Data', instruction: 'LOAD A', activeCells: ['A'], activeParts: ['bus', 'control'], activeRegisters: ['MAR', 'MDR', 'ACC'], reason: 'A의 값 3을 읽어 Accumulator에 저장한다.', description: '데이터에 접근할 때도 MAR와 MDR이 사용될 수 있다. 이 단순화된 모델에서 A의 값 3이 Accumulator로 이동한다.' },
      { title: '2단계 · ADD B Fetch', pc: '102', ir: 'LOAD A', mar: '101', mdr: 'ADD B', acc: '3', c: '0', access: '주소 101 · Instruction', instruction: 'ADD B', activeCells: ['101'], activeParts: ['bus'], activeRegisters: ['PC', 'MAR', 'MDR'], reason: '다음 명령어 ADD B를 가져오고 PC를 102로 옮긴다.', description: 'PC는 다음에 가져올 명령어 101을 가리켰고, 명령어가 MDR로 들어온다. IR은 다음 Decode에서 갱신된다.' },
      { title: '2단계 · ADD B Decode', pc: '102', ir: 'ADD B', mar: '101', mdr: 'ADD B', acc: '3', c: '0', access: '명령어 해석', instruction: 'ADD B', activeCells: ['101'], activeParts: ['control'], activeRegisters: ['IR'], reason: 'Control Unit이 ADD B를 해석한다.', description: 'ADD 명령어는 B의 값을 읽어 현재 Accumulator 값과 더할 연산을 준비한다.' },
      { title: '2단계 · ADD B Execute', pc: '102', ir: 'ADD B', mar: 'B', mdr: '5', acc: '8', c: '0', access: '주소 B · Data', instruction: 'ADD B', activeCells: ['B'], activeParts: ['bus', 'control', 'alu'], activeRegisters: ['MAR', 'MDR', 'ACC'], reason: 'B의 값 5를 읽어 ALU에서 3 + 5를 계산하고 Accumulator를 8로 바꾼다.', description: 'ALU가 Accumulator의 3과 메모리 B의 5를 더한다. 결과 8은 Accumulator에 저장된다.' },
      { title: '3단계 · STORE C Fetch', pc: '103', ir: 'ADD B', mar: '102', mdr: 'STORE C', acc: '8', c: '0', access: '주소 102 · Instruction', instruction: 'STORE C', activeCells: ['102'], activeParts: ['bus'], activeRegisters: ['PC', 'MAR', 'MDR'], reason: '다음 명령어 STORE C를 가져오고 PC를 103으로 옮긴다.', description: 'STORE C 명령어를 메모리에서 가져온다. Accumulator의 값 8은 아직 C에 저장되지 않았다.' },
      { title: '3단계 · STORE C Decode', pc: '103', ir: 'STORE C', mar: '102', mdr: 'STORE C', acc: '8', c: '0', access: '명령어 해석', instruction: 'STORE C', activeCells: ['102'], activeParts: ['control'], activeRegisters: ['IR'], reason: 'Control Unit이 Accumulator의 값을 C에 쓰는 동작을 해석한다.', description: 'STORE는 연산 결과를 메모리의 C에 기록하는 명령어다.' },
      { title: '3단계 · STORE C Execute', pc: '103', ir: 'STORE C', mar: 'C', mdr: '8', acc: '8', c: '8', access: '주소 C · Data', instruction: 'STORE C', activeCells: ['C'], activeParts: ['bus', 'control'], activeRegisters: ['MAR', 'MDR'], reason: 'Accumulator의 8을 메모리 C에 저장한다.', description: 'MDR을 거쳐 전달된 값 8이 C에 기록된다. 프로그램의 예제 결과는 C = 8이다.' },
      { title: '최종 상태 · 프로그램 종료', pc: '103', ir: 'STORE C', mar: 'C', mdr: '8', acc: '8', c: '8', access: 'C = 8', instruction: '종료', activeCells: ['C'], activeParts: [], activeRegisters: [], reason: 'LOAD A · ADD B · STORE C의 예제 실행이 끝났다.', description: 'A = 3과 B = 5를 더한 결과가 Accumulator와 메모리 C에 남았다. 실제 CPU의 모든 세부 동작을 포함한 상태는 아니다.' }
    ];

    let currentStep = 0;
    const render = (index = currentStep) => {
      const step = steps[index];
      currentStep = index;
      setText(root, '[data-linux-step-title]', step.title);
      setText(root, '[data-linux-step-count]', `${index + 1} / ${steps.length}`);
      setText(root, '[data-linux-vn-access]', step.access);
      setText(root, '[data-linux-vn-instruction]', step.instruction);
      setText(root, '[data-linux-vn-reason]', step.reason);
      setText(root, '[data-linux-description]', step.description);

      const registers = { PC: step.pc, IR: step.ir, MAR: step.mar, MDR: step.mdr, ACC: step.acc };
      root.querySelectorAll('[data-linux-vn-register]').forEach((register) => {
        const key = register.dataset.linuxVnRegister;
        const value = register.querySelector('strong');
        if (value) value.textContent = registers[key];
        register.dataset.state = step.activeRegisters.includes(key) ? 'active' : 'idle';
      });
      root.querySelectorAll('[data-linux-memory-cell]').forEach((cell) => {
        cell.dataset.state = step.activeCells.includes(cell.dataset.linuxMemoryCell) ? 'active' : 'idle';
      });
      const cValue = root.querySelector('[data-linux-memory-value="C"]');
      if (cValue) cValue.textContent = step.c;
      root.querySelectorAll('[data-linux-vn-part]').forEach((part) => {
        part.dataset.state = step.activeParts.includes(part.dataset.linuxVnPart) ? 'active' : 'idle';
      });

      root.querySelector('[data-linux-action="previous"]').disabled = index === 0;
      root.querySelector('[data-linux-action="reset"]').disabled = index === 0;
      root.querySelector('[data-linux-action="next"]').disabled = index === steps.length - 1;
    };
    const lock = () => {
      if (window.InteractiveLayout) window.InteractiveLayout.lockHeights({ root, renderStep: render, stepCount: steps.length, currentStep, slots: commonSlots });
      else render(currentStep);
    };
    installStepControls({ root, getSteps: () => steps, render, getCurrentStep: () => currentStep, setCurrentStep: (value) => { currentStep = value; }, lock });
  };

  const initPermission = (root) => {
    const initialBits = { user: { r: 1, w: 1, x: 0 }, group: { r: 1, w: 0, x: 0 }, other: { r: 0, w: 0, x: 0 } };
    let bits = JSON.parse(JSON.stringify(initialBits));
    let fileType = 'file';
    let actor = 'user';
    let operation = 'r';
    const order = ['r', 'w', 'x'];
    const labels = { r: '읽기', w: '쓰기', x: '실행' };
    const octal = (group) => order.reduce((sum, permission, index) => sum + group[permission] * [4, 2, 1][index], 0);
    const symbolic = (group) => order.map((permission) => (group[permission] ? permission : '-')).join('');
    const isInitialPlusOwnerExecute = () => bits.user.r === 1 && bits.user.w === 1 && bits.user.x === 1 && bits.group.r === 1 && bits.group.w === 0 && bits.group.x === 0 && bits.other.r === 0 && bits.other.w === 0 && bits.other.x === 0;

    const render = () => {
      const target = fileType === 'file' ? 'deploy.sh' : 'config/';
      const mode = `${octal(bits.user)}${octal(bits.group)}${octal(bits.other)}`;
      const textMode = `${symbolic(bits.user)}${symbolic(bits.group)}${symbolic(bits.other)}`;
      setText(root, '[data-linux-permission-target]', target);
      setText(root, '[data-linux-permission-symbolic]', textMode);
      setText(root, '[data-linux-permission-octal]', mode);
      setText(root, '[data-linux-permission-command]', fileType === 'file' && isInitialPlusOwnerExecute() ? 'chmod u+x deploy.sh' : `chmod ${mode} ${target}`);
      setText(root, '[data-linux-description]', fileType === 'file' && isInitialPlusOwnerExecute() ? 'User에게 x 권한을 추가하면 `640`이 `740`이 된다. 전체 권한을 다시 지정하는 숫자 방식과 달리 `chmod u+x deploy.sh`는 현재 권한을 유지하면서 필요한 비트만 바꾼다.' : fileType === 'directory' ? '디렉터리에서는 r·w·x의 뜻이 일반 파일과 다르다. 특히 x가 없으면 파일 자체의 r 권한이 있어도 해당 경로를 탐색하기 어렵다.' : '권한 범주는 User·Group·Others로 나뉘며 선택한 실행 주체에 해당하는 한 범주의 권한만 접근 판단에 사용된다.');

      root.querySelectorAll('[data-linux-permission-group]').forEach((row) => {
        const group = row.dataset.linuxPermissionGroup;
        row.querySelector('[data-linux-permission-bits]').textContent = order.map((permission) => bits[group][permission]).join('');
        row.querySelectorAll('[data-linux-permission-bit]').forEach((button) => {
          const permission = button.dataset.linuxPermissionBit;
          const active = Boolean(bits[group][permission]);
          button.setAttribute('aria-pressed', String(active));
          button.classList.toggle('is-active', active);
        });
      });

      const operationLabel = root.querySelector('[data-linux-operation-label]');
      if (operationLabel) operationLabel.textContent = fileType === 'directory' && operation === 'x' ? '탐색' : labels[operation];
      const hasPermission = Boolean(bits[actor][operation]);
      const directoryWriteNeedsExecute = fileType === 'directory' && operation === 'w' && hasPermission && !bits[actor].x;
      const result = directoryWriteNeedsExecute ? '제한됨' : hasPermission ? '허용' : '거부';
      const resultState = directoryWriteNeedsExecute ? 'partial' : hasPermission ? 'allow' : 'denied';
      const reason = fileType === 'directory'
        ? operation === 'r'
          ? hasPermission ? '선택한 범주에 r이 있어 내부 항목 이름 목록을 확인할 수 있다.' : '디렉터리 목록을 확인하려면 선택한 범주에 r이 필요하다.'
          : operation === 'w'
            ? directoryWriteNeedsExecute ? '디렉터리 항목을 만들거나 삭제하려면 일반적으로 w와 x가 함께 필요하다.' : hasPermission ? '선택한 범주에 w와 x가 있어 내부 항목을 변경할 수 있다.' : '디렉터리 항목을 변경하려면 선택한 범주에 w와 x가 함께 필요하다.'
            : hasPermission ? '선택한 범주에 x가 있어 해당 디렉터리를 경로로 탐색할 수 있다.' : '디렉터리의 x는 프로그램 실행이 아니라 경로 탐색 권한이다.'
        : hasPermission ? `선택한 ${actor === 'user' ? 'User' : actor === 'group' ? 'Group' : 'Others'} 범주에 ${labels[operation]} 권한 \`${operation}\`이 있다.` : `선택한 범주에 ${labels[operation]} 권한 \`${operation}\`이 없다.`;
      const resultElement = root.querySelector('[data-linux-access-result]');
      if (resultElement) {
        resultElement.dataset.state = resultState;
      }
      setText(root, '[data-linux-access-result]', result);
      setText(root, '[data-linux-access-reason]', reason);
    };
    const reset = () => {
      bits = copyBitsFrom(initialBits);
      fileType = 'file';
      actor = 'user';
      operation = 'r';
      setActiveButtons(root, '[data-linux-file-type]', fileType, 'linuxFileType');
      setActiveButtons(root, '[data-linux-actor]', actor, 'linuxActor');
      setActiveButtons(root, '[data-linux-operation]', operation, 'linuxOperation');
      render();
    };
    const copyBitsFrom = (source) => JSON.parse(JSON.stringify(source));

    root.querySelectorAll('[data-linux-permission-bit]').forEach((button) => {
      button.addEventListener('click', () => {
        const row = button.closest('[data-linux-permission-group]');
        const group = row.dataset.linuxPermissionGroup;
        const permission = button.dataset.linuxPermissionBit;
        bits[group][permission] = bits[group][permission] ? 0 : 1;
        render();
      });
    });
    root.querySelectorAll('[data-linux-file-type]').forEach((button) => button.addEventListener('click', () => {
      fileType = button.dataset.linuxFileType;
      setActiveButtons(root, '[data-linux-file-type]', fileType, 'linuxFileType');
      render();
    }));
    root.querySelectorAll('[data-linux-actor]').forEach((button) => button.addEventListener('click', () => {
      actor = button.dataset.linuxActor;
      setActiveButtons(root, '[data-linux-actor]', actor, 'linuxActor');
      render();
    }));
    root.querySelectorAll('[data-linux-operation]').forEach((button) => button.addEventListener('click', () => {
      operation = button.dataset.linuxOperation;
      setActiveButtons(root, '[data-linux-operation]', operation, 'linuxOperation');
      render();
    }));
    root.querySelector('[data-linux-action="reset"]').addEventListener('click', reset);
    root.dataset.linuxInitialized = 'true';
    const lock = () => {
      if (window.InteractiveLayout) window.InteractiveLayout.lockHeights({ root, renderStep: render, stepCount: 1, currentStep: 0, slots: commonSlots });
      else render();
    };
    lock();
    root.classList.add('is-ready');
    if (window.InteractiveLayout) window.InteractiveLayout.watchResize(lock);
  };

  roots.forEach((root) => {
    if (root.dataset.linuxInitialized === 'true') return;
    try {
      const kind = root.dataset.linuxKind;
      if (kind === 'pipe') initPipe(root);
      if (kind === 'von-neumann') initVonNeumann(root);
      if (kind === 'permission') initPermission(root);
    } catch (error) {
      root.classList.add('is-failed');
      root.querySelectorAll('[data-linux-action], [data-linux-mode], [data-linux-file-type], [data-linux-actor], [data-linux-operation], [data-linux-permission-bit]').forEach((button) => { button.disabled = true; });
      root.querySelectorAll('[data-linux-fallback]').forEach((fallback) => { fallback.hidden = false; });
      console.error('Linux visualization initialization failed.', error);
    }
  });
})();
