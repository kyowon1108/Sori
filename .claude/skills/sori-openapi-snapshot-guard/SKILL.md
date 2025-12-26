---
name: sori-openapi-snapshot-guard
description: Guards OpenAPI snapshot drift and WebSocket contract checks for SORI.
---
# Purpose
- OpenAPI 스냅샷 드리프트와 WS 계약 체크를 관리한다.

# Applicability
- REST/WS 계약 변경 또는 드리프트 점검이 필요한 경우.

# Preconditions
- API 변경 범위와 기대 계약이 정리되어 있어야 한다.

# Commands
- `bash scripts/export-openapi.sh`
- `cd backend && pytest tests/test_ws_contract.py -v`

# Workflow
1) OpenAPI 스냅샷을 갱신한다.
2) `contracts/ws.messages.md`와 WS 동작을 정렬한다.
3) 계약 테스트를 실행하고 결과를 기록한다.

# Expected outputs
- 스냅샷 드리프트 여부와 변경 요약.
- WS 계약 테스트 결과와 로그.

# Failure modes & fixes
- 스냅샷 생성 실패: 환경 변수(DATABASE_URL, SECRET_KEY)를 확인한다.
- WS 테스트 실패: `contracts/ws.messages.md`와 WS 타입 목록을 재점검한다.
