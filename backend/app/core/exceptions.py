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
    def __init__(self, message: str = "이 작업을 수행할 권한이 없습니다"):
        super().__init__(status.HTTP_403_FORBIDDEN, message)


# Pairing code errors
class PairingCodeError(APIError):
    def __init__(self, message: str, remaining_attempts: int = None):
        details = {}
        if remaining_attempts is not None:
            details["remaining_attempts"] = remaining_attempts
        super().__init__(status.HTTP_400_BAD_REQUEST, message, details)


class PairingCodeExpiredError(APIError):
    def __init__(self):
        super().__init__(status.HTTP_400_BAD_REQUEST, "페어링 코드가 만료되었습니다")


class PairingCodeUsedError(APIError):
    def __init__(self):
        super().__init__(status.HTTP_400_BAD_REQUEST, "이미 사용된 페어링 코드입니다")


class RateLimitExceededError(APIError):
    def __init__(self):
        super().__init__(status.HTTP_429_TOO_MANY_REQUESTS, "너무 많은 요청입니다. 잠시 후 다시 시도해주세요")
