# WebSocket Messages

이 문서는 SORI WebSocket 연결에서 사용되는 메시지 타입을 정의한다.

## 엔드포인트

- **V1**: `/ws/{call_id}?token={jwt}` - Claude AI 기반 (기본)
  - 파일: `backend/app/routes/websocket.py`
  
- **V2**: `/ws/v2/{call_id}?token={jwt}` - OpenAI GPT-4o + Agent SDK
  - 파일: `backend/app/routes/websocket_v2.py`
  - Perceive-Plan-Act-Reflect 에이전트 루프 사용
  - 함수 호출(Function Calling) 지원

## 메시지 타입 목록

### 1. ping
**방향**: Server → Client  
**목적**: 연결 상태 확인용 하트비트  
**필드**:
- `type`: "ping"
- `timestamp`: ISO 8601 타임스탬프

**예시**:
```json
{
  "type": "ping",
  "timestamp": "2025-12-28T10:30:00.000Z"
}
```

### 2. pong
**방향**: Client → Server 또는 Server → Client  
**목적**: ping에 대한 응답  
**필드**:
- `type`: "pong"
- `timestamp`: ISO 8601 타임스탬프

**예시**:
```json
{
  "type": "pong",
  "timestamp": "2025-12-28T10:30:00.100Z"
}
```

### 3. message
**방향**: Client → Server (사용자 입력), Server → Client (에코)  
**목적**: 사용자 채팅 메시지 전송  
**필드**:
- `type`: "message"
- `content`: 메시지 내용 (문자열)
- `message_id`: (선택) 중복 제거를 위한 고유 ID
- `role`: (서버 에코 시) "user" 또는 "assistant"
- `is_streaming`: (서버 에코 시) boolean, false

**클라이언트 → 서버 예시**:
```json
{
  "type": "message",
  "content": "안녕하세요",
  "message_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**서버 → 클라이언트 예시** (에코):
```json
{
  "type": "message",
  "role": "user",
  "content": "안녕하세요",
  "is_streaming": false
}
```

### 4. ack
**방향**: Server → Client  
**목적**: 메시지 수신 확인  
**필드**:
- `type`: "ack"
- `message_id`: 확인된 메시지의 ID

**예시**:
```json
{
  "type": "ack",
  "message_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 5. stream_chunk
**방향**: Server → Client  
**목적**: AI 응답 스트리밍 (청크 단위)  
**필드**:
- `type`: "stream_chunk"
- `response_id`: 응답 세션 고유 ID
- `role`: "assistant"
- `content`: 스트리밍 청크 내용

**예시**:
```json
{
  "type": "stream_chunk",
  "response_id": "resp_abc123",
  "role": "assistant",
  "content": "안녕하"
}
```

### 6. stream_end
**방향**: Server → Client  
**목적**: AI 응답 스트리밍 종료 및 전체 내용 전달  
**필드**:
- `type`: "stream_end"
- `response_id`: 응답 세션 고유 ID
- `role`: "assistant"
- `content`: 전체 응답 내용 (TTS용, `[CALL_END]` 마커 제거됨)
- `is_streaming`: false
- `call_end_detected`: (선택) boolean, AI가 통화 종료 의도를 감지한 경우 true
- `tool_calls`: (선택, V2 전용) 에이전트가 실행한 함수 호출 목록

**예시**:
```json
{
  "type": "stream_end",
  "response_id": "resp_abc123",
  "role": "assistant",
  "content": "안녕하세요! 오늘 기분이 어떠세요?",
  "is_streaming": false,
  "call_end_detected": false
}
```

**통화 종료 감지 예시**:
```json
{
  "type": "stream_end",
  "response_id": "resp_xyz789",
  "role": "assistant",
  "content": "네, 오늘도 좋은 하루 보내세요!",
  "is_streaming": false,
  "call_end_detected": true
}
```

### 7. end_call
**방향**: Client → Server  
**목적**: 통화 종료 요청 (사용자 명시적 종료)  
**필드**:
- `type`: "end_call"

**예시**:
```json
{
  "type": "end_call"
}
```

### 8. ended
**방향**: Server → Client  
**목적**: 통화 종료 확인  
**필드**:
- `type`: "ended"
- `call_id`: 종료된 통화 ID
- `status`: 통화 상태 ("completed")
- `auto_ended`: (선택) boolean, AI가 자동으로 종료한 경우 true

**예시** (사용자 명시적 종료):
```json
{
  "type": "ended",
  "call_id": 123,
  "status": "completed"
}
```

**예시** (AI 자동 종료):
```json
{
  "type": "ended",
  "call_id": 123,
  "status": "completed",
  "auto_ended": true
}
```

### 9. history
**방향**: Server → Client  
**목적**: 연결 시 기존 메시지 히스토리 전송  
**필드**:
- `type`: "history"
- `role`: "user" 또는 "assistant"
- `content`: 메시지 내용
- `created_at`: ISO 8601 타임스탬프

**예시**:
```json
{
  "type": "history",
  "role": "assistant",
  "content": "안녕하세요! 오늘 기분이 어떠세요?",
  "created_at": "2025-12-28T09:15:30.000Z"
}
```

## 연결 흐름

### 초기 연결
1. 클라이언트가 WebSocket 연결 (`/ws/{call_id}?token={jwt}`)
2. 서버가 연결 수락
3. 서버가 기존 메시지를 `history` 타입으로 전송
4. 기존 메시지가 없는 경우, 서버가 초기 인사말 생성 (`stream_chunk` → `stream_end`)

### 메시지 교환
1. 클라이언트가 `message` 전송
2. 서버가 `ack` 응답
3. 서버가 사용자 메시지 에코 (`message`, role="user")
4. 서버가 AI 응답 스트리밍 (`stream_chunk` × N → `stream_end`)

### 하트비트
- 서버가 30초마다 `ping` 전송
- 클라이언트는 `pong`으로 응답해야 함
- 40초 이상 `pong` 없으면 연결 타임아웃

### 통화 종료
**방법 1: 사용자 명시적 종료**
1. 클라이언트가 `end_call` 전송
2. 서버가 통화 상태 업데이트
3. 서버가 `ended` 응답
4. 연결 종료

**방법 2: AI 자동 종료**
1. AI가 사용자의 종료 의도 감지 (응답에 `[CALL_END]` 마커 포함)
2. 서버가 `stream_end`에서 `call_end_detected: true` 전송
3. 서버가 통화 상태 업데이트 후 `ended` 전송 (`auto_ended: true`)
4. 연결 종료

**방법 3: 연결 끊김**
1. 클라이언트 연결 끊김 감지
2. 서버가 통화 상태 업데이트 (completed)
3. 서버가 분석 태스크 트리거

## 구현 상세

### 하트비트 설정
- `HEARTBEAT_INTERVAL`: 30초
- `HEARTBEAT_TIMEOUT`: 10초
- 총 타임아웃: 40초

### 중복 메시지 방지
- LRU 기반 메시지 ID 추적 (최대 1000개)
- `message_id`를 통한 중복 검출

### 권한 검증
- 토큰 필수: `token` 쿼리 파라미터
- Scope 확인:
  - `elderly` + `device_access`: 노인 디바이스 토큰
  - `caregiver`: 보호자 액세스 토큰

### 통화 상태 전이
- `pending/scheduled` → `in_progress` (연결 시)
- `in_progress` → `completed` (종료 시)

### 분석 태스크
- 통화 종료 시 자동으로 `analyze_call.delay(call_id)` 호출
- Celery 비동기 태스크로 실행

## 참조

- V1 구현: `/backend/app/routes/websocket.py`
- V2 구현: `/backend/app/routes/websocket_v2.py`
- 에이전트 서비스: `/backend/app/services/agents/openai_agent.py` (V2)
- AI 서비스: `/backend/app/services/ai_service.py` (V1)
