---
name: sori-docker-service-restart
description: Manages selective Docker service restarts/rebuilds based on git diff analysis for SORI infrastructure changes.
---
# Purpose
- Docker/infra 변경 시 영향받는 서비스만 선택적으로 재시작/재빌드
- 변경 범위를 자동 식별하여 불필요한 전체 재시작 방지
- Health check 및 로그 검증을 통한 재시작 성공 확인

# Applicability
- `docker-compose*.yml`, `compose.yaml` 변경
- `backend/Dockerfile`, `frontend/Dockerfile` 변경
- `backend/**/*.py`, `frontend/**/*.{ts,tsx,js,jsx}` 변경 (볼륨 마운트 포함)
- `.env`, `*.env` 환경변수 파일 변경
- `nginx.conf`, `init-db.sql` 등 인프라 설정 파일 변경
- `scripts/docker/**` 스크립트 변경

# Preconditions
- Docker와 Docker Compose 설치 확인: `docker compose version`
- Compose 파일 경로: `./docker-compose.yml` (또는 명시된 경로)
- 환경변수 파일: `.env` 존재 여부 확인
- 포트 충돌 없음: 8000(backend), 3000(frontend), 5432(postgres), 6379(redis), 5555(flower), 80/443(nginx)
- 충분한 디스크 공간(이미지 빌드 시)

# Diff-to-Service Mapping Logic
git diff로 변경된 파일 경로를 기준으로 영향받는 서비스 식별:

```
# Backend 관련
backend/app/**/*.py                  → backend, celery-worker, celery-beat, flower
backend/requirements.txt             → backend, celery-worker, celery-beat, flower (rebuild)
backend/Dockerfile                   → backend, celery-worker, celery-beat, flower (rebuild)
backend/docker-compose.yml           → postgres, backend (validate + rebuild)

# Frontend 관련
frontend/app/**/*                    → frontend
frontend/src/**/*                    → frontend
frontend/public/**/*                 → frontend
frontend/package.json                → frontend (rebuild)
frontend/package-lock.json           → frontend (rebuild)
frontend/Dockerfile                  → frontend (rebuild)
frontend/next.config.js              → frontend (rebuild)

# Infrastructure
docker-compose.yml                   → ALL services (validate, selective rebuild)
docker-compose.prod.yml              → production services
.env, *.env                          → ALL services (restart to pick up env changes)
nginx.conf                           → nginx (restart)
init-db.sql                          → postgres (requires recreate: down + up)

# Scripts
scripts/docker/**                    → inspect script to determine affected services
```

# Restart vs Rebuild Decision
## Restart (Safe, No Build)
- Python/JavaScript 소스 코드만 변경 (볼륨 마운트된 경로)
- 환경변수 파일(.env) 변경
- Nginx 설정(nginx.conf) 변경

**명령어**: `docker compose restart <service1> <service2>`

## Rebuild (Build Context Changed)
- Dockerfile 수정
- requirements.txt, package.json, package-lock.json 변경
- docker-compose.yml에서 서비스 정의(build, image, command) 변경
- 볼륨 마운트 경로 변경 (docker-compose.yml)

**명령어**: `docker compose up -d --build <service1> <service2>`

## Full Recreate (Rarely Needed)
- init-db.sql 변경 (postgres 초기화 스크립트)
- 볼륨 데이터 삭제가 필요한 경우

**명령어**: `docker compose down <service> && docker compose up -d <service>`

# Standard Commands
```bash
# 1. Validate compose file
docker compose config

# 2. Get changed files from git
git diff --name-only origin/main...HEAD
# Fallback if origin/main unavailable:
git diff --name-only HEAD~1...HEAD

# 3. Restart services (code changes only)
docker compose restart backend frontend

# 4. Rebuild and restart services
docker compose up -d --build backend frontend

# 5. Check service status
docker compose ps

# 6. View logs (last 200 lines)
docker compose logs --tail=200 backend
docker compose logs --tail=200 frontend

# 7. Backend health check
curl -f http://localhost:8000/health

# 8. Frontend reachability
curl -f http://localhost:3000

# 9. Check for errors in logs
docker compose logs --tail=200 backend | grep -i error
docker compose logs --tail=200 frontend | grep -i error

# 10. Dry-run mode (using helper script)
DRY_RUN=1 scripts/docker/restart-impacted-services.sh
```

# Workflow
1. **변경 파일 식별**: `git diff --name-only` 실행하여 변경 파일 목록 확보
2. **서비스 매핑**: Diff-to-Service 매핑 로직에 따라 영향받는 서비스 결정
3. **재시작 전략 선택**: 변경 유형에 따라 restart vs rebuild 결정
4. **Compose 검증**: `docker compose config` 실행하여 구성 파일 유효성 확인
5. **서비스 재시작/재빌드**: 선택된 명령어 실행
6. **상태 확인**: `docker compose ps`로 모든 서비스가 Up 상태인지 확인
7. **로그 검증**: 각 서비스 로그에서 에러 없는지 확인
8. **Health Check**: Backend/Frontend의 health endpoint 또는 접근성 검증
9. **Restart Summary 출력**: 변경 파일, 영향받는 서비스, 실행 명령어, 검증 결과, 경고사항

# Output Contract
Agent는 반드시 다음 형식의 "Restart Summary" 블록을 출력해야 함:

```
## Restart Summary

### Changed Files
- [file paths]

### Impacted Services
- [service]: [restart|rebuild] - [reason]

### Commands Executed
1. [command]: [✓|✗] [result]

### Verification Results
- [service] health: [✓|✗] [details]
- Logs: [summary]

### Warnings
- [any warnings or none]

### Next Actions
- [recommended follow-up steps]
```

# Common Failure Points + Fix
## 포트 충돌 (Address already in use)
- **증상**: 서비스가 시작되지 않고 "port is already allocated" 에러
- **해결**:
  ```bash
  docker compose down
  lsof -i :8000  # 충돌 프로세스 확인
  docker compose up -d
  ```

## 환경변수 누락
- **증상**: 서비스 로그에 "environment variable not set" 에러
- **해결**: `.env` 파일 존재 확인, 필수 변수(CLAUDE_API_KEY, SECRET_KEY 등) 설정 확인

## 볼륨 권한 문제
- **증상**: "permission denied" 에러
- **해결**:
  ```bash
  docker compose down -v  # 볼륨 삭제
  docker compose up -d    # 재생성
  ```

## 이미지 빌드 캐시 문제
- **증상**: 변경사항이 반영되지 않음
- **해결**:
  ```bash
  docker compose build --no-cache backend
  docker compose up -d backend
  ```

## DB 마이그레이션 필요
- **증상**: Backend 로그에 "relation does not exist" 등 DB 스키마 에러
- **해결**:
  ```bash
  # Backend 컨테이너에서 마이그레이션 실행
  docker compose exec backend alembic upgrade head
  docker compose restart backend
  ```

## Health Check 실패
- **증상**: `curl` 명령이 타임아웃 또는 비정상 응답
- **해결**:
  - 컨테이너가 완전히 시작될 때까지 30초 대기
  - `docker compose logs backend` 확인
  - 네트워크 설정 확인: `docker compose exec backend ping postgres`

# Helper Script
Optional: `scripts/docker/restart-impacted-services.sh`
- Git diff를 분석하여 영향받는 서비스 자동 식별
- Dry-run 모드 지원: `DRY_RUN=1 ./scripts/docker/restart-impacted-services.sh`
- POSIX sh 호환 (jq, python 의존성 없음)
- 실행 예시:
  ```bash
  # 실제 재시작
  ./scripts/docker/restart-impacted-services.sh

  # Dry-run (명령어만 출력)
  DRY_RUN=1 ./scripts/docker/restart-impacted-services.sh
  ```
