---
name: sori-security-review
description: Reviews security-sensitive changes, PII/log redaction, and token handling for SORI.
---
# 목적/범위
- 인증/인가, 토큰 처리, 로그/PII 노출 검토를 수행한다.

# Preconditions
- 변경 대상 기능과 보안 요구사항이 정리되어 있어야 한다.

# Inputs (필수/선택)
- 필수: 변경 파일 목록, 보안 요구사항.
- 선택: 로그/모니터링 정책, 위협 모델 메모.

# Steps (Plan → Implement → Verify)
1) Plan: 민감 데이터 흐름과 로그 포인트를 파악한다.
2) Implement: 보안 리뷰 및 필요한 보완을 적용한다.
3) Verify: 로그/토큰 처리 점검을 수행한다.

# Commands
- `rg -n "logger|print|console" backend frontend`
- `rg -n "token|secret|api_key" backend frontend`

# Expected outputs
- 리스크 평가와 완화책.
- 로그/PII 점검 결과.

# DoD / AC
- 민감 정보가 로그에 노출되지 않는다.
- 토큰 처리 정책이 준수된다.

# Guardrails
- 계약 변경이 포함되면 `sori-openapi-snapshot-guard`를 참조한다.
- 보안 이슈 발견 시 `sori-integration-qa-agent`에 공유한다.
