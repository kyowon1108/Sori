---
name: sori-docker-service-restart
description: Manages selective Docker service restarts/rebuilds based on git diff analysis for SORI infrastructure changes.
---
# Purpose
- 변경된 파일 기준으로 영향 서비스만 재시작/재빌드한다.
- 헬스 체크와 로그 검증으로 상태를 확인한다.
- 로컬 또는 EC2 서버에 배포할 수 있다.

# EC2 접속 정보 (중요!)
```
SSH_KEY: ~/.ssh/sori-ec2-key.pem
SSH_USER: ubuntu
EC2_HOST: 52.79.227.179
PROJECT_PATH: ~/sori
```

모든 SSH/SCP 명령에 반드시 `-i ~/.ssh/sori-ec2-key.pem` 옵션을 포함해야 한다.

# Applicability
- `docker-compose*.yml`, `compose.yaml`, `Dockerfile`, `.env*`, `nginx.conf`, `init-db.sql`, `scripts/docker/**` 변경 시.

# Preconditions
- Docker와 Docker Compose 설치 확인: `docker compose version`.
- `docker-compose.yml` 경로와 `.env` 존재 여부 확인.
- EC2 배포 시: SSH 키 파일 `~/.ssh/sori-ec2-key.pem` 존재 확인.

# Commands (Local)
- `docker compose config`
- `git diff --name-only origin/main...HEAD`
- `git diff --name-only HEAD~1...HEAD`
- `docker compose restart <services>`
- `docker compose up -d --build <services>`
- `docker compose ps`
- `docker compose logs --tail=200 <service>`
- `curl -f http://localhost:8000/health`
- `curl -f http://localhost:3000`
- `DRY_RUN=1 scripts/docker/restart-impacted-services.sh`

# Commands (EC2)
- `scp -i ~/.ssh/sori-ec2-key.pem <local_file> ubuntu@52.79.227.179:~/sori/<path>`
- `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "cd ~/sori && docker compose config"`
- `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "cd ~/sori && docker compose up -d --build <service>"`
- `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "cd ~/sori && docker compose restart <service>"`
- `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "cd ~/sori && docker compose ps"`
- `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "cd ~/sori && docker compose logs --tail=200 <service>"`
- `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "curl -f http://localhost:8000/health"`

# Workflow (Local)
1) `git diff`로 변경 파일을 확인한다.
2) 변경 경로에 따라 영향 서비스를 매핑한다.
3) restart vs rebuild 전략을 결정한다.
4) `docker compose config/ps/logs`로 상태를 점검한다.
5) `/health`와 프론트 접근성을 확인한다.

# Workflow (EC2)
1) `git diff`로 변경 파일을 확인한다.
2) 변경된 파일을 SCP로 EC2에 전송:
   - `scp -i ~/.ssh/sori-ec2-key.pem <file> ubuntu@52.79.227.179:~/sori/<path>`
3) Docker 서비스 재빌드:
   - `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "cd ~/sori && docker compose up -d --build <service>"`
4) 상태 확인:
   - `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "cd ~/sori && docker compose ps"`
5) 헬스 체크:
   - `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "curl -f http://localhost:8000/health"`
6) 로그 확인:
   - `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "cd ~/sori && docker compose logs --tail=50 <service>"`

# Expected outputs
- 영향 서비스 목록과 재시작/재빌드 결과.
- 로그/헬스 체크 요약.

# Failure modes & fixes
- 포트 충돌: `docker compose down` 후 재시작.
- 환경변수 누락: `.env` 설정 확인.
- 변경 반영 실패: `docker compose build --no-cache <service>` 실행.
- SSH 접속 실패 (Permission denied): 키 경로 확인 (`~/.ssh/sori-ec2-key.pem`), 권한 확인 (`chmod 400`).
- SCP 전송 실패: 경로 확인, EC2 디스크 용량 확인.
