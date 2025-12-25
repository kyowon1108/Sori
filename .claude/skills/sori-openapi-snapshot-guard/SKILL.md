---
name: sori-openapi-snapshot-guard
description: Guards OpenAPI snapshot drift and WebSocket contract checks for SORI.
---
# 목적/범위
- OpenAPI 스냅샷 드리프트와 WS 계약 체크를 관리한다.
- 기준 파일: `contracts/openapi.snapshot.json`, `contracts/ws.messages.md` (존재/생성 기대).

# Inputs (필수/선택)
- 필수: API 스키마 변경 내역, 기대 응답/요청 구조.
- 선택: CI 워크플로 변경 필요 여부.

# Steps (Plan → Implement → Verify)
1) Plan: 변경된 API/WS 범위를 확인하고 스냅샷 영향도를 정리한다.
2) Implement: 스냅샷 갱신과 계약 문서 업데이트를 수행한다.
3) Verify: 계약 테스트를 실행하고 드리프트 여부를 확인한다.

# Commands
- `bash scripts/export-openapi.sh`
- `cd backend && pytest tests/test_ws_contract.py -v`

# DoD / AC
- 스냅샷 드리프트가 의도된 변경과 일치한다.
- WS 계약 테스트가 통과한다.
- CI 계약 체크 구성이 최신 상태다.

# Guardrails
- 스냅샷 갱신은 명시적 의도가 있을 때만 수행한다.
- 계약 파일 외 앱 코드 변경은 하지 않는다.
