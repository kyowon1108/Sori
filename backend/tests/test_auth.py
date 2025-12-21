import pytest


class TestAuthRegister:
    def test_register_success(self, client, test_user_data):
        """회원가입 성공"""
        response = client.post("/api/auth/register", json=test_user_data)
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "success"
        assert data["code"] == 201
        assert data["data"]["email"] == test_user_data["email"]
        assert data["data"]["full_name"] == test_user_data["full_name"]

    def test_register_duplicate_email(self, client, test_user_data):
        """이미 등록된 이메일로 회원가입"""
        # 첫 번째 등록
        client.post("/api/auth/register", json=test_user_data)
        # 중복 등록 시도
        response = client.post("/api/auth/register", json=test_user_data)
        assert response.status_code == 400
        data = response.json()
        assert data["status"] == "error"

    def test_register_invalid_email(self, client):
        """이메일 형식이 잘못된 경우"""
        response = client.post("/api/auth/register", json={
            "email": "invalid-email",
            "password": "ValidPassword123",
            "full_name": "Test"
        })
        assert response.status_code == 422

    def test_register_weak_password_no_uppercase(self, client):
        """대문자 없는 비밀번호"""
        response = client.post("/api/auth/register", json={
            "email": "test@example.com",
            "password": "password123",
            "full_name": "Test User"
        })
        assert response.status_code == 422

    def test_register_weak_password_no_number(self, client):
        """숫자 없는 비밀번호"""
        response = client.post("/api/auth/register", json={
            "email": "test@example.com",
            "password": "PasswordOnly",
            "full_name": "Test User"
        })
        assert response.status_code == 422

    def test_register_weak_password_too_short(self, client):
        """너무 짧은 비밀번호"""
        response = client.post("/api/auth/register", json={
            "email": "test@example.com",
            "password": "Pass1",
            "full_name": "Test User"
        })
        assert response.status_code == 422


class TestAuthLogin:
    def test_login_success(self, client, test_user_data):
        """로그인 성공"""
        # 먼저 회원가입
        client.post("/api/auth/register", json=test_user_data)
        # 로그인
        response = client.post("/api/auth/login", json={
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "access_token" in data["data"]
        assert "refresh_token" in data["data"]
        assert "user" in data["data"]

    def test_login_wrong_password(self, client, test_user_data):
        """잘못된 비밀번호로 로그인"""
        # 먼저 회원가입
        client.post("/api/auth/register", json=test_user_data)
        # 잘못된 비밀번호로 로그인
        response = client.post("/api/auth/login", json={
            "email": test_user_data["email"],
            "password": "WrongPassword123"
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        """존재하지 않는 사용자로 로그인"""
        response = client.post("/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "Password123"
        })
        assert response.status_code == 401


class TestAuthToken:
    def test_refresh_token_success(self, client, test_user_data):
        """토큰 갱신 성공"""
        # 회원가입 + 로그인
        client.post("/api/auth/register", json=test_user_data)
        login_response = client.post("/api/auth/login", json={
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        })
        refresh_token = login_response.json()["data"]["refresh_token"]

        # 토큰 갱신
        response = client.post("/api/auth/refresh", json={
            "refresh_token": refresh_token
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data["data"]
        assert "refresh_token" in data["data"]

    def test_refresh_token_invalid(self, client):
        """유효하지 않은 refresh token"""
        response = client.post("/api/auth/refresh", json={
            "refresh_token": "invalid-token"
        })
        assert response.status_code == 401


class TestAuthMe:
    def test_get_me_success(self, client, auth_headers):
        """현재 사용자 정보 조회 성공"""
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "email" in data["data"]
        assert "full_name" in data["data"]

    def test_get_me_unauthorized(self, client):
        """토큰 없이 /auth/me 호출"""
        response = client.get("/api/auth/me")
        assert response.status_code == 403

    def test_get_me_invalid_token(self, client):
        """유효하지 않은 토큰으로 /auth/me 호출"""
        response = client.get("/api/auth/me", headers={
            "Authorization": "Bearer invalid-token"
        })
        assert response.status_code == 401
