# Claude Routing
- Frontend changes: use `sori-frontend-agent` with `sori-frontend-ux`, then hand off to `sori-ui-verifier-agent` for lint/build/e2e evidence.
- Backend changes: use `sori-backend-agent` with `sori-backend-ws-contract`.
- Contract guards: use `sori-contract-guard-agent` with `sori-openapi-snapshot-guard`.
- Docs: use `sori-docs-agent` with `sori-docs-generator`.
- **Docker/infra changes**: use `sori-docker-restart-agent` with `sori-docker-service-restart`.

## Docker Restart Routing

### When to Use
Docker/infra 관련 파일 변경 시 `sori-docker-restart-agent` 사용:
- `docker-compose*.yml`, `compose.yaml` 변경
- `Dockerfile` (backend 또는 frontend) 변경
- 환경변수 파일(`.env`, `*.env`) 변경
- `nginx.conf`, `init-db.sql` 등 인프라 설정 파일 변경
- `backend/requirements.txt`, `frontend/package.json` 등 의존성 파일 변경
- `scripts/docker/**` 스크립트 변경

### Must-Run Checks
Agent는 반드시 다음 검증을 수행해야 함:
1. `docker compose config` - 구성 파일 유효성 검증
2. `docker compose ps` - 서비스 실행 상태 확인
3. `docker compose logs --tail=200 <service>` - 재시작한 서비스 로그 확인
4. Backend health check: `curl -f http://localhost:8000/health`
5. Frontend reachability: `curl -f http://localhost:3000`

### Handoff Format
Agent는 작업 완료 시 다음 형식으로 리포트:

```
## Restart Summary

### Changed Files
- [변경된 파일 목록]

### Impacted Services
- [서비스명]: [restart|rebuild] - [사유]

### Commands Executed
1. [명령어]: [✓|✗] [결과]

### Verification Results
- [서비스] health: [✓|✗] [상세]
- Logs: [요약]

### Warnings
- [경고사항 또는 none]

### Next Actions
- [권장 후속 조치]
```

### Example Usage
```
Context: docker-compose.yml에서 backend 서비스의 환경변수 추가
Goal: Backend 서비스 재시작 및 정상 동작 확인
Acceptance Criteria:
  - Backend 서비스가 새 환경변수를 인식
  - Health check 통과
  - 로그에 에러 없음
Test Plan:
  - docker compose config 검증
  - docker compose restart backend
  - curl http://localhost:8000/health 확인
Rollback:
  - git checkout docker-compose.yml
  - docker compose restart backend
```

### Follow-up Agents
Docker 변경 후 필요 시 추가 agent 호출:
- **Cross-surface 영향**: `sori-integration-qa-agent` (frontend ↔ backend 통합 테스트)
- **API contract 변경**: `sori-contract-guard-agent` (OpenAPI snapshot 검증)
- **Frontend UI 영향**: `sori-ui-verifier-agent` (E2E 테스트)

### Helper Script
Optional: `scripts/docker/restart-impacted-services.sh`
- Git diff 기반으로 영향받는 서비스 자동 식별 및 재시작
- Dry-run 모드: `DRY_RUN=1 ./scripts/docker/restart-impacted-services.sh`
- 실제 실행: `./scripts/docker/restart-impacted-services.sh`
