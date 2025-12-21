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

    # Claude API
    CLAUDE_API_KEY: str = ""

    # OpenAI API
    OPENAI_API_KEY: str = ""

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
