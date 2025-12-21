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
