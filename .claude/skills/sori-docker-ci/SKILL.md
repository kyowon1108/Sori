---
name: sori-docker-ci
description: Handles docker-compose and CI workflow changes for SORI.
---
# 목적/범위
- `docker-compose.yml`, `docker-compose.prod.yml`, `.github/workflows/**`, `.env.example` 변경을 다룬다.

# Preconditions
- 변경 대상 서비스/워크플로 요구사항이 정리되어 있어야 한다.

# Inputs (필수/선택)
- 필수: 변경 대상 파일, 기대 동작.
- 선택: 배포/환경 변수 정책, 빌드 캐시 전략.

# Steps (Plan → Implement → Verify)
1) Plan: 대상 서비스와 환경 변수 영향을 정리한다.
2) Implement: compose/CI 변경을 적용한다.
3) Verify: 로컬 compose 빌드와 CI 설정을 점검한다.

# Commands
- `docker-compose up -d --build`
- `docker-compose ps`

# Expected outputs
- 변경된 compose/CI 요약과 실행 결과.
- 영향받는 환경 변수 목록.

# DoD / AC
- compose 빌드가 성공하고 서비스 상태가 정상이다.
- CI 워크플로 변경 내용이 명확하다.

# Guardrails
- 애플리케이션 코드 변경은 별도 에이전트로 분리한다.
- 계약 변경이 포함되면 `sori-openapi-snapshot-guard`를 참조한다.
