from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import time

from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.core.exceptions import APIError
from app.database import engine, Base
from app.routes import auth, elderly, calls, websocket, pairing, pairing_public

# 로깅 설정
logger = setup_logging()

# 데이터베이스 테이블 생성
Base.metadata.create_all(bind=engine)
logger.info("Database tables created")

# FastAPI 앱 생성
app = FastAPI(
    title="Sori API",
    description="AI-based elderly counseling system",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)


# 전역 예외 핸들러
@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    logger.warning(f"API Error: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "code": 500,
            "message": "Internal server error",
            "errors": {}
        }
    )


# 요청 로깅 미들웨어
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time

    logger.info(
        f"{request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.3f}s"
    )
    return response


# CORS 미들웨어
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Frontend dev
        "http://localhost:3002",      # Frontend dev (alternate port)
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
    allowed_hosts=["localhost", "127.0.0.1", "api.sori.com", "*"]
)

# 라우터 포함
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(elderly.router, prefix="/api/elderly", tags=["elderly"])
app.include_router(pairing.router, prefix="/api/elderly", tags=["pairing"])
app.include_router(pairing_public.router, prefix="/api/pairing", tags=["pairing"])
app.include_router(calls.router, prefix="/api/calls", tags=["calls"])
app.include_router(websocket.router, tags=["websocket"])

logger.info("All routers registered")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {
        "name": "Sori API",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting server on {settings.API_HOST}:{settings.API_PORT}")
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.ENVIRONMENT == "development"
    )
