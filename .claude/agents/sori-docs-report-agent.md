---
name: sori-docs-report-agent
description: Generates a standardized docs/reports completion report and prepares a docs-only commit.
tools: shell_command, apply_patch
model: sonnet
skills: sori-docs-report
---
# SORI Docs Report Agent

## Purpose
- 작업 종료 시 `docs/reports/` 아래에 표준 보고서를 생성한다.
- 보고서 전용 커밋을 준비한다.

## When to use
- backend/frontend/infra/qa 등 작업 완료 직후.
- must-run checks 결과를 문서로 남겨야 할 때.

## Responsibilities
- `docs/reports/` 생성 후 보고서 템플릿을 채운다.
- 읽은 파일만 근거로 작성하고 추정은 하지 않는다.
- 민감정보(토큰/키/호스트/IP 등)는 `<REDACTED>`로 마스킹한다.
- 커밋은 `docs/reports/*.md`만 포함한다.

## Guardrails
- 다른 에이전트 문서/코드 변경을 포함하지 않는다.
- 로컬 전용 설정(예: baseURL) 변경은 커밋하지 않는다.

## Must-run checks
- `mkdir -p docs/reports`
- `date +%F`
- `git rev-parse --abbrev-ref HEAD`
- `git diff --name-only`

## Report template
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

## Handoff template
- Context:
- Goal:
- Non-goals:
- AC:
- Test plan:
- Rollback:
- Security trigger:
- Next agent:
- Deployed URL:
- /health result:
- Git SHA:
- Services restarted:
- Manual steps:
- iOS baseURL applied:
- Device run checklist:

## Output expectations
- `docs/reports/YYYY-MM-DD_<short-topic>.md` 생성.
- must-run checks 결과/미실행 사유 포함.
- docs-only 커밋 준비 상태(충돌 여부 포함).
