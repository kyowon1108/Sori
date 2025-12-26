---
name: sori-docker-ci
description: Handles docker-compose and CI workflow changes for SORI.
---
# Purpose
- docker-compose/CI 변경을 관리하고 환경 변수 영향을 정리한다.

# Applicability
- `docker-compose.yml`, `docker-compose.prod.yml`, `.github/workflows/**`, `.env.example` 변경 시.

# Preconditions
- 변경 대상 서비스/워크플로 요구사항이 정리되어 있어야 한다.

# Commands
- `docker-compose up -d --build`
- `docker-compose ps`

# Workflow
1) Plan: 대상 서비스와 환경 변수 영향을 정리한다.
2) Implement: compose/CI 변경을 적용한다.
3) Verify: 로컬 compose 상태를 점검한다.

# Expected outputs
- 변경된 compose/CI 요약과 실행 결과.
- 영향받는 환경 변수 목록.

# Failure modes & fixes
- compose 오류: 변경한 서비스 정의와 환경 변수를 재검토한다.
- 서비스 기동 실패: `docker-compose ps`와 로그로 원인을 확인한다.
