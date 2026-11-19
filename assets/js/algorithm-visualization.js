(function () {
  /* global InteractiveLayout */
  'use strict';

  const roots = document.querySelectorAll('[data-algorithm-visualization]');

  const detail = (label, value) => ({ label, value: String(value) });

  const cloneBuckets = (buckets) => buckets.map((bucket) => bucket.map((entry) => ({ ...entry })));

  const makeStep = (state) => ({
    array: state.array ? state.array.slice() : [],
    bucketEntries: state.bucketEntries ? cloneBuckets(state.bucketEntries) : null,
    title: state.title,
    description: state.description,
    status: state.status || 'info',
    range: state.range ? state.range.slice() : null,
    nextRange: state.nextRange ? state.nextRange.slice() : null,
    excluded: state.excluded ? state.excluded.slice() : [],
    compare: state.compare ? state.compare.slice() : [],
    target: state.target ?? null,
    left: state.left ?? null,
    right: state.right ?? null,
    mid: state.mid ?? null,
    comparedValue: state.comparedValue ?? null,
    currentBucket: state.currentBucket ?? null,
    comparedKeys: state.comparedKeys ? state.comparedKeys.slice() : [],
    matchKey: state.matchKey ?? null,
    result: state.result ?? null,
    details: state.details || []
  });

  const createBinarySteps = () => {
    const array = [2, 4, 6, 8, 10, 12, 14];
    const target = 10;
    const steps = [];

    steps.push(makeStep({
      array,
      target,
      title: '시작',
      description: '오름차순 배열에서 left와 right가 가리키는 전체 구간을 확인한다. target은 10이다.',
      details: [
        detail('target', target),
        detail('left', 0),
        detail('right', 6),
        detail('현재 범위', '[0, 6]')
      ]
    }));

    steps.push(makeStep({
      array,
      target,
      left: 0,
      right: 6,
      mid: 3,
      comparedValue: 8,
      range: [0, 6],
      nextRange: [4, 6],
      excluded: [0, 1, 2, 3],
      compare: [3],
      status: 'compare',
      title: '1단계 · mid = 3',
      description: 'arr[3]은 8이고 target 10보다 작다. 이미 비교한 mid와 왼쪽 구간을 제외하고 [4, 6]만 남긴다.',
      details: [
        detail('비교', 'arr[3] = 8 < target = 10'),
        detail('left / right', '0 / 6'),
        detail('mid', 3),
        detail('다음 범위', '[4, 6]')
      ]
    }));

    steps.push(makeStep({
      array,
      target,
      left: 4,
      right: 6,
      mid: 5,
      comparedValue: 12,
      range: [4, 6],
      nextRange: [4, 4],
      excluded: [5, 6],
      compare: [5],
      status: 'compare',
      title: '2단계 · mid = 5',
      description: 'arr[5]는 12이고 target 10보다 크다. 이미 비교한 mid와 오른쪽 구간을 제외하고 [4, 4]만 남긴다.',
      details: [
        detail('비교', 'arr[5] = 12 > target = 10'),
        detail('left / right', '4 / 6'),
        detail('mid', 5),
        detail('다음 범위', '[4, 4]')
      ]
    }));

    steps.push(makeStep({
      array,
      target,
      left: 4,
      right: 4,
      mid: 4,
      comparedValue: 10,
      range: [4, 4],
      compare: [4],
      status: 'result',
      result: '탐색 성공 · 인덱스 4',
      title: '3단계 · target 발견',
      description: 'arr[4]가 target 10과 같다. 이미 비교한 mid를 다시 포함하지 않고 인덱스 4를 반환한다.',
      details: [
        detail('비교', 'arr[4] = 10 == target = 10'),
        detail('left / right', '4 / 4'),
        detail('mid', 4),
        detail('결과', '인덱스 4')
      ]
    }));

    return steps;
  };

  const simpleHash = (key) => Array.from(key).reduce((sum, character) => sum + character.charCodeAt(0), 0) % 5;

  const createHashSteps = (rawValues) => {
    const operations = rawValues.split('|').map((value) => {
      const [key, rawValue] = value.split(':');
      return { key, value: rawValue === 'get' ? null : Number(rawValue) };
    });
    const buckets = Array.from({ length: 5 }, () => []);
    const steps = [];
    const bucketArray = [0, 1, 2, 3, 4];

    const push = (state) => steps.push(makeStep({ array: bucketArray, bucketEntries: buckets, ...state }));

    push({
      title: '시작',
      description: '크기 5인 버킷 배열을 준비한다. 이 시각화의 해시 함수는 문자 코드 합계를 5로 나눈 나머지를 사용한다.',
      details: [detail('버킷 수', 5), detail('해시 함수', '문자 코드 합계 % 5'), detail('상태', '모든 버킷 비어 있음'), detail('다음 연산', 'apple 저장')]
    });

    operations.forEach((operation) => {
      const bucketIndex = simpleHash(operation.key);
      const bucket = buckets[bucketIndex];
      const existingIndex = bucket.findIndex((entry) => entry.key === operation.key);
      const isLookup = operation.value === null;

      if (isLookup) {
        const found = existingIndex >= 0 ? bucket[existingIndex].value : null;
        push({
          currentBucket: bucketIndex,
          comparedKeys: bucket.map((entry) => entry.key),
          matchKey: existingIndex >= 0 ? operation.key : null,
          result: found === null ? '조회 실패' : String(found),
          status: 'result',
          title: `${operation.key} 조회`,
          description: `${operation.key}의 버킷 ${bucketIndex}에서 원본 키를 비교했다. 키가 일치하는 엔트리의 값 ${found}을 반환한다.`,
          details: [
            detail('입력 키', operation.key),
            detail('버킷 인덱스', bucketIndex),
            detail('키 비교', `${operation.key} 일치`),
            detail('조회 결과', found)
          ]
        });
        return;
      }

      if (existingIndex >= 0) {
        const previousValue = bucket[existingIndex].value;
        bucket[existingIndex].value = operation.value;
        push({
          currentBucket: bucketIndex,
          comparedKeys: bucket.map((entry) => entry.key),
          matchKey: operation.key,
          result: `값 갱신 · ${previousValue} → ${operation.value}`,
          status: 'result',
          title: `${operation.key} 값 갱신`,
          description: `버킷 ${bucketIndex}에서 같은 키 ${operation.key}를 찾았다. 새 엔트리를 만들지 않고 기존 값 ${previousValue}를 ${operation.value}로 바꾼다.`,
          details: [
            detail('입력 키 / 값', `${operation.key} / ${operation.value}`),
            detail('버킷 인덱스', bucketIndex),
            detail('키 비교', `${operation.key} 일치`),
            detail('엔트리 수', bucket.length)
          ]
        });
        return;
      }

      const collidedKeys = bucket.map((entry) => entry.key);
      bucket.push({ key: operation.key, value: operation.value });
      push({
        currentBucket: bucketIndex,
        comparedKeys: collidedKeys,
        matchKey: null,
        result: collidedKeys.length > 0 ? '충돌 · 새 엔트리 연결' : '새 엔트리 추가',
        status: collidedKeys.length > 0 ? 'compare' : 'current',
        title: `${operation.key} 저장`,
        description: collidedKeys.length > 0
          ? `버킷 ${bucketIndex}에서 기존 키와 비교했지만 ${operation.key}와 달랐다. 별도 엔트리로 체이닝한다.`
          : `해시 결과가 버킷 ${bucketIndex}을 가리킨다. 비어 있는 버킷에 ${operation.key} 엔트리를 추가한다.`,
        details: [
          detail('입력 키 / 값', `${operation.key} / ${operation.value}`),
          detail('해시 계산', `${operation.key} → ${bucketIndex}`),
          detail('키 비교', collidedKeys.length > 0 ? `${collidedKeys.join(', ')}와 다름` : '비교할 엔트리 없음'),
          detail('저장 결과', collidedKeys.length > 0 ? '체이닝' : '새 엔트리')
        ]
      });
    });

    return steps;
  };

  const createSteps = (kind, values) => {
    if (kind === 'binary') {
      return createBinarySteps();
    }
    if (kind === 'hash') {
      return createHashSteps(values);
    }
    throw new Error(`Unknown algorithm visualization: ${kind}`);
  };

  const createTextElement = (tagName, className, text) => {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    return element;
  };

  const statusLabels = {
    compare: '비교',
    current: '현재',
    result: '결과',
    info: '상태'
  };

  const renderRoot = (root) => {
    const kind = root.dataset.algorithmKind;
    const rawValues = root.dataset.algorithmValues || '';
    const values = kind === 'binary' ? rawValues.split(',').map((value) => Number(value.trim())) : rawValues;
    if (kind === 'binary' && (values.some((value) => !Number.isFinite(value)) || values.length < 2)) {
      throw new Error('Binary Search visualization values are invalid.');
    }

    const steps = createSteps(kind, values);
    const refs = {
      arrayWrap: root.querySelector('[data-algorithm-array-wrap]'),
      array: root.querySelector('[data-algorithm-array]'),
      bucketsWrap: root.querySelector('[data-algorithm-buckets-wrap]'),
      buckets: root.querySelector('[data-algorithm-buckets]'),
      details: root.querySelector('[data-algorithm-details]'),
      title: root.querySelector('[data-algorithm-step-title]'),
      count: root.querySelector('[data-algorithm-step-count]'),
      description: root.querySelector('[data-algorithm-description]'),
      previous: root.querySelector('[data-algorithm-action="previous"]'),
      reset: root.querySelector('[data-algorithm-action="reset"]'),
      next: root.querySelector('[data-algorithm-action="next"]'),
      error: root.querySelector('[data-algorithm-error]'),
      stepData: root.querySelector('[data-algorithm-step-data]')
    };
    let currentStep = 0;

    root.style.setProperty('--algorithm-count', kind === 'binary' ? String(values.length) : '5');

    const renderArray = (step) => {
      refs.array.replaceChildren(
        ...step.array.map((value, index) => {
          let state = 'idle';
          if (step.status === 'result' && step.mid === index) {
            state = 'result';
          } else if (step.compare.includes(index)) {
            state = 'compare';
          } else if (step.range && index >= step.range[0] && index <= step.range[1]) {
            state = 'current';
          }

          const cell = document.createElement('div');
          cell.className = 'algorithm-visualization__cell';
          cell.dataset.state = state;
          cell.dataset.inRange = step.range ? String(index >= step.range[0] && index <= step.range[1]) : 'true';
          cell.dataset.excluded = String(step.excluded.includes(index));
          const label = step.mid === index ? `mid = ${index}` : step.target === value ? 'target 후보' : '대기';
          cell.setAttribute('role', 'listitem');
          cell.setAttribute('aria-label', `인덱스 ${index}, 값 ${value}, ${label}`);
          cell.append(
            createTextElement('span', 'algorithm-visualization__cell-index', `index ${index}`),
            createTextElement('strong', 'algorithm-visualization__cell-value', String(value)),
            createTextElement('span', 'algorithm-visualization__cell-meta', step.target === null ? '' : `target ${step.target}`),
            createTextElement('span', 'algorithm-visualization__cell-label', label)
          );
          return cell;
        })
      );
    };

    const renderBuckets = (step) => {
      refs.buckets.replaceChildren(
        ...step.bucketEntries.map((entries, bucketIndex) => {
          const bucket = document.createElement('div');
          bucket.className = 'algorithm-visualization__bucket';
          bucket.dataset.active = String(step.currentBucket === bucketIndex);
          bucket.setAttribute('role', 'listitem');
          bucket.setAttribute('aria-label', `버킷 ${bucketIndex}`);
          bucket.append(createTextElement('strong', 'algorithm-visualization__bucket-index', `bucket ${bucketIndex}`));

          const entryList = document.createElement('div');
          entryList.className = 'algorithm-visualization__bucket-entries';
          if (entries.length === 0) {
            entryList.append(createTextElement('span', 'algorithm-visualization__bucket-empty', '비어 있음'));
          } else {
            entries.forEach((entry) => {
              const item = document.createElement('div');
              item.className = 'algorithm-visualization__entry';
              item.dataset.state = step.matchKey === entry.key ? 'match' : step.comparedKeys.includes(entry.key) ? 'compare' : 'idle';
              item.append(
                createTextElement('span', 'algorithm-visualization__entry-key', 'Key'),
                createTextElement('strong', 'algorithm-visualization__entry-value', `${entry.key} → ${entry.value}`)
              );
              entryList.append(item);
            });
          }
          bucket.append(entryList);
          return bucket;
        })
      );
    };

    const renderDetails = (step) => {
      const details = step.details.slice();
      if (step.result) {
        details.push(detail('상태', step.result));
      }
      refs.details.replaceChildren(
        ...details.map((item) => {
          const article = document.createElement('article');
          article.className = 'algorithm-visualization__detail';
          article.append(
            createTextElement('span', 'algorithm-visualization__detail-label', item.label),
            createTextElement('strong', 'algorithm-visualization__detail-value', item.value)
          );
          return article;
        })
      );
    };

    const render = (stepIndex = currentStep) => {
      const step = steps[stepIndex];
      root.dataset.step = String(stepIndex + 1);
      refs.title.textContent = `${statusLabels[step.status] || statusLabels.info} · ${step.title}`;
      refs.count.textContent = `${stepIndex + 1} / ${steps.length}`;
      refs.description.textContent = step.description;
      refs.previous.disabled = stepIndex === 0;
      refs.reset.disabled = stepIndex === 0;
      refs.next.disabled = stepIndex === steps.length - 1;
      refs.stepData.hidden = true;
      const isBinary = kind === 'binary';
      refs.arrayWrap.hidden = !isBinary;
      refs.bucketsWrap.hidden = isBinary;
      if (isBinary) {
        renderArray(step);
      } else {
        renderBuckets(step);
      }
      renderDetails(step);
    };

    const moveTo = (stepIndex) => {
      currentStep = Math.min(Math.max(stepIndex, 0), steps.length - 1);
      render();
    };

    refs.previous.addEventListener('click', () => moveTo(currentStep - 1));
    refs.reset.addEventListener('click', () => moveTo(0));
    refs.next.addEventListener('click', () => moveTo(currentStep + 1));

    root.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveTo(currentStep - 1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveTo(currentStep + 1);
      }
      if (event.key === 'Home') {
        event.preventDefault();
        moveTo(0);
      }
      if (event.key === 'End') {
        event.preventDefault();
        moveTo(steps.length - 1);
      }
    });

    const layoutSlots = {
      progress: {
        selector: '.algorithm-visualization__progress',
        variable: '--algorithm-progress-height'
      },
      stage: {
        selector: '.algorithm-visualization__stage',
        variable: '--algorithm-stage-height'
      },
      description: {
        selector: '.algorithm-visualization__description',
        variable: '--algorithm-description-height'
      }
    };

    const lockLayout = () => {
      InteractiveLayout.lockHeights({
        root,
        renderStep: render,
        stepCount: steps.length,
        currentStep,
        slots: layoutSlots
      });
    };

    root.dataset.algorithmInitialized = 'true';
    lockLayout();
    root.classList.add('is-ready');
    InteractiveLayout.watchResize(lockLayout);
  };

  roots.forEach((root) => {
    if (root.dataset.algorithmInitialized === 'true') {
      return;
    }

    try {
      renderRoot(root);
    } catch (error) {
      root.classList.add('is-failed');
      root.querySelectorAll('[data-algorithm-action]').forEach((button) => {
        button.disabled = true;
      });
      const errorMessage = root.querySelector('[data-algorithm-error]');
      const stepData = root.querySelector('[data-algorithm-step-data]');
      if (errorMessage) {
        errorMessage.hidden = false;
      }
      if (stepData) {
        stepData.hidden = false;
      }
      console.error('Algorithm visualization initialization failed.', error);
    }
  });
})();
