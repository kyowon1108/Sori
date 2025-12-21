import pytest


class TestElderlyCreate:
    def test_create_elderly_success(self, client, auth_headers, test_elderly_data):
        """어르신 등록 성공"""
        response = client.post("/api/elderly", headers=auth_headers, json=test_elderly_data)
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "success"
        assert data["data"]["name"] == test_elderly_data["name"]
        assert data["data"]["age"] == test_elderly_data["age"]
        assert data["data"]["caregiver_id"] > 0

    def test_create_elderly_minimal(self, client, auth_headers):
        """최소 정보로 어르신 등록"""
        response = client.post("/api/elderly", headers=auth_headers, json={
            "name": "홍길동"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["data"]["name"] == "홍길동"

    def test_create_elderly_unauthorized(self, client, test_elderly_data):
        """인증 없이 어르신 등록 시도"""
        response = client.post("/api/elderly", json=test_elderly_data)
        assert response.status_code == 403


class TestElderlyList:
    def test_list_elderly_empty(self, client, auth_headers):
        """어르신 목록 조회 (빈 목록)"""
        response = client.get("/api/elderly", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["data"]["items"] == []
        assert data["data"]["total"] == 0

    def test_list_elderly_with_data(self, client, auth_headers):
        """어르신 목록 조회"""
        # 어르신 추가
        client.post("/api/elderly", headers=auth_headers, json={"name": "홍길동"})
        client.post("/api/elderly", headers=auth_headers, json={"name": "김영희"})

        response = client.get("/api/elderly", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]["items"]) == 2
        assert data["data"]["total"] == 2


class TestElderlyGet:
    def test_get_elderly_success(self, client, auth_headers):
        """어르신 상세 조회 성공"""
        # 어르신 추가
        create_response = client.post("/api/elderly", headers=auth_headers, json={"name": "홍길동", "age": 75})
        elderly_id = create_response.json()["data"]["id"]

        response = client.get(f"/api/elderly/{elderly_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["name"] == "홍길동"
        assert data["data"]["age"] == 75

    def test_get_elderly_not_found(self, client, auth_headers):
        """존재하지 않는 어르신 조회"""
        response = client.get("/api/elderly/9999", headers=auth_headers)
        assert response.status_code == 404

    def test_get_elderly_permission_denied(self, client, test_user_data):
        """다른 사용자의 어르신 조회 시도"""
        # 첫 번째 사용자 등록 및 어르신 추가
        client.post("/api/auth/register", json=test_user_data)
        login_resp = client.post("/api/auth/login", json={
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        })
        token1 = login_resp.json()["data"]["access_token"]
        headers1 = {"Authorization": f"Bearer {token1}"}

        create_response = client.post("/api/elderly", headers=headers1, json={"name": "홍길동"})
        elderly_id = create_response.json()["data"]["id"]

        # 두 번째 사용자 등록
        client.post("/api/auth/register", json={
            "email": "other@example.com",
            "password": "OtherPass123",
            "full_name": "Other User"
        })
        login_resp2 = client.post("/api/auth/login", json={
            "email": "other@example.com",
            "password": "OtherPass123"
        })
        token2 = login_resp2.json()["data"]["access_token"]
        headers2 = {"Authorization": f"Bearer {token2}"}

        # 다른 사용자의 어르신 조회 시도
        response = client.get(f"/api/elderly/{elderly_id}", headers=headers2)
        assert response.status_code == 403


class TestElderlyUpdate:
    def test_update_elderly_success(self, client, auth_headers):
        """어르신 정보 수정 성공"""
        # 어르신 추가
        create_response = client.post("/api/elderly", headers=auth_headers, json={"name": "홍길동", "age": 75})
        elderly_id = create_response.json()["data"]["id"]

        # 수정
        response = client.put(f"/api/elderly/{elderly_id}", headers=auth_headers, json={
            "name": "홍길동(수정)",
            "age": 76,
            "health_condition": "양호함"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["name"] == "홍길동(수정)"
        assert data["data"]["age"] == 76
        assert data["data"]["health_condition"] == "양호함"

    def test_update_elderly_partial(self, client, auth_headers):
        """어르신 정보 부분 수정"""
        # 어르신 추가
        create_response = client.post("/api/elderly", headers=auth_headers, json={"name": "홍길동", "age": 75})
        elderly_id = create_response.json()["data"]["id"]

        # 일부만 수정
        response = client.put(f"/api/elderly/{elderly_id}", headers=auth_headers, json={
            "age": 80
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["name"] == "홍길동"  # 변경되지 않음
        assert data["data"]["age"] == 80  # 변경됨

    def test_update_elderly_not_found(self, client, auth_headers):
        """존재하지 않는 어르신 수정"""
        response = client.put("/api/elderly/9999", headers=auth_headers, json={"age": 80})
        assert response.status_code == 404


class TestElderlyDelete:
    def test_delete_elderly_success(self, client, auth_headers):
        """어르신 삭제 성공"""
        # 어르신 추가
        create_response = client.post("/api/elderly", headers=auth_headers, json={"name": "홍길동"})
        elderly_id = create_response.json()["data"]["id"]

        # 삭제
        response = client.delete(f"/api/elderly/{elderly_id}", headers=auth_headers)
        assert response.status_code == 204

        # 삭제 확인
        get_response = client.get(f"/api/elderly/{elderly_id}", headers=auth_headers)
        assert get_response.status_code == 404

    def test_delete_elderly_not_found(self, client, auth_headers):
        """존재하지 않는 어르신 삭제"""
        response = client.delete("/api/elderly/9999", headers=auth_headers)
        assert response.status_code == 404
