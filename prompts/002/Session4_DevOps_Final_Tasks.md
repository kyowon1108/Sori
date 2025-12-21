# 🟡 SESSION 4: DEVOPS - 코드 생성 후 필수 작업 Prompt

**상태:** 코드 생성 완료 → 통합 테스트 & 배포 준비  
**목표:** Docker 스택 완전 작동, CI/CD 자동화, 프로덕션 준비  
**마감일:** 2025-12-31  

---

## 🚨 PRIORITY 1: Docker Compose 로컬 테스트 (12/22-12/24)

### Task 1.1: 전체 스택 시작 및 상태 확인

```bash
cd 프로젝트_루트

# 1. .env 파일 생성
cp .env.docker .env

# 2. 필수 환경 변수 설정 (.env 파일 수정)
cat .env
# 다음 값들이 올바른지 확인:
# DATABASE_URL=postgresql://sori_user:sori_password@postgres:5432/sori_db
# CLAUDE_API_KEY=sk-ant-xxxxx... (실제 API 키)
# SECRET_KEY=your-secret-key-min-32-chars-for-production
# FRONTEND_URL=http://localhost:3000
# ENVIRONMENT=development

# 3. Docker 이미지 빌드
docker-compose build

# 4. 전체 스택 시작
docker-compose up -d

# 5. 서비스 상태 확인
docker-compose ps
# 모든 서비스가 "Up" 상태인지 확인:
# sori-postgres         healthy
# sori-backend          healthy
# sori-frontend         healthy
# sori-nginx            Up
```

### Task 1.2: 각 서비스 개별 검증

```bash
# PostgreSQL 확인
docker-compose exec postgres pg_isready -U sori_user
# accepting connections

# PostgreSQL 테이블 생성 확인
docker-compose exec postgres psql -U sori_user -d sori_db -c "\dt"
# 5개 테이블이 모두 보이는지 확인:
# - public | call_analysis
# - public | calls
# - public | elderly
# - public | messages
# - public | users

# Backend 헬스 체크
curl http://localhost:8000/health
# {"status":"ok", "environment":"development", "database":true}

# Backend 로그 확인
docker-compose logs -f backend
# 에러가 없는지 확인

# Frontend 확인
curl -I http://localhost:3000
# HTTP/1.1 200 OK

# Frontend 로그 확인
docker-compose logs -f frontend
# 빌드 성공 및 서버 시작 확인

# Nginx 확인
curl -I http://localhost
# HTTP/1.1 200 OK

# Nginx 로그 확인
docker-compose logs nginx
```

### Task 1.3: 통합 테스트 (모든 서비스 간 통신)

```bash
# 1. Backend API 호출 (직접)
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "full_name": "Test User"
  }'
# ✅ 201 응답 확인

# 2. Nginx 경유 Backend API 호출
curl -X GET http://localhost/api/auth/me \
  -H "Authorization: Bearer <token>"
# ✅ 동일한 응답 확인

# 3. Frontend에서 Backend 통신 확인
# 브라우저에서 http://localhost:3000 열기
# 로그인 시도
# Browser DevTools → Network 탭 → /api/auth/login 확인
# ✅ 요청이 성공하는지 확인 (200 응답)

# 4. WebSocket 테스트 (Nginx 경유)
npm install -g wscat
wscat -c "ws://localhost/ws/1" --header "Authorization: Bearer <token>"
# ✅ WebSocket 연결 성공 확인
```

---

## 🚨 PRIORITY 2: CI/CD 파이프라인 설정 (12/25-12/27)

### Task 2.1: GitHub Repository 설정

```bash
# 1. GitHub에 새 리포지토리 생성 (Public)
# Repository name: SORI 또는 sori-ai
# Add .gitignore: Python, Node
# Add LICENSE: MIT

# 2. 로컬에서 GitHub에 푸시
cd 프로젝트_루트
git init
git add .
git commit -m "Initial commit: SORI project complete"
git branch -M main
git remote add origin https://github.com/yourusername/SORI.git
git push -u origin main

# 3. develop 브랜치 생성
git checkout -b develop
git push -u origin develop

# 4. GitHub 설정 확인
# Repository → Settings → Default branch → develop으로 변경 (선택사항)
# Repository → Settings → Branch protection rules 설정 (선택사항)
```

### Task 2.2: GitHub Actions Secrets 추가

```
GitHub Repository → Settings → Secrets and variables → Actions

다음 Secrets 추가:

1. DOCKER_USERNAME
   값: Docker Hub username

2. DOCKER_PASSWORD
   값: Docker Hub access token
   생성 방법: https://hub.docker.com/settings/security

3. PROD_HOST
   값: your-production-server.com 또는 IP address

4. PROD_USER
   값: deploy user (e.g., ubuntu, ec2-user)

5. PROD_SSH_KEY
   값: SSH private key (전체 내용)
   생성 방법:
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/sori_deploy
   cat ~/.ssh/sori_deploy | pbcopy  (macOS)
   또는 type C:\Users\user\.ssh\sori_deploy (Windows)

6. SENTRY_DSN (선택사항)
   값: https://xxxxx@sentry.io/xxxxx
   Sentry.io 가입 후 얻을 수 있음

7. CLAUDE_API_KEY
   값: sk-ant-xxxxx...
   Anthropic API 키
```

### Task 2.3: GitHub Actions 워크플로우 검증

```bash
# 1. .github/workflows/test.yml 파일 확인
cat .github/workflows/test.yml

# 다음 항목들이 올바른지 확인:
# - Python 3.11
# - Node.js 20
# - pytest 테스트
# - npm lint & build

# 2. .github/workflows/deploy.yml 파일 확인
cat .github/workflows/deploy.yml

# 다음 항목들이 올바른지 확인:
# - Docker 이미지 빌드
# - Docker Hub에 푸시
# - SSH로 서버 접속 후 배포
```

### Task 2.4: 워크플로우 테스트

```bash
# 1. 코드 푸시로 test.yml 트리거
git add .
git commit -m "Test CI/CD pipeline"
git push origin develop

# 2. GitHub → Actions 탭에서 진행 상황 확인
# Workflow 실행 중... → 완료 대기

# 3. PR 생성 (develop → main)
# test.yml이 자동 실행되는지 확인

# 4. develop에 merge (또는 main에 직접 push)
# deploy.yml이 실행되는지 확인 (실제 배포)
```

---

## 🚨 PRIORITY 3: 프로덕션 배포 준비 (12/28-12/30)

### Task 3.1: 프로덕션 환경 설정

```bash
# 1. 프로덕션 서버 준비 (AWS EC2, 또는 다른 클라우드)
# Ubuntu 22.04 LTS 권장
# t3.medium 이상 (2 CPU, 4GB RAM)

# 2. 서버에 SSH 접속
ssh -i ~/.ssh/sori_deploy ubuntu@your-prod-server.com

# 3. Docker 설치
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo usermod -aG docker $USER
sudo systemctl start docker
sudo systemctl enable docker

# 4. 프로젝트 디렉토리 생성
mkdir -p /opt/sori
cd /opt/sori

# 5. GitHub에서 clone
git clone https://github.com/yourusername/SORI.git .

# 6. 프로덕션 환경 변수 설정
sudo nano .env

# 다음 값들 설정 (개발용과 다른 값):
DATABASE_URL=postgresql://sori_user:STRONG_PASSWORD@postgres:5432/sori_db
CLAUDE_API_KEY=sk-ant-xxxxx...  (실제 API 키)
SECRET_KEY=very-long-random-string-min-32-chars-CHANGE-THIS
FRONTEND_URL=https://app.yourdomain.com
ENVIRONMENT=production
```

### Task 3.2: 프로덕션 Docker Compose 실행

```bash
# 프로덕션 서버에서

# 1. 환경 변수 로드
export $(cat .env | grep -v '^#' | xargs)

# 2. 프로덕션 스택 시작
docker-compose -f docker-compose.prod.yml up -d

# 또는 (일반 compose 사용)
docker-compose up -d

# 3. 상태 확인
docker-compose ps

# 4. 데이터베이스 마이그레이션 (필요시)
docker-compose exec backend alembic upgrade head

# 5. 헬스 체크
curl https://your-prod-server.com/health
```

### Task 3.3: SSL/TLS 인증서 설정

```bash
# 프로덕션 서버에서

# 1. Let's Encrypt 설치
sudo apt-get install -y certbot python3-certbot-nginx

# 2. 인증서 발급
sudo certbot certonly --standalone -d your-prod-domain.com

# 3. Nginx 설정 업데이트
# nginx.conf의 HTTPS 부분 주석 해제
# ssl_certificate /etc/letsencrypt/live/your-prod-domain.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/your-prod-domain.com/privkey.pem;

# 4. Nginx 재시작
docker-compose exec nginx nginx -s reload

# 5. 자동 갱신 설정
sudo systemctl start certbot.timer
sudo systemctl enable certbot.timer
```

---

## 🚨 PRIORITY 4: 모니터링 및 백업 (12/31)

### Task 4.1: Sentry 모니터링 설정

```bash
# 1. Sentry 계정 생성
# https://sentry.io → Sign Up

# 2. Organization 및 Project 생성
# Language: Python (Backend)
# Language: JavaScript (Frontend)

# 3. 각 프로젝트에서 DSN 복사
# Backend DSN: https://xxxxx@sentry.io/xxxxx
# Frontend DSN: https://xxxxx@sentry.io/xxxxx

# 4. .env에 설정
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# 5. 코드에서 Sentry 초기화 확인
# app/main.py (Backend)
# app/page.tsx (Frontend)

# 6. 테스트
curl -X GET http://localhost:8000/trigger-error
# Sentry 대시보드에 에러가 표시되는지 확인
```

### Task 4.2: 로그 수집 (CloudWatch 또는 ELK)

#### CloudWatch 사용 (AWS)
```bash
# 1. CloudWatch Logs 그룹 생성
aws logs create-log-group --log-group-name /sori/backend
aws logs create-log-group --log-group-name /sori/frontend

# 2. docker-compose.yml에 로그 드라이버 추가
services:
  backend:
    logging:
      driver: awslogs
      options:
        awslogs-group: /sori/backend
        awslogs-region: us-east-1
```

#### ELK Stack (Self-hosted)
```bash
# 아래 링크 참고:
# https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html
```

### Task 4.3: 데이터베이스 백업 자동화

```bash
# 1. 백업 스크립트 확인
cat scripts/backup-db.sh

# 2. 실행 권한 설정
chmod +x scripts/backup-db.sh

# 3. 수동 백업 테스트
./scripts/backup-db.sh
# 백업 파일이 생성되는지 확인

# 4. Cron Job 설정 (프로덕션 서버)
sudo crontab -e

# 다음 라인 추가 (매일 새벽 2시에 백업):
0 2 * * * cd /opt/sori && ./scripts/backup-db.sh >> /var/log/sori-backup.log 2>&1

# 5. 백업 파일을 S3에 업로드 (선택사항)
# scripts/backup-db.sh를 수정하여 aws s3 cp 추가
aws s3 cp /backups/database/sori_*.sql s3://your-bucket/backups/
```

---

## 🧪 최종 검증 체크리스트

### Docker Compose
- [ ] docker-compose ps로 모든 서비스가 Up 상태
- [ ] PostgreSQL 5개 테이블 모두 생성됨
- [ ] Backend 헬스 체크 성공
- [ ] Frontend 포트 3000에서 실행 중
- [ ] Nginx 포트 80/443에서 실행 중

### 통합 테스트
- [ ] Backend API 직접 호출 성공
- [ ] Nginx 경유 Backend API 호출 성공
- [ ] WebSocket 연결 성공
- [ ] Frontend에서 Backend 통신 성공

### CI/CD
- [ ] GitHub Actions test.yml 자동 실행
- [ ] pytest 테스트 통과
- [ ] npm lint 통과
- [ ] npm build 성공
- [ ] deploy.yml이 성공 시에만 실행

### 프로덕션 준비
- [ ] 환경 변수 모두 설정됨
- [ ] SECRET_KEY 변경됨 (프로덕션용 32자 이상)
- [ ] ALLOWED_HOSTS 설정됨
- [ ] CORS 설정 (실제 도메인)
- [ ] HTTPS 활성화 (SSL 인증서)

### 모니터링
- [ ] Sentry 연동 완료
- [ ] 에러 로깅 확인
- [ ] 로그 수집 시작
- [ ] 백업 자동화 설정

---

## 📚 참고 명령어

```bash
# Docker Compose 전체 관리
docker-compose up -d              # 시작
docker-compose down               # 종료
docker-compose logs -f            # 로그 실시간 보기
docker-compose ps                 # 상태 확인
docker-compose restart            # 재시작
docker-compose rebuild            # 이미지 재빌드

# 개별 서비스 관리
docker-compose exec postgres psql -U sori_user -d sori_db
docker-compose exec backend bash
docker-compose exec frontend bash

# 데이터베이스 초기화 (개발용)
docker-compose down -v
docker-compose up -d

# 프로덕션 배포
docker-compose -f docker-compose.prod.yml up -d
docker-compose exec backend alembic upgrade head
```

---

**다음 단계:** 모든 검증이 완료되면 본격 운영 가능!

**문제 발생 시:**
1. `docker-compose logs -f backend` 로그 확인
2. 환경 변수 확인
3. 네트워크 연결 확인 (ping, curl)
4. 방화벽 설정 확인