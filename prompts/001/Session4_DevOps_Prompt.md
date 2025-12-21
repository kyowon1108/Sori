# 🟡 SESSION 4: DEVOPS & INFRASTRUCTURE - 구현 Prompt

**목표:** Docker, Docker Compose, CI/CD, 데이터베이스, 모니터링 설정  
**기한:** 2025-01-31  
**역할:** DevOps 엔지니어  
**의존:** Session 1 (Backend), Session 2 (Frontend), Session 3 (iOS)  

---

## 📋 최우선 준수 규칙

### 🚫 MUST DO / MUST NOT
1. **환경 변수 통일** (모든 서비스에서 일치)
   - DATABASE_URL, CLAUDE_API_KEY, SECRET_KEY 등
   - .env 파일로 중앙 관리
   - 프로덕션/개발/테스트 환경별로 별도 관리

2. **Docker 이미지** (경량화 필수)
   - 멀티스테이지 빌드로 최종 이미지 크기 최소화
   - 최신 Python/Node 버전 사용
   - 보안: non-root 사용자로 실행

3. **데이터베이스** (PostgreSQL)
   - 자동 마이그레이션 (Alembic 또는 수동)
   - 백업 전략 (daily snapshots)
   - 초기화 스크립트로 테스트 데이터 생성 (개발 환경)

4. **네트워킹** (보안 & 성능)
   - Nginx 리버스 프록시로 HTTPS/WSS 처리
   - CORS 설정 일치 (Frontend/iOS 호출 허용)
   - 포트 매핑: Backend 8000, Frontend 3000, Nginx 80/443

5. **CI/CD** (자동화)
   - 코드 푸시 시 자동 테스트
   - 테스트 통과 시 자동 배포
   - 배포 실패 시 롤백

---

## 🛠️ 개발 순서

### **Phase 1: Docker 설정 (1-2일)**

#### 1.1 Backend Dockerfile
```dockerfile
# Stage 1: Builder
FROM python:3.11-slim as builder

WORKDIR /app

# 의존성 설치
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim

WORKDIR /app

# 보안: non-root 사용자 생성
RUN groupadd -r sori && useradd -r -g sori sori

# 빌더 단계에서 패키지 복사
COPY --from=builder /root/.local /home/sori/.local
COPY app/ ./app/
COPY .env.docker .env

# 소유권 변경
RUN chown -R sori:sori /app

# 환경 변수
ENV PATH=/home/sori/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

# 사용자 전환
USER sori

# 헬스 체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 1.2 Frontend Dockerfile
```dockerfile
# Stage 1: Builder
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# 환경 변수 (빌드 시)
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_WS_URL=ws://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV NEXT_TELEMETRY_DISABLED=1

CMD ["node", "server.js"]
```

#### 1.3 docker-compose.yml (로컬 개발)
```yaml
version: '3.8'

services:
  # PostgreSQL 데이터베이스
  postgres:
    image: postgres:15-alpine
    container_name: sori-postgres
    environment:
      POSTGRES_USER: ${DB_USER:-sori_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-sori_password}
      POSTGRES_DB: ${DB_NAME:-sori_db}
      POSTGRES_INITDB_ARGS: "-c log_statement=all"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sori_user"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - sori-network

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: sori-backend
    environment:
      DATABASE_URL: postgresql://${DB_USER:-sori_user}:${DB_PASSWORD:-sori_password}@postgres:5432/${DB_NAME:-sori_db}
      CLAUDE_API_KEY: ${CLAUDE_API_KEY}
      SECRET_KEY: ${SECRET_KEY:-your-secret-key-change-in-production}
      ALGORITHM: HS256
      ACCESS_TOKEN_EXPIRE_HOURS: 24
      REFRESH_TOKEN_EXPIRE_DAYS: 7
      FRONTEND_URL: http://localhost:3000
      IOS_BUNDLE_ID: com.sori.app
      ENVIRONMENT: development
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend/app:/app/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    networks:
      - sori-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend Web
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: http://localhost:8000
        NEXT_PUBLIC_WS_URL: ws://localhost:8000
    container_name: sori-frontend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
      NEXT_PUBLIC_WS_URL: ws://localhost:8000
    ports:
      - "3000:3000"
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
    networks:
      - sori-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx 리버스 프록시 (선택사항)
  nginx:
    image: nginx:alpine
    container_name: sori-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    networks:
      - sori-network

volumes:
  postgres_data:
    driver: local

networks:
  sori-network:
    driver: bridge
```

#### 1.4 .env.docker (Docker용 환경 변수)
```env
# Database
DB_USER=sori_user
DB_PASSWORD=sori_password
DB_NAME=sori_db

# Backend
CLAUDE_API_KEY=sk-ant-xxxxx...
SECRET_KEY=your-secret-key-min-32-chars-for-production
ALGORITHM=HS256

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Environment
ENVIRONMENT=development
```

---

### **Phase 2: 데이터베이스 설정 (1-2일)**

#### 2.1 init-db.sql (초기 데이터베이스 구성)
```sql
-- users 테이블
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'caregiver',
    fcm_token VARCHAR(512),
    device_type VARCHAR(20),
    push_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- elderly 테이블
CREATE TABLE IF NOT EXISTS elderly (
    id SERIAL PRIMARY KEY,
    caregiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    age INTEGER,
    phone VARCHAR(20),
    call_schedule JSONB DEFAULT '{"enabled": true, "times": ["09:00", "14:00", "19:00"]}',
    health_condition TEXT,
    medications JSONB,
    emergency_contact VARCHAR(255),
    risk_level VARCHAR(20) DEFAULT 'low',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- calls 테이블
CREATE TABLE IF NOT EXISTS calls (
    id SERIAL PRIMARY KEY,
    elderly_id INTEGER NOT NULL REFERENCES elderly(id) ON DELETE CASCADE,
    call_type VARCHAR(50) DEFAULT 'voice',
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    duration INTEGER,
    status VARCHAR(50) DEFAULT 'in_progress',
    is_successful BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- messages 테이블
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    call_id INTEGER NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- call_analysis 테이블
CREATE TABLE IF NOT EXISTS call_analysis (
    id SERIAL PRIMARY KEY,
    call_id INTEGER NOT NULL UNIQUE REFERENCES calls(id) ON DELETE CASCADE,
    risk_level VARCHAR(20) DEFAULT 'low',
    sentiment_score FLOAT DEFAULT 0.0,
    summary TEXT,
    recommendations JSONB,
    analyzed_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_elderly_caregiver_id ON elderly(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_elderly_id ON calls(elderly_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_call_id ON messages(call_id);
CREATE INDEX IF NOT EXISTS idx_call_analysis_call_id ON call_analysis(call_id);

-- 테스트 데이터 (개발 환경용)
INSERT INTO users (email, password_hash, full_name, role) VALUES
('test@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5EeVHTZLqQnqm', 'Test User', 'caregiver');
```

#### 2.2 Alembic 마이그레이션 (선택사항)
```bash
# Alembic 초기화 (Backend에서)
alembic init alembic

# env.py 설정 (SQLAlchemy 사용)
# alembic/versions에 마이그레이션 생성
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

---

### **Phase 3: Nginx 설정 (1일)**

#### 3.1 nginx.conf (리버스 프록시)
```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:3000;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name localhost;

        # Backend API
        location /api/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket
        location /ws/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_read_timeout 86400;
        }

        # Docs
        location /docs {
            proxy_pass http://backend/docs;
            proxy_http_version 1.1;
        }

        location /redoc {
            proxy_pass http://backend/redoc;
            proxy_http_version 1.1;
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check
        location /health {
            proxy_pass http://backend/health;
        }
    }

    # HTTPS (프로덕션용)
    # server {
    #     listen 443 ssl http2;
    #     server_name api.sori.com;
    #
    #     ssl_certificate /etc/nginx/ssl/cert.pem;
    #     ssl_certificate_key /etc/nginx/ssl/key.pem;
    #
    #     # SSL 설정
    #     ssl_protocols TLSv1.2 TLSv1.3;
    #     ssl_ciphers HIGH:!aNULL:!MD5;
    #     ssl_prefer_server_ciphers on;
    #
    #     # 동일한 proxy 설정...
    # }
}
```

---

### **Phase 4: CI/CD 파이프라인 (2-3일)**

#### 4.1 .github/workflows/test.yml (자동 테스트)
```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        working-directory: ./backend
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov
      
      - name: Run tests
        working-directory: ./backend
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
          CLAUDE_API_KEY: test-key
          SECRET_KEY: test-secret-key-for-testing
        run: |
          pytest tests/ --cov=app --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.xml

  frontend-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: './frontend/package-lock.json'
      
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
      
      - name: Lint
        working-directory: ./frontend
        run: npm run lint
      
      - name: Build
        working-directory: ./frontend
        env:
          NEXT_PUBLIC_API_URL: http://localhost:8000
          NEXT_PUBLIC_WS_URL: ws://localhost:8000
        run: npm run build
```

#### 4.2 .github/workflows/deploy.yml (자동 배포)
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: [backend-test, frontend-test]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and push Docker images
        run: |
          docker login -u ${{ secrets.DOCKER_USERNAME }} -p ${{ secrets.DOCKER_PASSWORD }}
          
          # Backend
          docker build -t sori-backend:latest ./backend
          docker tag sori-backend:latest ${{ secrets.DOCKER_USERNAME }}/sori-backend:latest
          docker push ${{ secrets.DOCKER_USERNAME }}/sori-backend:latest
          
          # Frontend
          docker build -t sori-frontend:latest ./frontend
          docker tag sori-frontend:latest ${{ secrets.DOCKER_USERNAME }}/sori-frontend:latest
          docker push ${{ secrets.DOCKER_USERNAME }}/sori-frontend:latest
      
      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /opt/sori
            docker-compose pull
            docker-compose up -d
            docker-compose exec -T backend alembic upgrade head
```

---

### **Phase 5: 모니터링 설정 (2일)**

#### 5.1 Sentry 설정 (에러 추적)
Backend에서:
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    integrations=[FastApiIntegration()],
    traces_sample_rate=1.0,
    environment=settings.ENVIRONMENT
)
```

Frontend에서:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  integrations: [new Sentry.Replay()],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
});
```

#### 5.2 Health Check Endpoints
Backend:
```python
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "database": check_database_connection()
    }
```

#### 5.3 로깅 설정
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

---

### **Phase 6: 백업 및 보안 (1-2일)**

#### 6.1 데이터베이스 백업 스크립트
```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="sori_db"
DB_USER="sori_user"

mkdir -p $BACKUP_DIR

# PostgreSQL 백업
PGPASSWORD=$DB_PASSWORD pg_dump -h postgres -U $DB_USER -d $DB_NAME \
    > $BACKUP_DIR/sori_$TIMESTAMP.sql

# 30일 이상 된 백업 삭제
find $BACKUP_DIR -name "sori_*.sql" -mtime +30 -delete

echo "Backup completed: sori_$TIMESTAMP.sql"
```

#### 6.2 Cron Job (자동 백업)
```bash
# 매일 새벽 2시에 백업
0 2 * * * /opt/sori/backup-db.sh
```

---

## 🚀 배포 및 운영 명령어

### 로컬 개발
```bash
# 전체 스택 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f backend
docker-compose logs -f frontend

# 서비스 중지
docker-compose down

# 데이터베이스 초기화 (테스트용)
docker-compose down -v
docker-compose up -d
```

### 프로덕션 배포
```bash
# 환경 변수 설정
export CLAUDE_API_KEY=sk-ant-...
export SECRET_KEY=production-secret-key-32-chars-min
export DB_PASSWORD=strong-password

# 빌드 및 배포
docker-compose -f docker-compose.prod.yml up -d

# 마이그레이션 실행
docker-compose exec backend alembic upgrade head

# 헬스 체크
curl http://api.sori.com/health
```

---

## 🧪 테스트 기준

### DevOps 체크리스트
- [ ] Docker Compose로 모든 서비스 실행 확인
- [ ] PostgreSQL 데이터베이스 마이그레이션 성공
- [ ] Backend, Frontend, Nginx 간 통신 정상
- [ ] WebSocket 연결 정상 (Nginx 경유)
- [ ] 환경 변수 모든 서비스에서 로드됨
- [ ] 헬스 체크 엔드포인트 정상
- [ ] CI/CD 파이프라인 작동
- [ ] 에러 로깅 (Sentry) 정상
- [ ] 데이터베이스 백업 스크립트 작동

---

## 📊 모니터링 대시보드

### Sentry
- URL: https://sentry.io/organizations/sori
- Backend, Frontend 에러 추적

### PostgreSQL 모니터링
```sql
-- 활성 연결 확인
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;

-- 슬로우 쿼리 로그
-- postgresql.conf에서 log_min_duration_statement 설정
```

---

**🎯 완성 기준:**
- ✅ Docker Compose로 전체 스택 실행 가능
- ✅ PostgreSQL 데이터베이스 마이그레이션 완료
- ✅ Backend, Frontend, Nginx 통합 완료
- ✅ CI/CD 파이프라인 자동화
- ✅ 모니터링 및 알림 설정
- ✅ 백업 자동화
- ✅ 문서화 완료

**다음 단계:** 각 Session별로 코드를 구현하고, 통합 테스트를 진행합니다!