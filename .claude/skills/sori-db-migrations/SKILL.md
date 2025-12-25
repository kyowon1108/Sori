---
name: sori-db-migrations
description: Manages SORI DB schema changes, migration notes, and rollback guidance.
---
# 목적/범위
- DB 스키마 변경, 마이그레이션/롤백 노트, 초기화 SQL 변경을 관리한다.
- 대상: `docker-compose.yml`, `init-db.sql`, `backend/app/models/**`, `backend/app/database.py`.

# Preconditions
- 변경 전후 스키마와 영향 범위가 정리되어 있어야 한다.
- 롤백 가능 경로가 합의되어 있어야 한다.

# Inputs (필수/선택)
- 필수: 스키마 변경 내용, 롤백 전략.
- 선택: 데이터 백필/마이그레이션 스크립트, 환경별 차이.

# Steps (Plan → Implement → Verify)
1) Plan: 스키마 변경과 영향 모델을 정리한다.
2) Implement: 마이그레이션/롤백 노트를 작성하고 필요한 SQL을 준비한다.
3) Verify: 백업 후 적용/롤백 절차를 로컬에서 재현한다.

# Commands
- `bash scripts/backup-db.sh`
- `docker-compose up -d postgres`

# Expected outputs
- 마이그레이션 노트와 롤백 절차.
- 로컬 재현 결과와 적용/검증 커맨드.

# DoD / AC
- 변경 내역과 롤백 절차가 문서화되어 있다.
- 로컬 재현이 가능하고 결과가 기록된다.

# Guardrails
- 계약 변경이 포함되면 `sori-openapi-snapshot-guard`를 함께 사용한다.
- 애플리케이션 코드 변경은 별도 에이전트로 분리한다.
