from pydantic import BaseModel
from typing import Any, Optional, Generic, TypeVar

T = TypeVar('T')


class APIResponse(BaseModel, Generic[T]):
    status: str = "success"
    code: int = 200
    message: str = "OK"
    data: Optional[T] = None


def success_response(data: Any = None, message: str = "OK", code: int = 200) -> dict:
    return {
        "status": "success",
        "code": code,
        "message": message,
        "data": data
    }


def error_response(message: str, code: int = 400, errors: dict = None) -> dict:
    return {
        "status": "error",
        "code": code,
        "message": message,
        "errors": errors or {}
    }
