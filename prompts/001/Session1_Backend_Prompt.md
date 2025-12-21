# 🔴 SESSION 1: BACKEND API (FastAPI) - 구현 Prompt

**목표:** FastAPI 기반 완전한 Backend API 서버 구현  
**기한:** 2025-01-31  
**역할:** Backend 개발자  
**협력:** Frontend, iOS는 이 API를 호출하므로 정확한 구현 필수  

---

## 📋 최우선 준수 규칙

### 🚫 MUST DO / MUST NOT
1. **데이터 모델 준수** (완벽한 일치 필수)
   - users, elderly, calls, messages, call_analysis 테이블
   - 필드명, 타입, 기본값 일치
   
2. **API 엔드포인트 정확성** (15개 정확히)
   - 경로, HTTP 메서드, 요청/응답 포맷 일치
   - 응답: {status, code, message, data}

3. **JWT 토큰 관리** (HS256, 24h/7d)
   - access_token: 24시간 만료
   - refresh_token: 7일 만료
   - sub: user_id, email 포함

4. **권한 검증** (매우 중요!)
   - get_current_user() 미들웨어로 모든 protected route 검증
   - elderly, calls 조회 시 caregiver_id 확인 (다른 사용자 데이터 접근 방지)

5. **에러 처리** (명확한 메시지)
   - 400: 입력 검증 실패
   - 401: 인증 필요 (토큰 없음/만료)
   - 403: 권한 없음
   - 404: 리소스 없음
   - 500: 서버 에러

---

## 🛠️ 개발 순서 (Phase별)

### **Phase 1: 기초 설정 (2-3일)**

#### 1.1 프로젝트 초기화
```bash
mkdir sori-backend && cd sori-backend

# 가상환경
python -m venv venv
source venv/bin/activate

# 패키지 설치
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic python-jose[cryptography] bcrypt python-multipart anthropic python-dotenv pytest pytest-asyncio httpx

pip freeze > requirements.txt
```

#### 1.2 폴더 구조 생성
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 앱 진입점
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py           # 환경 변수
│   │   ├── security.py         # JWT, bcrypt
│   │   └── exceptions.py       # 커스텀 예외
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py             # User ORM
│   │   ├── elderly.py          # Elderly ORM
│   │   ├── call.py             # Call ORM
│   │   ├── message.py          # Message ORM
│   │   └── call_analysis.py    # CallAnalysis ORM
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py             # Auth Pydantic models
│   │   ├── elderly.py
│   │   └── call.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py             # /api/auth/* 엔드포인트
│   │   ├── elderly.py          # /api/elderly/* 엔드포인트
│   │   ├── calls.py            # /api/calls/* 엔드포인트
│   │   └── websocket.py        # /ws/{call_id}
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth.py             # 인증 로직
│   │   └── claude_ai.py        # Claude API 호출
│   ├── database.py             # SQLAlchemy 설정
│   └── dependencies.py         # Depends 함수들
├── tests/
│   ├── __init__.py
│   ├── conftest.py             # pytest 설정
│   └── test_*.py               # 테스트 파일들
├── .env                        # 환경 변수
├── .gitignore
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── README.md
```

#### 1.3 .env 파일 작성
```env
# Database
DATABASE_URL=postgresql://sori_user:sori_password@localhost:5432/sori_db

# JWT
SECRET_KEY=your-super-secret-key-at-least-32-chars-long-for-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=24
REFRESH_TOKEN_EXPIRE_DAYS=7

# Claude API
CLAUDE_API_KEY=sk-ant-xxxxx...  # Anthropic API 키

# CORS
FRONTEND_URL=http://localhost:3000
IOS_BUNDLE_ID=com.sori.app

# Firebase (푸시 알림)
FIREBASE_CREDENTIALS_PATH=./firebase-key.json

# Server
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO

# Environment
ENVIRONMENT=development
```

#### 1.4 main.py (FastAPI 앱 초기화)
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.database import engine, Base
from app.routes import auth, elderly, calls, websocket

# 데이터베이스 테이블 생성
Base.metadata.create_all(bind=engine)

# FastAPI 앱 생성
app = FastAPI(
    title="Sori API",
    description="AI-based elderly counseling system",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS 미들웨어
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Frontend dev
        "http://localhost:8080",      # iOS dev
        settings.FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 신뢰 호스트 미들웨어
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "api.sori.com"]
)

# 라우터 포함
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(elderly.router, prefix="/api/elderly", tags=["elderly"])
app.include_router(calls.router, prefix="/api/calls", tags=["calls"])
app.include_router(websocket.router, tags=["websocket"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.ENVIRONMENT == "development"
    )
```

#### 1.5 database.py (SQLAlchemy 설정)
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    pool_pre_ping=True,  # Connection 유효성 검사
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### 1.6 core/config.py (환경 설정)
```python
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Claude API
    CLAUDE_API_KEY: str
    
    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    IOS_BUNDLE_ID: str = "com.sori.app"
    
    # Firebase
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None
    
    # Server
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    LOG_LEVEL: str = "INFO"
    
    # Environment
    ENVIRONMENT: str = "development"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

#### 1.7 core/security.py (JWT & bcrypt)
```python
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from typing import Optional

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(user_id: int, email: str) -> str:
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "type": "access",
    }
    expire = datetime.utcnow() + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt

def create_refresh_token(user_id: int, email: str) -> str:
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "type": "refresh",
    }
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
```

#### 1.8 core/exceptions.py (커스텀 예외)
```python
from fastapi import HTTPException, status

class APIError(HTTPException):
    def __init__(self, status_code: int, message: str, details: dict = None):
        self.status_code = status_code
        self.detail = {
            "status": "error",
            "code": status_code,
            "message": message,
            "errors": details or {}
        }
        super().__init__(status_code=status_code, detail=self.detail)

class InvalidCredentialsError(APIError):
    def __init__(self):
        super().__init__(status.HTTP_401_UNAUTHORIZED, "이메일 또는 비밀번호가 잘못되었습니다")

class EmailAlreadyExistsError(APIError):
    def __init__(self):
        super().__init__(status.HTTP_400_BAD_REQUEST, "이미 가입된 이메일입니다")

class InvalidTokenError(APIError):
    def __init__(self):
        super().__init__(status.HTTP_401_UNAUTHORIZED, "토큰이 유효하지 않습니다")

class NotFoundError(APIError):
    def __init__(self, resource: str):
        super().__init__(status.HTTP_404_NOT_FOUND, f"{resource}를(을) 찾을 수 없습니다")

class ForbiddenError(APIError):
    def __init__(self):
        super().__init__(status.HTTP_403_FORBIDDEN, "이 작업을 수행할 권한이 없습니다")
```

---

### **Phase 2: 데이터 모델 (2-3일)**

#### 2.1 models/user.py
```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="caregiver")
    
    # 모바일 푸시 알림
    fcm_token = Column(String(512), nullable=True)
    device_type = Column(String(20), nullable=True)  # 'ios', 'android', 'web'
    push_enabled = Column(Boolean, default=True)
    fcm_token_updated_at = Column(DateTime, nullable=True)
    
    # 메타데이터
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계
    elderly = relationship("Elderly", back_populates="caregiver", cascade="all, delete-orphan")
```

#### 2.2 models/elderly.py
```python
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base

class Elderly(Base):
    __tablename__ = "elderly"
    
    id = Column(Integer, primary_key=True, index=True)
    caregiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 기본 정보
    name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=True)
    phone = Column(String(20), nullable=True)
    
    # 통화 관련
    call_schedule = Column(JSON, default={"enabled": True, "times": ["09:00", "14:00", "19:00"]})
    
    # 건강 정보
    health_condition = Column(Text, nullable=True)
    medications = Column(JSON, nullable=True)
    emergency_contact = Column(String(255), nullable=True)
    
    # 상태 정보
    risk_level = Column(String(20), default="low")  # 'low', 'medium', 'high', 'critical'
    notes = Column(Text, nullable=True)
    
    # 메타데이터
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계
    caregiver = relationship("User", back_populates="elderly")
    calls = relationship("Call", back_populates="elderly", cascade="all, delete-orphan")
```

#### 2.3 models/call.py
```python
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base

class Call(Base):
    __tablename__ = "calls"
    
    id = Column(Integer, primary_key=True, index=True)
    elderly_id = Column(Integer, ForeignKey("elderly.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 통화 정보
    call_type = Column(String(50), default="voice")
    started_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    duration = Column(Integer, nullable=True)  # seconds
    
    # 상태
    status = Column(String(50), default="in_progress")  # 'in_progress', 'completed', 'failed', 'cancelled'
    is_successful = Column(Boolean, default=True)
    
    # 메타데이터
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 관계
    elderly = relationship("Elderly", back_populates="calls")
    messages = relationship("Message", back_populates="call", cascade="all, delete-orphan")
    analysis = relationship("CallAnalysis", back_populates="call", uselist=False, cascade="all, delete-orphan")
```

#### 2.4 models/message.py
```python
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 메시지 정보
    role = Column(String(50), nullable=False)  # 'user', 'assistant'
    content = Column(Text, nullable=False)
    
    # 메타데이터
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 관계
    call = relationship("Call", back_populates="messages")
```

#### 2.5 models/call_analysis.py
```python
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base

class CallAnalysis(Base):
    __tablename__ = "call_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # 분석 결과
    risk_level = Column(String(20), default="low")  # 'low', 'medium', 'high', 'critical'
    sentiment_score = Column(Float, default=0.0)  # -1.0 ~ 1.0
    summary = Column(Text, nullable=True)
    recommendations = Column(JSON, nullable=True)
    
    # 메타데이터
    analyzed_at = Column(DateTime, default=datetime.utcnow)
    
    # 관계
    call = relationship("Call", back_populates="analysis")
```

---

### **Phase 3: Pydantic Schemas (1-2일)**

#### 3.1 schemas/auth.py
```python
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    
    @field_validator('password')
    @classmethod
    def password_strong(cls, v):
        if len(v) < 8:
            raise ValueError('비밀번호는 최소 8자 이상이어야 합니다')
        if not any(c.isupper() for c in v):
            raise ValueError('비밀번호는 최소 1개의 대문자를 포함해야 합니다')
        if not any(c.isdigit() for c in v):
            raise ValueError('비밀번호는 최소 1개의 숫자를 포함해야 합니다')
        return v

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    fcm_token: Optional[str] = None
    device_type: Optional[str] = None
    push_enabled: bool
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserResponse

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class FCMTokenUpdateRequest(BaseModel):
    fcm_token: str
    device_type: str  # 'ios', 'android', 'web'
```

#### 3.2 schemas/elderly.py
```python
from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime

class CallSchedule(BaseModel):
    enabled: bool = True
    times: List[str] = []  # ["09:00", "14:00"]

class ElderlyCreateRequest(BaseModel):
    name: str
    age: Optional[int] = None
    phone: Optional[str] = None
    call_schedule: Optional[CallSchedule] = None
    health_condition: Optional[str] = None
    medications: Optional[List[Dict[str, Any]]] = None
    emergency_contact: Optional[str] = None
    notes: Optional[str] = None

class ElderlyUpdateRequest(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    phone: Optional[str] = None
    call_schedule: Optional[CallSchedule] = None
    health_condition: Optional[str] = None
    medications: Optional[List[Dict[str, Any]]] = None
    emergency_contact: Optional[str] = None
    notes: Optional[str] = None

class ElderlyResponse(BaseModel):
    id: int
    caregiver_id: int
    name: str
    age: Optional[int] = None
    phone: Optional[str] = None
    call_schedule: Dict[str, Any]
    health_condition: Optional[str] = None
    medications: Optional[List[Dict[str, Any]]] = None
    emergency_contact: Optional[str] = None
    risk_level: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
```

#### 3.3 schemas/call.py
```python
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class MessageResponse(BaseModel):
    id: int
    call_id: int
    role: str  # 'user', 'assistant'
    content: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class CallAnalysisResponse(BaseModel):
    id: int
    call_id: int
    risk_level: str
    sentiment_score: float
    summary: Optional[str] = None
    recommendations: Optional[List[str]] = None
    analyzed_at: datetime
    
    class Config:
        from_attributes = True

class CallCreateRequest(BaseModel):
    elderly_id: int
    call_type: str = "voice"

class CallStartResponse(BaseModel):
    id: int
    elderly_id: int
    call_type: str
    started_at: datetime
    status: str
    ws_url: str

class CallDetailResponse(BaseModel):
    id: int
    elderly_id: int
    call_type: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration: Optional[int] = None
    status: str
    is_successful: bool
    messages: List[MessageResponse] = []
    analysis: Optional[CallAnalysisResponse] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class CallListResponse(BaseModel):
    id: int
    elderly_id: int
    call_type: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration: Optional[int] = None
    status: str
    is_successful: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
```

---

### **Phase 4: 인증 로직 (2-3일)**

#### 4.1 services/auth.py
```python
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.auth import UserRegisterRequest, UserLoginRequest
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, verify_token
from app.core.exceptions import EmailAlreadyExistsError, InvalidCredentialsError, InvalidTokenError

class AuthService:
    @staticmethod
    def register(db: Session, user_data: UserRegisterRequest):
        # 이메일 중복 확인
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise EmailAlreadyExistsError()
        
        # 새 사용자 생성
        new_user = User(
            email=user_data.email,
            password_hash=get_password_hash(user_data.password),
            full_name=user_data.full_name,
            role="caregiver"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    
    @staticmethod
    def login(db: Session, email: str, password: str):
        user = db.query(User).filter(User.email == email).first()
        if not user or not verify_password(password, user.password_hash):
            raise InvalidCredentialsError()
        
        access_token = create_access_token(user.id, user.email)
        refresh_token = create_refresh_token(user.id, user.email)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user
        }
    
    @staticmethod
    def refresh_tokens(refresh_token: str):
        payload = verify_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise InvalidTokenError()
        
        user_id = int(payload.get("sub"))
        email = payload.get("email")
        
        new_access_token = create_access_token(user_id, email)
        new_refresh_token = create_refresh_token(user_id, email)
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token
        }
```

#### 4.2 routes/auth.py
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.auth import (
    UserRegisterRequest, UserLoginRequest, UserResponse,
    TokenResponse, RefreshTokenRequest, FCMTokenUpdateRequest
)
from app.services.auth import AuthService
from app.models.user import User
from app.core.exceptions import EmailAlreadyExistsError, InvalidTokenError

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegisterRequest, db: Session = Depends(get_db)):
    """새 사용자 회원가입"""
    try:
        user = AuthService.register(db, user_data)
        return user
    except EmailAlreadyExistsError as e:
        raise e

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLoginRequest, db: Session = Depends(get_db)):
    """사용자 로그인"""
    result = AuthService.login(db, credentials.email, credentials.password)
    return TokenResponse(
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
        user=result["user"]
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """토큰 갱신"""
    try:
        tokens = AuthService.refresh_tokens(request.refresh_token)
        # 새 토큰에서 user_id 추출해서 user 정보 조회
        # (여기서는 간단히 처리, 실제로는 better 방법 있음)
        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            user={}  # 간단하게 처리
        )
    except InvalidTokenError as e:
        raise e

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """현재 사용자 정보 조회"""
    return current_user

@router.post("/update-fcm-token")
async def update_fcm_token(
    request: FCMTokenUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """FCM 토큰 업데이트"""
    current_user.fcm_token = request.fcm_token
    current_user.device_type = request.device_type
    db.add(current_user)
    db.commit()
    return {"message": "FCM 토큰이 업데이트되었습니다"}
```

#### 4.3 dependencies.py (get_current_user 미들웨어)
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from sqlalchemy.orm import Session
from jose import JWTError

from app.database import get_db
from app.core.security import verify_token
from app.models.user import User
from app.core.exceptions import InvalidTokenError

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """현재 사용자 조회 (토큰 검증)"""
    token = credentials.credentials
    
    payload = verify_token(token)
    if not payload or payload.get("type") == "refresh":
        raise InvalidTokenError()
    
    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise InvalidTokenError()
    
    return user
```

---

### **Phase 5: 어르신 관리 (2-3일)**

#### 5.1 services/elderly.py (CRUD 로직)
```python
from sqlalchemy.orm import Session
from app.models.elderly import Elderly
from app.schemas.elderly import ElderlyCreateRequest, ElderlyUpdateRequest
from app.core.exceptions import NotFoundError, ForbiddenError

class ElderlyService:
    @staticmethod
    def create(db: Session, elderly_data: ElderlyCreateRequest, caregiver_id: int):
        new_elderly = Elderly(
            caregiver_id=caregiver_id,
            name=elderly_data.name,
            age=elderly_data.age,
            phone=elderly_data.phone,
            call_schedule=elderly_data.call_schedule.model_dump() if elderly_data.call_schedule else None,
            health_condition=elderly_data.health_condition,
            medications=elderly_data.medications,
            emergency_contact=elderly_data.emergency_contact,
            notes=elderly_data.notes
        )
        db.add(new_elderly)
        db.commit()
        db.refresh(new_elderly)
        return new_elderly
    
    @staticmethod
    def get_list(db: Session, caregiver_id: int, skip: int = 0, limit: int = 10):
        return db.query(Elderly)\
            .filter(Elderly.caregiver_id == caregiver_id)\
            .offset(skip)\
            .limit(limit)\
            .all()
    
    @staticmethod
    def get_by_id(db: Session, elderly_id: int, caregiver_id: int):
        elderly = db.query(Elderly).filter(Elderly.id == elderly_id).first()
        if not elderly:
            raise NotFoundError("어르신")
        if elderly.caregiver_id != caregiver_id:
            raise ForbiddenError()
        return elderly
    
    @staticmethod
    def update(db: Session, elderly_id: int, caregiver_id: int, elderly_data: ElderlyUpdateRequest):
        elderly = ElderlyService.get_by_id(db, elderly_id, caregiver_id)
        
        update_data = elderly_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if key == "call_schedule" and value:
                setattr(elderly, key, value.model_dump())
            elif value is not None:
                setattr(elderly, key, value)
        
        db.add(elderly)
        db.commit()
        db.refresh(elderly)
        return elderly
    
    @staticmethod
    def delete(db: Session, elderly_id: int, caregiver_id: int):
        elderly = ElderlyService.get_by_id(db, elderly_id, caregiver_id)
        db.delete(elderly)
        db.commit()
        return True
```

#### 5.2 routes/elderly.py (엔드포인트)
```python
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.elderly import ElderlyCreateRequest, ElderlyUpdateRequest, ElderlyResponse
from app.services.elderly import ElderlyService

router = APIRouter()

@router.get("", response_model=list[ElderlyResponse])
async def list_elderly(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """현재 사용자의 어르신 목록 조회"""
    return ElderlyService.get_list(db, current_user.id, skip, limit)

@router.get("/{elderly_id}", response_model=ElderlyResponse)
async def get_elderly(
    elderly_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """어르신 상세 조회"""
    return ElderlyService.get_by_id(db, elderly_id, current_user.id)

@router.post("", response_model=ElderlyResponse, status_code=status.HTTP_201_CREATED)
async def create_elderly(
    elderly_data: ElderlyCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """새 어르신 등록"""
    return ElderlyService.create(db, elderly_data, current_user.id)

@router.put("/{elderly_id}", response_model=ElderlyResponse)
async def update_elderly(
    elderly_id: int,
    elderly_data: ElderlyUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """어르신 정보 수정"""
    return ElderlyService.update(db, elderly_id, current_user.id, elderly_data)

@router.delete("/{elderly_id}", status_code=status.HTTP_200_OK)
async def delete_elderly(
    elderly_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """어르신 삭제"""
    ElderlyService.delete(db, elderly_id, current_user.id)
    return {"message": "어르신이 삭제되었습니다"}
```

---

### **Phase 6: 통화 관리 (2-3일)**

#### 6.1 services/calls.py
```python
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.call import Call
from app.models.message import Message
from app.models.elderly import Elderly
from app.schemas.call import CallCreateRequest, CallDetailResponse
from app.core.exceptions import NotFoundError, ForbiddenError

class CallService:
    @staticmethod
    def start_call(db: Session, call_data: CallCreateRequest, caregiver_id: int):
        # 어르신이 해당 caregiver의 것인지 확인
        elderly = db.query(Elderly).filter(Elderly.id == call_data.elderly_id).first()
        if not elderly or elderly.caregiver_id != caregiver_id:
            raise ForbiddenError()
        
        # 새 통화 레코드 생성
        new_call = Call(
            elderly_id=call_data.elderly_id,
            call_type=call_data.call_type,
            started_at=datetime.utcnow(),
            status="in_progress"
        )
        db.add(new_call)
        db.commit()
        db.refresh(new_call)
        
        return new_call
    
    @staticmethod
    def get_list(db: Session, caregiver_id: int, elderly_id: int = None, skip: int = 0, limit: int = 10):
        query = db.query(Call).join(Elderly).filter(Elderly.caregiver_id == caregiver_id)
        
        if elderly_id:
            query = query.filter(Call.elderly_id == elderly_id)
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def get_by_id(db: Session, call_id: int, caregiver_id: int):
        call = db.query(Call).join(Elderly).filter(Call.id == call_id).first()
        if not call:
            raise NotFoundError("통화")
        if call.elderly.caregiver_id != caregiver_id:
            raise ForbiddenError()
        return call
    
    @staticmethod
    def end_call(db: Session, call_id: int, caregiver_id: int):
        call = CallService.get_by_id(db, call_id, caregiver_id)
        
        call.ended_at = datetime.utcnow()
        call.duration = int((call.ended_at - call.started_at).total_seconds())
        call.status = "completed"
        
        db.add(call)
        db.commit()
        db.refresh(call)
        
        return call
    
    @staticmethod
    def save_message(db: Session, call_id: int, role: str, content: str):
        message = Message(
            call_id=call_id,
            role=role,
            content=content
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        return message
```

#### 6.2 routes/calls.py
```python
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.call import CallCreateRequest, CallStartResponse, CallDetailResponse, CallListResponse
from app.services.calls import CallService

router = APIRouter()

@router.get("", response_model=list[CallListResponse])
async def list_calls(
    elderly_id: int = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """통화 목록 조회"""
    return CallService.get_list(db, current_user.id, elderly_id, skip, limit)

@router.get("/{call_id}", response_model=CallDetailResponse)
async def get_call(
    call_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """통화 상세 조회 (메시지 + 분석)"""
    return CallService.get_by_id(db, call_id, current_user.id)

@router.post("/start", response_model=CallStartResponse, status_code=status.HTTP_201_CREATED)
async def start_call(
    call_data: CallCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """새 통화 시작"""
    call = CallService.start_call(db, call_data, current_user.id)
    return CallStartResponse(
        id=call.id,
        elderly_id=call.elderly_id,
        call_type=call.call_type,
        started_at=call.started_at,
        status=call.status,
        ws_url=f"ws://localhost:8000/ws/{call.id}"  # 실제로는 환경변수 사용
    )

@router.post("/{call_id}/end")
async def end_call(
    call_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """통화 종료 + 분석"""
    call = CallService.end_call(db, call_id, current_user.id)
    # 여기서 Claude API로 분석 실행 (Phase 7에서 구현)
    return {"message": "통화가 종료되었습니다", "call_id": call.id}
```

---

### **Phase 7: WebSocket + Claude API 통합 (3-5일)**

#### 7.1 services/claude_ai.py
```python
import anthropic
from app.core.config import settings

class ClaudeService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)
    
    async def stream_chat_response(self, messages: list) -> str:
        """Claude API를 사용한 스트리밍 응답"""
        system_prompt = """당신은 친절하고 감정적으로 공감하는 AI 상담사입니다.
어르신들의 이야기를 경청하고, 그들의 감정에 공감하며, 긍정적인 격려를 제공합니다.
항상 존댓말을 사용하고, 어르신의 건강과 안전을 최우선으로 고려합니다."""
        
        formatted_messages = [
            {
                "role": msg["role"],
                "content": msg["content"]
            }
            for msg in messages
        ]
        
        full_response = ""
        with self.client.messages.stream(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            system=system_prompt,
            messages=formatted_messages
        ) as stream:
            for text in stream.text_stream:
                full_response += text
                yield text
        
        return full_response
    
    async def analyze_call(self, messages: list) -> dict:
        """통화 분석"""
        analysis_prompt = f"""다음 상담 대화를 분석해주세요.

대화 내용:
{self._format_messages(messages)}

다음 항목을 JSON 형식으로 제공해주세요:
{{
  "risk_level": "low|medium|high|critical",
  "sentiment_score": -1.0 ~ 1.0,
  "summary": "대화 요약",
  "recommendations": ["추천사항1", "추천사항2"]
}}"""
        
        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": analysis_prompt
                }
            ]
        )
        
        # JSON 파싱 (실제 구현에서는 regex 사용)
        import json
        return json.loads(response.content[0].text)
    
    def _format_messages(self, messages: list) -> str:
        return "\n".join([
            f"{'사용자' if m['role'] == 'user' else 'AI'}: {m['content']}"
            for m in messages
        ])
```

#### 7.2 routes/websocket.py (실시간 채팅)
```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.orm import Session
from jose import JWTError
import json

from app.database import SessionLocal, get_db
from app.core.security import verify_token
from app.models.call import Call
from app.models.message import Message
from app.models.elderly import Elderly
from app.services.claude_ai import ClaudeService
from app.services.calls import CallService

router = APIRouter()
claude_service = ClaudeService()

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}
    
    async def connect(self, websocket: WebSocket, call_id: int):
        await websocket.accept()
        self.active_connections[call_id] = websocket
    
    def disconnect(self, call_id: int):
        if call_id in self.active_connections:
            del self.active_connections[call_id]
    
    async def broadcast(self, call_id: int, message: dict):
        if call_id in self.active_connections:
            await self.active_connections[call_id].send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/{call_id}")
async def websocket_endpoint(websocket: WebSocket, call_id: int, token: str = Query(...)):
    """WebSocket 실시간 채팅"""
    # 토큰 검증
    payload = verify_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    db = SessionLocal()
    try:
        # Call 존재 확인
        call = db.query(Call).filter(Call.id == call_id).first()
        if not call:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        await manager.connect(websocket, call_id)
        
        # 기존 메시지 로드
        existing_messages = db.query(Message)\
            .filter(Message.call_id == call_id)\
            .all()
        
        messages_list = [
            {"role": m.role, "content": m.content}
            for m in existing_messages
        ]
        
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "message":
                user_message = message_data.get("content")
                
                # 사용자 메시지 저장
                user_msg = CallService.save_message(
                    db, call_id, "user", user_message
                )
                messages_list.append({"role": "user", "content": user_message})
                
                # Claude API 호출 (스트리밍)
                full_response = ""
                async for chunk in claude_service.stream_chat_response(messages_list):
                    await manager.broadcast(call_id, {
                        "type": "message",
                        "role": "assistant",
                        "content": chunk,
                        "is_streaming": True
                    })
                    full_response += chunk
                
                # AI 응답 저장
                ai_msg = CallService.save_message(
                    db, call_id, "assistant", full_response
                )
                messages_list.append({"role": "assistant", "content": full_response})
                
                # 스트리밍 완료
                await manager.broadcast(call_id, {
                    "type": "message",
                    "role": "assistant",
                    "content": full_response,
                    "is_streaming": False
                })
    
    except WebSocketDisconnect:
        manager.disconnect(call_id)
    except Exception as e:
        manager.disconnect(call_id)
        await websocket.close(code=status.WS_1011_SERVER_ERROR)
    finally:
        db.close()
```

---

### **Phase 8: 테스트 및 배포 (2-3일)**

#### 8.1 Docker 설정 (Dockerfile)
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 코드 복사
COPY app/ ./app/
COPY .env .

# 포트 노출
EXPOSE 8000

# 실행
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 8.2 Docker Compose (로컬 개발용)
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: sori_user
      POSTGRES_PASSWORD: sori_password
      POSTGRES_DB: sori_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: .
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://sori_user:sori_password@postgres:5432/sori_db
      CLAUDE_API_KEY: ${CLAUDE_API_KEY}
      SECRET_KEY: ${SECRET_KEY}
    depends_on:
      - postgres
    volumes:
      - .:/app

volumes:
  postgres_data:
```

#### 8.3 requirements.txt
```
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
pydantic==2.5.0
pydantic-settings==2.1.0
pydantic[email]==2.5.0
python-jose[cryptography]==3.3.0
bcrypt==4.1.1
python-multipart==0.0.6
anthropic==0.7.0
python-dotenv==1.0.0
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.2
```

---

## 🧪 테스트 기준 (필수!)

### Backend 테스트 체크리스트
- [ ] 모든 15개 엔드포인트 동작 확인
- [ ] JWT 토큰 생성/검증/갱신
- [ ] 비밀번호 해싱 (bcrypt)
- [ ] 권한 검증 (caregiver_id 확인)
- [ ] WebSocket 연결/메시지/종료
- [ ] Claude API 호출 및 스트리밍
- [ ] 에러 처리 (400, 401, 403, 404, 500)
- [ ] 데이터베이스 CRUD 정상 동작
- [ ] FCM 토큰 업데이트

### 통합 테스트 시나리오
1. 회원가입 → 로그인 → 토큰 발급
2. 어르신 추가 → 수정 → 삭제
3. 통화 시작 → 메시지 송수신 → 통화 종료
4. 분석 결과 조회 및 위험도 판정

---

## 🚀 배포 명령어

```bash
# 로컬 개발
docker-compose up -d

# 데이터베이스 테이블 자동 생성 (main.py에서)
# 또는 Alembic으로 마이그레이션 (선택사항)

# 개발 서버 실행
python -m uvicorn app.main:app --reload

# 프로덕션 빌드
docker build -t sori-backend:latest .
docker run -d -p 8000:8000 --env-file .env sori-backend:latest
```

---

**🎯 완성 기준:**
- ✅ 모든 엔드포인트 구현 및 테스트 완료
- ✅ WebSocket으로 실시간 메시지 송수신
- ✅ Claude API 통합 및 스트리밍
- ✅ JWT 토큰 관리 완료
- ✅ 권한 검증 및 에러 처리
- ✅ Docker 컨테이너화
- ✅ API 문서 자동 생성 (/docs)

**다음 단계:** Frontend와 iOS는 이 Backend API를 호출하여 구현합니다!