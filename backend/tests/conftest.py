import pytest
import os
import sys

# 프로젝트 루트를 path에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 테스트 환경 변수 설정
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["OPENAI_API_KEY"] = "test-openai-api-key"
os.environ["ENVIRONMENT"] = "testing"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db

# 테스트용 인메모리 SQLite 데이터베이스
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    from app.main import app
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def test_user_data():
    return {
        "email": "test@example.com",
        "password": "TestPassword123",
        "full_name": "Test User"
    }


@pytest.fixture
def auth_headers(client, test_user_data):
    # 회원가입
    client.post("/api/auth/register", json=test_user_data)
    # 로그인
    response = client.post("/api/auth/login", json={
        "email": test_user_data["email"],
        "password": test_user_data["password"]
    })
    # 새로운 응답 포맷: {"status": "success", "code": 200, "data": {...}}
    token = response.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_elderly_data():
    return {
        "name": "Kim Young-Hee",
        "age": 75,
        "phone": "010-1234-5678",
        "call_schedule": {"enabled": True, "times": ["09:00", "14:00", "19:00"]},
        "health_condition": "Good",
        "medications": [],
        "emergency_contact": "010-9876-5432",
        "notes": "Prefers morning calls"
    }


# Agent testing fixtures
@pytest.fixture
def agent_config():
    """Basic agent configuration for testing."""
    from app.services.agents import AgentConfig
    return AgentConfig(
        model="gpt-4o",
        max_tokens=1024,
        max_retries=2,
        quality_threshold=0.6,
        enable_reflection=True,
        temperature=0.7,
    )


@pytest.fixture
def conversation_context():
    """Sample conversation context for testing."""
    from app.services.agents import ConversationContext
    return ConversationContext(
        conversation_id="test_call_123",
        elderly_id=1,
        elderly_name="김영희",
        elderly_age=75,
        health_condition="고혈압, 당뇨",
        medications=["혈압약", "당뇨약"],
        call_id=123,
    )


@pytest.fixture
def mock_openai_response():
    """Mock OpenAI API response for streaming."""
    class MockChoice:
        def __init__(self, content=None, finish_reason=None):
            self.delta = type('Delta', (), {'content': content, 'tool_calls': None})()
            self.finish_reason = finish_reason

    class MockChunk:
        def __init__(self, content=None, finish_reason=None):
            self.choices = [MockChoice(content, finish_reason)]

    return MockChunk


@pytest.fixture
def mock_openai_client(mock_openai_response):
    """Mock AsyncOpenAI client for testing without API calls."""
    from unittest.mock import AsyncMock, MagicMock

    async def mock_stream():
        chunks = [
            mock_openai_response("안녕"),
            mock_openai_response("하세요, "),
            mock_openai_response("김영희님!"),
            mock_openai_response(None, "stop"),
        ]
        for chunk in chunks:
            yield chunk

    client = MagicMock()
    client.chat = MagicMock()
    client.chat.completions = MagicMock()
    client.chat.completions.create = AsyncMock(return_value=mock_stream())

    return client
