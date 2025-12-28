# Contracts

이 디렉터리는 SORI의 API 계약 스냅샷을 저장한다.

## 파일 목록

- `openapi.snapshot.json`: OpenAPI 스키마 스냅샷 (REST API)
  - 현재 비어있음 (향후 REST API 계약 추가 예정)
  
- `ws.messages.md`: WebSocket 메시지 타입 명세
  - WebSocket 연결 (`/ws/{call_id}`, `/ws/v2/{call_id}`)에서 사용되는 메시지 타입 정의
  - 클라이언트↔서버 양방향 메시지 형식 문서화

## 갱신 방법

### OpenAPI 스키마
```bash
bash scripts/export-openapi.sh
```

### WebSocket 메시지 명세
- 수동 갱신: `backend/app/routes/websocket.py` 및 `backend/app/routes/websocket_v2.py` 코드 참조
- 변경 사항 발생 시 `ws.messages.md` 업데이트 필요

## 참조 파일

- `/backend/app/routes/websocket.py` - WebSocket V1 엔드포인트 (Claude AI)
- `/backend/app/routes/websocket_v2.py` - WebSocket V2 엔드포인트 (OpenAI GPT-4o + Agent SDK)
