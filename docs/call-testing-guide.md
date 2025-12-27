# SORI 통화 테스트 가이드

## 개요

이 문서는 SORI 시스템에서 어르신에게 통화를 거는 방법과 테스트 절차를 설명합니다.

## 사전 요구사항

### 1. 테스트 계정
| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 보호자 (Caregiver) | `test@sori.com` | `Test1234` |

### 2. EC2 서버 정보
- **Frontend URL**: `http://52.79.227.179`
- **Backend API**: `http://52.79.227.179:8000`
- **SSH**: `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179`

### 3. 어르신 등록
통화를 걸기 전에 어르신이 등록되어 있어야 합니다:
1. 대시보드 로그인
2. 어르신 관리 → 어르신 추가
3. 이름, 전화번호, 디바이스 연결 설정

---

## 통화 시작 방법

### 방법 1: REST API 직접 호출

#### 1. 인증 토큰 획득
```bash
curl -s -X POST http://52.79.227.179:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@sori.com","password":"Test1234"}' \
  | jq -r '.data.access_token' > /tmp/token.txt
```

#### 2. 통화 시작
```bash
TOKEN=$(cat /tmp/token.txt)
curl -s -X POST "http://52.79.227.179:8000/api/calls" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"elderly_id": 1, "call_type": "voice"}'
```

#### 응답 예시
```json
{
  "status": "success",
  "code": 201,
  "message": "Call started",
  "data": {
    "id": 1,
    "elderly_id": 1,
    "call_type": "voice",
    "started_at": "2025-12-27T06:00:22.254698",
    "status": "in_progress",
    "ws_url": "ws://localhost:8000/ws/1"
  }
}
```

### 방법 2: Frontend 대시보드
현재 Frontend 대시보드에서는 직접 통화 시작 버튼이 구현되어 있지 않습니다.
통화는 주로 iOS 앱의 자동 스케줄 또는 API를 통해 시작됩니다.

---

## iOS 앱 통화 감지

### Pending Call 폴링
iOS 앱은 `GET /api/device/pending-call`을 10초마다 폴링하여 대기 중인 통화를 감지합니다.

#### 감지 조건
1. `status == "in_progress"` 상태의 모든 통화
2. `trigger_type == "auto"` AND `status == "scheduled"` AND 시간 범위 내 통화

#### 백엔드 로그 확인
```bash
ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 \
  "docker logs sori-backend --tail 50 2>&1 | grep 'PENDING-CALL'"
```

#### 정상 감지 로그 예시
```
[DEBUG] ===== [PENDING-CALL] elderly_id=1 =====
[DEBUG] Query result: found=True
[DEBUG]   ✓ Call ID: 2
[DEBUG]   ✓ Status: in_progress
[DEBUG]   ✓ Call Type: voice
[DEBUG]   ✓ Trigger Type: manual
```

---

## 통화 종료

### API 호출
```bash
TOKEN=$(cat /tmp/token.txt)
curl -s -X PUT "http://52.79.227.179:8000/api/calls/{call_id}/end" \
  -H "Authorization: Bearer $TOKEN"
```

### WebSocket 메시지
iOS 앱에서 WebSocket을 통해 `end_call` 메시지를 전송하면 통화가 종료됩니다.

---

## 통화 상세 조회

### 접근 제한
- **진행 중 (`in_progress`)** 통화: 상세 페이지 접근 불가
- **예정된 (`scheduled`)** 통화: 상세 페이지 접근 불가
- **완료된 (`completed`)** 통화: 상세 페이지 접근 가능

### API 엔드포인트
```bash
# 통화 목록
GET /api/calls?elderly_id={id}&skip=0&limit=10

# 통화 상세 (완료된 통화만)
GET /api/calls/{call_id}

# 통화 분석
GET /api/calls/{call_id}/analysis
```

---

## 데이터베이스 직접 확인

### PostgreSQL 접속
```bash
ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 \
  "docker exec sori-postgres psql -U sori_user -d sori_db"
```

### 유용한 쿼리
```sql
-- 어르신 목록
SELECT id, name, phone FROM elderly;

-- 통화 목록
SELECT id, elderly_id, status, call_type, started_at FROM calls ORDER BY id DESC;

-- 진행 중인 통화
SELECT * FROM calls WHERE status = 'in_progress';
```

---

## 트러블슈팅

### iOS 앱에서 통화 감지 안 됨
1. **원인**: pending-call API가 `call_type='manual'`만 검색
2. **해결**: 모든 `in_progress` 상태 통화를 검색하도록 수정
3. **확인**: 백엔드 로그에서 `[DEBUG] Query result: found=True` 확인

### 통화 상세 페이지가 로딩만 됨
1. **원인**: 진행 중인 통화에 접근 시도
2. **해결**: 통화 완료 후 접근 또는 통화 종료 API 호출
3. **확인**: `/calls` 목록에서 상태가 `completed`인지 확인

### WebSocket 연결 실패
1. **원인**: 잘못된 WebSocket URL
2. **확인**: `ws://52.79.227.179:8000/ws/{call_id}?token={device_token}`
3. **로그**: `docker logs sori-backend --tail 100 | grep -i websocket`

---

## 관련 파일

### Backend
- `backend/app/routes/calls.py` - 통화 API 라우터
- `backend/app/routes/device.py` - 디바이스 pending-call API
- `backend/app/services/calls.py` - 통화 비즈니스 로직

### Frontend
- `frontend/app/(main)/calls/page.tsx` - 통화 목록 페이지
- `frontend/app/(main)/calls/[id]/page.tsx` - 통화 상세 페이지

### iOS
- `ios/Somi/Services/PendingCallService.swift` - 통화 감지 서비스
- `ios/Somi/ViewModels/VoiceCallViewModel.swift` - 통화 뷰모델

---

## 테스트 체크리스트

- [ ] 보호자 계정으로 로그인
- [ ] 어르신 등록 확인
- [ ] API로 통화 시작
- [ ] iOS 앱에서 통화 감지 확인 (pending-call 로그)
- [ ] WebSocket 연결 확인
- [ ] 통화 종료
- [ ] 통화 상세 페이지 접근 확인
- [ ] 통화 분석 결과 확인
