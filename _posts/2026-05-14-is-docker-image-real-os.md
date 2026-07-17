---
title: "Docker 이미지는 정말 OS일까?"
subtitle: "Docker Image와 RootFS의 정체"
date: 2026-05-14
categories: [Infrastructure, Docker]
tags: [Docker, Image, Container, RootFS, OS, Kernel, Layer, TIL]
permalink: /posts/docker-image-not-os/
---

## 들어가면서

이전 포스트들에서 [VM과 컨테이너의 근본적인 차이](/posts/vm-container-diff/)와 [컨테이너가 어떻게 격리되는지](/posts/container-isolation/) 살펴보았다. 컨테이너는 호스트 OS의 커널을 공유하며 가볍게 동작한다고 했는데, 그렇다면 우리가 흔히 쓰는 `ubuntu`나 `alpine` 같은 Docker 이미지는 정말 운영체제(OS)일까?

많은 개발자가 Docker 이미지를 "작은 VM"이나 "OS가 통째로 들어있는 것"으로 오해하곤 한다. 이 글에서는 그 오해를 짚어보면서 Docker 이미지의 정체가 무엇인지, 이미지와 컨테이너가 어떻게 다른지 정리해본다.

### 이 글의 목표

*   Docker 이미지의 본질을 이해한다.
*   이미지와 컨테이너 차이를 설명할 수 있다.

---

![Docker 이미지 구조와 RootFS](/assets/images/2026-05-14-posting/docker-image-rootfs-layers.png)

## 1. Docker 이미지는 OS인가?

우리는 `docker run ubuntu` 같은 명령어로 컨테이너를 실행한다. 이때 쓰이는 `ubuntu` 이미지는 정말 Ubuntu OS 전체를 담고 있을까? 만약 그렇다면 컨테이너가 호스트 OS의 커널을 공유한다는 말과 모순되지 않을까?

이 질문에 답하려면 Docker 이미지의 구성 요소와 작동 방식을 하나씩 뜯어봐야 한다.

---

## 2. Docker Image란?

Docker 이미지는 컨테이너를 실행하는 데 필요한 모든 것을 담은 **읽기 전용(Read-Only) 템플릿**이다. 애플리케이션 코드, 런타임, 시스템 도구, 시스템 라이브러리, 설정 파일 등이 여기에 들어간다.

*   **읽기 전용 레이어:** Docker 이미지는 여러 개의 읽기 전용 레이어로 이뤄진다. 각 레이어는 `Dockerfile`의 명령(예: `RUN`, `COPY`)으로 만들어지고, 이전 레이어 위에 쌓이면서 변경 사항을 기록한다. 덕분에 이미지를 효율적으로 저장하고 재사용할 수 있다.
*   **실행 가능한 패키지:** 이미지는 특정 애플리케이션을 돌리는 데 필요한 모든 종속성을 갖춘, 그 자체로 실행 가능한 패키지다.

---

## 3. RootFS(Root File System)의 정체

Docker 이미지가 OS가 아니라면 `ubuntu` 이미지 안에는 무엇이 들어있을까? 바로 **RootFS(Root File System)**다. RootFS는 컨테이너가 시작될 때 `/` 디렉토리에 마운트되는 파일 시스템이다. 컨테이너 안에서 애플리케이션이 동작하는 데 필요한 파일과 디렉토리가 모두 여기에 담긴다.

*   `/bin`: 실행 가능한 바이너리 파일 (예: `ls`, `cat`)
*   `/lib`: 공유 라이브러리 파일
*   `/usr`: 사용자 프로그램 및 라이브러리
*   `package files`: 애플리케이션 및 그 종속성 파일

이 RootFS는 리눅스 배포판의 파일 시스템 구조와 비슷하지만, **커널은 포함하지 않는다.** 컨테이너는 이 RootFS를 바탕으로 호스트 OS의 커널 위에서 동작한다.

---

## 4. 왜 커널은 포함되지 않을까?

Docker 이미지가 커널을 포함하지 않는 가장 큰 이유는 컨테이너가 **호스트 OS의 커널을 공유**하기 때문이다.

*   **Host kernel 공유:** 컨테이너는 호스트 OS의 커널을 직접 써서 시스템 콜을 처리한다. [VM과 컨테이너는 무엇이 다를까?](/posts/vm-container-diff/)에서 설명했듯이, 컨테이너가 VM보다 가볍고 빠르게 동작하는 핵심 원리가 바로 이것이다.
*   **시스템 콜 흐름:** 컨테이너 안 애플리케이션이 시스템 콜을 호출하면, 이 요청은 컨테이너의 RootFS를 거쳐 호스트 OS의 커널로 곧장 전달된다. 별도의 Guest OS 커널을 거치지 않으니 이미지에 커널을 넣을 필요도 없다.

---

## 5. Image vs Container: 설계도와 실행 중인 프로세스

Docker에서 이미지(Image)와 컨테이너(Container)는 밀접하게 얽혀 있지만 엄연히 다른 개념이다.

| 구분      | Image (이미지)                                 | Container (컨테이너)                               |
| :-------- | :--------------------------------------------- | :------------------------------------------------- |
| **정의**  | 애플리케이션 실행에 필요한 모든 것을 담은 읽기 전용 템플릿 (설계도) | 이미지의 실행 가능한 인스턴스 (실행 중인 프로세스) |
| **상태**  | 정적(Static), 불변(Immutable)                  | 동적(Dynamic), 가변(Mutable)                       |
| **생성**  | `Dockerfile`을 통해 빌드                       | `docker run` 명령어로 이미지로부터 생성            |
| **구성**  | 여러 개의 읽기 전용 레이어 + RootFS            | 이미지 레이어 + 쓰기 가능한 컨테이너 레이어        |
| **커널**  | 포함하지 않음                                  | 호스트 OS의 커널 공유                              |

---

## 6. Dockerfile 이해하기: 이미지 빌드의 청사진

`Dockerfile`은 Docker 이미지를 빌드하는 명령어의 모음이다. 명령어 하나가 이미지의 레이어 하나를 만들고, 이렇게 애플리케이션 환경을 단계적으로 쌓아 올린다.

*   `FROM <base_image>`: 베이스 이미지를 지정한다. (예: `FROM ubuntu:22.04`)
*   `COPY <src> <dest>`: 호스트의 파일을 이미지로 복사한다.
*   `WORKDIR <path>`: 작업 디렉토리를 설정한다.
*   `RUN <command>`: 이미지를 빌드하는 동안 실행될 명령어를 지정한다. (예: 패키지 설치)
*   `ENTRYPOINT <command>`: 컨테이너가 시작될 때 실행될 기본 명령어를 지정한다.

---

## 7. JAR 배포와 이미지 배포 비교

Docker 이미지로 배포하면, 전통적인 JAR 파일 배포가 겪던 "내 컴퓨터에서는 되는데 서버에서는 안 돼요" 같은 환경 차이 문제를 크게 덜 수 있다.

*   **환경 차이 문제:** JAR 파일만 배포하면, 서버에 Java 런타임, 특정 라이브러리, OS 설정 등이 제대로 갖춰져 있지 않을 때 애플리케이션이 정상 동작하지 않는다.
*   **Java 버전 문제:** 개발 환경과 운영 환경의 Java 버전이 다르면 호환성 문제가 생긴다.
*   **실행 방식 포함:** Docker 이미지는 애플리케이션 코드뿐 아니라 런타임(예: OpenJDK), 필요한 라이브러리, 환경 변수, 심지어 애플리케이션 실행 명령어까지 모두 담는다. 그래서 어떤 환경에서든 똑같이 동작하는 이식성(Portability)을 확보한다.

---

## 8. 자주 하는 오해

### "Docker 이미지는 작은 VM이다?"

**아니다.** Docker 이미지는 VM처럼 OS 전체를 품지 않는다. 애플리케이션 실행에 필요한 RootFS와 메타데이터를 담을 뿐이다. VM은 하드웨어 가상화로 Guest OS를 통째로 넣지만, Docker 이미지는 호스트 OS의 커널을 공유한다.

### "Ubuntu 이미지면 Ubuntu OS 전체인가?"

**아니다.** `ubuntu` Docker 이미지에는 Ubuntu 배포판의 RootFS, 즉 `/bin`, `/lib`, `/usr` 같은 핵심 파일 시스템만 들어 있다. Ubuntu OS의 커널은 빠져 있고, 컨테이너는 호스트의 리눅스 커널을 쓴다. 그러니까 `ubuntu` 이미지가 주는 건 "Ubuntu 사용자 공간(Userland) 환경"이지 완전한 Ubuntu OS가 아니다.

---

## 마무리 정리

Docker 이미지는 컨테이너 기술의 핵심이고, 그 정체는 "커널 없는 실행 환경 패키지"에 가깝다.

*   Docker 이미지는 읽기 전용 RootFS와 메타데이터로 이뤄진 실행 가능한 패키지다.
*   커널은 포함하지 않고, 호스트 OS의 커널을 공유한다.
*   이미지는 컨테이너의 설계도이고, 컨테이너는 그 설계도대로 실행되는 프로세스다.

이 정도만 잡아둬도 Docker를 한결 수월하게 다룰 수 있고, "내 컴퓨터에서는 되는데 서버에서는 안 돼요" 같은 환경 문제도 훨씬 쉽게 풀 수 있다.

---

## References

*   [Docker 공식 문서: What is an image?](https://docs.docker.com/get-started/overview/#images)
*   [Docker 공식 문서: Dockerfile reference](https://docs.docker.com/engine/reference/builder/)
*   [이전 포스트: VM과 컨테이너는 무엇이 다를까?](/posts/vm-container-diff/)
*   [이전 포스트: 컨테이너는 어떻게 격리될까?](/posts/container-isolation/)
