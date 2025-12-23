---
name: sori-ui-e2e-verification
description: Verifies SORI frontend UI behavior and assets with Playwright E2E and visual snapshots. Use when UI changes need reproducible checks.
---
# Purpose
- Ensure UI assets load without errors and user journeys remain valid.
- Provide repeatable E2E + visual regression workflows for dashboard and elderly flows.

# Applicability
- Apply when touching `frontend/app/**`, `frontend/src/components/**`, `frontend/public/**`, or layout/styling changes.

# UI Quality Bar
- No console errors (error-level).
- No failed network requests for images/CSS.
- Key journeys pass (dashboard -> elderly list -> elderly detail).
- Visual snapshots only updated intentionally.

# Standard Commands
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm run e2e`
- `cd frontend && npm run e2e -- --update-snapshots`

# Workflow
1) Run lint and E2E tests.
2) If snapshots change intentionally, update with `--update-snapshots` and record rationale.
3) Attach Playwright report artifacts when failures occur.
4) E2E uses Playwright mocks for API responses and seeds auth via cookie/localStorage.

# Common Failure Points + Fix
- Middleware redirects to login: ensure test auth cookie and localStorage are set.
- Image/CSS failures: verify files exist in `frontend/public` and paths are correct.
- Snapshot diffs: confirm UI change is intended before updating.
