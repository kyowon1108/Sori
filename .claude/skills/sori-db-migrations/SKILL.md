---
name: sori-db-migrations
description: Manages SORI DB schema changes, migration notes, and rollback guidance.
---
# Purpose
- DB 스키마 변경과 마이그레이션/롤백 절차를 관리한다.

# Applicability
- `docker-compose.yml`, `init-db.sql`, `backend/app/models/**`, `backend/app/database.py` 변경 시.

# Preconditions
- 변경 전후 스키마와 롤백 경로가 정리되어 있어야 한다.

# Commands
- `bash scripts/backup-db.sh`
- `docker-compose up -d postgres`

# Workflow
1) Plan: 스키마 변경과 영향 모델을 정리한다.
2) Implement: 마이그레이션/롤백 노트를 작성한다.
3) Verify: 백업 후 적용/롤백 절차를 로컬에서 재현한다.

# Expected outputs
- 마이그레이션 노트와 롤백 절차.
- 로컬 재현 결과와 적용/검증 커맨드.

# Failure modes & fixes
- 백업 실패: DB 접속 정보와 권한을 확인한다.
- 로컬 적용 실패: init-db.sql 및 모델 정의를 재검토한다.
