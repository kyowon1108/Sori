---
name: sori-docs-report
description: Produces standardized completion reports under docs/reports with masking and docs-only commit rules.
---
# Purpose
- 작업 완료 보고서를 `docs/reports/`에 표준 템플릿으로 생성한다.
- 보고서 전용 커밋을 준비한다.

# Applicability
- backend/frontend/infra/qa 작업 완료 후.

# Preconditions
- 보고서에 포함할 변경 내용과 실행 커맨드가 정리되어 있어야 한다.
- 민감정보 마스킹 규칙을 적용해야 한다.

# Commands
- `mkdir -p docs/reports`
- `date +%F`
- `git rev-parse --abbrev-ref HEAD`
- `git diff --name-only`
- `git status --porcelain`

# Workflow
1) `docs/reports/`를 생성한다.
2) 브랜치 이름 또는 PR 제목을 slugify하여 `<short-topic>`을 만든다.
3) `docs/reports/YYYY-MM-DD_<short-topic>.md`를 생성한다.
4) must-run checks 결과를 기록하고, 미실행 시 사유와 대체 검증을 남긴다.
5) 민감정보(토큰/키/호스트/IP 등)를 `<REDACTED>`로 마스킹한다.
6) 커밋은 `docs/reports/*.md`만 포함하도록 준비한다.

Slugify 예시(필요 시):
```
BRANCH=$(git rev-parse --abbrev-ref HEAD)
SHORT_TOPIC=$(printf "%s" "$BRANCH" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')
DATE=$(date +%F)
REPORT="docs/reports/${DATE}_${SHORT_TOPIC}.md"
```

Report template(섹션 순서 고정):
```
# Summary

# Context / Goal

# Scope (Changed files)

# Key Changes

# Commands Run + Results

# Verification Evidence

# Risks + Rollback

# Follow-ups / TODO

# Appendix
```

# Expected outputs
- 표준 템플릿을 채운 보고서 파일.
- docs-only 커밋 준비 상태 요약.

# Failure modes & fixes
- docs 디렉터리 없음: `mkdir -p docs/reports`로 생성한다.
- 브랜치명이 HEAD: `<short-topic>`을 수동 지정한다.
- 민감정보 포함: `<REDACTED>`로 치환 후 재확인한다.
