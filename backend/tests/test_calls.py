import pytest


class TestCallsStart:
    def test_start_call_success(self, client, auth_headers):
        """통화 시작 성공"""
        # 어르신 먼저 등록
        elderly_resp = client.post("/api/elderly", headers=auth_headers, json={"name": "홍길동"})
        elderly_id = elderly_resp.json()["data"]["id"]

        # 통화 시작
        response = client.post("/api/calls", headers=auth_headers, json={
            "elderly_id": elderly_id,
            "call_type": "voice"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "success"
        assert data["data"]["elderly_id"] == elderly_id
        assert data["data"]["status"] == "in_progress"
        assert "ws_url" in data["data"]

    def test_start_call_invalid_elderly(self, client, auth_headers):
        """존재하지 않는 어르신으로 통화 시작"""
        response = client.post("/api/calls", headers=auth_headers, json={
            "elderly_id": 9999,
            "call_type": "voice"
        })
        assert response.status_code == 403

    def test_start_call_unauthorized(self, client):
        """인증 없이 통화 시작"""
        response = client.post("/api/calls", json={
            "elderly_id": 1,
            "call_type": "voice"
        })
        assert response.status_code == 403


class TestCallsList:
    def test_list_calls_empty(self, client, auth_headers):
        """통화 목록 조회 (빈 목록)"""
        response = client.get("/api/calls", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["data"]["items"] == []
        assert data["data"]["total"] == 0

    def test_list_calls_with_data(self, client, auth_headers):
        """통화 목록 조회"""
        # 어르신 등록
        elderly_resp = client.post("/api/elderly", headers=auth_headers, json={"name": "홍길동"})
        elderly_id = elderly_resp.json()["data"]["id"]

        # 통화 시작
        client.post("/api/calls", headers=auth_headers, json={
            "elderly_id": elderly_id,
            "call_type": "voice"
        })

        response = client.get("/api/calls", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]["items"]) == 1
        assert data["data"]["total"] == 1

    def test_list_calls_filter_by_elderly(self, client, auth_headers):
        """어르신별 통화 목록 조회"""
        # 두 어르신 등록
        elderly_resp1 = client.post("/api/elderly", headers=auth_headers, json={"name": "홍길동"})
        elderly_id1 = elderly_resp1.json()["data"]["id"]

        elderly_resp2 = client.post("/api/elderly", headers=auth_headers, json={"name": "김영희"})
        elderly_id2 = elderly_resp2.json()["data"]["id"]

        # 각각 통화 시작
        client.post("/api/calls", headers=auth_headers, json={"elderly_id": elderly_id1, "call_type": "voice"})
        client.post("/api/calls", headers=auth_headers, json={"elderly_id": elderly_id2, "call_type": "voice"})

        # 특정 어르신 통화만 조회
        response = client.get(f"/api/calls?elderly_id={elderly_id1}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]["items"]) == 1
        assert data["data"]["items"][0]["elderly_id"] == elderly_id1


class TestCallsGet:
    def test_get_call_success(self, client, auth_headers):
        """통화 상세 조회 성공"""
        # 어르신 등록 및 통화 시작
        elderly_resp = client.post("/api/elderly", headers=auth_headers, json={"name": "홍길동"})
        elderly_id = elderly_resp.json()["data"]["id"]

        call_resp = client.post("/api/calls", headers=auth_headers, json={
            "elderly_id": elderly_id,
            "call_type": "voice"
        })
        call_id = call_resp.json()["data"]["id"]

        response = client.get(f"/api/calls/{call_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["id"] == call_id
        assert data["data"]["elderly_id"] == elderly_id

    def test_get_call_not_found(self, client, auth_headers):
        """존재하지 않는 통화 조회"""
        response = client.get("/api/calls/9999", headers=auth_headers)
        assert response.status_code == 404


class TestCallsEnd:
    def test_end_call_success(self, client, auth_headers):
        """통화 종료 성공"""
        # 어르신 등록 및 통화 시작
        elderly_resp = client.post("/api/elderly", headers=auth_headers, json={"name": "홍길동"})
        elderly_id = elderly_resp.json()["data"]["id"]

        call_resp = client.post("/api/calls", headers=auth_headers, json={
            "elderly_id": elderly_id,
            "call_type": "voice"
        })
        call_id = call_resp.json()["data"]["id"]

        # 통화 종료
        response = client.put(f"/api/calls/{call_id}/end", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["status"] == "completed"
        assert data["data"]["duration"] is not None

    def test_end_call_not_found(self, client, auth_headers):
        """존재하지 않는 통화 종료"""
        response = client.put("/api/calls/9999/end", headers=auth_headers)
        assert response.status_code == 404


class TestCallsAnalysis:
    def test_get_analysis_not_found(self, client, auth_headers):
        """분석 결과 없음"""
        # 어르신 등록 및 통화 시작
        elderly_resp = client.post("/api/elderly", headers=auth_headers, json={"name": "홍길동"})
        elderly_id = elderly_resp.json()["data"]["id"]

        call_resp = client.post("/api/calls", headers=auth_headers, json={
            "elderly_id": elderly_id,
            "call_type": "voice"
        })
        call_id = call_resp.json()["data"]["id"]

        # 분석 결과 조회 (아직 없음)
        response = client.get(f"/api/calls/{call_id}/analysis", headers=auth_headers)
        assert response.status_code == 404
