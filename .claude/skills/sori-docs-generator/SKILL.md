---
name: sori-docs-generator
description: Generates implementation docs from current code with path-based citations.
---
# Purpose
- 코드 기반 구현 문서를 backend/frontend/ios 범위로 생성한다.
- 모든 설명에 파일 경로 인용을 포함한다.

# Applicability
- 코드 변경 내용을 문서로 정리해야 하는 경우.

# Preconditions
- 문서 대상 영역과 범위가 확정되어 있어야 한다.

# Commands
- `rg --files -g 'backend/app/**'`
- `rg --files -g 'frontend/app/**'`
- `rg -n "WebSocket" backend/app/routes/websocket.py`
- `mkdir -p docs && ls -la docs`

# Workflow
1) 대상 파일 목록을 확인하고 문서 구조를 잡는다.
2) 코드 내용을 읽고 섹션별로 정리한다.
3) 인용 경로 누락 여부를 점검한다.

# Expected outputs
- 경로 인용이 포함된 문서 파일 목록.
- 문서별 핵심 요약.

# Failure modes & fixes
- docs 디렉터리 누락: `mkdir -p docs`로 생성 후 진행한다.
- 인용 누락: 문서 내 경로 인용을 추가한다.
