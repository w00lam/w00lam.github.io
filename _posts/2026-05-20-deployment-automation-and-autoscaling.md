---
title: "배포 자동화와 오토스케일링은 어떻게 연결될까?"
subtitle: "CI/CD와 오토스케일링의 시너지"
date: 2026-05-20
categories: [DevOps, CI/CD, AWS, AutoScaling, Container]
tags: [CI, CD, DevOps, AWS, AutoScaling, ECR, ASG, LaunchTemplate, UserData, Docker, TIL]
permalink: /posts/deployment-automation-and-autoscaling/
---

## 들어가면서

이전 포스트 [왜 컨테이너만으로는 부족할까?](/posts/why-containers-are-not-enough/)에서 컨테이너 운영의 한계와 오케스트레이션의 필요성에 대해 다뤘다. 컨테이너 오케스트레이션은 수많은 컨테이너를 효율적으로 관리하고 운영하는 데 필수적이지만, 그 시작점에는 애플리케이션의 빌드부터 배포까지의 과정을 자동화하는 CI/CD(Continuous Integration/Continuous Delivery) 파이프라인이 존재한다. 특히 클라우드 환경에서 트래픽 변화에 유연하게 대응하기 위한 오토스케일링(Auto Scaling)과 배포 자동화는 떼려야 뗄 수 없는 관계이다.

이 글에서는 CI/CD의 기본 개념부터 AWS 환경에서 배포 자동화와 오토스케일링이 어떻게 유기적으로 연결되어 작동하는지 살펴본다. 또한, 실제 배포 과정에서 겪을 수 있는 문제점과 그 해결책을 공유하며 안정적인 서비스 운영을 위한 통찰을 제공하고자 한다.

### 이 글의 목표

*   CI(Continuous Integration)와 CD(Continuous Delivery/Deployment)의 차이를 명확히 이해한다.
*   일반적인 배포 자동화 흐름을 설명할 수 있다.
*   AWS Auto Scaling Group(ASG), Launch Template, User Data가 어떻게 연결되어 오토스케일링 환경에서 애플리케이션을 배포하는지 이해한다.
*   컨테이너 이미지 저장소(ECR)의 필요성을 설명할 수 있다.
*   자동 배포 과정에서 발생할 수 있는 실패 경험을 통해 핵심적인 배포 전략을 배운다.

---

## 1. CI와 CD는 무엇이 다를까? 검증 자동화 vs 배포 자동화

소프트웨어 개발에서 CI/CD는 개발 주기를 단축하고 안정성을 높이는 핵심적인 방법론이다. 하지만 CI와 CD의 정확한 의미와 역할은 종종 혼동되곤 한다.

*   **CI (Continuous Integration, 지속적 통합)**: 개발자들이 작성한 코드를 주기적으로 메인 브랜치에 통합하고, 통합된 코드에 대해 자동으로 빌드 및 테스트를 수행하여 잠재적인 오류를 조기에 발견하는 과정이다. **'검증 자동화'**에 가깝다.
    *   **목표**: 코드 충돌 방지, 버그 조기 발견, 코드 품질 유지
    *   **주요 활동**: 코드 커밋, 자동 빌드, 단위/통합 테스트 실행

*   **CD (Continuous Delivery/Deployment, 지속적 제공/배포)**: CI 단계를 통과한 코드를 자동으로 배포 가능한 상태로 만들거나(Delivery), 실제 운영 환경에 배포하는(Deployment) 과정이다. **'배포 자동화'**에 해당한다.
    *   **Continuous Delivery**: 언제든지 수동으로 배포할 수 있는 상태로 만드는 것. 배포 여부는 사람이 결정한다.
    *   **Continuous Deployment**: 모든 변경 사항을 자동으로 운영 환경에 배포하는 것. 사람의 개입 없이 자동으로 배포된다.

결론적으로 CI는 코드의 품질과 안정성을 보장하는 데 초점을 맞추고, CD는 이 코드를 사용자에게 전달하는 과정을 자동화하는 데 초점을 맞춘다.

## 2. 배포는 어떤 흐름으로 진행될까?

컨테이너 기반의 클라우드 환경에서 일반적인 배포 자동화 흐름은 다음과 같다.

1.  **Push (코드 변경)**: 개발자가 코드를 작성하고 Git 저장소(예: GitHub)에 푸시한다.
2.  **Build (빌드 및 테스트)**: CI 도구(예: Jenkins, GitHub Actions, GitLab CI)가 코드 변경을 감지하여 프로젝트를 빌드하고, 정의된 테스트(단위, 통합 테스트)를 실행한다.
3.  **이미지 생성 (Docker Image Build)**: 빌드 및 테스트를 통과한 애플리케이션 코드를 Docker 이미지로 빌드한다. 이 이미지는 애플리케이션과 그 실행에 필요한 모든 종속성을 포함한다.
4.  **ECR 업로드 (Image Registry Push)**: 생성된 Docker 이미지를 컨테이너 이미지 저장소(예: AWS ECR, Docker Hub)에 푸시한다. 이때 이미지 태그(예: `my-app:v1.0.0`)를 사용하여 버전을 관리한다.
5.  *5. 서버 반영 (Deployment): CD 도구가 ECR에 새로운 이미지가 업로드된 것을 감지하거나, 수동 트리거에 의해 배포를 시작한다. 이 단계에서 오토스케일링 그룹(ASG)과 같은 인프라가 새로운 이미지를 사용하여 애플리케이션을 업데이트한다.

![CI/CD, ECR, ASG 배포 흐름](/assets/images/2026-05-20-posting/deployment-automation-autoscaling-flow.png)


## 3. ASG, Launch Template, User Data의 연결: 새 서버가 떠도 같은 앱이 실행되는 이유

AWS 환경에서 오토스케일링은 Auto Scaling Group(ASG)을 통해 구현된다. ASG는 정의된 규칙에 따라 EC2 인스턴스의 수를 자동으로 조절하며, 이때 새로운 인스턴스가 생성될 때 어떤 애플리케이션을 실행할지 결정하는 것이 중요하다.

*   **ASG (Auto Scaling Group)**: EC2 인스턴스 컬렉션을 관리하며, 최소/최대/원하는 인스턴스 수를 유지한다. 트래픽 증가 시 인스턴스를 자동으로 추가하고, 감소 시 제거한다.
*   **Launch Template (시작 템플릿)**: ASG가 새로운 EC2 인스턴스를 시작할 때 필요한 모든 구성 정보(AMI ID, 인스턴스 타입, 보안 그룹, 키 페어 등)를 정의한다. 여기에 **User Data**를 포함할 수 있다.
*   **User Data**: EC2 인스턴스가 처음 시작될 때 실행되는 스크립트이다. 이 스크립트를 통해 애플리케이션을 설치하고 실행하는 명령어를 전달할 수 있다.

새로운 EC2 인스턴스가 ASG에 의해 시작되면, Launch Template에 정의된 User Data 스크립트가 자동으로 실행된다. 이 스크립트에는 일반적으로 다음과 같은 내용이 포함된다.

```bash
#!/bin/bash
yum update -y
yum install -y docker
service docker start
docker login -u AWS -p $(aws ecr get-login-password --region ap-northeast-2) <ECR_ACCOUNT_ID>.dkr.ecr.ap-northeast-2.amazonaws.com
docker pull <ECR_ACCOUNT_ID>.dkr.ecr.ap-northeast-2.amazonaws.com/my-app:latest
docker run -d -p 80:8080 <ECR_ACCOUNT_ID>.dkr.ecr.ap-northeast-2.amazonaws.com/my-app:latest
```

이처럼 User Data를 통해 Docker를 설치하고, ECR에서 최신 이미지를 pull 받아 실행함으로써, 새로 시작된 모든 인스턴스에서 동일한 버전의 애플리케이션이 자동으로 실행될 수 있다. (다른 방법으로는 AMI에 이미 Docker와 애플리케이션이 설치된 상태로 구성하는 방법도 있다.)

## 4. 왜 이미지 저장소(ECR)가 필요할까?

컨테이너 이미지 저장소(예: AWS ECR, Docker Hub)는 Docker 이미지를 저장하고 관리하는 중앙 집중식 저장소이다. 이는 배포 자동화에서 매우 중요한 역할을 한다.

*   **버전 관리**: 각 이미지에 태그(tag)를 부여하여 애플리케이션의 버전을 명확하게 관리할 수 있다. 특정 버전으로 롤백하거나, 여러 환경에 다른 버전을 배포할 때 유용하다.
*   **일관된 환경**: 모든 배포 환경(개발, 스테이징, 운영)에서 동일한 이미지를 사용하여 일관된 애플리케이션 실행 환경을 보장한다.
*   **보안**: 비공개 저장소를 사용하여 민감한 애플리케이션 이미지를 안전하게 보관하고, 접근 제어를 통해 보안을 강화할 수 있다.
*   **효율적인 배포**: ASG의 새로운 인스턴스가 이미지를 pull 받을 때, ECR과 같은 지역별 저장소를 사용하면 네트워크 지연을 줄이고 빠르게 이미지를 가져올 수 있다.

결론적으로 이미지 저장소는 '어떤 버전의 앱을 실행할지 정하는 기준'이 되며, 배포의 안정성과 효율성을 크게 향상시킨다.

## 5. 실패 경험으로 이해한 자동 배포의 핵심

자동 배포는 편리하지만, 인프라와 애플리케이션의 복합적인 이해 없이는 예기치 못한 장애를 마주하기 쉽다. 이전 포스트 [실전 클라우드 배포와 운영: 내가 마주한 기술적 고민과 해결책](/posts/cloud-deployment-troubleshooting/)에서 다뤘던 사례들을 통해 자동화의 핵심 요소를 되새겨보자.

*   **아키텍처 불일치로 인한 실행 실패**: GitHub Actions(`amd64`)와 EC2(`arm64`) 간의 아키텍처가 맞지 않아 컨테이너가 무한 재시작되는 경험을 했다. 자동화 파이프라인이 이미지를 성공적으로 푸시하더라도, 실행 환경의 CPU 아키텍처가 다르면 무용지물이다. CI/CD 단계에서 멀티 플랫폼 빌드 설정을 확인하는 것이 필수적이다.
*   **User Data 및 인프라 설정 오류**: Launch Template의 User Data 스크립트가 완벽하더라도, EC2와 RDS 간의 보안 그룹(Security Group) 설정이 잘못되어 있으면 애플리케이션은 정상적으로 부팅되지 않는다. 이는 결국 ALB 헬스체크 실패(`Unhealthy`)로 이어져 서비스 불능 상태를 만든다.
*   **환경 변수 및 인증 문제**: ECR에서 이미지를 pull 받기 위한 IAM 역할(Role)이나 인증 정보가 User Data 스크립트에 제대로 반영되지 않으면 배포는 실패한다. 자동화된 환경일수록 권한 관리와 환경 변수 설정이 더욱 견고해야 한다.

이러한 실패 경험들은 자동 배포 시스템을 구축할 때 단순히 스크립트를 실행하는 것을 넘어, **인프라 전체의 연결성과 실행 환경의 정밀한 검증**이 필수적임을 깨닫게 한다. 특히 오토스케일링 환경에서는 새로운 인스턴스가 언제든 자동으로 생성되므로, User Data 스크립트의 안정성은 서비스 전체의 가용성과 직결된다.

---

## 마무리 정리

컨테이너는 애플리케이션 실행 단위를 표준화하여 개발과 배포의 일관성을 제공한다. 여기에 CI/CD를 통한 배포 자동화는 코드 변경이 빠르게 운영 환경에 반영될 수 있도록 돕고, 오토스케일링은 변화하는 트래픽에 맞춰 인프라 자원을 유연하게 조절한다.

결론적으로 **컨테이너는 실행 단위를 표준화하고, 오케스트레이션은 운영을 자동화하며, CI/CD는 이 모든 과정을 효율적으로 연결하는 다리 역할**을 한다. 이 세 가지 요소가 결합될 때 비로소 안정적이고 확장 가능한 클라우드 네이티브 애플리케이션 운영 환경이 완성된다.

---

## References

*   [What is CI/CD? - AWS Documentation](https://aws.amazon.com/devops/ci-cd/)
*   [What is Amazon ECR? - AWS Documentation](https://docs.aws.amazon.com/ecr/latest/userguide/what-is-ecr.html)
*   [What is AWS Auto Scaling? - AWS Documentation](https://docs.aws.amazon.com/autoscaling/ec2/userguide/what-is-auto-scaling.html)
*   [Working with Launch Templates - AWS Documentation](https://docs.aws.amazon.com/autoscaling/ec2/userguide/LaunchTemplates.html)
*   [Running commands on your Linux instance at launch - AWS Documentation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html)
