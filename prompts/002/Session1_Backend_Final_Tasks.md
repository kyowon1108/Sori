# 🔴 SESSION 1: BACKEND - 코드 생성 후 필수 작업 Prompt

**상태:** 코드 생성 완료 → 테스트 & 검증 단계  
**목표:** 모든 엔드포인트 검증 및 테스트 커버리지 80% 달성  
**마감일:** 2025-12-28  

---

## 🚨 PRIORITY 1: 엔드포인트 검증 (12/22-12/24)

### Task 1.1: 전체 서버 시작 및 기본 테스트

```bash
cd backend

# Python 환경 설정
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 또는 Docker에서
docker-compose up -d

# 서버 시작
python -m uvicorn app.main:app --reload

# 헬스 체크
curl http://localhost:8000/health
# {"status":"ok", ...}
```

### Task 1.2: 15개 엔드포인트 모두 테스트

다음 순서대로 각 엔드포인트를 테스트하고, **모두 성공하면 체크**:

#### 인증 (Auth)
```bash
# 1. POST /api/auth/register - 회원가입
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "full_name": "Test User"
  }'
# 응답: {"status": "success", "code": 201, "message": "User registered", "data": {...}}
# ✅ 체크리스트: email unique 확인, 비밀번호 해싱 확인

# 2. POST /api/auth/login - 로그인
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
# 응답: {"status": "success", "code": 200, "data": {"access_token": "...", "refresh_token": "..."}}
# 반환된 access_token을 TOKEN 변수에 저장
# export TOKEN="eyJ..."
# ✅ 체크리스트: JWT 토큰 생성 확인, 형식 검증

# 3. POST /api/auth/refresh - 토큰 갱신
curl -X POST http://localhost:8000/api/auth/refresh \
  -H "Authorization: Bearer $TOKEN"
# 응답: {"status": "success", "code": 200, "data": {"access_token": "..."}}
# ✅ 체크리스트: refresh_token으로 새 access_token 생성 확인

# 4. GET /api/auth/me - 현재 사용자 정보
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
# 응답: {"status": "success", "code": 200, "data": {"id": 1, "email": "test@example.com", ...}}
# ✅ 체크리스트: 토큰에서 user_id 추출 확인
```

#### 어르신 관리 (Elderly)
```bash
# 5. POST /api/elderly - 어르신 등록
curl -X POST http://localhost:8000/api/elderly \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kim Young-Hee",
    "age": 75,
    "phone": "010-1234-5678",
    "call_schedule": {"enabled": true, "times": ["09:00", "14:00", "19:00"], "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]},
    "health_condition": "Good",
    "medications": [],
    "emergency_contact": "010-9876-5432",
    "risk_level": "low",
    "notes": "Prefers morning calls"
  }'
# 응답: {"status": "success", "code": 201, "data": {"id": 1, "caregiver_id": 1, ...}}
# ✅ 체크리스트: caregiver_id가 현재 사용자로 설정되는지 확인, JSON 필드 저장 확인

# 6. GET /api/elderly - 어르신 목록 조회
curl -X GET http://localhost:8000/api/elderly \
  -H "Authorization: Bearer $TOKEN"
# 응답: {"status": "success", "code": 200, "data": {"items": [...], "total": 1}}
# ✅ 체크리스트: caregiver_id 기반 필터링 확인

# 7. GET /api/elderly/{elderly_id} - 어르신 상세 조회
curl -X GET http://localhost:8000/api/elderly/1 \
  -H "Authorization: Bearer $TOKEN"
# 응답: {"status": "success", "code": 200, "data": {...}}
# ✅ 체크리스트: 권한 검증 (다른 caregiver의 elderly 조회 시 403)

# 8. PUT /api/elderly/{elderly_id} - 어르신 정보 수정
curl -X PUT http://localhost:8000/api/elderly/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kim Young-Hee",
    "age": 76,
    "health_condition": "Good with slight hypertension"
  }'
# 응답: {"status": "success", "code": 200, "data": {...}}
# ✅ 체크리스트: 부분 업데이트 확인

# 9. DELETE /api/elderly/{elderly_id} - 어르신 삭제
# 주의: 이건 마지막에 테스트 (데이터 필요)
curl -X DELETE http://localhost:8000/api/elderly/1 \
  -H "Authorization: Bearer $TOKEN"
# 응답: {"status": "success", "code": 204}
```

#### 통화 관리 (Calls)
```bash
# 10. POST /api/calls - 통화 시작
curl -X POST http://localhost:8000/api/calls \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "elderly_id": 1,
    "call_type": "voice"
  }'
# 응답: {"status": "success", "code": 201, "data": {"id": 1, "status": "in_progress", ...}}
# 반환된 call_id를 CALL_ID 변수에 저장
# export CALL_ID="1"
# ✅ 체크리스트: 통화 상태가 'in_progress'로 설정되는지 확인

# 11. GET /api/calls - 통화 목록 조회
curl -X GET http://localhost:8000/api/calls \
  -H "Authorization: Bearer $TOKEN"
# 응답: {"status": "success", "code": 200, "data": {"items": [...], "total": 1}}
# ✅ 체크리스트: elderly 기반 필터링, 페이지네이션 확인

# 12. GET /api/calls/{call_id} - 통화 상세 조회
curl -X GET http://localhost:8000/api/calls/$CALL_ID \
  -H "Authorization: Bearer $TOKEN"
# 응답: {"status": "success", "code": 200, "data": {...}}
```

#### 메시지 (Messages)
```bash
# 13. WebSocket 연결 및 메시지 송수신
# wscat 설치
npm install -g wscat

# WebSocket 연결
wscat -c "ws://localhost:8000/ws/$CALL_ID" --header "Authorization: Bearer $TOKEN"

# 메시지 전송 (CLI에서)
> {"type": "user", "role": "user", "content": "안녕하세요"}

# 응답 대기 (Claude API로부터)
< {"type": "assistant", "role": "assistant", "content": "안녕하세요..."}

# ✅ 체크리스트:
# - WebSocket 연결 확인
# - 메시지 저장 확인 (db에 저장되는지 check)
# - Claude API 스트리밍 확인
```

#### 통화 종료 및 분석
```bash
# 14. PUT /api/calls/{call_id}/end - 통화 종료
curl -X PUT http://localhost:8000/api/calls/$CALL_ID/end \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 300
  }'
# 응답: {"status": "success", "code": 200, "data": {"id": 1, "status": "completed", ...}}
# ✅ 체크리스트: 통화 상태가 'completed'로 변경, 분석 시작

# 15. GET /api/calls/{call_id}/analysis - 분석 결과 조회
curl -X GET http://localhost:8000/api/calls/$CALL_ID/analysis \
  -H "Authorization: Bearer $TOKEN"
# 응답: {"status": "success", "code": 200, "data": {"risk_level": "low", "sentiment_score": 0.8, "summary": "...", "recommendations": [...]}}
# ✅ 체크리스트: 분석 결과가 저장되고 조회되는지 확인
```

---

## 🚨 PRIORITY 2: 테스트 코드 작성 (12/25-12/26)

### Task 2.1: pytest 테스트 케이스 추가

```bash
# 테스트 라이브러리 설치
pip install pytest pytest-asyncio pytest-cov httpx

# 테스트 실행
pytest tests/ -v

# 커버리지 리포트
pytest tests/ --cov=app --cov-report=html
# htmlcov/index.html 열어서 확인
```

### Task 2.2: tests/test_auth.py 확장

```python
# 다음 테스트 케이스 추가:

def test_register_with_invalid_email():
    """이메일 형식이 잘못된 경우"""
    response = client.post("/api/auth/register", json={
        "email": "invalid-email",
        "password": "ValidPassword123",
        "full_name": "Test"
    })
    assert response.status_code == 422  # Validation Error

def test_register_with_weak_password():
    """비밀번호가 약한 경우 (숫자/대문자 없음)"""
    response = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "onlysmallletters",
        "full_name": "Test"
    })
    assert response.status_code == 422

def test_register_duplicate_email():
    """이미 등록된 이메일로 회원가입"""
    client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "ValidPassword123",
        "full_name": "Test"
    })
    response = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "ValidPassword123",
        "full_name": "Test"
    })
    assert response.status_code == 400  # Conflict

def test_login_with_wrong_password():
    """잘못된 비밀번호로 로그인"""
    # 먼저 사용자 생성
    client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "ValidPassword123",
        "full_name": "Test"
    })
    # 잘못된 비밀번호로 로그인
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "WrongPassword"
    })
    assert response.status_code == 401  # Unauthorized

def test_login_nonexistent_user():
    """존재하지 않는 사용자로 로그인"""
    response = client.post("/api/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "Password123"
    })
    assert response.status_code == 401

def test_refresh_token_invalid():
    """유효하지 않은 refresh token"""
    response = client.post("/api/auth/refresh", headers={
        "Authorization": "Bearer invalid-token"
    })
    assert response.status_code == 401

def test_get_current_user_unauthorized():
    """토큰 없이 /auth/me 호출"""
    response = client.get("/api/auth/me")
    assert response.status_code == 401

def test_get_current_user_invalid_token():
    """유효하지 않은 토큰으로 /auth/me 호출"""
    response = client.get("/api/auth/me", headers={
        "Authorization": "Bearer invalid-token"
    })
    assert response.status_code == 401
```

### Task 2.3: tests/test_elderly.py 작성

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_create_elderly_success():
    """어르신 생성 성공"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 먼저 회원가입
        reg_response = await client.post("/api/auth/register", json={
            "email": "caregiver@example.com",
            "password": "Password123",
            "full_name": "Caregiver"
        })
        token = reg_response.json()["data"]["access_token"]
        
        # 어르신 등록
        response = await client.post(
            "/api/elderly",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Kim Young-Hee",
                "age": 75,
                "phone": "010-1234-5678",
                "call_schedule": {"enabled": True, "times": ["09:00"]},
                "health_condition": "Good",
                "risk_level": "low"
            }
        )
        assert response.status_code == 201
        assert response.json()["data"]["name"] == "Kim Young-Hee"
        assert response.json()["data"]["caregiver_id"] > 0

@pytest.mark.asyncio
async def test_get_elderly_permission_denied():
    """다른 caregiver의 어르신 조회 - 권한 거부"""
    # 구현: 두 명의 caregiver 생성, 하나는 어르신 등록,
    # 다른 하나는 접근 시도 → 403 확인

@pytest.mark.asyncio
async def test_update_elderly_not_found():
    """존재하지 않는 어르신 수정"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 로그인
        reg_response = await client.post("/api/auth/register", json={
            "email": "test@example.com",
            "password": "Password123",
            "full_name": "Test"
        })
        token = reg_response.json()["data"]["access_token"]
        
        # 존재하지 않는 elderly 수정
        response = await client.put(
            "/api/elderly/9999",
            headers={"Authorization": f"Bearer {token}"},
            json={"age": 80}
        )
        assert response.status_code == 404

@pytest.mark.asyncio
async def test_delete_elderly():
    """어르신 삭제"""
    # 구현: 어르신 생성 후 삭제, 204 확인
```

### Task 2.4: tests/test_websocket.py 작성

```python
@pytest.mark.asyncio
async def test_websocket_message_flow():
    """WebSocket 메시지 흐름"""
    # 구현:
    # 1. 사용자 로그인
    # 2. 통화 생성
    # 3. WebSocket 연결
    # 4. 메시지 전송 및 수신
    # 5. Claude API 응답 확인

@pytest.mark.asyncio
async def test_websocket_unauthorized():
    """토큰 없이 WebSocket 연결 시도"""
    # 구현: WebSocket 연결 실패 확인 (403 또는 연결 거부)
```

---

## 🚨 PRIORITY 3: 에러 처리 및 로깅 (12/27)

### Task 3.1: 에러 처리 강화

```python
# app/core/exceptions.py 에서 다음 예외 처리 추가

class InvalidEmailFormatException(Exception):
    """이메일 형식 검증 실패"""
    pass

class WeakPasswordException(Exception):
    """비밀번호 규칙 미충족 (대문자, 숫자 포함 필요)"""
    pass

class DuplicateEmailException(Exception):
    """이미 등록된 이메일"""
    pass

# app/routes/auth.py에서 다음과 같이 사용
@router.post("/register")
async def register(user: UserRegisterSchema):
    # 이메일 형식 검증
    if not validate_email(user.email):
        raise InvalidEmailFormatException("Invalid email format")
    
    # 비밀번호 규칙 검증
    if not validate_password(user.password):
        raise WeakPasswordException("Password must contain uppercase, lowercase, and numbers")
    
    # 중복 확인
    existing_user = await db.get_user_by_email(user.email)
    if existing_user:
        raise DuplicateEmailException("Email already registered")
```

### Task 3.2: 로깅 설정

```python
# app/core/logging.py 생성
import logging
from logging.handlers import RotatingFileHandler

def setup_logging():
    logger = logging.getLogger("sori")
    logger.setLevel(logging.DEBUG)
    
    # 파일 핸들러
    file_handler = RotatingFileHandler(
        "logs/sori.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=10
    )
    file_handler.setLevel(logging.DEBUG)
    
    # 콘솔 핸들러
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    
    # 포매터
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

# app/main.py에서
from app.core.logging import setup_logging
logger = setup_logging()
```

---

## 🧪 최종 검증 체크리스트

### 엔드포인트 검증
- [ ] 15개 엔드포인트 모두 curl/Postman으로 테스트 완료
- [ ] 각 엔드포인트별 성공/실패 케이스 모두 확인
- [ ] 응답 포맷 통일: `{status, code, message, data}`

### 테스트 커버리지
- [ ] pytest 테스트 커버리지 > 80%
- [ ] `pytest tests/ --cov=app --cov-report=html` 실행 후 htmlcov/index.html 확인
- [ ] 모든 주요 로직에 테스트 존재

### 데이터베이스
- [ ] 5개 테이블 모두 생성 확인: users, elderly, calls, messages, call_analysis
- [ ] 인덱스 생성 확인
- [ ] 샘플 데이터 삽입 및 조회 확인

### 보안
- [ ] 비밀번호는 bcrypt로 해싱 확인
- [ ] JWT 토큰 signature 검증
- [ ] CORS 설정 확인 (Frontend URL 허용)
- [ ] 권한 검증 (caregiver_id 기반)

### 성능
- [ ] 응답 시간 < 200ms
- [ ] WebSocket 지연 < 100ms
- [ ] 메모리 누수 없음 (무한 루프 체크)

---

**다음 단계:** 모든 체크리스트 항목이 완료되면 Session 2 (Frontend)로 진행합니다!