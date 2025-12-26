---
name: sori-ui-e2e-verification
description: Verifies SORI frontend UI behavior and assets with reproducible checks.
---
# Purpose
- UI 자산 로드 오류와 주요 사용자 흐름을 검증한다.
- 재현 가능한 UI 검증 기록을 남긴다.

# Applicability
- `frontend/app/**`, `frontend/src/components/**`, `frontend/public/**` 변경 시.

# Preconditions
- 프론트엔드 의존성이 준비되어 있어야 한다.
- Playwright 기반 E2E는 구성된 경우에만 수행한다.

# Commands
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

# Workflow
1) lint/build를 실행하고 결과를 기록한다.
2) Playwright가 구성된 경우에만 E2E를 수행하고 증빙을 남긴다.
3) 콘솔 오류/네트워크 실패 여부를 요약한다.

# Expected outputs
- 실행 커맨드 결과 요약.
- 콘솔/네트워크 오류 요약과 증빙.
- E2E 수행 여부(구성 여부 포함).

# Failure modes & fixes
- Playwright 미구성: E2E 생략 사유를 남기고 구성 작업을 별도 트래킹한다.
- 콘솔 오류: 오류 로그와 재현 경로를 첨부한다.
