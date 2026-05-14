---
title: "컨테이너는 어떻게 격리될까?"
subtitle: "Linux Namespace와 Cgroup 이해하기"
date: 2026-05-13
categories: [Infrastructure, Docker]
tags: [Container, Docker, Linux, Namespace, Cgroup, Isolation, TIL]
permalink: /posts/container-isolation/
---

## 들어가면서

이전 포스트인 [VM과 컨테이너는 무엇이 다를까?](/posts/vm-container-diff/)에서 컨테이너가 VM보다 가볍고 빠르게 동작하는 이유를 구조적 차이에서 살펴보았다. 컨테이너는 호스트 OS의 커널을 공유하면서도 독립적인 실행 환경을 제공하는데, 이때 핵심적인 역할을 하는 것이 바로 **Linux Namespace**와 **Cgroup**이다.

"컨테이너는 OS를 새로 띄우지 않는데 어떻게 이렇게 완벽하게 분리된 것처럼 보일까?" 

이번 글에서는 이 질문에 답하며 컨테이너 격리의 실제 동작 원리를 깊이 있게 파헤쳐 보고자 한다.

### 이 글의 목표

*   컨테이너 격리의 실제 동작 원리를 이해한다.
*   `namespace`와 `cgroup`의 역할을 설명할 수 있다.

---

![컨테이너 격리: Namespace와 Cgroup](/assets/images/2026-05-13-posting/container-isolation-namespace-cgroup.png)

## 1. 문제 제기: 컨테이너는 어떻게 독립성을 얻을까?

컨테이너를 실행하면 마치 독립된 운영체제처럼 보이지만, 실제로는 호스트 OS의 커널을 공유한다. 그렇다면 어떻게 컨테이너 내부의 프로세스는 자기 자신만 보이고, 독립적인 네트워크 주소를 가지며, 파일 시스템도 분리되어 보일까? 이 모든 마법은 리눅스 커널의 두 가지 핵심 기술, `Namespace`와 `Cgroup` 덕분이다.

---

## 2. Namespace란? "보이는 세상"을 분리하다

`Namespace`는 리눅스 커널의 기능으로, 프로세스가 볼 수 있는 시스템 자원(프로세스 ID, 네트워크 인터페이스, 마운트 포인트 등)을 격리하는 역할을 한다. 즉, 각 컨테이너는 자신만의 `namespace` 안에서 동작하며, 마치 자신만이 시스템의 유일한 사용자이자 관리자인 것처럼 인식하게 된다.

### Namespace 개념 설명

`namespace`는 프로세스 그룹에 대해 전역 시스템 리소스의 추상화된 뷰를 제공한다. 예를 들어, PID `namespace`는 각 `namespace` 내에서 0부터 시작하는 독립적인 PID 공간을 제공하여, 컨테이너 내부에서는 호스트의 다른 프로세스들을 볼 수 없게 만든다.

---

## 3. 주요 Namespace 살펴보기

리눅스에는 여러 종류의 `namespace`가 있으며, 컨테이너는 이들을 조합하여 격리된 환경을 구축한다.

*   **PID namespace (Process ID):**
    *   **프로세스 격리:** 각 `PID namespace`는 독립적인 프로세스 ID 공간을 가진다. 컨테이너 내부의 `init` 프로세스는 PID 1을 가지며, 컨테이너 안에서는 호스트의 다른 프로세스들을 볼 수 없다.
    *   **컨테이너 안에서는 자기 프로세스만 보임:** `ps aux`와 같은 명령어를 실행하면 컨테이너 내부에서 실행 중인 프로세스만 나타난다.

*   **NET namespace (Network):**
    *   **네트워크 인터페이스 분리:** 각 `NET namespace`는 독립적인 네트워크 스택(네트워크 인터페이스, 라우팅 테이블, IP 주소, 포트 등)을 가진다. 이는 컨테이너가 독립된 네트워크처럼 보이는 이유이다.
    *   **독립된 네트워크처럼 보이는 이유:** 컨테이너는 자신만의 가상 네트워크 인터페이스를 통해 통신하며, 호스트의 네트워크 설정과 분리된다.

*   **MNT namespace (Mount):**
    *   **파일 시스템 view 분리:** 각 `MNT namespace`는 독립적인 파일 시스템 마운트 포인트를 가진다. 이를 통해 컨테이너는 자신만의 루트 파일 시스템을 가지며, 호스트의 파일 시스템에 직접 접근할 수 없다.

*   **UTS namespace (UNIX Time-sharing System):**
    *   **hostname 분리:** 각 `UTS namespace`는 독립적인 호스트 이름(hostname)과 도메인 이름을 가진다. 컨테이너마다 고유한 호스트 이름을 설정할 수 있다.

---

## 4. Cgroup이란? "자원 제한" 기능

`Cgroup (Control Group)`은 리눅스 커널의 또 다른 기능으로, 프로세스 그룹이 사용할 수 있는 시스템 자원(CPU, 메모리, I/O 등)을 제한하고 할당하는 역할을 한다. `namespace`가 "무엇을 볼 수 있는가"를 제어한다면, `cgroup`은 "얼마나 사용할 수 있는가"를 제어한다.

### 자원 제한 기능

`cgroup`은 특정 프로세스 그룹이 과도하게 시스템 자원을 사용하는 것을 방지하여, 호스트 시스템의 안정성을 유지하고 다른 컨테이너에 미치는 영향을 최소화한다.

---

## 5. 제한 가능한 자원

`cgroup`을 통해 다양한 시스템 자원을 제한할 수 있다.

*   **CPU:** 특정 컨테이너가 사용할 수 있는 CPU 시간의 비율이나 코어 수를 제한한다.
*   **Memory:** 컨테이너가 사용할 수 있는 메모리 양을 제한한다.
*   **I/O:** 디스크 읽기/쓰기 대역폭을 제한한다.
*   **Process Count:** 컨테이너 내에서 생성할 수 있는 프로세스의 최대 개수를 제한한다.

### Docker 예시

Docker는 `cgroup`을 활용하여 컨테이너의 자원을 제어한다.

*   `docker run --memory=128m`: 해당 컨테이너의 메모리 사용량을 128MB로 제한한다.
*   `docker run --cpus=0.5`: 해당 컨테이너가 0.5개의 CPU 코어만큼의 CPU 시간을 사용할 수 있도록 제한한다.

---

## 6. Namespace만으로 부족한 이유

`namespace`는 프로세스에게 독립적인 "시야"를 제공하여 격리된 환경처럼 보이게 하지만, 자원 사용량에 대한 통제는 제공하지 않는다. 예를 들어, `PID namespace`로 프로세스 목록을 격리해도, 컨테이너 내부의 프로세스가 무한 루프에 빠져 CPU를 100% 점유한다면 호스트 시스템 전체에 영향을 미칠 수 있다.

*   **보이기만 분리됨:** `namespace`는 논리적인 격리를 제공할 뿐, 물리적인 자원 사용을 제한하지 않는다.
*   **자원 제한 필요:** 따라서 `cgroup`을 통해 각 컨테이너가 사용할 수 있는 자원을 명확히 제한함으로써, 컨테이너 간의 간섭을 막고 호스트 시스템의 안정성을 보장해야 한다.

---

## 마무리 정리

컨테이너는 `namespace`와 `cgroup`이라는 리눅스 커널의 강력한 두 가지 기술을 활용하여 독립적인 실행 환경을 구축한다.

*   **`namespace`는 "시야"를 분리하고, `cgroup`은 "자원 사용량"을 제한한다.**
*   이를 통해 컨테이너는 호스트 OS의 커널을 공유하면서도, 마치 독립된 VM처럼 동작하는 효율적인 격리 환경을 제공한다.

결론적으로, 컨테이너는 VM처럼 하드웨어 전체를 가상화하는 것이 아니라, 호스트 OS의 기능을 활용하여 프로세스 수준에서 격리된 실행 환경을 제공하는 것이다. 이는 [VM과 컨테이너는 무엇이 다를까?](/posts/vm-container-diff/)에서 다루었던 "VM은 가상 컴퓨터, 컨테이너는 격리된 프로세스 실행 환경"이라는 정의를 더욱 명확하게 뒷받침한다.

---

## References

*   [Linux namespaces - Wikipedia](https://en.wikipedia.org/wiki/Linux_namespaces)
*   [cgroups - Wikipedia](https://en.wikipedia.org/wiki/Cgroups)
*   [Docker 공식 문서: Understand the key concepts of Docker](https://docs.docker.com/get-started/overview/#the-docker-engine)
*   [이전 포스트: VM과 컨테이너는 무엇이 다를까?](/posts/vm-container-diff/)
