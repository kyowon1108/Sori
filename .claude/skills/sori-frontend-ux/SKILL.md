---
name: sori-frontend-ux
description: Handles SORI Next.js UI/UX changes for dashboard and elderly flows within frontend/.
---
# 목적/범위
- `frontend/**` 범위의 UI/UX 변경 (페이지, 레이아웃, 컴포넌트, 상태/API 연동).
- 주요 대상: `frontend/app/(main)/dashboard/page.tsx`, `frontend/src/components/**`, `frontend/src/services/api.ts`.

# Inputs (필수/선택)
- 필수: 변경 대상 화면/경로, 기대 동작.
- 선택: 디자인 레퍼런스, 스크린샷, 관련 API 변경 요약.

# Steps (Plan → Implement → Verify)
1) Plan: 영향 범위와 재사용 가능한 컴포넌트를 확인한다.
2) Implement: UI/상태 변경을 `frontend/**` 내에서 구현한다.
3) Verify: lint/build/e2e를 실행하거나 `sori-ui-verifier-agent`로 검증을 위임한다.

# Commands
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm run e2e`
- `cd frontend && npm run e2e -- --update-snapshots`

# DoD / AC
- 변경된 화면이 기대 동작을 충족한다.
- 콘솔 오류/자산 로드 실패가 없다.
- 스냅샷 변경은 의도된 경우에만 발생한다.

# Guardrails
- `frontend/app/(auth)/layout.tsx`는 수정하지 않는다.
- `frontend/**` 외 영역은 변경하지 않는다.
- 스냅샷 업데이트는 명시적인 의도가 있을 때만 수행한다.
