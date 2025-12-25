---
name: sori-backend-ws-contract
description: Handles SORI FastAPI/WebSocket/Celery backend changes with minimal WS contract discipline.
---
# 목적/범위
- `backend/**` 범위의 FastAPI 라우트/서비스/모델/Celery 작업 변경.
- WebSocket 동작은 `backend/app/routes/websocket.py`를 기준으로 유지한다.

# Inputs (필수/선택)
- 필수: 변경 대상 엔드포인트/라우트, 기대 동작.
- 선택: DB 스키마/모델 영향, 호출 흐름(REST/WS) 요약.

# Steps (Plan → Implement → Verify)
1) Plan: 관련 라우트/서비스/모델을 확인하고 영향 범위를 정리한다.
2) Implement: API/WS/Celery 변경을 `backend/**` 내에서 구현한다.
3) Verify: `pytest`를 실행하고 WS 계약 규칙을 재확인한다.

# Commands
- `cd backend && pytest`

# DoD / AC
- 주요 테스트가 통과한다.
- WS 메시지 타입은 계약 범위 내에서 유지된다.
- `stream_end`가 스트림 종료 규칙을 따른다.

# Guardrails
- 허용된 WS type( `ping`, `pong`, `message`, `ack`, `stream_chunk`, `stream_end`, `end_call`, `ended`, `history` ) 외 신규 type 추가 금지.
- `stream_end`는 마지막 `stream_chunk` 이후 1회만 전송하고 전체 `content`를 포함한다.
- `backend/**` 외 변경은 하지 않는다.
