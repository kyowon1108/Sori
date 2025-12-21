# 🎯 SORI 프로젝트 - 최종 프로젝트 스펙 및 Session 할당

**프로젝트명:** SORI (AI 기반 어르신 정서 상담 시스템)  
**작성일:** 2025-12-21  
**개발 방식:** Claude Code Max Plan - 다중 세션 병렬 개발  
**팀 구성:** Backend, Frontend, iOS, DevOps 4개 세션  
**상태:** 구현 Prompt 생성 완료

---

## 📌 프로젝트 핵심 정의

### 🎭 서비스 개요
- **타겟:** 노인(65세 이상) 정서 상담 및 상태 모니터링
- **메커니즘:** AI(Claude API) 기반 실시간 음성 상담 + 보호자 모니터링 대시보드
- **핵심 플로우:**
  1. 보호자가 어르신 정보 + 통화 일정 사전 등록
  2. 지정된 시간에 AI가 자동으로 어르신에게 전화 (Cisco VoIP 또는 VAPI.ai)
  3. 실시간 대화를 서버로 전송 (WebSocket)
  4. Claude API로 대화 분석 (위험도, 감정 점수, 요약)
  5. 분석 결과를 보호자 대시보드에 표시

### 🏗️ 시스템 구성요소
```
┌─────────────────────────────────────────┐
│  Clients (Web + iOS)                    │
├─────────────────────────────────────────┤
│ Web Frontend (Next.js + TypeScript)     │
│ iOS App (SwiftUI + Combine)             │
└────────────────┬────────────────────────┘
                 │ (REST API + WebSocket)
                 ▼
┌─────────────────────────────────────────┐
│  Backend API Server (FastAPI)           │
│  - 인증 (JWT)                           │
│  - 어르신 관리 (CRUD)                   │
│  - 통화 관리 & WebSocket                │
│  - Claude API 통합                      │
└────────────┬──────────────┬──────────────┘
             │              │
    ┌────────▼──┐   ┌──────▼─────┐
    │PostgreSQL │   │Claude API   │
    │Database   │   │(LLM)        │
    └───────────┘   └─────────────┘
```

---

## 🗄️ 데이터 모델 (통일 필수!)

### 1️⃣ **users** 테이블
```json
{
  "id": "INTEGER PRIMARY KEY",
  "email": "VARCHAR(255) UNIQUE",
  "password_hash": "VARCHAR(255)",
  "full_name": "VARCHAR(255)",
  "role": "VARCHAR(50) DEFAULT 'caregiver'",
  "fcm_token": "VARCHAR(512)",
  "device_type": "VARCHAR(20)",  // 'ios', 'android', 'web'
  "push_enabled": "BOOLEAN DEFAULT TRUE",
  "created_at": "TIMESTAMP DEFAULT NOW()",
  "updated_at": "TIMESTAMP DEFAULT NOW()"
}
```

### 2️⃣ **elderly** 테이블
```json
{
  "id": "INTEGER PRIMARY KEY",
  "caregiver_id": "INTEGER FK → users.id (ON DELETE CASCADE)",
  "name": "VARCHAR(255) NOT NULL",
  "age": "INTEGER",
  "phone": "VARCHAR(20)",
  "call_schedule": "JSONB DEFAULT '{\"enabled\": true, \"times\": [\"09:00\", \"14:00\"]}'",
  "health_condition": "TEXT",
  "medications": "JSONB",
  "emergency_contact": "VARCHAR(255)",
  "risk_level": "VARCHAR(20) DEFAULT 'low'",  // 'low', 'medium', 'high', 'critical'
  "notes": "TEXT",
  "created_at": "TIMESTAMP DEFAULT NOW()",
  "updated_at": "TIMESTAMP DEFAULT NOW()"
}
```

### 3️⃣ **calls** 테이블
```json
{
  "id": "INTEGER PRIMARY KEY",
  "elderly_id": "INTEGER FK → elderly.id (ON DELETE CASCADE)",
  "call_type": "VARCHAR(50) DEFAULT 'voice'",
  "started_at": "TIMESTAMP NOT NULL",
  "ended_at": "TIMESTAMP",
  "duration": "INTEGER",  // seconds
  "status": "VARCHAR(50) DEFAULT 'in_progress'",  // 'in_progress', 'completed', 'failed', 'cancelled'
  "is_successful": "BOOLEAN DEFAULT TRUE",
  "created_at": "TIMESTAMP DEFAULT NOW()"
}
```

### 4️⃣ **messages** 테이블
```json
{
  "id": "INTEGER PRIMARY KEY",
  "call_id": "INTEGER FK → calls.id (ON DELETE CASCADE)",
  "role": "VARCHAR(50) NOT NULL",  // 'user', 'assistant'
  "content": "TEXT NOT NULL",
  "created_at": "TIMESTAMP DEFAULT NOW()"
}
```

### 5️⃣ **call_analysis** 테이블
```json
{
  "id": "INTEGER PRIMARY KEY",
  "call_id": "INTEGER FK → calls.id (UNIQUE, ON DELETE CASCADE)",
  "risk_level": "VARCHAR(20) DEFAULT 'low'",
  "sentiment_score": "FLOAT DEFAULT 0.0",  // -1.0 ~ 1.0
  "summary": "TEXT",
  "recommendations": "JSONB",  // Array of recommendations
  "analyzed_at": "TIMESTAMP DEFAULT NOW()"
}
```

---

## 🔌 API 엔드포인트 통일 명세

### ✅ Authentication (5개)
```
POST   /api/auth/register                     요청: {email, password, full_name}
POST   /api/auth/login                        요청: {email, password}
POST   /api/auth/refresh                      요청: {refresh_token}
GET    /api/auth/me                           헤더: Authorization: Bearer <token>
POST   /api/auth/update-fcm-token             요청: {fcm_token, device_type}
```

### ✅ Elderly Management (5개)
```
GET    /api/elderly                           쿼리: ?skip=0&limit=10
GET    /api/elderly/{id}                      경로: elderly_id
POST   /api/elderly                           요청: {name, age, phone, ...}
PUT    /api/elderly/{id}                      경로: elderly_id, 요청: 수정 정보
DELETE /api/elderly/{id}                      경로: elderly_id
```

### ✅ Calls Management (4개)
```
GET    /api/calls                             쿼리: ?elderly_id={id}&skip=0&limit=10
GET    /api/calls/{id}                        경로: call_id (메시지 + 분석 포함)
POST   /api/calls/start                       요청: {elderly_id, call_type}
POST   /api/calls/{id}/end                    경로: call_id
```

### ✅ WebSocket (1개)
```
WS     /ws/{call_id}                          헤더: Authorization: Bearer <token>
       메시지: {type: "message", content: "..."}
       응답: {type: "message", role: "assistant", content: "..."}
```

### 📐 응답 포맷 (모든 엔드포인트 통일)
```json
{
  "status": "success",  // or "error"
  "code": 200,          // HTTP status code
  "message": "String",
  "data": {}            // response body
}
```

### 🔐 토큰 구조 (JWT)
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234567890 + 86400,  // 24시간
  "type": "access"
}
```

---

## 🎬 주요 로직 플로우 (구현 필수)

### 1️⃣ 회원가입 → 로그인 → 대시보드
```
1. Frontend/iOS: POST /api/auth/register
   - email, password, full_name 전송
   - 검증: 이메일 중복 확인, 비밀번호 규칙 (8자, 대문자, 숫자)
   
2. Backend: bcrypt로 비밀번호 해싱 후 DB 저장
   
3. Frontend/iOS: POST /api/auth/login
   - email, password 전송
   - Backend: 비밀번호 검증 → JWT 토큰 발급
   - Response: {access_token, refresh_token, user}
   
4. Frontend/iOS: 토큰을 localStorage/Keychain에 저장
   
5. GET /api/auth/me
   - 토큰 유효성 검증 (Middleware)
   - 현재 사용자 정보 반환
```

### 2️⃣ 어르신 등록 → 통화 일정 설정
```
1. Frontend: POST /api/elderly
   요청 본문:
   {
     "name": "박할머니",
     "age": 75,
     "phone": "010-1234-5678",
     "call_schedule": {
       "enabled": true,
       "times": ["09:00", "14:00", "19:00"]  // 24시간 형식
     },
     "health_condition": "고혈압",
     "emergency_contact": "010-9876-5432"
   }
   
2. Backend:
   - 입력 검증 (Pydantic)
   - caregiver_id 자동 설정 (현재 사용자)
   - DB에 elderly 레코드 생성
   - Response: 생성된 어르신 정보
```

### 3️⃣ 통화 시작 → 메시지 송수신 → 분석
```
1. Frontend/iOS: POST /api/calls/start
   {
     "elderly_id": 1,
     "call_type": "voice"
   }
   Response: {call_id: 1, ws_url: "ws://..."}

2. Frontend/iOS: WebSocket 연결
   new WebSocket(ws_url)
   헤더에 Authorization 토큰 포함

3. 메시지 송수신 (양방향)
   클라이언트 → 서버:
   {
     "type": "message",
     "content": "안녕하세요"
   }
   
   서버 → 클라이언트 (Streaming):
   {
     "type": "message",
     "role": "assistant",
     "content": "안녕하세요. 오늘 하루는 어떠셨어요?"
   }

4. Backend 처리 흐름:
   a. 메시지 DB 저장 (role: "user")
   b. Claude API 호출 (messages array 전송)
   c. Claude 응답을 Streaming으로 클라이언트에 전송
   d. 완전한 응답을 DB에 저장 (role: "assistant")

5. Frontend/iOS: POST /api/calls/{id}/end
   통화 종료 신호

6. Backend: 통화 분석
   a. 모든 메시지를 Claude에 전송
   b. Risk Level 판정
   c. Sentiment Score 계산
   d. Summary 생성
   e. Recommendations 제시
   f. call_analysis 레코드 생성
   g. Risk Level >= "high" → FCM 푸시 알림 전송

7. Frontend/iOS: /api/calls/{id} 호출
   메시지 + 분석 결과 표시
```

---

## 🔧 기술 스택 통일

| 영역 | 기술 | 버전 | 용도 |
|------|------|------|------|
| **Backend** | FastAPI | 0.104+ | REST API |
| | SQLAlchemy | 2.0+ | ORM |
| | PostgreSQL | 15+ | Database |
| | Pydantic | 2.0+ | 데이터 검증 |
| | python-jose | 3.3+ | JWT |
| | bcrypt | 4.1+ | 비밀번호 해싱 |
| | python-dotenv | 1.0+ | 환경 변수 |
| **Frontend** | Next.js | 14+ | SSR/SSG |
| | TypeScript | 5+ | 타입 안전성 |
| | Zustand | 4.4+ | 상태 관리 |
| | Axios | 1.6+ | HTTP 클라이언트 |
| | TailwindCSS | 3+ | 스타일링 |
| **iOS** | SwiftUI | iOS 13+ | UI |
| | Combine | iOS 13+ | 비동기 |
| | URLSession | iOS 13+ | HTTP |
| | Firebase | 10+ | FCM, Crashlytics |
| **DevOps** | Docker | 24+ | 컨테이너화 |
| | Docker Compose | 2.0+ | 로컬 개발 |
| | PostgreSQL | 15+ | 데이터베이스 |
| | Nginx | 1.25+ | 리버스 프록시 |

---

## 📦 환경 변수 통일 명세 (.env)

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sori_db

# JWT
SECRET_KEY=your-secret-key-here-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=24
REFRESH_TOKEN_EXPIRE_DAYS=7

# Claude API
CLAUDE_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Cors
FRONTEND_URL=http://localhost:3000
IOS_APP_URL=sori://

# Firebase
FIREBASE_CREDENTIALS_PATH=/app/firebase-key.json

# Server
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO

# Environment
ENVIRONMENT=development  # development, staging, production
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_API_TIMEOUT=30000

NEXT_PUBLIC_ENVIRONMENT=development
```

### iOS (ConfigConstants.swift)
```swift
struct ConfigConstants {
    static let apiBaseURL = "http://localhost:8000"
    static let wsBaseURL = "ws://localhost:8000"
    static let apiTimeout = 30.0
    static let environment = "development"
}
```

---

## ⚠️ 중복 방지 규칙

### 🚫 절대 하지 말아야 할 것
1. **API 엔드포인트 중복**: 위의 15개 엔드포인트 외에 추가 엔드포인트 생성 금지
2. **변수명 변경**: 위에 정의된 필드명(email, password_hash, elderly_id 등) 변경 금지
3. **데이터모델 변경**: 데이터베이스 스키마 독단적 변경 금지 → PR로 논의 필수
4. **응답 포맷 변경**: 모든 API는 {status, code, message, data} 구조 준수
5. **인증 방식 변경**: JWT (HS256)로 통일 → OAuth2 같은 다른 방식 금지
6. **로깅 위치 변수**: 로그 포맷은 모든 모듈에서 동일하게
7. **재구현 금지**: 다른 세션에서 이미 구현한 기능 재구현 금지 → API 호출로 사용

### ✅ 협업 체크리스트
- [ ] **변수명 확인**: Backend의 필드명과 Frontend/iOS의 요청/응답 필드명이 일치하는가?
- [ ] **에러 코드 확인**: Backend의 예외 처리가 Frontend/iOS에서 올바르게 핸들링되는가?
- [ ] **토큰 처리**: Frontend/iOS가 refresh_token으로 자동 갱신하는가?
- [ ] **WebSocket**: 메시지 포맷 {type, role, content} 등이 모든 클라이언트에서 통일되었는가?
- [ ] **시간 포맷**: 모든 timestamp가 ISO 8601 형식 (2025-12-21T12:00:00Z)인가?

---

## 📋 Session 역할 분담

### 🔴 **Session 1: Backend API (FastAPI)**
**담당자:** Backend 개발자  
**기한:** 1월 31일  
**산출물:** 
- main.py (FastAPI 앱)
- database.py (PostgreSQL 연결)
- models/ (SQLAlchemy ORM)
- schemas/ (Pydantic)
- routes/ (15개 엔드포인트)
- services/ (Claude API 통합)
- Dockerfile + docker-compose.yml

### 🟢 **Session 2: Frontend Web (Next.js)**
**담당자:** Frontend 개발자  
**기한:** 1월 31일  
**산출물:**
- app/ 구조 (Auth, Main layouts)
- components/ (LoginForm, ElderlyCard, ChatView 등)
- services/ (api.ts, 엔드포인트 호출)
- hooks/ (useAuth, useWebSocket 등)
- store/ (Zustand 상태 관리)
- pages/ (로그인, 대시보드, 통화)

### 🔵 **Session 3: iOS App (SwiftUI)**
**담당자:** iOS 개발자  
**기한:** 1월 31일  
**산출물:**
- Models/ (Codable structs)
- ViewModels/ (MVVM)
- Views/ (SwiftUI screens)
- Services/ (APIService, WebSocketService)
- AppDelegate (Firebase 초기화)
- Somi.xcodeproj

### 🟡 **Session 4: DevOps & Infrastructure**
**담당자:** DevOps 엔지니어  
**기한:** 1월 31일  
**산출물:**
- Docker 설정 (Dockerfile, docker-compose.yml)
- CI/CD 파이프라인 (GitHub Actions)
- 환경 변수 관리 (.env 템플릿)
- 데이터베이스 마이그레이션
- 배포 스크립트
- 모니터링 설정 (Sentry, CloudWatch)

---

## 🔄 주요 통신 포인트

### Backend → Frontend/iOS 공통 계약
```json
Request Headers:
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {access_token}"
}

Response Format (모든 엔드포인트):
{
  "status": "success",
  "code": 200,
  "message": "사용자가 이해할 수 있는 메시지",
  "data": {}
}

Error Response:
{
  "status": "error",
  "code": 400,
  "message": "필드명은 이러하지 않습니다",
  "errors": {
    "field_name": ["에러 메시지"]
  }
}
```

### WebSocket 메시지 포맷
```json
Client → Server:
{
  "type": "message",
  "content": "사용자가 입력한 텍스트"
}

Server → Client:
{
  "type": "message",
  "role": "assistant",
  "content": "AI의 응답 텍스트"
}

Connection Events:
{
  "type": "connection",
  "status": "connected" | "disconnected"
}
```

---

## 🧪 테스트 기준 (모든 세션 필수)

### Backend
- [ ] 15개 엔드포인트 모두 POST/GET/PUT/DELETE 테스트
- [ ] JWT 토큰 만료/갱신 테스트
- [ ] WebSocket 연결/종료 테스트
- [ ] Claude API 호출 테스트
- [ ] 권한 검증 (caregiver_id 확인) 테스트
- [ ] 에러 처리 (400, 401, 403, 404, 500)

### Frontend
- [ ] 로그인/회원가입 흐름
- [ ] 어르신 CRUD
- [ ] 통화 시작/종료
- [ ] WebSocket 실시간 메시지
- [ ] 토큰 자동 갱신
- [ ] 모바일 반응형

### iOS
- [ ] 로그인/회원가입 흐름
- [ ] 어르신 리스트 조회
- [ ] 통화 시작/종료
- [ ] WebSocket 실시간 메시지
- [ ] FCM 푸시 알림 수신
- [ ] 오프라인 처리

---

## 📈 일정 & 마일스톤

| 주차 | 날짜 | 목표 | 상태 |
|------|------|------|------|
| 1주 | 12/21-27 | Backend: Auth, DB / Frontend: Setup / iOS: Models | 진행 중 |
| 2주 | 12/28-1/3 | 기본 CRUD 엔드포인트 구현 | 예정 |
| 3주 | 1/4-10 | WebSocket + Claude 통합 | 예정 |
| 4주 | 1/11-17 | UI 완성 + 통합 테스트 | 예정 |
| 5주 | 1/18-24 | 버그 수정 + 최적화 | 예정 |
| 6주 | 1/25-31 | 베타 배포 + 모니터링 | 예정 |
| 2월 | 2/1+ | 정식 배포 | 예정 |

---

## 🎯 성공 기준

- ✅ 15개 API 엔드포인트 모두 동작
- ✅ WebSocket으로 실시간 메시지 송수신
- ✅ Claude API로 통화 분석
- ✅ FCM으로 푸시 알림
- ✅ 모든 에러 케이스 처리
- ✅ 토큰 자동 갱신
- ✅ 모바일 반응형 디자인
- ✅ 성능: API 응답 < 200ms, WebSocket 지연 < 500ms

---

**🚀 각 Session은 아래의 Prompt를 참고하여 구현을 시작하세요!**