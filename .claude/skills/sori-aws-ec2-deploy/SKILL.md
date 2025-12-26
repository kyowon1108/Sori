---
name: sori-aws-ec2-deploy
description: Performs AWS CLI-based EC2 deployments and real-device iOS verification for SORI.
---
# Purpose
- AWS CLI 기반 EC2 배포와 iOS 실기기 연결 확인을 수행한다.

# EC2 접속 정보 (중요!)
```
SSH_KEY: ~/.ssh/sori-ec2-key.pem
SSH_USER: ubuntu
EC2_HOST: 52.79.227.179
PROJECT_PATH: ~/sori
DEPLOY_BASE_URL: http://52.79.227.179:8000
```

모든 SSH/SCP 명령에 반드시 `-i ~/.ssh/sori-ec2-key.pem` 옵션을 포함해야 한다.

# Applicability
- 배포 타겟이 EC2이고 리전이 `ap-northeast-2`인 경우.

# Preconditions
- AWS CLI 설치 및 인증이 완료되어 있어야 한다.
- 기본 리전이 `ap-northeast-2`로 설정되어 있어야 한다.
- SSH 키 파일 `~/.ssh/sori-ec2-key.pem` 존재 확인.

# Commands
## AWS CLI 확인
- `aws --version`
- `aws sts get-caller-identity`
- `aws configure get region`
- `aws configure list`

## EC2 접속 확인
- `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "whoami"`
- `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "cd ~/sori && docker compose ps"`

## 파일 전송 (SCP)
- `scp -i ~/.ssh/sori-ec2-key.pem <local_file> ubuntu@52.79.227.179:~/sori/<path>`
- `scp -i ~/.ssh/sori-ec2-key.pem -r <local_dir> ubuntu@52.79.227.179:~/sori/<path>`

## Docker 서비스 배포
- `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "cd ~/sori && docker compose up -d --build backend"`
- `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "cd ~/sori && docker compose up -d --build frontend"`
- `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "cd ~/sori && docker compose restart backend"`

## 헬스 체크
- `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "curl -f http://localhost:8000/health"`
- `curl -f http://52.79.227.179:8000/health`

## 로그 확인
- `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "cd ~/sori && docker compose logs --tail=100 backend"`

# Workflow
1) SSH 키 파일 존재 확인: `ls -la ~/.ssh/sori-ec2-key.pem`
2) EC2 접속 테스트: `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "whoami"`
3) 변경된 파일을 SCP로 전송:
   - Backend: `scp -i ~/.ssh/sori-ec2-key.pem -r backend/app ubuntu@52.79.227.179:~/sori/backend/`
   - Frontend: `scp -i ~/.ssh/sori-ec2-key.pem -r frontend/src ubuntu@52.79.227.179:~/sori/frontend/`
4) Docker 서비스 재빌드:
   - `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "cd ~/sori && docker compose up -d --build backend"`
5) 서비스 상태 확인:
   - `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "cd ~/sori && docker compose ps"`
6) `/health` 스모크 체크:
   - `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "curl -f http://localhost:8000/health"`
7) 로그 확인 (에러 없음 확인):
   - `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "cd ~/sori && docker compose logs --tail=50 backend"`

# Expected outputs
- 배포 대상/리전/런타임 정보 요약.
- 실행 커맨드와 결과 로그.
- `/health` 결과와 iOS 실기기 연결 확인.

# Failure modes & fixes
- SSH 접속 실패 (Permission denied): 키 경로 확인 (`~/.ssh/sori-ec2-key.pem`), 권한 확인 (`chmod 400`).
- SCP 전송 실패: 경로 확인, EC2 디스크 용량 확인.
- Docker 빌드 실패: 로그 확인, 의존성 문제 해결.
- `/health` 실패: 백엔드 로그 확인, 포트 8000 노출 확인.
- baseURL 커밋 위험: 로컬 변경은 커밋하지 않는다.
