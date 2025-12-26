---
name: sori-frontend-ux
description: Handles SORI Next.js UI/UX changes for dashboard and elderly flows within frontend/.
---
# Purpose
- `frontend/**` 범위의 UI/UX 변경을 수행한다.
- 대시보드/어르신 화면의 레이아웃과 상태 흐름을 정리한다.

# Applicability
- `frontend/app/**`, `frontend/src/components/**`, `frontend/src/services/api.ts` 변경 시.

# Preconditions
- 변경 대상 화면과 기대 동작이 합의되어 있어야 한다.

# Commands
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

# Workflow
1) Plan: 영향 범위와 재사용 가능한 컴포넌트를 확인한다.
2) Implement: UI/상태 변경을 `frontend/**` 내에서 구현한다.
3) Verify: lint/build 결과를 기록하고 필요 시 검증 에이전트로 핸드오프한다.

# Expected outputs
- 변경된 화면 요약과 근거.
- 실행한 검증 커맨드 결과.

# Failure modes & fixes
- lint/build 실패: 오류 메시지를 기준으로 컴포넌트/타입 수정.
- E2E 미구성: Playwright 구성 전까지 E2E는 생략하고 사유를 남긴다.
