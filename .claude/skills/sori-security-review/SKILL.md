---
name: sori-security-review
description: Reviews security-sensitive changes, PII/log redaction, and token handling for SORI.
---
# Purpose
- 인증/인가, 토큰 처리, 로그/PII 노출 검토를 수행한다.

# Applicability
- 인증/인가 또는 로그 정책 변경이 포함된 경우.

# Preconditions
- 변경 대상 기능과 보안 요구사항이 정리되어 있어야 한다.

# Commands
- `rg -n "logger|print|console" backend frontend`
- `rg -n "token|secret|api_key" backend frontend`

# Workflow
1) 민감 데이터 흐름과 로그 포인트를 파악한다.
2) 토큰 처리와 레드액션 정책을 점검한다.
3) 리스크와 완화책을 정리한다.

# Expected outputs
- 리스크 평가와 완화책.
- 로그/PII 점검 결과.

# Failure modes & fixes
- 민감 정보 노출: 로그 마스킹/레드액션을 적용한다.
- 토큰 취급 오류: 저장/전송 정책을 재검토한다.
