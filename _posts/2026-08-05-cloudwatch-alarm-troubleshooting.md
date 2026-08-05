---
title: "CloudWatch 알람이 울렸을 때 무엇부터 확인해야 할까?"
date: 2026-08-05
categories: [TIL, DevOps, AWS]
tags: [AWS, CloudWatch, Monitoring, DevOps, EC2, Nginx, Troubleshooting, TIL]
permalink: /posts/cloudwatch-alarm-troubleshooting/
---

어느 날 운영 중인 서비스의 CloudWatch 알람 채널로 빨간색 경고 메시지가 날아왔다. CPU 사용률이 임계값을 초과했거나 Status Check에 문제가 발생했다는 알람이었다. 

급하게 AWS 콘솔의 CloudWatch 대시보드로 이동해 그래프를 켜보았지만, 화면이 말해주는 것은 단 하나뿐이었다. 

> **"특정 시각에 어떤 지표(Metric)가 설정해둔 기준치(Threshold)를 넘었다."**

알람 화면을 아무리 들여다보아도 서비스에 실제로 장애가 난 것인지, 애플리케이션의 내부 예외 때문인지, Nginx 설정 불량인지, DB 타임아웃인지, 혹은 그저 CI/CD 배포 과정에서 일시적으로 발생한 스파이크 현상인지 곧바로 알 수는 없었다.

이 경험을 통해 깨달은 핵심은 다음과 같다. **CloudWatch 알람은 장애의 원인을 직접 알려주는 도구가 아니라, 시스템에 이상 징후가 발생했음을 알리는 '출발점'일 뿐**이라는 사실이다. 알람을 받았다면 단순히 알람 상태만 확인하고 조급해할 것이 아니라, 관련 지표와 발생 시간, 서버 로그, 애플리케이션 로그, 배포 이력을 결합하여 원인을 추적해 나가야 한다.

---

## CloudWatch 알람이 알려주는 것

CloudWatch 알람이 어떤 방식으로 상태를 판단하는지 이해해야 알람 메시지의 의미를 정확히 해석할 수 있다. 하나의 알람은 다음과 같은 구성 요소들이 얽혀 동작한다.

* **Namespace & Metric**: 어떤 서비스의 어떤 지표인가? (예: `AWS/EC2` 그룹의 `CPUUtilization`)
* **Dimension**: 대상 리소스의 특정 식별자 (예: `InstanceId=i-0123456789abcdef0`)
* **Period & Statistic**: 데이터를 얼마나 자주, 어떤 방식으로 모을 것인가? (예: 5분 간격, 평균값 `Average`)
* **Threshold & Evaluation Period**: 상태 판단 기준 (예: 임계값 `80%`, 최근 3개의 평가 구간 중 `Datapoints to Alarm = 2`개 구간 조건 충족 시 `ALARM` 전환)

```text
[정상 데이터 수집 (OK)] 
  → 1구간: CPU 45% (정상)
  → 2구간: CPU 85% (초과 1회 - 아직 OK 유지)
  → 3구간: CPU 88% (초과 2회 - 조건 충족!) 
  → [ALARM 상태 전환 및 알림 발송]
```

CloudWatch 알람은 순간적인 1초 피크를 감지하기보다는, 설정된 평가 기간(Evaluation Period) 동안 이상 상태가 지속되는지 검증한 뒤 `OK`, `ALARM`, `INSUFFICIENT_DATA` 중 하나의 상태를 부여한다. 따라서 알람 알림을 받은 시점은 **지표 이상이 이미 일정 시간 지속된 후**일 가능성이 크다.

---

## 알람이 울렸을 때 확인한 순서

실무에서 알람을 받았을 때 당황하지 않고 원인을 추적하기 위한 단계별 점검 순서는 다음과 같다.

![CloudWatch 알람 원인 추적 흐름도](/assets/images/2026-08-05-cloudwatch-alarm/cloudwatch_alarm_flowchart.png)
_CloudWatch 알람 수신 후 리소스 식별부터 로그, 배포 이력, 사용자 영향 검증까지 이어지는 원인 추적 워크플로._

```text
알람 확인
→ 대상 리소스와 Metric 확인
→ 알람 조건 확인
→ 발생 시각 확인
→ 같은 시간대 Metric 그래프 확인
→ EC2·Nginx·애플리케이션 로그 확인
→ 배포 및 서버 변경 이력 비교
→ 실제 사용자 영향 확인
→ 알람 조건 또는 시스템 개선
```

### 1. 대상 리소스와 Metric 확인

알람 이름만 보고 성급히 추측하지 말고, **Namespace**와 **Dimension**을 직접 조회해 어떤 리소스에서 유발되었는지 확인해야 한다.

* **EC2**: `AWS/EC2` (`CPUUtilization`, `StatusCheckFailed` 등)
* **RDS**: `AWS/RDS` (`CPUUtilization`, `FreeableMemory`, `DatabaseConnections`)
* **ALB**: `AWS/ApplicationELB` (`TargetResponseTime`, `HTTPCode_Target_5XX_Count`)
* **Custom Metric**: 애플리케이션에서 자체 전송하는 비즈니스 지표

### 2. 발생 시간 확인

시간대(Timezone) 확인은 매우 중요하다. AWS 콘솔 그래프나 시스템 로그 간 시각 차이로 원인 추적에 혼선을 빚는 경우가 많기 때문이다.

* **Metric 초과 시작 시각**: 지표 그래프가 비정상 궤적을 그리기 시작한 시점
* **ALARM 판단 시각**: CloudWatch 평가 조건을 만족하여 알람으로 바뀐 시점
* **알림 전달 시각**: SNS / Slack 등으로 전달된 시점
* **배포 및 서버 변경 시각**: GitHub Actions 빌드 완료 또는 스크립트 실행 시점

> 💡 **주의**: AWS 콘솔 기본 시각은 UTC로 표시될 수 있으므로, 서버 로그의 local time(KST, UTC+9)과 반드시 맞추어 비교해야 한다.

![Metric, 로그, 배포 이력의 상관관계](/assets/images/2026-08-05-cloudwatch-alarm/cloudwatch_timeline_correlation.png)
_동일 타임라인상에서 배포 이벤트, CPU 피크, Nginx 에러 로그, 애플리케이션 예외 시각을 타임라인별로 대조하는 원리._

### 3. 서버와 애플리케이션 로그 확인

알람이 발생한 시각을 파악했다면, 해당 시간대의 EC2 내부 로그를 확인한다.

`systemd` 기반 애플리케이션 서비스 로그를 확인할 때는 `journalctl`에 `--since`와 `--until` 옵션을 부여해 문제 시간대 앞뒤 10분 간격만 정밀 타격한다.

```bash
# 전체 시스템 로그 조회 (UTC/Local 시간 기준 지정)
sudo journalctl --since "2026-08-05 09:00:00" --until "2026-08-05 09:20:00"

# 특정 서비스(예: my-application.service) 로그만 타겟팅 조회
sudo journalctl -u my-application.service \
  --since "2026-08-05 09:00:00" \
  --until "2026-08-05 09:20:00"
```

웹 서버 앞단에 Nginx를 두고 있다면 Nginx 에러 로그도 같이 살펴본다.

```bash
# Nginx 에러 로그 최근 200줄 확인
sudo tail -n 200 /var/log/nginx/error.log

# 타임아웃, 예외, 메모리 부족 키워드 검색
sudo grep -iE "error|exception|failed|timeout|oom" /var/log/nginx/error.log
```

> 함께 읽으면 좋은 글: [왜 Nginx를 Spring Boot 앞에 두는가](/posts/why-nginx-in-front-of-spring-boot/)

애플리케이션 로그를 볼 때는 단순히 `ERROR` 단어가 찍혔는가만 찾기보다 **알람 발생 전후 1~2분 간의 로그 흐름**을 파악해야 한다.
* DB 커넥션 풀 고갈 또는 연결 실패 (`HikariPool - Connection is not available`)
* 외부 API 연동 타임아웃 (`SocketTimeoutException`)
* Java JVM 메모리 부족 (`java.lang.OutOfMemoryError: Java heap space`)
* 환경 변수 누락이나 인증 정보 실패로 인한 무한 재시도 Loop

### 4. 배포 및 변경 이력 비교

알람 발생 시간과 서비스 변경 이벤트가 겹치지 않는지 비교한다.

* GitHub Actions를 통한 최근 코드 배포 여부
* `systemctl restart` 또는 Docker 컨테이너 재시작 이력
* 보안 그룹(Security Group) 규칙 변경, RDS 파라미터 그룹 변경

배포 직후 애플리케이션이 스프링 부트(Spring Boot) 컨텍스트를 로딩하며 잠시 CPU를 100% 가깝게 쓰거나 JVM 워밍업으로 지표가 튈 수 있다. 지표 튐 이후 곧바로 정상 수치로 돌아왔다면 이는 장애가 아닌 '정상적인 스타트업 비용'일 가능성이 높다.

> 함께 읽으면 좋은 글: [GitHub Actions는 성공했는데 애플리케이션이 실행되지 않은 이유](/posts/github-actions-success-but-app-failed/)

---

## 지표별로 무엇을 확인해야 할까?

CloudWatch의 대표 지표가 상승했을 때 1차적으로 의심해야 할 항목과 확인 절차는 다음과 같다.

| 지표 | 의미 | 우선 확인할 내용 |
| :--- | :--- | :--- |
| **CPUUtilization** | CPU 사용률 증가 | 트래픽 폭증, 무한 루프 코드, 배치 작업, 배포 직후 초기화 과정 |
| **StatusCheckFailed_Instance** | 인스턴스 내부 문제 | OS 멈춤, 네트워크 설정 오류, 메모리 고갈(OOM Killer), 커널 패닉 |
| **StatusCheckFailed_System** | AWS 인프라 문제 | AWS 하드웨어/호스트 장애 (AWS Health Dashboard 확인 및 인스턴스 Stop/Start 필요) |
| **TargetResponseTime** | ALB 대상 응답 지연 | 쿼리 성능 저하(Full Scan), 외부 API 처리 지연, 애플리케이션 스레드 고갈 |
| **HTTPCode_Target_5XX_Count** | 대상 서버 5XX 에러 | 애플리케이션 Uncaught Exception, DB 커넥션 획득 실패, 502/504 Bad Gateway |
| **NetworkIn / NetworkOut** | 네트워크 트래픽 급변 | 대용량 파일 다운로드/업로드, 외부 크롤링 공격, 비정상 패킷 유입 |
| **DiskReadOps / DiskWriteOps** | 디스크 I/O 작업 증가 | 로그 파일 폭증, 임시 파일 생성, 디스크 기반 스왑(Swap) 발생 |

이 표는 가이드라인일 뿐이다. 동일한 `CPUUtilization` 상승이라도 백엔드 서비스 아키텍처나 배포 스케줄에 따라 배치 스케줄러 실행 때문일 수도 있고, DDoS 공격 때문일 수도 있으므로 단독 지표만 보고 원인을 확정해서는 안 된다.

---

## 일시적인 지표 상승과 실제 장애 구분하기

CPU가 90%로 치솟았다고 해서 100% 장애인 것은 아니다. **실제 장애인가?**를 판단할 때는 지표 단독 수치가 아닌 서비스 영향도를 체크해야 한다.

다음 체크리스트 중 2~3개 이상이 결합되어 나타난다면 실제 장애 상황일 가능성이 높다.

1. **실제 사용자의 에러 제보나 클라이언트 측 오류 보고가 있는가?**
2. **ALB 5XX 에러 카운터가 CPU/메모리 상승과 동시에 급증했는가?**
3. **ALB Target Group Health Status가 `Unhealthy`로 전환되었는가?**
4. **애플리케이션 로그에 동일한 Exception 발생 빈도가 폭증하고 있는가?**
5. **지표 이상 상태가 1~2분의 피크를 넘어 5분 이상 지속되고 있는가?**
6. **배포나 서버 재시작 시간대와 전혀 상관없는 시점에 발생했는가?**
7. **자동 복구(Self-healing) 없이 지표가 계속悪化되고 있는가?**

반대로 배포 직후 1~2분간 CPU 사용률이 증가했다가 애플리케이션 헬스체크 성공 후 곧바로 수치가 내려갔다면, 이는 운영에 지장이 없는 일시적 지표 스파이크로 볼 수 있다.

---

## 알람 조건도 점검해야 한다

운영 중 불필요한 알람이 너무 자주 울리면 정작 중요한 장애 알람이 왔을 때 둔감해지는 **'알람 피로(Alert Fatigue)'** 현상이 생긴다. 알람이 너무 민감하다고 느껴진다면 다음 설정값을 점검할 필요가 있다.

* **Period & Evaluation Period**: 1분 평가 1회 즉시 알람 대신 `5분 주기, 최근 3개 구간 중 2개 이상 조건 충족 시(2 out of 3)`로 완화
* **Statistic 선택**: 노이즈가 심한 `Maximum`(최댓값) 대신 `Average`(평균) 또는 `p95` / `p99` 백분위수 활용
* **Missing Data Handling**: 데이터 누락 시 `breaching`으로 처리되어 알람이 튄다면 `notBreaching` 또는 `ignore`로 변경 고려

```text
[너무 민감한 알람]
- Period: 1분 / Evaluation: 1 out of 1 / Threshold: CPU > 80%
-> 배포 시 10초만 CPU 80% 넘어도 밤중에 알림 울림 (노이즈)

[안정적인 알람]
- Period: 5분 / Evaluation: 2 out of 3 / Threshold: CPU > 80%
-> 5분 이상 지속되는 유의미한 과부하 상태에서만 알림 발송 (실효성 높음)
```

단, 알람 조건과 임계값을 무조건 느슨하게 설정하면 실제 장애 감지가 늦어지는 트레이드오프가 존재하므로, 서비스 SLA(서비스 수준 합약) 기준에 맞추어 점진적으로 튜닝해야 한다.

---

## 좋은 알람은 대응 방법이 명확한 알람이다

알람의 개수가 많은 시스템이 좋은 모니터링 시스템은 아니다. 알람 메시지를 받았을 때 담당자가 **"무엇을 해야 할지"** 명확하지 않다면 그 알람은 지워야 할 노이즈에 가깝다.

![좋은 알람과 나쁜 알람 비교](/assets/images/2026-08-05-cloudwatch-alarm/good_vs_bad_alarm_comparison.png)
_대응 절차 없이 알림만 반복되어 피로를 유발하는 알람(좌)과, 리소스·임계치·영향도·확인 체크리스트가 명시된 실행 가능한 알람(우)의 비교._

잘 설계된 CloudWatch 알람에는 다음 6가지 요소가 알람 설명(Description)이나 메시지에 포함되어 있어야 한다.

1. **감지 대상**: 어떤 리소스의 어떤 이상 상태인가?
2. **영향도**: 실제 사용자 및 서비스에 미치는 영향 수준 (P1/P2/P3)
3. **확인할 절차 (SOP/Runbook)**: 1차 점검 경로 및 명령어 가이드
4. **담당팀 / 담당자**: 알람을 처리해야 할 주체
5. **자동 복구 여부**: Auto Scaling 또는 인스턴스 재부팅 자동화 동작 여부
6. **복구 조건**: 정상(OK) 판정 기준

> 함께 읽으면 좋은 글: [Nginx 배포 전환 시점과 무중단 배포 전략](/posts/nginx-deployment-switching-point/)

---

## 마무리

CloudWatch 알람을 받고 당황했던 경험을 복기해 보면, 지표 자체에 집중하느라 주변 정황(Time Correlation)을 놓쳤기 때문이었다.

* **CloudWatch 알람은 장애 원인이 아니라 '이상 징후'를 알려주는 깃발이다.**
* **알람을 받으면 Metric 조건과 타임스탬프부터 정확히 파악해야 한다.**
* **알람 시각을 기준으로 EC2, Nginx, 애플리케이션 로그와 배포 이력을 대조해야 비로소 원인이 보인다.**
* **단순한 지표 튐과 실제 사용자 장애를 구분하는 눈을 키워야 한다.**
* **좋은 알람 시스템은 많이 울리는 알람이 아닌, 울렸을 때 즉시 대응할 수 있는 알람이다.**

앞으로는 알람 하나를 만들더라도 "이 알람이 새벽 3시에 울렸을 때 내가 이 메시지만 보고 바로 대처할 수 있을까?"를 먼저 고민하며 설정해 나가야겠다.
