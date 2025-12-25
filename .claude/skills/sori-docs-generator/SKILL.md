---
name: sori-docs-generator
description: Generates implementation docs from current code with path-based citations.
---
# 목적/범위
- 코드 기반 구현 문서를 backend/frontend/ios 범위로 생성한다.
- 모든 설명은 실제 파일 경로 인용을 포함한다.

# Inputs (필수/선택)
- 필수: 문서 대상 영역(backend/frontend/ios).
- 선택: 원하는 문서 깊이, 포함할 흐름/기능.

# Steps (Plan → Implement → Verify)
1) Plan: 대상 파일 목록을 확인하고 문서 구조를 잡는다.
2) Implement: 코드 내용을 읽고 섹션별로 정리한다.
3) Verify: 인용 경로가 누락되지 않았는지 점검한다.

# Commands
- `rg --files -g 'backend/app/**'`
- `rg --files -g 'frontend/app/**'`
- `rg -n "WebSocket" backend/app/routes/websocket.py`
- `ls -la docs`

# DoD / AC
- 모든 문서에 파일 경로 인용이 포함된다.
- 대상 영역별 문서가 생성/갱신된다.
- 추정이나 외부 링크 없이 코드 기반으로만 작성된다.

# Guardrails
- `docs/`가 없으면 `docs/backend/`, `docs/frontend/`, `docs/ios/`를 생성한다.
- 문서 외 파일은 변경하지 않는다.
