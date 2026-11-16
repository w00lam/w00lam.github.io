(function () {
  'use strict';

  const roots = document.querySelectorAll('[data-sort-visualization]');

  const rangeText = (range) => {
    if (!range) {
      return '전체 배열';
    }

    const [start, end] = range;
    return start > end ? `[${start}, ${end}] · 빈 구간` : `[${start}, ${end}]`;
  };

  const allIndices = (length) => Array.from({ length }, (_, index) => index);

  const uniqueIndices = (indices) => [...new Set(indices)].filter((index) => index !== null && index !== undefined);

  const makeStep = (state) => ({
    array: state.array.slice(),
    title: state.title,
    description: state.description,
    status: state.status || 'info',
    compare: uniqueIndices(state.compare || []),
    swap: uniqueIndices(state.swap || []),
    sorted: uniqueIndices(state.sorted || []),
    range: state.range ? state.range.slice() : null,
    pivotIndex: state.pivotIndex ?? null,
    keyIndex: state.keyIndex ?? null,
    keyValue: state.keyValue ?? null,
    holeIndex: state.holeIndex ?? null,
    insertIndex: state.insertIndex ?? null,
    details: state.details || [],
    callStack: state.callStack ? state.callStack.slice() : []
  });

  const detail = (label, value) => ({ label, value: String(value) });

  const completedBefore = (length, start) => allIndices(length).filter((index) => index < start);

  const createBubbleSteps = (input) => {
    const array = input.slice();
    const steps = [];
    const length = array.length;

    steps.push(
      makeStep({
        array,
        title: '시작',
        description: '왼쪽부터 인접한 원소를 비교한다. 오른쪽의 정렬 완료 영역은 아직 없다.',
        details: [detail('현재 순회', '준비'), detail('비교 대상', '없음'), detail('swapped', 'false')]
      })
    );

    for (let pass = 0; pass < length - 1; pass += 1) {
      let swapped = false;
      const last = length - pass - 1;
      const sortedBefore = allIndices(length).filter((index) => index >= last);

      for (let j = 0; j < last; j += 1) {
        const left = array[j];
        const right = array[j + 1];
        const shouldSwap = left > right;

        steps.push(
          makeStep({
            array,
            title: `${pass + 1}회 순회 · ${j}와 ${j + 1} 비교`,
            description: shouldSwap
              ? `${left} > ${right}이므로 두 인접 원소를 교환한다.`
              : `${left} ≤ ${right}이므로 교환하지 않고 다음 인접 원소로 이동한다.`,
            status: 'compare',
            compare: [j, j + 1],
            sorted: sortedBefore,
            details: [
              detail('현재 순회', `${pass + 1} / ${length - 1}`),
              detail('비교 대상', `arr[${j}]와 arr[${j + 1}]`),
              detail('교환 여부', shouldSwap ? '예' : '아니오'),
              detail('swapped', swapped ? 'true' : 'false')
            ]
          })
        );

        if (shouldSwap) {
          [array[j], array[j + 1]] = [array[j + 1], array[j]];
          swapped = true;
          steps.push(
            makeStep({
              array,
              title: `${pass + 1}회 순회 · 교환 완료`,
              description: `arr[${j}]와 arr[${j + 1}]을 교환했다. 큰 값이 오른쪽으로 이동한다.`,
              status: 'swap',
              swap: [j, j + 1],
              sorted: sortedBefore,
              details: [
                detail('현재 순회', `${pass + 1} / ${length - 1}`),
                detail('교환 대상', `arr[${j}]와 arr[${j + 1}]`),
                detail('swapped', 'true')
              ]
            })
          );
        }
      }

      const sortedAfter = allIndices(length).filter((index) => index >= last - 1);
      if (!swapped) {
        steps.push(
          makeStep({
            array,
            title: `${pass + 1}회 순회 · 조기 종료`,
            description: '이번 순회에서 교환이 한 번도 발생하지 않았다. 배열이 이미 정렬되어 있으므로 종료한다.',
            status: 'done',
            sorted: allIndices(length),
            details: [detail('현재 순회', `${pass + 1} / ${length - 1}`), detail('swapped', 'false'), detail('처리 결과', '정렬 완료')]
          })
        );
        return steps;
      }

      steps.push(
        makeStep({
          array,
          title: `${pass + 1}회 순회 완료`,
          description: `현재 미정렬 구간의 최댓값 ${array[last - 1]}이(가) 오른쪽 위치에 고정되었다.`,
          status: 'sorted',
          sorted: sortedAfter,
          details: [detail('정렬 완료 영역', `${last - 1} ~ ${length - 1}`), detail('다음 범위', `0 ~ ${last - 2}`), detail('swapped', 'true')]
        })
      );
    }

    steps.push(
      makeStep({
        array,
        title: '정렬 완료',
        description: '모든 인접 비교가 끝나 배열이 오름차순으로 정렬되었다.',
        status: 'done',
        sorted: allIndices(length),
        details: [detail('결과', array.join(' → ')), detail('추가 공간', 'O(1)')]
      })
    );
    return steps;
  };

  const createSelectionSteps = (input) => {
    const array = input.slice();
    const steps = [];
    const length = array.length;

    steps.push(
      makeStep({
        array,
        title: '시작',
        description: '왼쪽 정렬 완료 영역은 비어 있고, 전체 배열이 미정렬 영역이다.',
        details: [detail('i', '준비'), detail('j', '준비'), detail('minIndex', '없음')]
      })
    );

    for (let i = 0; i < length - 1; i += 1) {
      let minIndex = i;
      const sortedBefore = completedBefore(length, i);

      steps.push(
        makeStep({
          array,
          title: `i = ${i} · 최솟값 탐색 시작`,
          description: `arr[${i}]부터 미정렬 영역의 최솟값을 찾는다. minIndex는 ${i}에서 시작한다.`,
          status: 'compare',
          compare: [i],
          sorted: sortedBefore,
          details: [detail('정렬 완료 영역', sortedBefore.length ? `0 ~ ${i - 1}` : '없음'), detail('i', i), detail('j', '준비'), detail('minIndex', minIndex)]
        })
      );

      for (let j = i + 1; j < length; j += 1) {
        const candidate = array[j];
        const currentMinimum = array[minIndex];
        const isNewMinimum = candidate < currentMinimum;

        steps.push(
          makeStep({
            array,
            title: `i = ${i} · j = ${j} 비교`,
            description: isNewMinimum
              ? `${candidate}가 현재 최솟값 ${currentMinimum}보다 작으므로 minIndex를 갱신한다.`
              : `${candidate}가 현재 최솟값 ${currentMinimum}보다 작지 않으므로 minIndex를 유지한다.`,
            status: 'compare',
            compare: [j, minIndex],
            sorted: sortedBefore,
            details: [detail('i', i), detail('j', j), detail('현재 minIndex', minIndex), detail('비교 결과', isNewMinimum ? '새 최솟값' : '유지')]
          })
        );

        if (isNewMinimum) {
          minIndex = j;
          steps.push(
            makeStep({
              array,
              title: `minIndex 갱신 · ${j}`,
              description: `현재 최솟값의 위치를 ${j}로 바꿨다. 값 자체가 아니라 인덱스를 저장한다.`,
              status: 'info',
              compare: [j],
              sorted: sortedBefore,
              details: [detail('i', i), detail('j', j), detail('minIndex', minIndex), detail('현재 최솟값', array[minIndex])]
            })
          );
        }
      }

      if (minIndex !== i) {
        const selectedValue = array[minIndex];
        [array[i], array[minIndex]] = [array[minIndex], array[i]];
        steps.push(
          makeStep({
            array,
            title: `i = ${i} · 교환 완료`,
            description: `탐색한 최솟값 ${selectedValue}을(를) arr[${i}]와 교환했다.`,
            status: 'swap',
            swap: [i, minIndex],
            sorted: [...sortedBefore, i],
            details: [detail('i', i), detail('minIndex', minIndex), detail('교환 대상', `arr[${i}]와 arr[${minIndex}]`), detail('정렬 완료', `0 ~ ${i}`)]
          })
        );
      } else {
        steps.push(
          makeStep({
            array,
            title: `i = ${i} · 교환 생략`,
            description: `minIndex와 i가 같으므로 자기 자신과의 불필요한 교환을 생략한다.`,
            status: 'sorted',
            sorted: [...sortedBefore, i],
            details: [detail('i', i), detail('minIndex', minIndex), detail('교환', '생략'), detail('정렬 완료', `0 ~ ${i}`)]
          })
        );
      }
    }

    steps.push(
      makeStep({
        array,
        title: '정렬 완료',
        description: '각 위치에 들어갈 최솟값을 선택해 배열 전체를 정렬했다.',
        status: 'done',
        sorted: allIndices(length),
        details: [detail('결과', array.join(' → ')), detail('비교 횟수', `${(length * (length - 1)) / 2}`), detail('추가 공간', 'O(1)')]
      })
    );
    return steps;
  };

  const createInsertionSteps = (input) => {
    const array = input.slice();
    const steps = [];
    const length = array.length;

    steps.push(
      makeStep({
        array,
        title: '시작',
        description: '첫 번째 원소 하나를 정렬된 영역으로 보고 두 번째 원소부터 삽입한다.',
        sorted: [0],
        details: [detail('정렬 완료 영역', '0'), detail('key', '준비'), detail('j', '준비')]
      })
    );

    for (let i = 1; i < length; i += 1) {
      const key = array[i];
      let j = i - 1;
      const sortedBefore = allIndices(length).filter((index) => index < i);

      steps.push(
        makeStep({
          array,
          title: `i = ${i} · key 선택`,
          description: `arr[${i}]의 값 ${key}을(를) key에 보관하고 왼쪽 정렬 영역과 비교한다.`,
          status: 'info',
          keyIndex: i,
          keyValue: key,
          sorted: sortedBefore,
          details: [detail('정렬 완료 영역', `0 ~ ${i - 1}`), detail('key', key), detail('j', j), detail('삽입 위치', '탐색 중')]
        })
      );

      while (j >= 0) {
        const shouldMove = array[j] > key;
        steps.push(
          makeStep({
            array,
            title: `key 비교 · j = ${j}`,
            description: shouldMove
              ? `arr[${j}]의 값 ${array[j]}이(가) key ${key}보다 크므로 오른쪽으로 이동한다.`
              : `arr[${j}]의 값 ${array[j]}이(가) key ${key}보다 크지 않으므로 이동을 멈춘다.`,
            status: 'compare',
            compare: [j],
            keyValue: key,
            holeIndex: j + 1,
            sorted: sortedBefore,
            details: [detail('key', key), detail('j', j), detail('비교', `arr[${j}] > key`), detail('다음 동작', shouldMove ? '오른쪽 이동' : 'key 삽입')]
          })
        );

        if (!shouldMove) {
          break;
        }

        array[j + 1] = array[j];
        steps.push(
          makeStep({
            array,
            title: `원소 이동 · arr[${j}] → arr[${j + 1}]`,
            description: `큰 원소 ${array[j + 1]}을(를) 오른쪽으로 한 칸 이동했다. key는 별도로 보관 중이다.`,
            status: 'swap',
            swap: [j, j + 1],
            keyValue: key,
            holeIndex: j,
            sorted: sortedBefore,
            details: [detail('key', key), detail('이동 원소', `arr[${j}]`), detail('이동 위치', `arr[${j + 1}]`), detail('다음 j', j - 1)]
          })
        );
        j -= 1;
      }

      array[j + 1] = key;
      steps.push(
        makeStep({
          array,
          title: `key 삽입 · arr[${j + 1}]`,
          description: `비교가 끝난 위치 arr[${j + 1}]에 key ${key}을(를) 삽입했다.`,
          status: 'sorted',
          keyValue: key,
          insertIndex: j + 1,
          sorted: allIndices(length).filter((index) => index <= i),
          details: [detail('key', key), detail('j', j), detail('삽입 위치', j + 1), detail('정렬 완료 영역', `0 ~ ${i}`)]
        })
      );
    }

    steps.push(
      makeStep({
        array,
        title: '정렬 완료',
        description: '각 key를 정렬된 왼쪽 영역의 올바른 위치에 삽입했다.',
        status: 'done',
        sorted: allIndices(length),
        details: [detail('결과', array.join(' → ')), detail('최선의 입력', '이미 정렬된 배열'), detail('추가 공간', 'O(1)')]
      })
    );
    return steps;
  };

  const createQuickSteps = (input) => {
    const array = input.slice();
    const steps = [];
    const length = array.length;
    const fixed = new Set();
    const callStack = [];

    steps.push(
      makeStep({
        array,
        title: '시작',
        description: '전체 배열을 첫 번째 재귀 호출의 정렬 대상 구간으로 둔다.',
        range: [0, length - 1],
        details: [detail('현재 구간', `[0, ${length - 1}]`), detail('Pivot', '준비'), detail('재귀 종료 조건', 'start >= end')]
      })
    );

    const quickSort = (start, end) => {
      const currentStack = [...callStack, `[${start}, ${end}]`];
      if (start >= end) {
        if (start === end) {
          fixed.add(start);
        }
        steps.push(
          makeStep({
            array,
            title: `재귀 종료 · ${rangeText([start, end])}`,
            description: '정렬 대상 원소가 0개 또는 1개이므로 더 분할하지 않는다.',
            status: 'done',
            range: [start, end],
            sorted: [...fixed],
            callStack: currentStack,
            details: [detail('현재 구간', rangeText([start, end])), detail('종료 조건', 'start >= end'), detail('재귀 깊이', currentStack.length)]
          })
        );
        return;
      }

      callStack.push(`[${start}, ${end}]`);
      const pivotIndex = end;
      const pivot = array[pivotIndex];
      let i = start;

      steps.push(
        makeStep({
          array,
          title: `Partition 시작 · ${rangeText([start, end])}`,
          description: `Lomuto 방식으로 arr[${end}]의 값 ${pivot}을(를) Pivot으로 선택한다.`,
          status: 'partition',
          range: [start, end],
          pivotIndex,
          sorted: [...fixed],
          callStack,
          details: [detail('현재 구간', rangeText([start, end])), detail('Pivot', `arr[${pivotIndex}] = ${pivot}`), detail('i', i), detail('j', '준비')]
        })
      );

      for (let j = start; j < end; j += 1) {
        const isLess = array[j] < pivot;
        steps.push(
          makeStep({
            array,
            title: `Partition 비교 · j = ${j}`,
            description: isLess
              ? `${array[j]} < Pivot ${pivot}이므로 arr[i]와 교환할 후보가 된다.`
              : `${array[j]} ≥ Pivot ${pivot}이므로 현재 위치에 두고 다음 원소를 확인한다.`,
            status: 'compare',
            compare: [j],
            range: [start, end],
            pivotIndex,
            sorted: [...fixed],
            callStack,
            details: [detail('현재 구간', rangeText([start, end])), detail('Pivot', pivot), detail('i', i), detail('j', j), detail('비교 결과', isLess ? '왼쪽 그룹' : '보류')]
          })
        );

        if (isLess) {
          if (i !== j) {
            [array[i], array[j]] = [array[j], array[i]];
            steps.push(
              makeStep({
                array,
                title: `Partition 교환 · i = ${i}, j = ${j}`,
                description: `Pivot보다 작은 값을 왼쪽 경계 i로 옮겼다.`,
                status: 'swap',
                swap: [i, j],
                range: [start, end],
                pivotIndex,
                sorted: [...fixed],
                callStack,
                details: [detail('Pivot', pivot), detail('i', i), detail('j', j), detail('교환', `arr[${i}] ↔ arr[${j}]`)]
              })
            );
          }
          i += 1;
        }
      }

      if (i !== end) {
        [array[i], array[end]] = [array[end], array[i]];
        steps.push(
          makeStep({
            array,
            title: `Pivot 배치 · index ${i}`,
            description: `반복이 끝나 Pivot을 arr[${i}]에 배치한다. 이 인덱스가 Partition 반환값이다.`,
            status: 'swap',
            swap: [i, end],
            range: [start, end],
            pivotIndex: i,
            sorted: [...fixed],
            callStack,
            details: [detail('Pivot', pivot), detail('반환값', i), detail('왼쪽 재귀', rangeText([start, i - 1])), detail('오른쪽 재귀', rangeText([i + 1, end]))]
          })
        );
      }

      fixed.add(i);
      steps.push(
        makeStep({
          array,
          title: `Partition 완료 · index ${i}`,
          description: `Pivot ${pivot}의 왼쪽에는 작은 값, 오른쪽에는 크거나 같은 값이 오도록 구간을 나눴다.`,
          status: 'partition',
          range: [start, end],
          pivotIndex: i,
          sorted: [...fixed],
          callStack,
          details: [detail('Partition 반환값', i), detail('다음 왼쪽 구간', rangeText([start, i - 1])), detail('다음 오른쪽 구간', rangeText([i + 1, end]))]
        })
      );

      steps.push(
        makeStep({
          array,
          title: `왼쪽 재귀 호출 · ${rangeText([start, i - 1])}`,
          description: 'Pivot의 왼쪽 구간을 같은 방식으로 다시 정렬한다.',
          status: 'call',
          range: [start, i - 1],
          pivotIndex: i,
          sorted: [...fixed],
          callStack,
          details: [detail('현재 Pivot', i), detail('호출 구간', rangeText([start, i - 1])), detail('종료 조건', 'start >= end')]
        })
      );
      quickSort(start, i - 1);

      steps.push(
        makeStep({
          array,
          title: `오른쪽 재귀 호출 · ${rangeText([i + 1, end])}`,
          description: '왼쪽 구간이 끝나면 Pivot의 오른쪽 구간을 정렬한다.',
          status: 'call',
          range: [i + 1, end],
          pivotIndex: i,
          sorted: [...fixed],
          callStack,
          details: [detail('현재 Pivot', i), detail('호출 구간', rangeText([i + 1, end])), detail('재귀 순서', '왼쪽 완료 후 오른쪽')]
        })
      );
      quickSort(i + 1, end);
      callStack.pop();
    };

    quickSort(0, length - 1);
    steps.push(
      makeStep({
        array,
        title: '정렬 완료',
        description: '모든 재귀 호출이 종료되어 배열이 오름차순으로 정렬되었다.',
        status: 'done',
        sorted: allIndices(length),
        details: [detail('결과', array.join(' → ')), detail('평균 재귀 깊이', 'O(log n)'), detail('추가 공간', '재귀 스택 O(log n) 평균')]
      })
    );
    return steps;
  };

  const createSteps = (kind, input) => {
    const generators = {
      bubble: createBubbleSteps,
      selection: createSelectionSteps,
      insertion: createInsertionSteps,
      quick: createQuickSteps
    };

    if (!generators[kind]) {
      throw new Error(`Unknown sorting visualization: ${kind}`);
    }
    return generators[kind](input);
  };

  const createTextElement = (tagName, className, text) => {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    return element;
  };

  const statusLabels = {
    compare: '비교',
    swap: '교환',
    sorted: '정렬',
    partition: '분할',
    call: '호출',
    done: '완료',
    info: '상태'
  };

  const renderRoot = (root) => {
    const kind = root.dataset.sortKind;
    const input = root.dataset.sortValues.split(',').map((value) => Number(value.trim()));
    if (input.some((value) => !Number.isFinite(value)) || input.length < 2) {
      throw new Error('Sorting visualization values are invalid.');
    }

    const steps = createSteps(kind, input);
    const refs = {
      array: root.querySelector('[data-sort-array]'),
      details: root.querySelector('[data-sort-details]'),
      title: root.querySelector('[data-sort-step-title]'),
      count: root.querySelector('[data-sort-step-count]'),
      description: root.querySelector('[data-sort-description]'),
      stepData: root.querySelector('[data-sort-step-data]'),
      error: root.querySelector('[data-sort-error]'),
      previous: root.querySelector('[data-sort-action="previous"]'),
      reset: root.querySelector('[data-sort-action="reset"]'),
      next: root.querySelector('[data-sort-action="next"]')
    };

    if (Object.values(refs).some((ref) => !ref)) {
      throw new Error('Sorting visualization markup is incomplete.');
    }

    let currentStep = 0;

    const getCellState = (step, index) => {
      if (step.swap.includes(index)) {
        return 'swap';
      }
      if (step.pivotIndex === index) {
        return 'pivot';
      }
      if (step.keyIndex === index) {
        return 'key';
      }
      if (step.compare.includes(index)) {
        return 'compare';
      }
      if (step.sorted.includes(index)) {
        return 'sorted';
      }
      return 'idle';
    };

    const getCellLabel = (step, index, state) => {
      if (state === 'swap') {
        return '교환·이동';
      }
      if (state === 'pivot') {
        return 'Pivot';
      }
      if (state === 'key') {
        return 'key';
      }
      if (state === 'compare') {
        return '비교';
      }
      if (step.holeIndex === index) {
        return '삽입 위치';
      }
      if (step.sorted.includes(index)) {
        return '정렬 완료';
      }
      if (step.range && (index < step.range[0] || index > step.range[1])) {
        return '현재 구간 밖';
      }
      return '대기';
    };

    const renderArray = (step) => {
      refs.array.replaceChildren(
        ...step.array.map((value, index) => {
          const state = getCellState(step, index);
          const cell = document.createElement('div');
          cell.className = 'sort-visualization__cell';
          cell.dataset.state = state;
          cell.dataset.index = String(index);
          if (step.holeIndex === index) {
            cell.dataset.hole = 'true';
          }
          if (step.range) {
            cell.dataset.inRange = index >= step.range[0] && index <= step.range[1] ? 'true' : 'false';
          }
          cell.setAttribute('role', 'listitem');
          cell.setAttribute('aria-label', `인덱스 ${index}, 값 ${value}, ${getCellLabel(step, index, state)}`);
          cell.append(
            createTextElement('span', 'sort-visualization__cell-index', `index ${index}`),
            createTextElement('strong', 'sort-visualization__cell-value', String(value)),
            createTextElement('span', 'sort-visualization__cell-label', getCellLabel(step, index, state))
          );
          return cell;
        })
      );
    };

    const renderDetails = (step) => {
      const details = [...step.details];
      if (step.keyValue !== null) {
        details.unshift(detail('보관한 key', step.keyValue));
      }
      if (step.callStack.length > 0) {
        details.push(detail('재귀 호출 경로', step.callStack.join(' → ')));
      }
      refs.details.replaceChildren(
        ...details.map((item) => {
          const article = document.createElement('article');
          article.className = 'sort-visualization__detail';
          article.append(createTextElement('span', 'sort-visualization__detail-label', item.label));
          article.append(createTextElement('strong', 'sort-visualization__detail-value', item.value));
          return article;
        })
      );
    };

    const render = () => {
      const step = steps[currentStep];
      root.dataset.step = String(currentStep + 1);
      refs.title.textContent = `${statusLabels[step.status] || statusLabels.info} · ${step.title}`;
      refs.count.textContent = `${currentStep + 1} / ${steps.length}`;
      refs.description.textContent = step.description;
      refs.previous.disabled = currentStep === 0;
      refs.reset.disabled = currentStep === 0;
      refs.next.disabled = currentStep === steps.length - 1;
      refs.stepData.hidden = true;
      renderArray(step);
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

    root.dataset.sortInitialized = 'true';
    root.classList.add('is-ready');
    render();
  };

  roots.forEach((root) => {
    if (root.dataset.sortInitialized === 'true') {
      return;
    }

    try {
      renderRoot(root);
    } catch (error) {
      root.classList.add('is-failed');
      root.querySelectorAll('[data-sort-action]').forEach((button) => {
        button.disabled = true;
      });
      const errorMessage = root.querySelector('[data-sort-error]');
      const stepData = root.querySelector('[data-sort-step-data]');
      if (errorMessage) {
        errorMessage.hidden = false;
      }
      if (stepData) {
        stepData.hidden = false;
      }
      console.error('Sorting visualization initialization failed.', error);
    }
  });
})();
