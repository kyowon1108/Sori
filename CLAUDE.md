# SORI Claude Guide

## Claude Asset Validation
- `python scripts/validate_claude_assets.py`

## Routing Playbook
| Change type | Primary agent | Required follow-ups | Must-run checks |
| --- | --- | --- | --- |
| Frontend UI change | `sori-ui-verifier-agent` | `sori-integration-qa-agent` if user flows change | `cd frontend && npm run lint`, `cd frontend && npm run build`, `cd frontend && npm run e2e` (snapshots in `frontend/tests/e2e/__screenshots__`, update intentionally with `npm run e2e -- --update-snapshots`) |

## UI Verification Notes
- Base URL override: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000`
- E2E uses Playwright route mocks + seeded auth state; backend is not required.

## PR Definition of Done
- `python scripts/validate_claude_assets.py` passes.
- If UI changed: run the `sori-ui-e2e-verification` workflow (lint/build/E2E).
- Snapshot updates are intentional only; document rationale in the PR.
