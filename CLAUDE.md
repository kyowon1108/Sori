# Claude Routing
- Frontend changes: use `sori-frontend-agent` with `sori-frontend-ux`, then hand off to `sori-ui-verifier-agent` for lint/build/e2e evidence.
- Backend changes: use `sori-backend-agent` with `sori-backend-ws-contract`.
- Contract guards: use `sori-contract-guard-agent` with `sori-openapi-snapshot-guard`.
- Docs: use `sori-docs-agent` with `sori-docs-generator`.
