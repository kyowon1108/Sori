import logging
import os
from logging.handlers import RotatingFileHandler
from app.core.config import settings


def setup_logging():
    # logs 디렉토리 생성
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    logger = logging.getLogger("sori")
    logger.setLevel(logging.DEBUG if settings.ENVIRONMENT == "development" else logging.INFO)

    # 기존 핸들러 제거
    logger.handlers.clear()

    # 파일 핸들러
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, "sori.log"),
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=10,
        encoding="utf-8"
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


def get_logger(name: str = "sori"):
    return logging.getLogger(name)
