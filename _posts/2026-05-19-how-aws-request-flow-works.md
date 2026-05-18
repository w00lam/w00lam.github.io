---
title: "사용자의 요청은 AWS 내부에서 어떻게 처리될까?"
subtitle: "전체 요청 흐름 한눈에 보기"
date: 2026-05-19
categories: [Cloud, AWS, Network, Infrastructure]
tags: [AWS, VPC, ALB, EC2, RDS, Subnet, SecurityGroup, RouteTable, Network, TIL]
permalink: /posts/how-aws-request-flow-works/
---

## 들어가면서

클라우드 환경에서 애플리케이션을 운영한다는 것은 단순히 코드를 배포하는 것을 넘어, 사용자의 요청이 서비스에 도달하기까지의 복잡한 네트워크 흐름과 인프라 구성 요소를 이해하는 것을 의미한다. 특히 AWS와 같은 클라우드 플랫폼에서는 다양한 서비스들이 유기적으로 연결되어 작동하며, 이 과정에서 발생하는 문제들은 종종 네트워크 설정 오류에서 비롯되곤 한다.

이 글에서는 사용자의 요청이 AWS 내부에서 어떻게 처리되는지 전체적인 흐름을 살펴보고, 이 과정에서 핵심적인 역할을 하는 ALB, EC2, RDS와 같은 서비스들이 왜 분리되어야 하는지, 그리고 Public/Private Subnet, Route Table, Security Group과 같은 네트워크 구성 요소들이 어떤 역할을 하는지 알아본다. 또한, 실제 운영 환경에서 겪었던 설정 실수와 그로부터 배운 점들을 공유하며 클라우드 네트워크에 대한 이해를 돕고자 한다.

### 이 글의 목표

*   사용자의 요청이 AWS 내부에서 처리되는 전체적인 흐름을 이해한다.
*   ALB, EC2, RDS 등 주요 AWS 서비스의 역할과 책임 분리 원칙을 설명할 수 있다.
*   Public Subnet과 Private Subnet의 차이 및 활용 목적을 이해한다.
*   Route Table과 Security Group의 기능적 차이를 명확히 구분한다.
*   실제 설정 실수를 통해 클라우드 네트워크 구성의 중요성을 체감한다.

---

## 1. 문제 제기: `docker run`만으로 운영 가능할까?

컨테이너는 애플리케이션 실행의 표준을 제시했지만, 실제 서비스 운영 환경에서는 컨테이너를 둘러싼 네트워크 환경과 인프라 구성이 매우 중요하다. 사용자의 요청이 컨테이너화된 애플리케이션에 안전하고 효율적으로 도달하려면 어떤 과정들을 거쳐야 할까?

## 2. 전체 요청 흐름 한눈에 보기: 사용자 → ALB → EC2 → RDS

일반적인 웹 서비스 아키텍처에서 사용자의 요청은 다음과 같은 흐름으로 AWS 내부에서 처리된다.

1.  **사용자**: 웹 브라우저나 모바일 앱을 통해 서비스에 요청을 보낸다.
2.  **ALB (Application Load Balancer)**: 외부로부터의 요청을 받아 여러 EC2 인스턴스에 분산한다. 로드 밸런싱, SSL/TLS 종료, 헬스 체크 등의 역할을 수행한다.
3.  **EC2 (Elastic Compute Cloud)**: 애플리케이션 서버가 실행되는 가상 서버이다. 컨테이너화된 애플리케이션이 이 위에서 동작하며, 사용자의 요청을 처리한다.
4.  **RDS (Relational Database Service)**: 애플리케이션에서 필요한 데이터를 저장하고 관리하는 데이터베이스 서비스이다.

이러한 흐름 속에서 각 서비스는 명확한 역할과 책임을 가지며, 서로 유기적으로 연결되어 작동한다.

![AWS 요청 흐름 및 VPC 구조](/assets/images/2026-05-19-posting/aws-request-flow-vpc.png)


## 3. ALB, EC2, RDS는 왜 분리될까? 각 서비스의 역할과 책임

각 서비스가 분리되어 존재하는 것은 **단일 책임 원칙(Single Responsibility Principle)**과 **관심사의 분리(Separation of Concerns)**를 클라우드 인프라에 적용한 결과이다.

*   **ALB**: 트래픽 분산 및 라우팅, 헬스 체크, SSL/TLS 처리 등 **네트워크 트래픽 관리**에 특화되어 있다.
*   **EC2**: 애플리케이션 코드 실행, 비즈니스 로직 처리 등 **컴퓨팅 자원 제공 및 애플리케이션 실행**에 집중한다.
*   **RDS**: 데이터 저장, 관리, 백업, 복구 등 **데이터베이스 관리**에 특화되어 있다.

이러한 분리를 통해 각 서비스는 자신의 역할에만 집중할 수 있으며, 이는 확장성, 안정성, 보안성을 높이는 데 기여한다.

## 4. Public Subnet과 Private Subnet의 차이: 왜 ALB는 바깥, EC2/RDS는 안쪽에 두는가?

AWS VPC(Virtual Private Cloud)는 가상 네트워크 환경을 제공하며, 이 안에서 서브넷(Subnet)을 통해 네트워크를 논리적으로 분할한다. 서브넷은 크게 Public Subnet과 Private Subnet으로 나뉜다.

*   **Public Subnet**: 인터넷 게이트웨이(Internet Gateway)와 연결되어 있어 외부 인터넷과의 통신이 가능하다. 주로 ALB와 같이 외부 요청을 직접 받아야 하는 서비스들이 위치한다.
*   **Private Subnet**: 인터넷 게이트웨이와 직접 연결되어 있지 않아 외부 인터넷과의 통신이 불가능하다. NAT Gateway를 통해서만 외부로 나갈 수 있다. 보안이 중요한 EC2 인스턴스(애플리케이션 서버)나 RDS(데이터베이스)는 Private Subnet에 배치하여 외부로부터의 직접적인 접근을 차단한다.

이러한 구조는 **최소 권한 원칙(Principle of Least Privilege)**을 따르며, 외부에 노출될 필요가 없는 자원들을 보호하여 전체 시스템의 보안을 강화한다.

## 5. Route Table과 Security Group은 무엇이 다를까? 길 안내 vs 출입 통제

클라우드 네트워크에서 트래픽의 흐름을 제어하는 두 가지 핵심 요소는 Route Table과 Security Group이다.

*   **Route Table (길 안내)**: 서브넷에 연결되어 트래픽이 목적지(IP 주소 범위)로 가기 위해 어떤 경로(게이트웨이, 네트워크 인터페이스 등)를 거쳐야 하는지 정의한다. 즉, **트래픽의 경로를 결정**한다.
    *   예: Public Subnet의 Route Table은 인터넷 게이트웨이로 향하는 경로를 포함한다.
*   **Security Group (출입 통제)**: 인스턴스(EC2, RDS 등)에 연결되어 해당 인스턴스로 들어오고 나가는 트래픽을 허용하거나 차단하는 **방화벽 역할**을 한다. IP 주소, 포트, 프로토콜 등을 기반으로 규칙을 설정한다.
    *   예: EC2 인스턴스의 Security Group은 ALB로부터의 HTTP/HTTPS 트래픽만 허용하고, RDS의 Security Group은 EC2로부터의 DB 포트 트래픽만 허용한다.

간단히 말해, Route Table은 
트래픽이 어디로 가야 할지 길을 알려주는 내비게이션이라면, Security Group은 그 길을 따라온 트래픽이 특정 목적지(인스턴스)에 들어올 수 있는지 검사하는 문지기 역할을 한다.

## 6. 직접 겪은 설정 실수와 배운 점

이전 포스트 [실전 클라우드 배포와 운영: 내가 마주한 기술적 고민과 해결책](/posts/cloud-deployment-troubleshooting/)에서 다뤘던 트러블슈팅 사례들은 대부분 AWS 네트워크 설정에 대한 이해 부족에서 비롯되었다. 실제 운영 환경에서 다음과 같은 실수들을 통해 많은 것을 배울 수 있었다.

*   **헬스체크 실패**: ALB 헬스체크가 실패하여 대상 그룹이 `Unhealthy` 상태가 되는 문제는 주로 EC2 인스턴스가 RDS에 연결하지 못해 애플리케이션이 정상적으로 부팅되지 않았기 때문이었다. 이는 EC2와 RDS 간의 Security Group 설정 오류로 인해 DB 포트(예: 3306) 통신이 차단되었기 때문이다. 단순히 애플리케이션 문제로만 생각하기보다, 네트워크 보안 그룹 설정을 먼저 확인해야 함을 깨달았다.
*   **보안 그룹 실수**: 특정 포트만 열어야 하는 상황에서 너무 광범위하게 포트를 열어두거나, 필요한 포트를 닫아두어 통신이 안 되는 경우가 있었다. 특히 인스턴스 간 통신 시 발신(Outbound) 규칙과 수신(Inbound) 규칙을 양방향으로 정확히 설정해야 함을 배웠다. Security Group은 최소 권한 원칙에 따라 필요한 통신만 허용하도록 세밀하게 설정해야 한다.

이러한 경험들은 AWS 네트워크 구성이 단순히 설정값을 입력하는 것을 넘어, 시스템 전체의 보안과 안정성에 직결되는 중요한 요소임을 일깨워주었다.

---

## 마무리 정리

사용자의 요청이 AWS 내부에서 처리되는 과정은 ALB, EC2, RDS와 같은 서비스들의 유기적인 협력과 Public/Private Subnet, Route Table, Security Group과 같은 네트워크 구성 요소들의 정교한 설정에 의해 이루어진다. 각 서비스의 역할과 책임, 그리고 네트워크 구성 요소들의 기능을 명확히 이해하는 것은 안정적이고 보안성 높은 클라우드 환경을 구축하는 데 필수적이다.

클라우드 환경에서의 문제 해결은 종종 애플리케이션 코드보다는 인프라와 네트워크 설정에서 답을 찾아야 할 때가 많다. 이번 글을 통해 AWS 내부의 요청 처리 흐름과 네트워크 구성 요소들에 대한 이해를 높이고, 실제 운영 환경에서의 트러블슈팅에 도움이 되기를 바란다.

---

## References

*   [What is an Application Load Balancer? - AWS Documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html)
*   [What is Amazon EC2? - AWS Documentation](https://docs.aws.amazon.com/ec2/latest/userguide/what-is-amazon-ec2.html)
*   [What is Amazon RDS? - AWS Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html)
*   [VPCs and subnets - AWS Documentation](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Subnets.html)
*   [Route tables - AWS Documentation](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html)
*   [Security groups for your VPC - AWS Documentation](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html)

