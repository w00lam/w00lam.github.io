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
    graphMode: state.graphMode ?? null,
    graphVisited: state.graphVisited ? state.graphVisited.slice() : [],
    graphCurrent: state.graphCurrent ?? null,
    graphEdges: state.graphEdges ? state.graphEdges.slice() : [],
    graphStack: state.graphStack ? state.graphStack.slice() : [],
    graphQueue: state.graphQueue ? state.graphQueue.slice() : [],
    graphNew: state.graphNew ? state.graphNew.slice() : [],
    lisArray: state.lisArray ? state.lisArray.slice() : [],
    lisDp: state.lisDp ? state.lisDp.slice() : [],
    lisTails: state.lisTails ? state.lisTails.slice() : [],
    lisI: state.lisI ?? null,
    lisJ: state.lisJ ?? null,
    lisCondition: state.lisCondition ?? null,
    lisLowerBound: state.lisLowerBound ?? null,
    lisSearch: state.lisSearch ? state.lisSearch.slice() : [],
    lisMax: state.lisMax ?? null,
    dijkstraNodes: state.dijkstraNodes ? state.dijkstraNodes.slice() : [],
    dijkstraEdges: state.dijkstraEdges ? state.dijkstraEdges.slice() : [],
    dijkstraCurrent: state.dijkstraCurrent ?? null,
    dijkstraProcessed: state.dijkstraProcessed ? state.dijkstraProcessed.slice() : [],
    dijkstraEdge: state.dijkstraEdge ?? null,
    dijkstraDist: state.dijkstraDist ? state.dijkstraDist.slice() : [],
    dijkstraQueue: state.dijkstraQueue ? state.dijkstraQueue.slice() : [],
    bitmask: state.bitmask ?? 5,
    bitmaskBefore: state.bitmaskBefore ?? null,
    bitmaskIndex: state.bitmaskIndex ?? null,
    bitmaskOperation: state.bitmaskOperation ?? null,
    bitmaskExpression: state.bitmaskExpression ?? '',
    bitmaskReason: state.bitmaskReason ?? '',
    bitmaskChanged: state.bitmaskChanged ? state.bitmaskChanged.slice() : [],
    bitmaskCheck: state.bitmaskCheck ?? null,
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

  const createGraphSteps = (mode) => {
    const nodes = [1, 2, 3, 4, 5];
    const steps = [];
    const push = (state) => steps.push(makeStep({
      array: nodes,
      graphMode: mode,
      graphVisited: [],
      graphEdges: [],
      graphStack: [],
      graphQueue: [],
      graphNew: [],
      ...state
    }));

    if (mode === 'dfs') {
      push({
        title: '초기 상태',
        description: '1에서 DFS를 시작하기 전 상태다. 아직 방문한 정점은 없고 재귀 호출 Stack에는 시작 정점 1을 준비한다.',
        graphStack: [1],
        details: [detail('현재 정점', '—'), detail('방문 순서', '없음'), detail('재귀 Stack', '[1]'), detail('다음 동작', '1 방문')]
      });
      push({
        status: 'current',
        title: '정점 1 방문',
        description: '시작 정점 1을 방문 처리한다. 인접 정점은 작은 번호부터 확인한다.',
        graphVisited: [1],
        graphCurrent: 1,
        graphStack: [1],
        details: [detail('현재 정점', 1), detail('방문 순서', '1'), detail('재귀 Stack', '[1]'), detail('다음 간선', '1 → 2')]
      });
      push({
        status: 'compare',
        title: '정점 2로 깊게 이동',
        description: '1의 인접 정점 2를 방문하고 재귀 호출한다. DFS는 가능한 한 깊게 내려간다.',
        graphVisited: [1, 2],
        graphCurrent: 2,
        graphEdges: ['1-2'],
        graphStack: [1, 2],
        details: [detail('현재 정점', 2), detail('방문 순서', '1 → 2'), detail('재귀 Stack', '[1, 2]'), detail('탐색 중인 간선', '1 → 2')]
      });
      push({
        status: 'compare',
        title: '정점 4로 더 깊게 이동',
        description: '2의 첫 번째 미방문 인접 정점 4를 방문한다. 4에서는 더 내려갈 정점이 없다.',
        graphVisited: [1, 2, 4],
        graphCurrent: 4,
        graphEdges: ['2-4'],
        graphStack: [1, 2, 4],
        details: [detail('현재 정점', 4), detail('방문 순서', '1 → 2 → 4'), detail('재귀 Stack', '[1, 2, 4]'), detail('탐색 중인 간선', '2 → 4')]
      });
      push({
        title: '2로 복귀',
        description: '정점 4의 인접 정점을 모두 확인했으므로 dfs(4)가 종료된다. 호출이 끝나면 이전 dfs(2)의 반복문으로 돌아간다.',
        graphVisited: [1, 2, 4],
        graphCurrent: 2,
        graphStack: [1, 2],
        details: [detail('현재 정점', 2), detail('방문 순서', '1 → 2 → 4'), detail('재귀 Stack', '[1, 2]'), detail('복귀 이유', '4 탐색 종료')]
      });
      push({
        status: 'compare',
        title: '정점 5 방문',
        description: '2의 다음 인접 정점 5를 방문한다. 5까지 처리한 뒤 다시 1의 반복문으로 복귀한다.',
        graphVisited: [1, 2, 4, 5],
        graphCurrent: 5,
        graphEdges: ['2-5'],
        graphStack: [1, 2, 5],
        details: [detail('현재 정점', 5), detail('방문 순서', '1 → 2 → 4 → 5'), detail('재귀 Stack', '[1, 2, 5]'), detail('탐색 중인 간선', '2 → 5')]
      });
      push({
        title: '1로 복귀',
        description: '정점 5의 탐색이 끝나면 dfs(2)도 종료된다. 호출 Stack에서 2를 빼고 dfs(1)의 다음 정점 3을 확인한다.',
        graphVisited: [1, 2, 4, 5],
        graphCurrent: 1,
        graphStack: [1],
        details: [detail('현재 정점', 1), detail('방문 순서', '1 → 2 → 4 → 5'), detail('재귀 Stack', '[1]'), detail('다음 간선', '1 → 3')]
      });
      push({
        status: 'result',
        title: '정점 3 방문',
        description: '1의 다음 미방문 인접 정점 3을 방문한다. DFS 방문 순서는 1 → 2 → 4 → 5 → 3이다.',
        graphVisited: [1, 2, 4, 5, 3],
        graphCurrent: 3,
        graphEdges: ['1-3'],
        graphStack: [1, 3],
        result: 'DFS 순서 · 1 → 2 → 4 → 5 → 3',
        details: [detail('현재 정점', 3), detail('방문 순서', '1 → 2 → 4 → 5 → 3'), detail('재귀 Stack', '[1, 3]'), detail('탐색 중인 간선', '1 → 3')]
      });
      push({
        status: 'result',
        title: '탐색 종료',
        description: '정점 3까지 처리한 뒤 모든 인접 정점을 확인했다. 모든 재귀 호출이 종료되고 Stack이 비워진다.',
        graphVisited: [1, 2, 4, 5, 3],
        result: 'DFS 방문 완료',
        details: [detail('현재 정점', '없음'), detail('방문 순서', '1 → 2 → 4 → 5 → 3'), detail('재귀 Stack', '[]'), detail('상태', '탐색 종료')]
      });
      return steps;
    }

    push({
      status: 'current',
      title: '초기 Queue',
      description: 'BFS는 시작 정점 1을 먼저 방문 표시하고 Queue에 넣는다. 방문 표시는 Queue에 추가하는 시점에 한다.',
      graphVisited: [1],
      graphQueue: [1],
      details: [detail('현재 정점', '—'), detail('방문 순서', '1'), detail('Queue', '[1]'), detail('다음 동작', '1 poll')]
    });
    push({
      status: 'compare',
      title: '1 poll · 2, 3 offer',
      description: '1을 poll하면 Queue에서 제거된다. 인접한 2와 3을 방문 표시한 뒤 Queue에 offer한다.',
      graphVisited: [1, 2, 3],
      graphCurrent: 1,
      graphEdges: ['1-2', '1-3'],
      graphQueue: [2, 3],
      graphNew: [2, 3],
      details: [detail('현재 정점', 1), detail('방문 순서', '1 → 2 → 3'), detail('Queue', '[2, 3]'), detail('새로 발견', '2, 3')]
    });
    push({
      status: 'compare',
      title: '2 poll · 4, 5 offer',
      description: '2를 poll한 뒤 Queue에는 3이 남는다. 4와 5를 방문 표시하고 Queue 뒤에 offer한다.',
      graphVisited: [1, 2, 3, 4, 5],
      graphCurrent: 2,
      graphEdges: ['2-4', '2-5'],
      graphQueue: [3, 4, 5],
      graphNew: [4, 5],
      details: [detail('현재 정점', 2), detail('방문 순서', '1 → 2 → 3 → 4 → 5'), detail('Queue', '[3, 4, 5]'), detail('새로 발견', '4, 5')]
    });
    push({
      title: '3 poll',
      description: '3을 poll한다. 새로 발견할 정점이 없으므로 Queue에는 4와 5가 남는다.',
      graphVisited: [1, 2, 3, 4, 5],
      graphCurrent: 3,
      graphQueue: [4, 5],
      details: [detail('현재 정점', 3), detail('방문 순서', '1 → 2 → 3 → 4 → 5'), detail('Queue', '[4, 5]'), detail('새로 발견', '없음')]
    });
    push({
      title: '4 poll',
      description: '4를 poll한다. 이미 모든 정점을 방문 표시했으므로 Queue에는 5만 남는다.',
      graphVisited: [1, 2, 3, 4, 5],
      graphCurrent: 4,
      graphQueue: [5],
      details: [detail('현재 정점', 4), detail('방문 순서', '1 → 2 → 3 → 4 → 5'), detail('Queue', '[5]'), detail('새로 발견', '없음')]
    });
    push({
      status: 'result',
      title: '5 poll',
      description: '마지막 정점 5를 poll하면 Queue가 빈다. BFS 방문 순서는 1 → 2 → 3 → 4 → 5다.',
      graphVisited: [1, 2, 3, 4, 5],
      graphCurrent: 5,
      graphQueue: [],
      result: 'BFS 순서 · 1 → 2 → 3 → 4 → 5',
      details: [detail('현재 정점', 5), detail('방문 순서', '1 → 2 → 3 → 4 → 5'), detail('Queue', '[]'), detail('새로 발견', '없음')]
    });
    push({
      status: 'result',
      title: '탐색 종료',
      description: 'Queue가 비었으므로 BFS 탐색을 종료한다. poll된 정점은 Queue에 남아 있지 않다.',
      graphVisited: [1, 2, 3, 4, 5],
      result: 'BFS 방문 완료',
      details: [detail('현재 정점', '없음'), detail('방문 순서', '1 → 2 → 3 → 4 → 5'), detail('Queue', '[]'), detail('상태', '탐색 종료')]
    });
    return steps;
  };

  const createLisDpSteps = () => {
    const array = [7, 2, 3, 8, 4, 5];
    const dp = array.map(() => 1);
    const steps = [];
    const push = (state) => steps.push(makeStep({
      lisArray: array,
      lisDp: dp,
      lisMax: Math.max(...dp),
      ...state
    }));

    push({
      title: '초기화',
      description: '모든 원소는 자기 자신만으로 길이 1의 증가 부분 수열이 된다. dp를 모두 1로 채운다.',
      details: [detail('dp 의미', 'arr[i]에서 끝나는 LIS 길이'), detail('초기 dp', '[1, 1, 1, 1, 1, 1]'), detail('현재 i', '—'), detail('현재 LIS 길이', 1)]
    });

    for (let i = 0; i < array.length; i += 1) {
      if (i === 0) {
        push({
          status: 'current',
          lisI: i,
          title: 'i = 0 확정',
          description: '첫 원소 7은 앞에서 비교할 원소가 없다. 자기 자신으로 끝나는 LIS 길이 1을 유지한다.',
          details: [detail('현재 i', 0), detail('현재 값', 'arr[0] = 7'), detail('비교 중인 j', '없음'), detail('dp[0]', 1)]
        });
        continue;
      }

      for (let j = 0; j < i; j += 1) {
        const condition = array[j] < array[i];
        const previous = dp[i];
        if (condition) {
          dp[i] = Math.max(dp[i], dp[j] + 1);
        }
        push({
          status: condition ? 'result' : 'compare',
          lisI: i,
          lisJ: j,
          lisCondition: condition,
          title: `i = ${i}, j = ${j}`,
          description: condition
            ? `arr[${j}] = ${array[j]} < arr[${i}] = ${array[i]}다. dp[${i}]를 ${previous}에서 dp[${j}] + 1 = ${dp[j] + 1}과 비교해 ${dp[i]}로 갱신한다.`
            : `arr[${j}] = ${array[j]} < arr[${i}] = ${array[i]}가 아니다. 이 j에서는 dp[${i}]를 갱신하지 않는다.`,
          details: [
            detail('현재 i / 값', `${i} / ${array[i]}`),
            detail('비교 j / 값', `${j} / ${array[j]}`),
            detail('조건', condition ? 'arr[j] < arr[i] · 참' : 'arr[j] < arr[i] · 거짓'),
            detail(`dp[${i}]`, condition ? `${previous} → ${dp[i]}` : dp[i])
          ]
        });
      }
    }

    push({
      status: 'result',
      lisMax: Math.max(...dp),
      title: 'DP 완료',
      description: '모든 비교가 끝났다. dp[i]는 각 위치에서 끝나는 LIS 길이이고, 전체 LIS 길이는 dp의 최댓값 4다.',
      result: 'LIS 길이 · 4',
      details: [detail('최종 dp', '[1, 1, 2, 3, 3, 4]'), detail('dp 최댓값', 4), detail('LIS', '2 → 3 → 4 → 5'), detail('비교 조건', 'arr[j] < arr[i]')]
    });
    return steps;
  };

  const lowerBound = (tails, target) => {
    let left = 0;
    let right = tails.length;
    const trace = [];
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      trace.push(`left=${left}, mid=${mid}, right=${right}`);
      if (tails[mid] < target) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    return { index: left, trace };
  };

  const createLisBinarySteps = () => {
    const array = [7, 2, 3, 8, 4, 5];
    const tails = [];
    const steps = [];
    const push = (state) => steps.push(makeStep({
      lisArray: array,
      lisTails: tails,
      lisMax: tails.length,
      ...state
    }));

    push({
      title: '초기화',
      description: '입력 배열을 왼쪽부터 처리한다. tails[k]는 길이가 k + 1인 증가 부분 수열의 가능한 최소 끝값이다.',
      details: [detail('처리 순서', '7 → 2 → 3 → 8 → 4 → 5'), detail('현재 원소', '—'), detail('tails', '[]'), detail('현재 LIS 길이', 0)]
    });

    array.forEach((value) => {
      const search = lowerBound(tails, value);
      const position = search.index;
      const before = tails.slice();
      const append = position === tails.length;
      tails[position] = value;
      push({
        status: append ? 'result' : 'compare',
        lisI: array.indexOf(value),
        lisLowerBound: position,
        lisSearch: search.trace,
        title: `${value} 처리`,
        description: append
          ? `target ${value}는 현재 tails의 모든 끝값보다 크다. Lower Bound가 ${position}이므로 끝에 추가하고 길이가 1 증가한다.`
          : `target ${value} 이상인 첫 위치가 ${position}이다. tails[${position}]의 ${before[position]}을 ${value}로 교체해 같은 길이에서 끝값을 낮춘다.`,
        result: append ? `끝 추가 · 길이 ${tails.length}` : `값 교체 · 길이 ${tails.length}`,
        details: [
          detail('현재 원소', value),
          detail('Lower Bound', `index ${position}`),
          detail('처리 전 tails', before.length ? `[${before.join(', ')}]` : '[]'),
          detail('처리 후 tails', `[${tails.join(', ')}]`),
          detail('길이 변화', append ? `${tails.length - 1} → ${tails.length}` : '변화 없음')
        ]
      });
    });

    push({
      status: 'result',
      lisI: null,
      lisLowerBound: null,
      result: 'LIS 길이 · 4',
      title: 'Binary Search 완료',
      description: '최종 tails의 길이는 4다. tails 배열은 길이별 최소 끝값을 저장하므로 항상 실제 LIS 수열을 뜻하지는 않는다.',
      details: [detail('최종 tails', '[2, 3, 4, 5]'), detail('현재 LIS 길이', 4), detail('배열의 의미', '길이별 최소 끝값'), detail('수열 복원', '이번 학습 범위에 없음')]
    });
    return steps;
  };

  const createDijkstraSteps = () => {
    const nodes = [0, 1, 2, 3];
    const edges = [[0, 1, 2], [0, 2, 5], [1, 3, 1], [2, 3, 2]];
    const initialDist = ['0', 'INF', 'INF', 'INF'];
    const steps = [];
    const push = (state) => steps.push(makeStep({
      dijkstraNodes: nodes,
      dijkstraEdges: edges,
      dijkstraDist: initialDist,
      dijkstraQueue: [],
      dijkstraProcessed: [],
      ...state
    }));

    push({
      title: '초기 상태',
      description: '시작 정점 0의 거리는 0으로 두고, 아직 발견하지 못한 정점은 INF로 표시한다. 우선순위 큐에는 (정점, 거리)인 (0, 0)을 넣는다.',
      dijkstraQueue: [[0, 0]],
      details: [detail('dist', '[0, INF, INF, INF]'), detail('PQ', '[(0, 0)]'), detail('시작 정점', 0), detail('정렬 기준', '거리')]
    });
    push({
      status: 'current',
      title: '정점 0 선택',
      description: 'PQ에서 현재 거리가 가장 짧은 (0, 0)을 꺼낸다. 시작 정점의 거리가 0임을 확인하고 인접 간선을 살핀다.',
      dijkstraCurrent: 0,
      dijkstraQueue: [],
      details: [detail('현재 정점', 0), detail('현재 거리', 0), detail('dist', '[0, INF, INF, INF]'), detail('다음 확인', '0 → 1')]
    });
    push({
      status: 'result',
      title: '0 → 1 완화',
      description: '0에서 1로 가는 새 비용은 0 + 2 = 2다. 기존 dist[1]이 INF보다 작으므로 dist[1]을 2로 갱신하고 PQ에 (1, 2)를 추가한다.',
      dijkstraCurrent: 0,
      dijkstraEdge: '0-1',
      dijkstraDist: ['0', '2', 'INF', 'INF'],
      dijkstraQueue: [[1, 2]],
      details: [detail('완화', '0 → 1 (2)'), detail('새 비용', '0 + 2 = 2'), detail('dist', '[0, 2, INF, INF]'), detail('PQ', '[(1, 2)]')]
    });
    push({
      status: 'result',
      title: '0 → 2 완화',
      description: '0에서 2로 가는 새 비용은 0 + 5 = 5다. INF보다 작으므로 dist[2]를 5로 갱신한다. PQ는 거리 2인 항목을 먼저 둔다.',
      dijkstraCurrent: 0,
      dijkstraEdge: '0-2',
      dijkstraDist: ['0', '2', '5', 'INF'],
      dijkstraQueue: [[1, 2], [2, 5]],
      details: [detail('완화', '0 → 2 (5)'), detail('새 비용', '0 + 5 = 5'), detail('dist', '[0, 2, 5, INF]'), detail('PQ', '[(1, 2), (2, 5)]')]
    });
    push({
      status: 'current',
      title: '정점 1 선택',
      description: 'PQ의 두 항목 중 거리가 2인 정점 1을 먼저 꺼낸다. 정점 1에서 3으로 가는 간선을 확인한다.',
      dijkstraCurrent: 1,
      dijkstraProcessed: [0],
      dijkstraQueue: [[2, 5]],
      details: [detail('현재 정점', 1), detail('현재 거리', 2), detail('PQ', '[(2, 5)]'), detail('다음 확인', '1 → 3')]
    });
    push({
      status: 'result',
      title: '1 → 3 완화',
      description: '0에서 1을 거쳐 3으로 가는 새 비용은 dist[1] + 1 = 3이다. 기존 dist[3]인 INF보다 작으므로 3으로 갱신한다.',
      dijkstraCurrent: 1,
      dijkstraProcessed: [0, 1],
      dijkstraEdge: '1-3',
      dijkstraDist: ['0', '2', '5', '3'],
      dijkstraQueue: [[3, 3], [2, 5]],
      details: [detail('완화', '1 → 3 (1)'), detail('새 비용', '2 + 1 = 3'), detail('dist', '[0, 2, 5, 3]'), detail('PQ', '[(3, 3), (2, 5)]')]
    });
    push({
      status: 'current',
      title: '정점 3 선택',
      description: 'PQ에서 현재 거리가 3인 정점 3을 꺼낸다. 정점 3에서 갱신할 간선이 없으므로 현재 최단 거리 후보를 유지한다.',
      dijkstraCurrent: 3,
      dijkstraProcessed: [0, 1],
      dijkstraQueue: [[2, 5]],
      details: [detail('현재 정점', 3), detail('현재 거리', 3), detail('PQ', '[(2, 5)]'), detail('갱신할 간선', '없음')]
    });
    push({
      status: 'current',
      title: '정점 2 선택',
      description: '남은 PQ 항목은 (2, 5)다. 정점 2를 꺼내 2에서 3으로 가는 간선을 확인한다.',
      dijkstraCurrent: 2,
      dijkstraProcessed: [0, 1, 3],
      dijkstraQueue: [],
      details: [detail('현재 정점', 2), detail('현재 거리', 5), detail('PQ', '[]'), detail('다음 확인', '2 → 3')]
    });
    push({
      status: 'compare',
      title: '2 → 3 확인',
      description: '2에서 3으로 가는 새 비용은 5 + 2 = 7이다. 기존 dist[3]이 3으로 더 작으므로 갱신하지 않는다.',
      dijkstraCurrent: 2,
      dijkstraProcessed: [0, 1, 3, 2],
      dijkstraEdge: '2-3',
      dijkstraDist: ['0', '2', '5', '3'],
      dijkstraQueue: [],
      details: [detail('확인', '2 → 3 (2)'), detail('새 비용', '5 + 2 = 7'), detail('기존 거리', 'dist[3] = 3'), detail('결과', '갱신하지 않음')]
    });
    push({
      status: 'result',
      title: '탐색 종료',
      description: 'PQ가 비었고 모든 후보를 확인했다. 시작 정점 0에서 각 정점까지의 최종 거리는 [0, 2, 5, 3]이다.',
      dijkstraProcessed: [0, 1, 3, 2],
      dijkstraDist: ['0', '2', '5', '3'],
      dijkstraQueue: [],
      result: '최종 거리 · [0, 2, 5, 3]',
      details: [detail('dist', '[0, 2, 5, 3]'), detail('PQ', '[]'), detail('시작 정점', 0), detail('상태', '탐색 종료')]
    });
    return steps;
  };

  const bitmaskOperationInfo = (mask, index, operation) => {
    const flag = 1 << index;
    const before = mask;
    let after = mask;
    let check = null;
    let expression = '';
    let reason = '';

    if (operation === 'add') {
      after = mask | flag;
      expression = 'mask |= (1 << i);';
      reason = (mask & flag) !== 0 ? `인덱스 ${index}는 이미 1이라 상태를 유지한다.` : `인덱스 ${index}의 비트를 1로 켠다.`;
    } else if (operation === 'remove') {
      after = mask & ~flag;
      expression = 'mask &= ~(1 << i);';
      reason = (mask & flag) === 0 ? `인덱스 ${index}는 이미 0이라 상태를 유지한다.` : `NOT으로 선택 비트만 0인 마스크를 만들어 인덱스 ${index}를 끈다.`;
    } else if (operation === 'check') {
      after = mask;
      check = (mask & flag) !== 0;
      expression = 'boolean exists = (mask & (1 << i)) != 0;';
      reason = `AND 결과가 0이 아니므로 인덱스 ${index}의 포함 여부를 확인한다.`;
    } else if (operation === 'toggle') {
      after = mask ^ flag;
      expression = 'mask ^= (1 << i);';
      reason = `XOR로 인덱스 ${index}의 비트를 ${(mask & flag) !== 0 ? '0' : '1'}로 반전한다.`;
    } else if (operation === 'clear') {
      after = 0;
      expression = 'mask = 0;';
      reason = '모든 비트를 0으로 만들어 상태를 초기화한다.';
    }

    return {
      before,
      after,
      check,
      expression,
      reason,
      changed: Array.from({ length: 4 }, (_, bit) => bit).filter((bit) => ((before >> bit) & 1) !== ((after >> bit) & 1))
    };
  };

  const createBitmaskStep = (state = {}) => makeStep({
    bitmask: 5,
    bitmaskBefore: null,
    bitmaskIndex: null,
    bitmaskOperation: null,
    bitmaskExpression: '',
    bitmaskReason: '',
    bitmaskChanged: [],
    bitmaskCheck: null,
    title: '초기 상태',
    description: '4비트 mask = 0101에서 시작한다. 오른쪽부터 인덱스 0, 1, 2, 3을 센다.',
    details: [detail('mask', '0101 (5)'), detail('인덱스', '3 2 1 0'), detail('켜진 비트', '인덱스 2, 0'), detail('다음 동작', '비트 인덱스 선택')],
    ...state
  });

  const createBitmaskSteps = () => [createBitmaskStep()];

  const createSteps = (kind, values, mode) => {
    if (kind === 'binary') {
      return createBinarySteps();
    }
    if (kind === 'hash') {
      return createHashSteps(values);
    }
    if (kind === 'graph') {
      return createGraphSteps(mode);
    }
    if (kind === 'lis') {
      return mode === 'binary' ? createLisBinarySteps() : createLisDpSteps();
    }
    if (kind === 'dijkstra') {
      return createDijkstraSteps();
    }
    if (kind === 'bitmask') {
      return createBitmaskSteps();
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

    let activeMode = kind === 'graph' ? 'dfs' : 'dp';
    let steps = createSteps(kind, values, activeMode);
    const refs = {
      modes: root.querySelector('[data-algorithm-modes]'),
      modeButtons: Array.from(root.querySelectorAll('[data-algorithm-mode]')),
      arrayWrap: root.querySelector('[data-algorithm-array-wrap]'),
      array: root.querySelector('[data-algorithm-array]'),
      bucketsWrap: root.querySelector('[data-algorithm-buckets-wrap]'),
      buckets: root.querySelector('[data-algorithm-buckets]'),
      graphWrap: root.querySelector('[data-algorithm-graph-wrap]'),
      graph: root.querySelector('[data-algorithm-graph]'),
      graphState: root.querySelector('[data-algorithm-graph-state]'),
      lisWrap: root.querySelector('[data-algorithm-lis-wrap]'),
      lisArray: root.querySelector('[data-algorithm-lis-array]'),
      lisDpWrap: root.querySelector('[data-algorithm-lis-dp-wrap]'),
      lisDp: root.querySelector('[data-algorithm-lis-dp]'),
      lisTailsWrap: root.querySelector('[data-algorithm-lis-tails-wrap]'),
      lisTails: root.querySelector('[data-algorithm-lis-tails]'),
      lisNote: root.querySelector('[data-algorithm-lis-note]'),
      dijkstraWrap: root.querySelector('[data-algorithm-dijkstra-wrap]'),
      dijkstraGraph: root.querySelector('[data-algorithm-dijkstra-graph]'),
      dijkstraDist: root.querySelector('[data-algorithm-dijkstra-dist]'),
      dijkstraQueue: root.querySelector('[data-algorithm-dijkstra-queue]'),
      bitmaskWrap: root.querySelector('[data-algorithm-bitmask-wrap]'),
      bitmaskCells: root.querySelector('[data-algorithm-bitmask-cells]'),
      bitmaskIndex: root.querySelector('[data-algorithm-bitmask-index]'),
      bitmaskOperations: Array.from(root.querySelectorAll('[data-bitmask-operation]')),
      bitmaskBefore: root.querySelector('[data-algorithm-bitmask-before]'),
      bitmaskAfter: root.querySelector('[data-algorithm-bitmask-after]'),
      bitmaskSelected: root.querySelector('[data-algorithm-bitmask-selected]'),
      bitmaskCheck: root.querySelector('[data-algorithm-bitmask-check]'),
      bitmaskExpression: root.querySelector('[data-algorithm-bitmask-expression]'),
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

    root.dataset.algorithmMode = activeMode;
    root.style.setProperty('--algorithm-count', kind === 'binary' ? String(values.length) : kind === 'lis' ? '6' : '5');

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

    const createSvgElement = (tagName, attributes = {}) => {
      const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
      Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
      return element;
    };

    const renderGraph = (step) => {
      const positions = {
        1: [160, 36],
        2: [85, 126],
        3: [235, 126],
        4: [45, 216],
        5: [125, 216]
      };
      const edges = [[1, 2], [1, 3], [2, 4], [2, 5]];
      refs.graph.setAttribute('viewBox', '0 0 320 250');
      refs.graph.replaceChildren();
      edges.forEach(([from, to]) => {
        const [x1, y1] = positions[from];
        const [x2, y2] = positions[to];
        const line = createSvgElement('line', {
          x1,
          y1,
          x2,
          y2,
          class: `algorithm-visualization__graph-edge${step.graphEdges.includes(`${from}-${to}`) ? ' is-active' : ''}`
        });
        refs.graph.append(line);
      });
      Object.entries(positions).forEach(([rawNode, [cx, cy]]) => {
        const node = Number(rawNode);
        const group = createSvgElement('g', { class: 'algorithm-visualization__graph-node' });
        const state = step.graphCurrent === node ? 'current' : step.graphVisited.includes(node) ? 'visited' : 'idle';
        group.dataset.state = state;
        const circle = createSvgElement('circle', { cx, cy, r: 25 });
        const label = createSvgElement('text', { x: cx, y: cy + 6, 'text-anchor': 'middle' });
        label.textContent = String(node);
        group.append(circle, label);
        refs.graph.append(group);
      });

      const stateItems = [
        ['현재 정점', step.graphCurrent ?? '없음'],
        ['방문', step.graphVisited.length ? step.graphVisited.join(' → ') : '없음'],
        [step.graphMode === 'dfs' ? '재귀 Stack' : 'Queue', step.graphMode === 'dfs' ? `[${step.graphStack.join(', ')}]` : `[${step.graphQueue.join(', ')}]`],
        ['새로 발견', step.graphNew.length ? step.graphNew.join(', ') : '없음']
      ];
      refs.graphState.replaceChildren(
        ...stateItems.map(([label, value]) => {
          const item = document.createElement('span');
          item.className = 'algorithm-visualization__graph-chip';
          item.append(createTextElement('small', '', label), createTextElement('strong', '', value));
          return item;
        })
      );
    };

    const renderLisCells = (container, valuesToRender, step, type) => {
      container.replaceChildren(
        ...valuesToRender.map((value, index) => {
          const cell = document.createElement('div');
          cell.className = 'algorithm-visualization__lis-cell';
          let state = 'idle';
          if (type === 'array') {
            state = step.lisI === index ? 'current' : step.lisJ === index ? 'compare' : 'idle';
          } else if (type === 'dp') {
            state = step.lisI === index ? 'current' : step.lisJ === index ? 'compare' : 'idle';
          } else if (type === 'tails' && step.lisLowerBound === index) {
            state = 'result';
          }
          cell.dataset.state = state;
          cell.setAttribute('role', 'listitem');
          cell.setAttribute('aria-label', `${type} index ${index}, 값 ${value}`);
          cell.append(
            createTextElement('span', 'algorithm-visualization__lis-index', `[${index}]`),
            createTextElement('strong', 'algorithm-visualization__lis-value', String(value))
          );
          return cell;
        })
      );
    };

    const renderLis = (step) => {
      renderLisCells(refs.lisArray, step.lisArray, step, 'array');
      const isDp = activeMode === 'dp';
      refs.lisDpWrap.hidden = !isDp;
      refs.lisTailsWrap.hidden = isDp;
      if (isDp) {
        renderLisCells(refs.lisDp, step.lisDp, step, 'dp');
        refs.lisNote.textContent = 'dp[i]는 arr[i]에서 끝나는 LIS 길이다. 전체 길이는 dp의 최댓값이다.';
      } else {
        renderLisCells(refs.lisTails, step.lisTails, step, 'tails');
        refs.lisNote.textContent = 'tails는 길이별 최소 끝값을 저장하며, 항상 실제 LIS 수열을 뜻하지는 않는다.';
      }
    };

    const formatBitmask = (mask) => (mask >>> 0).toString(2).padStart(4, '0').slice(-4);

    const renderDijkstra = (step) => {
      const positions = {
        0: [48, 116],
        1: [152, 48],
        2: [152, 184],
        3: [256, 116]
      };
      refs.dijkstraGraph.setAttribute('viewBox', '0 0 304 232');
      refs.dijkstraGraph.replaceChildren();
      const defs = createSvgElement('defs');
      const marker = createSvgElement('marker', {
        id: `dijkstra-arrow-${root.dataset.algorithmKind}`,
        markerWidth: 8,
        markerHeight: 8,
        refX: 7,
        refY: 4,
        orient: 'auto',
        markerUnits: 'strokeWidth'
      });
      marker.append(createSvgElement('path', { d: 'M 0 0 L 8 4 L 0 8 z', class: 'algorithm-visualization__dijkstra-arrow' }));
      defs.append(marker);
      refs.dijkstraGraph.append(defs);

      step.dijkstraEdges.forEach(([from, to, weight]) => {
        const [x1, y1] = positions[from];
        const [x2, y2] = positions[to];
        const active = step.dijkstraEdge === `${from}-${to}`;
        const line = createSvgElement('line', {
          x1,
          y1,
          x2,
          y2,
          class: `algorithm-visualization__dijkstra-edge${active ? ' is-active' : ''}`,
          'marker-end': `url(#dijkstra-arrow-${root.dataset.algorithmKind})`
        });
        const label = createSvgElement('text', {
          x: (x1 + x2) / 2,
          y: (y1 + y2) / 2 - 8,
          class: 'algorithm-visualization__dijkstra-weight',
          'text-anchor': 'middle'
        });
        label.textContent = String(weight);
        refs.dijkstraGraph.append(line, label);
      });

      Object.entries(positions).forEach(([rawNode, [cx, cy]]) => {
        const node = Number(rawNode);
        const group = createSvgElement('g', { class: 'algorithm-visualization__dijkstra-node' });
        const state = step.dijkstraCurrent === node ? 'current' : step.dijkstraProcessed.includes(node) ? 'processed' : 'idle';
        group.dataset.state = state;
        const circle = createSvgElement('circle', { cx, cy, r: 25 });
        const label = createSvgElement('text', { x: cx, y: cy + 6, 'text-anchor': 'middle' });
        label.textContent = String(node);
        const distance = createSvgElement('text', { x: cx, y: cy + 43, class: 'algorithm-visualization__dijkstra-distance', 'text-anchor': 'middle' });
        distance.textContent = `d=${step.dijkstraDist[node]}`;
        group.append(circle, label, distance);
        refs.dijkstraGraph.append(group);
      });

      refs.dijkstraDist.replaceChildren(
        ...step.dijkstraDist.map((value, index) => {
          const item = document.createElement('span');
          item.className = 'algorithm-visualization__dijkstra-value';
          item.dataset.state = step.dijkstraCurrent === index ? 'current' : 'idle';
          item.append(createTextElement('small', '', `[${index}]`), createTextElement('strong', '', value));
          return item;
        })
      );
      refs.dijkstraQueue.replaceChildren(
        ...(step.dijkstraQueue.length
          ? step.dijkstraQueue.map(([node, distance]) => {
            const item = document.createElement('span');
            item.className = 'algorithm-visualization__dijkstra-queue-item';
            item.append(createTextElement('small', '', '정점 · 거리'), createTextElement('strong', '', `(${node}, ${distance})`));
            return item;
          })
          : [createTextElement('span', 'algorithm-visualization__dijkstra-empty', '비어 있음')])
      );
    };

    const renderBitmask = (step) => {
      const bits = [3, 2, 1, 0];
      const selectedIndex = Number(refs.bitmaskIndex.value);
      refs.bitmaskCells.replaceChildren(
        ...bits.map((index) => {
          const value = (step.bitmask >> index) & 1;
          const cell = document.createElement('div');
          const isSelected = selectedIndex === index;
          const isChanged = step.bitmaskChanged.includes(index);
          cell.className = 'algorithm-visualization__bitmask-cell';
          cell.dataset.state = isChanged ? 'changed' : isSelected ? 'selected' : 'idle';
          cell.setAttribute('role', 'listitem');
          cell.setAttribute('aria-label', `인덱스 ${index}, 값 ${value}${isChanged ? ', 변경됨' : ''}`);
          cell.append(
            createTextElement('span', 'algorithm-visualization__bitmask-index', `index ${index}`),
            createTextElement('strong', 'algorithm-visualization__bitmask-value', String(value)),
            createTextElement('span', 'algorithm-visualization__bitmask-label', isChanged ? '변경' : isSelected ? '선택' : '유지')
          );
          return cell;
        })
      );
      refs.bitmaskBefore.textContent = step.bitmaskBefore === null ? '—' : formatBitmask(step.bitmaskBefore);
      refs.bitmaskAfter.textContent = formatBitmask(step.bitmask);
      refs.bitmaskSelected.textContent = String(selectedIndex);
      refs.bitmaskCheck.textContent = step.bitmaskCheck === null ? '—' : String(step.bitmaskCheck);
      refs.bitmaskExpression.textContent = step.bitmaskExpression || '아직 연산하지 않았다.';
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
      const isHash = kind === 'hash';
      const isGraph = kind === 'graph';
      const isLis = kind === 'lis';
      const isDijkstra = kind === 'dijkstra';
      const isBitmask = kind === 'bitmask';
      refs.arrayWrap.hidden = !isBinary;
      refs.bucketsWrap.hidden = !isHash;
      refs.graphWrap.hidden = !isGraph;
      refs.lisWrap.hidden = !isLis;
      refs.dijkstraWrap.hidden = !isDijkstra;
      refs.bitmaskWrap.hidden = !isBitmask;
      refs.modes.hidden = !isGraph && !isLis;
      if (isBinary) {
        renderArray(step);
      } else if (isHash) {
        renderBuckets(step);
      } else if (isGraph) {
        renderGraph(step);
      } else if (isLis) {
        renderLis(step);
      } else if (isDijkstra) {
        renderDijkstra(step);
      } else if (isBitmask) {
        renderBitmask(step);
      }
      renderDetails(step);
    };

    const moveTo = (stepIndex) => {
      currentStep = Math.min(Math.max(stepIndex, 0), steps.length - 1);
      render();
    };

    refs.previous.addEventListener('click', () => moveTo(currentStep - 1));
    refs.reset.addEventListener('click', () => {
      if (kind === 'bitmask') {
        steps = createBitmaskSteps();
        currentStep = 0;
        lockLayout();
        return;
      }
      moveTo(0);
    });
    refs.next.addEventListener('click', () => moveTo(currentStep + 1));

    const updateModeButtons = () => {
      refs.modeButtons.forEach((button) => {
        const isActive = button.dataset.algorithmMode === activeMode;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', String(isActive));
      });
    };

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

    const appendBitmaskOperation = (operation) => {
      const index = Number(refs.bitmaskIndex.value);
      const currentMask = steps[currentStep].bitmask;
      const result = bitmaskOperationInfo(currentMask, index, operation);
      const operationLabels = {
        add: '비트 추가',
        remove: '비트 삭제',
        check: '비트 확인',
        toggle: '비트 반전',
        clear: '전체 상태 초기화'
      };
      const nextStep = createBitmaskStep({
        status: operation === 'check' ? 'compare' : 'result',
        title: operationLabels[operation],
        description: `${result.reason} ${formatBitmask(currentMask)}에서 ${formatBitmask(result.after)}로 표시된다.`,
        bitmask: result.after,
        bitmaskBefore: result.before,
        bitmaskIndex: index,
        bitmaskOperation: operation,
        bitmaskExpression: result.expression,
        bitmaskReason: result.reason,
        bitmaskChanged: result.changed,
        bitmaskCheck: result.check,
        result: operation === 'check' ? `포함 여부 · ${result.check}` : `mask · ${formatBitmask(result.after)}`,
        details: [
          detail('선택 인덱스', index),
          detail('연산 전', `${formatBitmask(result.before)} (${result.before})`),
          detail('연산 후', `${formatBitmask(result.after)} (${result.after})`),
          detail('처리 이유', result.reason)
        ]
      });
      steps = steps.slice(0, currentStep + 1);
      steps.push(nextStep);
      currentStep = steps.length - 1;
      lockLayout();
    };

    refs.bitmaskOperations.forEach((button) => {
      button.addEventListener('click', () => appendBitmaskOperation(button.dataset.bitmaskOperation));
    });
    if (refs.bitmaskIndex) {
      refs.bitmaskIndex.addEventListener('change', () => render());
    }

    refs.modeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextMode = button.dataset.algorithmMode;
        if (nextMode === activeMode) {
          return;
        }
        activeMode = nextMode;
        root.dataset.algorithmMode = activeMode;
        steps = createSteps(kind, values, activeMode);
        currentStep = 0;
        updateModeButtons();
        lockLayout();
      });
    });

    root.dataset.algorithmInitialized = 'true';
    updateModeButtons();
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
