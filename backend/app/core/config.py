from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # Redis (Celery broker)
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Pairing Code
    PAIRING_CODE_PEPPER: str = ""
    PAIRING_CODE_TTL_MINUTES: int = 10
    PAIRING_CODE_MAX_ATTEMPTS: int = 5
    DEVICE_TOKEN_EXPIRE_DAYS: int = 90

    # OpenAI API (primary)
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"  # 또는 gpt-4o-mini for cost efficiency

    # Claude API (legacy fallback, optional)
    CLAUDE_API_KEY: str = ""

    # Agent Configuration
    AGENT_MAX_TOKENS: int = 4096
    AGENT_MAX_RETRIES: int = 3
    AGENT_QUALITY_THRESHOLD: float = 0.7
    AGENT_ENABLE_REFLECTION: bool = True
    AGENT_TEMPERATURE: float = 0.7

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
