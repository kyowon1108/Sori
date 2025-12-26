---
name: sori-backend-ws-contract
description: Handles SORI FastAPI/WebSocket/Celery backend changes with minimal WS contract discipline.
---
# Purpose
- `backend/**` 범위의 FastAPI 라우트/서비스/모델/Celery 변경을 수행한다.
- WebSocket 동작을 최소 계약 규율 내에서 유지한다.

# Applicability
- `backend/**` 변경 또는 WS 동작 수정이 필요한 경우.

# Preconditions
- 변경 대상 라우트/서비스 범위가 정리되어 있어야 한다.

# Commands
- `cd backend && pytest`

# Workflow
1) Plan: 관련 라우트/서비스/모델 영향 범위를 정리한다.
2) Implement: API/WS/Celery 변경을 `backend/**` 내에서 구현한다.
3) Verify: `pytest`로 동작을 확인하고 WS 규칙을 재점검한다.

# Expected outputs
- 변경 요약과 WS 계약 영향 여부.
- 실행 커맨드 결과.

# Failure modes & fixes
- `pytest` 실패: 실패 로그와 관련 라우트를 확인하고 수정한다.
- WS 타입 위반: 허용된 타입 목록으로 회귀한다.
