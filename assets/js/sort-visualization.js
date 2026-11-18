(function () {
  /* global InteractiveLayout */
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
    selected: uniqueIndices(state.selected || []),
    sorted: uniqueIndices(state.sorted || []),
    range: state.range ? state.range.slice() : null,
    pivotIndex: state.pivotIndex ?? null,
    keyIndex: state.keyIndex ?? null,
    keyValue: state.keyValue ?? null,
    holeIndex: state.holeIndex ?? null,
    insertIndex: state.insertIndex ?? null,
    parentIndex: state.parentIndex ?? null,
    leftChildIndex: state.leftChildIndex ?? null,
    rightChildIndex: state.rightChildIndex ?? null,
    largestIndex: state.largestIndex ?? null,
    heapSize: state.heapSize ?? null,
    currentIndex: state.currentIndex ?? null,
    digit: state.digit ?? null,
    digitPlace: state.digitPlace ?? null,
    count: state.count ? state.count.slice() : null,
    output: state.output ? state.output.slice() : null,
    countIndex: state.countIndex ?? null,
    outputIndex: state.outputIndex ?? null,
    items: state.items ? state.items.map((item) => ({ ...item })) : null,
    buffer: state.buffer ? state.buffer.slice() : null,
    segments: state.segments ? state.segments.map((segment) => ({ ...segment })) : [],
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
            description: 'minIndex와 i가 같으므로 자기 자신과의 불필요한 교환을 생략한다.',
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
                description: 'Pivot보다 작은 값을 왼쪽 경계 i로 옮겼다.',
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

  const createMergeSteps = (input) => {
    const array = input.slice();
    const steps = [];
    const length = array.length;

    const segmentsFor = (left, mid, right, status = 'active') => [
      { start: left, end: mid, label: `왼쪽 [${left}..${mid}]`, status },
      { start: mid + 1, end: right, label: `오른쪽 [${mid + 1}..${right}]`, status }
    ];

    steps.push(
      makeStep({
        array,
        title: '시작',
        description: '분할 단계에서는 원본 배열의 값을 바꾸지 않고 현재 인덱스 구간만 나눈다.',
        range: [0, length - 1],
        segments: [{ start: 0, end: length - 1, label: `전체 [0..${length - 1}]`, status: 'active' }],
        details: [detail('현재 구간', `[0, ${length - 1}]`), detail('단계', '분할 준비'), detail('buffer', '아직 없음')]
      })
    );

    const merge = (left, mid, right) => {
      let i = left;
      let j = mid + 1;
      const buffer = [];
      const mergeSegments = segmentsFor(left, mid, right);

      steps.push(
        makeStep({
          array,
          title: `병합 준비 · [${left}..${right}]`,
          description: '두 구간은 각각 정렬되어 있다. 각 구간의 첫 미사용 원소부터 비교한다.',
          status: 'merge',
          range: [left, right],
          compare: [i, j],
          buffer,
          segments: mergeSegments,
          details: [detail('병합 구간', `[${left}, ${right}]`), detail('왼쪽 포인터 i', i), detail('오른쪽 포인터 j', j), detail('buffer', '비어 있음')]
        })
      );

      while (i <= mid && j <= right) {
        const leftValue = array[i];
        const rightValue = array[j];
        const takeLeft = leftValue <= rightValue;
        const selectedIndex = takeLeft ? i : j;

        steps.push(
          makeStep({
            array,
            title: `병합 비교 · i = ${i}, j = ${j}`,
            description: takeLeft
              ? `${leftValue} ≤ ${rightValue}이므로 왼쪽 원소를 먼저 buffer에 넣는다.`
              : `${rightValue} < ${leftValue}이므로 오른쪽 원소를 먼저 buffer에 넣는다.`,
            status: 'compare',
            range: [left, right],
            compare: [i, j],
            buffer,
            segments: mergeSegments,
            details: [detail('i가 가리키는 값', leftValue), detail('j가 가리키는 값', rightValue), detail('선택할 쪽', takeLeft ? '왼쪽' : '오른쪽'), detail('buffer', buffer.length ? buffer.join(' → ') : '비어 있음')]
          })
        );

        buffer.push(takeLeft ? array[i] : array[j]);
        if (takeLeft) {
          i += 1;
        } else {
          j += 1;
        }

        steps.push(
          makeStep({
            array,
            title: `buffer에 ${buffer[buffer.length - 1]} 추가`,
            description: '선택한 원소만 포인터를 한 칸 이동하고 buffer의 다음 위치에 기록했다.',
            status: 'merge',
            range: [left, right],
            selected: [selectedIndex],
            buffer,
            segments: mergeSegments,
            details: [detail('다음 i', i), detail('다음 j', j), detail('bidx', buffer.length), detail('buffer', buffer.join(' → '))]
          })
        );
      }

      while (i <= mid) {
        const leftover = array[i];
        buffer.push(leftover);
        i += 1;
        steps.push(
          makeStep({
            array,
            title: `왼쪽 남은 원소 ${leftover} 복사`,
            description: '오른쪽 구간이 먼저 소진되어 왼쪽 구간의 남은 원소를 buffer에 복사한다.',
            status: 'copy',
            range: [left, right],
            selected: [i - 1],
            buffer,
            segments: mergeSegments,
            details: [detail('남은 쪽', '왼쪽'), detail('다음 i', i), detail('bidx', buffer.length), detail('buffer', buffer.join(' → '))]
          })
        );
      }

      while (j <= right) {
        const leftover = array[j];
        buffer.push(leftover);
        j += 1;
        steps.push(
          makeStep({
            array,
            title: `오른쪽 남은 원소 ${leftover} 복사`,
            description: '왼쪽 구간이 먼저 소진되어 오른쪽 구간의 남은 원소를 buffer에 복사한다.',
            status: 'copy',
            range: [left, right],
            selected: [j - 1],
            buffer,
            segments: mergeSegments,
            details: [detail('남은 쪽', '오른쪽'), detail('다음 j', j), detail('bidx', buffer.length), detail('buffer', buffer.join(' → '))]
          })
        );
      }

      for (let offset = 0; offset < buffer.length; offset += 1) {
        array[left + offset] = buffer[offset];
      }

      steps.push(
        makeStep({
          array,
          title: `원본 반영 · [${left}..${right}]`,
          description: 'buffer가 완성된 뒤에만 병합 결과를 원본 배열의 현재 구간에 복사한다.',
          status: 'sorted',
          range: [left, right],
          buffer,
          segments: [{ start: left, end: right, label: `병합 완료 [${left}..${right}]`, status: 'merged' }],
          sorted: allIndices(length).filter((index) => index >= left && index <= right),
          details: [detail('복사 대상', `arr[${left}..${right}]`), detail('복사 원본', 'buffer'), detail('결과', array.slice(left, right + 1).join(' → ')), detail('원본 변경 시점', 'buffer 복사 완료 후')]
        })
      );
    };

    const mergeSort = (left, right) => {
      if (left >= right) {
        steps.push(
          makeStep({
            array,
            title: `단일 원소 구간 · ${left}`,
            description: '원소가 하나만 남은 구간은 이미 정렬된 것으로 보고 재귀를 종료한다.',
            status: 'done',
            range: [left, right],
            segments: [{ start: left, end: right, label: `[${left}..${right}] · 정렬 완료`, status: 'merged' }],
            sorted: [left],
            details: [detail('현재 구간', `[${left}, ${right}]`), detail('종료 조건', 'left >= right'), detail('값', array[left])]
          })
        );
        return;
      }

      const mid = Math.floor((left + right) / 2);
      steps.push(
        makeStep({
          array,
          title: `분할 · [${left}..${right}]`,
          description: `mid = ${mid}를 기준으로 왼쪽 [${left}..${mid}]와 오른쪽 [${mid + 1}..${right}]로 나눈다.`,
          status: 'split',
          range: [left, right],
          segments: segmentsFor(left, mid, right, 'active'),
          details: [detail('left', left), detail('mid', mid), detail('right', right), detail('다음 구간', `[${left}..${mid}], [${mid + 1}..${right}]`)]
        })
      );

      mergeSort(left, mid);
      mergeSort(mid + 1, right);
      merge(left, mid, right);
    };

    mergeSort(0, length - 1);
    steps.push(
      makeStep({
        array,
        title: '정렬 완료',
        description: '모든 분할 구간의 병합과 원본 반영이 끝나 배열이 오름차순으로 정렬되었다.',
        status: 'done',
        sorted: allIndices(length),
        segments: [{ start: 0, end: length - 1, label: '전체 병합 완료', status: 'merged' }],
        buffer: array,
        details: [detail('결과', array.join(' → ')), detail('시간 복잡도', 'O(n log n)'), detail('추가 공간', 'O(n)')]
      })
    );
    return steps;
  };

  const createHeapSteps = (input) => {
    const array = input.slice();
    const steps = [];
    const length = array.length;

    const heapDetails = (heapSize) => [
      detail('현재 힙 영역', heapSize > 0 ? `0 ~ ${heapSize - 1}` : '없음'),
      detail('정렬 완료 영역', heapSize < length ? `${heapSize} ~ ${length - 1}` : '없음')
    ];

    steps.push(
      makeStep({
        array,
        title: '시작',
        description: '배열을 완전 이진 트리로 함께 보고, 아직 힙 조건을 적용하지 않은 상태에서 시작한다.',
        heapSize: length,
        details: [detail('배열 인덱스', '0 기반'), detail('루트', 'index 0'), ...heapDetails(length)]
      })
    );

    const lastParent = Math.floor(length / 2) - 1;
    steps.push(
      makeStep({
        array,
        title: `마지막 부모 · index ${lastParent}`,
        description: `마지막 부모부터 index ${lastParent} → 0 순서로 heapify한다. 리프 노드는 자식이 없어 건너뛴다.`,
        status: 'info',
        parentIndex: lastParent,
        heapSize: length,
        details: [detail('원소 수 n', length), detail('마지막 부모', 'n / 2 - 1'), detail('계산 결과', lastParent), ...heapDetails(length)]
      })
    );

    const heapify = (heapSize, rootIndex, phase) => {
      const leftChildIndex = rootIndex * 2 + 1;
      const rightChildIndex = rootIndex * 2 + 2;
      let largestIndex = rootIndex;
      const sorted = allIndices(length).filter((index) => index >= heapSize);

      steps.push(
        makeStep({
          array,
          title: `${phase} · heapify(${heapSize}, ${rootIndex})`,
          description: '현재 노드를 최댓값 후보로 두고 범위 안의 왼쪽·오른쪽 자식과 비교한다.',
          status: 'compare',
          range: [0, heapSize - 1],
          parentIndex: rootIndex,
          leftChildIndex: leftChildIndex < heapSize ? leftChildIndex : null,
          rightChildIndex: rightChildIndex < heapSize ? rightChildIndex : null,
          largestIndex,
          heapSize,
          sorted,
          compare: [rootIndex, leftChildIndex < heapSize ? leftChildIndex : null, rightChildIndex < heapSize ? rightChildIndex : null],
          details: [detail('rootIndex', rootIndex), detail('왼쪽 자식', leftChildIndex < heapSize ? leftChildIndex : '범위 밖'), detail('오른쪽 자식', rightChildIndex < heapSize ? rightChildIndex : '범위 밖'), ...heapDetails(heapSize)]
        })
      );

      if (leftChildIndex < heapSize && array[leftChildIndex] > array[largestIndex]) {
        largestIndex = leftChildIndex;
      }

      if (rightChildIndex < heapSize && array[rightChildIndex] > array[largestIndex]) {
        largestIndex = rightChildIndex;
      }

      steps.push(
        makeStep({
          array,
          title: `최댓값 후보 · index ${largestIndex}`,
          description: '오른쪽 자식도 원래 부모가 아니라 현재까지 선택된 최댓값 후보와 비교한다.',
          status: 'selected',
          range: [0, heapSize - 1],
          parentIndex: rootIndex,
          leftChildIndex: leftChildIndex < heapSize ? leftChildIndex : null,
          rightChildIndex: rightChildIndex < heapSize ? rightChildIndex : null,
          largestIndex,
          heapSize,
          sorted,
          selected: [largestIndex],
          compare: [rootIndex, leftChildIndex < heapSize ? leftChildIndex : null, rightChildIndex < heapSize ? rightChildIndex : null],
          details: [detail('부모 값', array[rootIndex]), detail('최댓값 후보', `index ${largestIndex} · ${array[largestIndex]}`), detail('교환 여부', largestIndex === rootIndex ? '없음' : '필요'), ...heapDetails(heapSize)]
        })
      );

      if (largestIndex === rootIndex) {
        steps.push(
          makeStep({
            array,
            title: `heapify 종료 · index ${rootIndex}`,
            description: '부모가 현재 자식보다 크거나 같으므로 교환하지 않고 heapify를 끝낸다.',
            status: 'done',
            range: [0, heapSize - 1],
            parentIndex: rootIndex,
            leftChildIndex: leftChildIndex < heapSize ? leftChildIndex : null,
            rightChildIndex: rightChildIndex < heapSize ? rightChildIndex : null,
            largestIndex,
            heapSize,
            sorted,
            details: [detail('교환', '생략'), detail('재귀 호출', '없음'), ...heapDetails(heapSize)]
          })
        );
        return;
      }

      [array[rootIndex], array[largestIndex]] = [array[largestIndex], array[rootIndex]];
      steps.push(
        makeStep({
          array,
          title: `교환 · ${rootIndex} ↔ ${largestIndex}`,
          description: `부모와 최댓값 후보를 교환하고 값이 내려간 index ${largestIndex}에서 heapify를 재귀 호출한다.`,
          status: 'swap',
          range: [0, heapSize - 1],
          parentIndex: rootIndex,
          leftChildIndex: leftChildIndex < heapSize ? leftChildIndex : null,
          rightChildIndex: rightChildIndex < heapSize ? rightChildIndex : null,
          largestIndex,
          heapSize,
          sorted,
          swap: [rootIndex, largestIndex],
          details: [detail('교환 대상', `arr[${rootIndex}] ↔ arr[${largestIndex}]`), detail('다음 재귀', `heapify(${heapSize}, ${largestIndex})`), ...heapDetails(heapSize)]
        })
      );
      heapify(heapSize, largestIndex, phase);
    };

    for (let rootIndex = lastParent; rootIndex >= 0; rootIndex -= 1) {
      heapify(length, rootIndex, '최대 힙 구성');
    }

    steps.push(
      makeStep({
        array,
        title: '최대 힙 구성 완료',
        description: '루트 index 0에 최댓값이 있고, 모든 부모가 자식보다 크거나 같은 최대 힙이 되었다.',
        status: 'done',
        heapSize: length,
        sorted: [],
        details: [detail('최대 힙', array.join(' → ')), detail('루트', array[0]), detail('다음 동작', '루트와 마지막 힙 원소 교환')]
      })
    );

    for (let endIndex = length - 1; endIndex > 0; endIndex -= 1) {
      const extractedValue = array[0];
      [array[0], array[endIndex]] = [array[endIndex], array[0]];
      const heapSize = endIndex;
      const sorted = allIndices(length).filter((index) => index >= heapSize);

      steps.push(
        makeStep({
          array,
          title: `최댓값 ${extractedValue} 추출`,
          description: `루트와 index ${endIndex}를 교환했다. ${endIndex} 뒤쪽은 정렬 완료 영역이므로 다음 heapify에서 제외한다.`,
          status: 'swap',
          range: [0, heapSize - 1],
          heapSize,
          sorted,
          swap: [0, endIndex],
          details: [detail('추출한 최댓값', extractedValue), detail('새 힙 크기', heapSize), detail('정렬 완료', `${heapSize} ~ ${length - 1}`), detail('다음 호출', `heapify(${heapSize}, 0)`)]
        })
      );

      if (heapSize > 1) {
        heapify(heapSize, 0, '힙 복구');
      }
    }

    steps.push(
      makeStep({
        array,
        title: '정렬 완료',
        description: '최댓값을 뒤쪽 정렬 구간으로 하나씩 보내고 남은 힙을 복구해 오름차순 정렬을 완성했다.',
        status: 'done',
        heapSize: 1,
        sorted: allIndices(length),
        details: [detail('결과', array.join(' → ')), detail('시간 복잡도', 'O(n log n)'), detail('재귀 heapify 공간', 'O(log n)')]
      })
    );
    return steps;
  };

  const createRadixSteps = (input) => {
    const steps = [];
    const max = Math.max(...input);
    const exponents = max === 0 ? [1] : [];
    for (let exp = 1; max > 0 && exp <= max; exp *= 10) {
      exponents.push(exp);
    }
    let items = input.map((value, index) => ({ value, id: `원본 ${index}` }));

    const digitAt = (value, exp) => Math.floor(value / exp) % 10;
    const valuesOf = (list) => list.map((item) => item.value);
    const digitSummary = (list, exp) => list.map((item) => `${item.value} → ${digitAt(item.value, exp)}`).join(', ');

    steps.push(
      makeStep({
        array: valuesOf(items),
        items,
        title: '시작',
        description: '각 원소에 원래 위치를 붙여 두고, 일의 자리부터 자릿수별 안정 정렬을 시작한다.',
        details: [
          detail('현재 자릿수', '준비'),
          detail('원본 배열', valuesOf(items).join(' → ')),
          detail('원래 위치', items.map((item) => item.id).join(' · ')),
          detail('정렬 방향', 'LSD · 낮은 자리 → 높은 자리')
        ]
      })
    );

    exponents.forEach((exp, pass) => {
      const placeName = exp === 1 ? '일의 자리' : exp === 10 ? '십의 자리' : `${Math.log10(exp) + 1}번째 자리`;
      const buckets = Array.from({ length: 10 }, () => []);
      items.forEach((item) => buckets[digitAt(item.value, exp)].push(item));
      const sortedItems = buckets.flat();
      const digitValues = digitSummary(items, exp);

      steps.push(
        makeStep({
          array: valuesOf(items),
          items,
          title: `${placeName} 기준 정렬 시작`,
          description: `${placeName}의 숫자를 확인하고, 같은 자릿수끼리는 현재 순서를 유지하면서 안정적으로 묶는다.`,
          status: 'compare',
          digit: exp,
          digitPlace: placeName,
          details: [
            detail('현재 자릿수', `${placeName} · exp = ${exp}`),
            detail('자릿수 값', digitValues),
            detail('정렬 전', valuesOf(items).join(' → ')),
            detail('안정성', '같은 자릿수면 이전 순서를 유지')
          ]
        })
      );

      items = sortedItems;
      steps.push(
        makeStep({
          array: valuesOf(items),
          items,
          title: `${placeName} 정렬 결과`,
          description: `${placeName} 기준으로 원소를 정렬했다. 다음 자릿수에서도 이 순서를 그대로 이어 받아 안정성을 유지한다.`,
          status: pass === exponents.length - 1 ? 'done' : 'sorted',
          digit: exp,
          digitPlace: placeName,
          sorted: allIndices(input.length),
          details: [
            detail('현재 자릿수', `${placeName} · exp = ${exp}`),
            detail('정렬된 배열', valuesOf(items).join(' → ')),
            detail('원래 위치', items.map((item) => item.id).join(' · ')),
            detail('유지된 순서', pass === 0 ? '일의 자리 같은 원소의 원래 순서' : '십의 자리 같은 원소의 이전 결과')
          ]
        })
      );
    });

    steps.push(
      makeStep({
        array: valuesOf(items),
        items,
        title: '정렬 완료',
        description: '일의 자리부터 높은 자리까지 모든 자릿수를 처리해 배열을 오름차순으로 정렬했다.',
        status: 'done',
        sorted: allIndices(input.length),
        details: [
          detail('처리한 자릿수', exponents.map((exp) => `exp = ${exp}`).join(' → ')),
          detail('최종 배열', valuesOf(items).join(' → ')),
          detail('안정성', '같은 자릿수의 상대 순서 유지'),
          detail('단계 수', '6단계')
        ]
      })
    );

    return steps;
  };

  const createCountingSteps = (input) => {
    const steps = [];
    const max = Math.max(...input);
    const count = Array.from({ length: max + 1 }, () => 0);
    const output = Array.from({ length: input.length }, () => null);
    const blankOutput = () => output.map((value) => value);

    const pushStep = (state) => {
      steps.push(
        makeStep({
          array: state.array || input,
          count,
          output,
          currentIndex: state.currentIndex,
          countIndex: state.countIndex,
          outputIndex: state.outputIndex,
          title: state.title,
          description: state.description,
          status: state.status,
          details: state.details
        })
      );
    };

    pushStep({
      title: '시작',
      description: '입력 배열은 그대로 두고 빈도 배열과 출력 배열을 준비한다.',
      details: [detail('입력 배열', input.join(' → ')), detail('count', '[0, 0, 0, 0]'), detail('output', '아직 배치된 원소 없음')]
    });

    input.forEach((value, index) => {
      const before = count[value];
      count[value] += 1;
      pushStep({
        currentIndex: index,
        countIndex: value,
        title: `빈도 계산 · arr[${index}] = ${value}`,
        description: `arr[${index}]의 값 ${value}를 확인하고 count[${value}]를 ${before}에서 ${count[value]}로 늘린다.`,
        status: 'compare',
        details: [detail('현재 원소', `arr[${index}] = ${value}`), detail('참조 인덱스', `count[${value}]`), detail('변경', `${before} → ${count[value]}`), detail('count', `[${count.join(', ')}]`)]
      });
    });

    pushStep({
      title: '빈도 배열 완성',
      description: '각 값이 몇 번 등장했는지 count 배열에 모였다. 아직 출력 위치는 계산하지 않았다.',
      status: 'sorted',
      details: [detail('count', `[${count.join(', ')}]`), detail('의미', '각 값의 등장 횟수'), detail('output', '모든 칸이 비어 있음')]
    });

    for (let index = 1; index < count.length; index += 1) {
      const previous = count[index - 1];
      const before = count[index];
      count[index] += previous;
      pushStep({
        countIndex: index,
        title: `누적합 계산 · count[${index}]`,
        description: `count[${index}]에 이전 값 count[${index - 1}]을 더해 ${before} + ${previous} = ${count[index]}으로 만든다.`,
        status: 'compare',
        details: [detail('현재 인덱스', index), detail('계산', `count[${index}] += count[${index - 1}]`), detail('변경', `${before} → ${count[index]}`), detail('count', `[${count.join(', ')}]`)]
      });
    }

    pushStep({
      title: '누적합 배열 완성',
      description: 'count[value]가 value 이하 원소의 개수가 되어 출력 배열의 끝 위치를 가리킬 수 있다.',
      status: 'sorted',
      details: [detail('count', `[${count.join(', ')}]`), detail('예시', `count[2] = ${count[2]} · 2 이하 원소의 개수`), detail('다음 단계', '입력 배열을 뒤에서부터 배치')]
    });

    for (let index = input.length - 1; index >= 0; index -= 1) {
      const value = input[index];
      const before = count[value];
      pushStep({
        currentIndex: index,
        countIndex: value,
        title: `배치할 원소 선택 · arr[${index}] = ${value}`,
        description: `안정성을 위해 입력 배열의 뒤쪽 원소부터 확인한다. ${value}의 기존 상대 순서가 유지될 자리를 찾는다.`,
        status: 'compare',
        details: [detail('현재 원소', `arr[${index}] = ${value}`), detail('count[value]', before), detail('순회 방향', `${index} → 0`), detail('output', '아직 배치 전')]
      });

      count[value] -= 1;
      const outputIndex = count[value];
      pushStep({
        currentIndex: index,
        countIndex: value,
        outputIndex,
        title: `출력 위치 결정 · output[${outputIndex}]`,
        description: `count[${value}]를 먼저 1 줄여 ${before - 1}로 만들고, 그 값을 0 기반 출력 인덱스로 사용한다.`,
        status: 'selected',
        details: [detail('현재 원소', `arr[${index}] = ${value}`), detail('감소', `count[${value}]: ${before} → ${count[value]}`), detail('출력 인덱스', `output[${outputIndex}]`), detail('output', blankOutput().map((item) => item === null ? '_' : item).join(' → '))]
      });

      output[outputIndex] = value;
      pushStep({
        currentIndex: index,
        countIndex: value,
        outputIndex,
        title: `출력 배열에 ${value} 배치`,
        description: `arr[${index}]의 값 ${value}를 output[${outputIndex}]에 넣었다. 다음에는 그 앞 원소를 처리한다.`,
        status: 'swap',
        details: [detail('배치', `output[${outputIndex}] = ${value}`), detail('남은 count[value]', count[value]), detail('다음 입력', index > 0 ? `arr[${index - 1}]` : '없음'), detail('output', output.map((item) => item === null ? '_' : item).join(' → '))]
      });
    }

    pushStep({
      array: output.slice(),
      title: '원본 배열에 복사',
      description: '출력 배열에 완성된 정렬 결과를 원본 배열에 복사한다. Java에서는 System.arraycopy를 사용할 수 있다.',
      status: 'done',
      details: [detail('output', output.join(' → ')), detail('복사', 'output → arr'), detail('결과', output.join(' → ')), detail('count', `[${count.join(', ')}]`)]
    });

    return steps;
  };

  const createSteps = (kind, input) => {
    const generators = {
      bubble: createBubbleSteps,
      selection: createSelectionSteps,
      insertion: createInsertionSteps,
      quick: createQuickSteps,
      merge: createMergeSteps,
      heap: createHeapSteps,
      radix: createRadixSteps,
      counting: createCountingSteps
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
    split: '분할',
    merge: '병합',
    copy: '복사',
    call: '호출',
    selected: '선택',
    current: '현재',
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
      structure: root.querySelector('[data-sort-structure]'),
      mergeStructure: root.querySelector('[data-sort-merge-structure]'),
      treeWrap: root.querySelector('[data-sort-tree-wrap]'),
      tree: root.querySelector('[data-sort-tree]'),
      countingStructure: root.querySelector('[data-sort-counting-structure]'),
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
    let selectedIndex = null;

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
      if (step.currentIndex === index) {
        return 'current';
      }
      if (step.parentIndex === index) {
        return 'parent';
      }
      if (step.selected.includes(index)) {
        return 'selected';
      }
      if (step.largestIndex === index && step.largestIndex !== step.parentIndex) {
        return 'candidate';
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
      if (state === 'current') {
        return '현재 원소';
      }
      if (state === 'parent') {
        return '부모';
      }
      if (state === 'selected') {
        return '선택됨';
      }
      if (state === 'candidate') {
        return '최댓값 후보';
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
          const item = step.items ? step.items[index] : null;
          const displayValue = item ? item.value : value;
          const itemLabel = item ? item.id : null;
          const cell = document.createElement('div');
          cell.className = 'sort-visualization__cell';
          cell.dataset.state = state;
          cell.dataset.index = String(index);
          cell.dataset.selected = selectedIndex === index ? 'true' : 'false';
          if (step.holeIndex === index) {
            cell.dataset.hole = 'true';
          }
          if (step.range) {
            cell.dataset.inRange = index >= step.range[0] && index <= step.range[1] ? 'true' : 'false';
          }
          cell.setAttribute('role', 'button');
          cell.setAttribute('tabindex', '0');
          cell.setAttribute('aria-pressed', selectedIndex === index ? 'true' : 'false');
          cell.setAttribute('aria-label', `인덱스 ${index}, 값 ${displayValue}${itemLabel ? `, ${itemLabel}` : ''}, ${getCellLabel(step, index, state)}. 선택하려면 Enter를 누르세요.`);
          cell.append(
            createTextElement('span', 'sort-visualization__cell-index', `index ${index}`),
            createTextElement('strong', 'sort-visualization__cell-value', String(displayValue)),
            ...(itemLabel ? [createTextElement('span', 'sort-visualization__cell-meta', itemLabel)] : []),
            createTextElement('span', 'sort-visualization__cell-label', getCellLabel(step, index, state))
          );
          cell.addEventListener('click', () => {
            selectedIndex = index;
            render();
          });
          cell.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              selectedIndex = index;
              render();
            }
          });
          return cell;
        })
      );
    };

    const getTreePosition = (index) => {
      const fixedPositions = [
        [320, 26],
        [180, 92],
        [460, 92],
        [100, 158],
        [260, 158],
        [400, 158],
        [540, 158]
      ];
      if (fixedPositions[index]) {
        return fixedPositions[index];
      }
      const depth = Math.floor(Math.log2(index + 1));
      const firstAtDepth = 2 ** depth - 1;
      const offset = index - firstAtDepth;
      const slots = 2 ** depth;
      return [640 * ((offset + 1) / (slots + 1)), 26 + depth * 66];
    };

    const treeNodeState = (step, index) => {
      if (step.swap.includes(index)) {
        return 'swap';
      }
      if (selectedIndex === index) {
        return 'selected';
      }
      if (step.selected.includes(index)) {
        return 'candidate';
      }
      if (step.parentIndex === index) {
        return 'parent';
      }
      if (step.compare.includes(index)) {
        return 'compare';
      }
      if (step.sorted.includes(index)) {
        return 'sorted';
      }
      return 'idle';
    };

    const createSvgElement = (tagName, attributes = {}) => {
      const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
      Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
      return element;
    };

    const renderTree = (step) => {
      if (!refs.tree || kind !== 'heap') {
        return;
      }

      refs.tree.setAttribute('viewBox', '0 0 640 190');
      const elements = [];
      for (let index = 1; index < step.array.length; index += 1) {
        const [x, y] = getTreePosition(index, step.array.length);
        const [parentX, parentY] = getTreePosition(Math.floor((index - 1) / 2), step.array.length);
        elements.push(
          createSvgElement('line', {
            class: 'sort-visualization__tree-edge',
            x1: parentX,
            y1: parentY,
            x2: x,
            y2: y
          })
        );
      }

      step.array.forEach((value, index) => {
        const [x, y] = getTreePosition(index, step.array.length);
        const state = treeNodeState(step, index);
        const group = createSvgElement('g', {
          class: 'sort-visualization__tree-node',
          'data-state': state,
          'data-index': index,
          'data-selected': selectedIndex === index ? 'true' : 'false',
          tabindex: '0',
          role: 'button',
          'aria-label': `인덱스 ${index}, 값 ${value}, ${getCellLabel(step, index, state)}`
        });
        const circle = createSvgElement('circle', { cx: x, cy: y, r: 22 });
        const valueText = createSvgElement('text', { class: 'sort-tree-value', x, y: y + 5 });
        valueText.textContent = String(value);
        const indexText = createSvgElement('text', { class: 'sort-tree-index', x, y: y + 36 });
        indexText.textContent = `index ${index}`;
        group.append(circle, valueText, indexText);
        group.addEventListener('click', () => {
          selectedIndex = index;
          render();
        });
        group.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectedIndex = index;
            render();
          }
        });
        elements.push(group);
      });
      refs.tree.replaceChildren(...elements);
    };

    const renderStructure = (step) => {
      if (!refs.structure) {
        return;
      }

      const isMerge = kind === 'merge';
      const isHeap = kind === 'heap';
      const isCounting = kind === 'counting';
      refs.structure.hidden = !isMerge && !isHeap && !isCounting;
      if (refs.mergeStructure) {
        refs.mergeStructure.hidden = !isMerge;
      }
      if (refs.treeWrap) {
        refs.treeWrap.hidden = !isHeap;
      }
      if (refs.countingStructure) {
        refs.countingStructure.hidden = !isCounting;
      }

      if (isMerge && refs.mergeStructure) {
        const heading = createTextElement('p', 'sort-visualization__structure-label', '분할·병합 구조');
        const segmentRow = document.createElement('div');
        segmentRow.className = 'sort-visualization__segment-row';
        segmentRow.append(createTextElement('span', 'sort-visualization__structure-label', '구간'));
        const segmentList = document.createElement('div');
        segmentList.className = 'sort-visualization__segment-list';
        step.segments.forEach((segment) => {
          const item = createTextElement('span', 'sort-visualization__segment', segment.label);
          item.dataset.state = segment.status || 'active';
          segmentList.append(item);
        });
        segmentRow.append(segmentList);

        const bufferRow = document.createElement('div');
        bufferRow.className = 'sort-visualization__buffer-row';
        bufferRow.append(createTextElement('span', 'sort-visualization__structure-label', 'buffer'));
        const bufferList = document.createElement('div');
        bufferList.className = 'sort-visualization__buffer-list';
        if (step.buffer === null) {
          bufferList.append(createTextElement('span', 'sort-visualization__buffer-cell', '병합 전'));
        } else if (step.buffer.length === 0) {
          bufferList.append(createTextElement('span', 'sort-visualization__buffer-cell', '비어 있음'));
        } else {
          step.buffer.forEach((value) => {
            const item = createTextElement('span', 'sort-visualization__buffer-cell', String(value));
            bufferList.append(item);
          });
        }
        bufferRow.append(bufferList);
        refs.mergeStructure.replaceChildren(heading, segmentRow, bufferRow);
      }

      if (isCounting && refs.countingStructure) {
        const heading = createTextElement('p', 'sort-visualization__structure-label', '계수 배열과 출력 배열');
        const createRow = (label, values, activeIndex, placeholder) => {
          const row = document.createElement('div');
          row.className = 'sort-visualization__count-row';
          row.append(createTextElement('span', 'sort-visualization__structure-label', label));
          const cells = document.createElement('div');
          cells.className = 'sort-visualization__count-cells';
          values.forEach((value, index) => {
            const cell = document.createElement('span');
            cell.className = 'sort-visualization__count-cell';
            cell.dataset.active = activeIndex === index ? 'true' : 'false';
            cell.append(
              createTextElement('span', 'sort-visualization__count-index', `index ${index}`),
              createTextElement('strong', 'sort-visualization__count-value', value === null ? placeholder : String(value))
            );
            cells.append(cell);
          });
          row.append(cells);
          return row;
        };

        refs.countingStructure.replaceChildren(
          heading,
          createRow('count', step.count || [], step.countIndex, '—'),
          createRow('output', step.output || [], step.outputIndex, '_')
        );
      }

      renderTree(step);
    };

    const renderDetails = (step) => {
      const details = [...step.details];
      if (step.keyValue !== null) {
        details.unshift(detail('보관한 key', step.keyValue));
      }
      if (step.callStack.length > 0) {
        details.push(detail('재귀 호출 경로', step.callStack.join(' → ')));
      }
      if (selectedIndex !== null && step.array[selectedIndex] !== undefined) {
        const parentIndex = selectedIndex === 0 ? null : Math.floor((selectedIndex - 1) / 2);
        const leftChildIndex = selectedIndex * 2 + 1;
        const rightChildIndex = selectedIndex * 2 + 2;
        details.push(detail('선택한 원소', `index ${selectedIndex} · ${step.array[selectedIndex]}`));
        if (kind === 'heap') {
          details.push(
            detail('부모 인덱스', parentIndex === null ? '없음' : parentIndex),
            detail('자식 인덱스', `${leftChildIndex < step.array.length ? leftChildIndex : '없음'} / ${rightChildIndex < step.array.length ? rightChildIndex : '없음'}`),
            detail('현재 힙 포함', step.heapSize === null ? '정보 없음' : selectedIndex < step.heapSize ? '예' : '아니오')
          );
        }
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
      renderArray(step);
      renderStructure(step);
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
    const layoutSlots = {
      progress: {
        selector: '.sort-visualization__progress',
        variable: '--sort-progress-height'
      },
      stage: {
        selector: '.sort-visualization__stage',
        variable: '--sort-stage-height'
      },
      description: {
        selector: '.sort-visualization__description',
        variable: '--sort-description-height'
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

    lockLayout();
    root.classList.add('is-ready');
    InteractiveLayout.watchResize(lockLayout);
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
