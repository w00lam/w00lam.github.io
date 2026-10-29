---
title: "TLS Handshake와 Load Balancing — 통신은 어떻게 보호하고 요청은 어떻게 분산할까?"
date: 2026-10-29
categories: [TIL, Backend, Network, Java]
tags: [Java, Spring Boot, Network, TLS, HTTPS, Load Balancing, TIL]
permalink: /posts/tls-handshake-load-balancing/
---

어제 HTTP와 HTTPS를 정리하면서 HTTPS가 TLS로 HTTP 통신을 보호한다는 점을 확인했다. 오늘은 보호된 통신이 시작되기 전 클라이언트와 서버가 어떤 준비를 거치는지 살펴봤다. TLS 연결을 준비하는 핸드셰이크를 정리한 다음에는 한 서버에 요청이 몰리지 않게 여러 인스턴스로 나누는 로드 밸런싱으로 넘어갔다. TLS가 보안 설정과 키를 마련하는 과정이라면 로드 밸런싱은 요청을 보낼 서버를 선택하는 과정이었다.

## TLS Handshake가 필요한 이유

처음에는 TLS 핸드셰이크가 없으면 보안 협의가 되지 않아 통신이 안전하지 않다는 정도로만 생각했다. 다시 살펴보니 연결에 사용할 TLS 버전과 암호 방식을 합의하고 서버를 인증하며 데이터를 보호할 키까지 설정하는 과정이었다. 이 준비가 끝나야 애플리케이션 데이터에 적용할 보안 설정이 정해진다.

클라이언트는 `ClientHello`에서 자신이 지원하는 버전과 암호 방식 같은 설정을 제안한다. 서버는 `ServerHello`에서 그중 실제로 사용할 설정을 고른다. 두 메시지는 사용할 규칙을 맞추는 공통 출발점이지만 키 교환 정보가 오가는 방식은 TLS 버전에 따라 달라진다.

서버가 보낸 인증서로 클라이언트는 신뢰 경로와 접속한 서버 이름 등을 확인한다. 이를 통해 서버의 신원과 공개키를 연결한다. 인증서가 애플리케이션 데이터를 직접 암호화하는 것은 아니다. 키 합의와 버전별 키 스케줄을 거쳐 만든 대칭키가 핸드셰이크 이후의 애플리케이션 데이터를 보호한다.

## TLS 1.2 ECDHE 예시

TLS 1.2에서 ECDHE를 사용하는 예시로 메시지 흐름을 정리했다. 클라이언트는 `ClientHello`로 지원 설정과 클라이언트 난수를 보낸다. 서버는 `ServerHello`에서 사용할 버전과 암호 방식을 선택하고 서버 난수를 보낸다.

서버는 `Certificate`와 함께 `ServerKeyExchange`를 보낸다. 이 메시지에는 서버의 임시 ECDHE 공개 정보가 들어간다. 서버는 인증서의 개인키로 이 정보에 서명해 자신이 보낸 키 교환 정보임을 증명한다. 클라이언트는 인증서를 검증한 뒤 `ClientKeyExchange`로 자신의 임시 ECDHE 공개 정보를 보낸다. 공유 비밀값 자체는 네트워크로 보내지 않는다. 양쪽이 공개 정보와 각자 가진 임시 개인 정보를 이용해 같은 값을 계산한다.

공유 비밀값을 그대로 애플리케이션 데이터 암호화 키로 쓰지는 않는다. TLS 1.2에서는 공유 비밀값인 `pre_master_secret`과 `ClientHello`·`ServerHello`의 양쪽 난수를 함께 사용해 `master_secret`을 만든다. 여기서 클라이언트와 서버 방향의 통신 키를 다시 파생한다. `master_secret`은 TLS 1.2 자료와 RFC 5246에서 사용한 명칭이다. TLS 1.3은 RFC 9846의 HKDF 키 스케줄과 그 안에서 구분되는 키 재료로 설명한다. 그러므로 두 버전의 용어를 그대로 섞어 쓰면 안 된다.

이후 TLS 1.2에서는 `ChangeCipherSpec`으로 새 보안 설정을 활성화한 뒤 `Finished`를 교환한다. 양쪽이 이를 확인하면 파생한 대칭키로 애플리케이션 데이터를 보호한다. 이 예시에서 기억할 부분은 `ServerKeyExchange`와 `ClientKeyExchange`로 임시 키 교환 정보를 주고받고 양쪽 난수와 함께 키 재료를 만든다는 점이다.

## TLS 1.3 인증서 기반 흐름

TLS 1.3에서는 키 교환 정보가 별도의 `ServerKeyExchange`와 `ClientKeyExchange` 메시지로 나타나지 않는다. 클라이언트는 `ClientHello`의 `supported_versions`로 지원 버전을 제시하고 암호 방식과 `key_share`를 함께 보낼 수 있다. 서버는 `ServerHello`에서 버전과 암호 방식을 선택한 뒤 자신의 `key_share`를 보낸다. 양쪽은 이 키 공유 정보로 공유 비밀값을 계산한다.

TLS 1.3은 이 공유 비밀값을 HKDF 키 스케줄에 넣어 먼저 핸드셰이크 트래픽 키를 파생한다. 서버는 이 키로 보호한 `EncryptedExtensions`, `Certificate`, `CertificateVerify`, `Finished`를 보낸다. 클라이언트는 인증서의 신뢰 경로와 서버 이름을 검증한 뒤 `CertificateVerify` 서명도 확인한다. `CertificateVerify`는 서버가 인증서에 대응하는 개인키를 실제로 보유했음을 핸드셰이크 내용에 대한 서명으로 증명하는 메시지다.

`Finished`의 역할은 다르다. 지금까지의 핸드셰이크 메시지가 바뀌지 않았는지 확인하고 양쪽이 같은 키 재료로 진행했는지 확인한다. 클라이언트도 자신의 `Finished`를 보내 확인을 마치면 HKDF 키 스케줄에서 애플리케이션 데이터용 트래픽 키를 파생한다. 이후 그 대칭키로 데이터를 보호한다. 인증서는 서버 인증에 쓰이고 `CertificateVerify`는 개인키 보유를 증명하며 `Finished`는 핸드셰이크 무결성과 키 설정을 확인한다는 점을 나누어야 했다.

TLS 1.2 ECDHE와 TLS 1.3 인증서 기반 흐름을 나란히 놓으면 메시지와 키 파생 방식이 서로 다르다는 점이 더 분명해진다.

![TLS 1.2 ECDHE와 TLS 1.3 인증서 기반 핸드셰이크 흐름 비교](/assets/images/2026-10-29-tls-load-balancing/tls-handshake-comparison.svg)

*그림 1. TLS 1.2 ECDHE와 TLS 1.3 인증서 기반 핸드셰이크 흐름은 메시지와 키 파생 방식이 다르다.*

## Load Balancing이 필요한 이유

로드 밸런서는 클라이언트 요청을 받아 여러 서버 인스턴스 중 하나로 전달한다. 서버가 하나뿐이면 요청이 몰릴 때 전체 서비스가 그 서버의 처리 능력에 묶인다. 요청을 여러 인스턴스로 나누면 특정 서버에 부하가 집중되는 상황을 줄이고 여러 인스턴스의 처리 능력을 함께 사용할 수 있다.

L4와 L7의 차이는 단순한 속도 차이가 아니라 요청을 분산할 때 참고하는 정보의 차이다. L4 로드 밸런싱은 IP 주소와 포트, TCP·UDP 연결 정보처럼 전송 계층에서 확인할 수 있는 정보를 기준으로 삼는다. L7 로드 밸런싱은 HTTP 호스트명과 경로, 헤더처럼 애플리케이션 계층의 요청 정보를 활용한다. 예를 들어 `/api`와 `/admin`처럼 HTTP 경로에 따라 다른 대상 그룹으로 보내려면 L7의 판단 기준이 필요하다.

Spring Boot 인스턴스가 여러 대라면 클라이언트와 인스턴스 사이에 로드 밸런서를 둘 수 있다. 로드 밸런서는 정상 상태의 인스턴스 중 하나로 요청을 전달한다. 각 인스턴스는 공용 데이터베이스에서 사용자나 주문 같은 영속 데이터를 읽고 쓴다. 로드 밸런서의 선택 기준과 인스턴스가 공유하는 데이터는 별개의 문제다.

![로드 밸런서와 Spring Boot 인스턴스의 요청 분산 구조](/assets/images/2026-10-29-tls-load-balancing/load-balancing-architecture.svg)

*그림 2. 로드 밸런서는 계층별 기준으로 요청을 분산하고 비정상 인스턴스를 분배 대상에서 제외한다.*

## 요청을 나누는 알고리즘

Round Robin은 서버를 순서대로 선택한다. 서버가 A, B, C 순서라면 요청은 A, B, C, A, B로 이어지고 다섯 번째 요청은 B로 간다. 서버의 처리 능력과 요청 처리 시간이 비슷할 때 적용하기 쉬운 기본 방식이다.

Weighted Round Robin은 서버별 가중치로 요청 비율을 조절한다. A의 처리 능력이 B보다 크다면 A에 더 높은 가중치를 준다. 예를 들어 A의 가중치가 3이고 B의 가중치가 1이면 장기적으로 A에 더 많은 요청이 가도록 분배한다.

Least Connections는 현재 활성 연결이 가장 적은 서버를 고른다. A에 활성 연결이 4개이고 B에 1개라면 새 요청을 B로 보낸다. 연결마다 처리 시간이 크게 다를 때 오래 걸리는 요청을 많이 가진 서버에 새 요청이 계속 쌓이는 상황을 줄이는 데 참고할 수 있다. 다만 연결 수가 CPU 사용량이나 남은 자원을 정확히 뜻하지는 않는다. 연결 수가 적은 서버를 항상 가장 여유로운 서버라고 단정할 수 없는 이유다.

IP Hash는 클라이언트의 출발지 IP를 기준으로 서버를 선택한다. 같은 IP의 요청이 같은 서버로 갈 수 있어 특정 클라이언트의 요청을 한 서버에 계속 보내는 성질을 활용할 수 있다. 하지만 같은 공인 IP 뒤에 여러 사용자가 있으면 그 IP에 요청이 몰릴 수 있다. IP Hash가 서버 사이에서 세션 데이터 자체를 복제하거나 공유하는 것은 아니다.

## 헬스 체크와 세션 처리

헬스 체크는 인스턴스가 요청을 처리할 수 있는 상태인지 확인하는 절차다. 비정상으로 판단된 인스턴스는 새 요청의 분배 대상에서 제외한다. 이후 정상 상태가 다시 확인되면 분배 대상에 포함할 수 있다. 인스턴스 하나에 문제가 생겨도 로드 밸런서가 확인된 정상 인스턴스로 새 요청을 보내는 이유다.

Sticky Session은 같은 사용자의 요청을 같은 서버로 보내는 방식이다. 로컬 세션을 사용하는 애플리케이션에서 요청이 다른 서버로 이동해 세션을 찾지 못하는 문제를 줄이지만 로컬 세션을 다른 서버에 복제하지는 않는다. 계속 요청을 받던 서버가 장애를 일으키면 다른 서버에서 기존 세션을 읽지 못할 수 있다. 특정 서버에 사용자가 몰려 부하가 균형을 잃을 가능성도 있다.

여러 인스턴스가 같은 세션을 읽어야 한다면 Redis 같은 공용 세션 저장소를 사용할 수 있다. 이 구조에서는 세션을 한 서버의 메모리에만 두지 않고 여러 인스턴스가 접근할 수 있는 저장소에 둔다. Sticky Session과 서버 간 세션 공유를 구분하는 내용은 [세션 인증은 서버가 여러 대가 되면 어떻게 동작할까?](https://w00lam.github.io/posts/session-auth-multi-server/)에서 정리한 흐름과도 이어진다.

## 오늘의 정리

처음에는 TLS 핸드셰이크를 막연한 보안 협의로만 생각했지만 실제로는 설정 합의, 서버 인증, 키 설정을 함께 수행하는 과정이라는 점을 구분했다. TLS 1.2의 `ServerKeyExchange`·`ClientKeyExchange`와 `master_secret`은 그 버전의 예시이고 TLS 1.3은 `key_share`와 HKDF 키 스케줄로 설명해야 했다. 인증서는 애플리케이션 데이터를 암호화하는 객체가 아니라 서버 신원과 공개키를 연결하며 파생된 대칭키가 실제 데이터를 보호한다. 로드 밸런싱도 단순히 요청을 빠르게 보내는 기능이 아니라 L4·L7에서 참고하는 정보와 선택 알고리즘에 따라 정상 인스턴스를 고르는 과정으로 정리했다.

### 참고 자료 (Sources)

* **오늘의 학습 페이지:** [TLS / SSL Handshake](https://app.notion.com/p/3e2a108cd60281f8a9edd407ce96402e) — TLS 핸드셰이크의 목적과 TLS 1.2·TLS 1.3의 메시지 및 키 파생 범위를 확인할 때 활용했다.
* **오늘의 학습 페이지:** [Load Balancing](https://app.notion.com/p/3e2a108cd602819fbd66ec40dfa13f5a) — L4·L7의 분산 기준과 알고리즘, 헬스 체크, 세션 처리 범위를 확인할 때 활용했다.
* **IETF RFC 9846, The Transport Layer Security (TLS) Protocol Version 1.3:** [RFC 9846](https://www.rfc-editor.org/rfc/rfc9846.html) — 현재 TLS 1.3 표준을 기준으로 `key_share`, `CertificateVerify`, `Finished`, HKDF 키 스케줄을 확인했다. 이 RFC는 RFC 8446과 RFC 5246을 대체한다.
* **IETF RFC 5246, The Transport Layer Security (TLS) Protocol Version 1.2:** [RFC 5246](https://www.rfc-editor.org/rfc/rfc5246.html) — 현재 표준으로 소개하지 않고 TLS 1.2 ECDHE 예시의 `ServerKeyExchange`, `ClientKeyExchange`, `master_secret` 흐름을 확인하는 보조 자료로 활용했다.
* **NGINX:** [Using nginx as HTTP load balancer](https://nginx.org/en/docs/http/load_balancing.html) — Round Robin, Least Connections, IP Hash, 가중치와 헬스 체크 동작을 확인했다.
* **AWS:** [What is an Application Load Balancer?](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html) — L7 라우팅과 정상 대상에만 트래픽을 보내는 헬스 체크를 확인했다.
* **AWS:** [What is a Network Load Balancer?](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html) — L4 로드 밸런싱과 헬스 체크를 확인했다.
