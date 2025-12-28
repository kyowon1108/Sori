# SORI Claude Configuration Summary

## 목적
이 문서는 `.claude/` 디렉터리의 에이전트 및 스킬 구성을 요약하고, 프로젝트 전반의 Claude Code 활용 방법을 안내합니다.

## 참조 문서
- **메인 라우팅 가이드**: `.claude/README.md` - 에이전트 목록, EC2 정보, 라우팅 플레이북, PR DoD
- **감사 보고서**: `docs/claude-agent-audit-2024-12-28.md` - 2024-12-28 기준 정합성 검증 결과

## Quick Reference

### EC2 서버 정보
```bash
URL: http://52.79.227.179
Backend API: http://52.79.227.179:8000
SSH: ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179
Project Path: ~/sori
```

### 테스트 계정
| Role | Email | Password |
|------|-------|----------|
| Caregiver (보호자) | test@sori.com | Test1234 |

## Agent 선택 가이드

### Backend 변경
- **API/서비스 로직**: `sori-backend-agent`
- **WebSocket 프로토콜**: `sori-realtime-agent`
- **DB 스키마**: `sori-db-agent`

### Frontend 변경
- **UI/UX 구현**: `sori-frontend-agent`
- **UI 검증**: `sori-ui-verifier-agent`

### Infrastructure
- **compose/CI/env**: `sori-docker-devops-agent`
- **서비스 재시작**: `sori-docker-restart-agent`
- **EC2 배포**: `sori-aws-ec2-deploy-agent`

### Quality & Documentation
- **계약 검증**: `sori-contract-guard-agent`
- **크로스 QA**: `sori-integration-qa-agent`
- **보안 리뷰**: `sori-security-agent`
- **문서 생성**: `sori-docs-agent`
- **보고서 생성**: `sori-docs-report-agent`

### iOS
- **VoiceCall 흐름**: `sori-ios-agent`

## 일반적인 워크플로우

### 1. Backend API 변경
```
sori-backend-agent
  → sori-openapi-snapshot-guard (skill)
  → sori-frontend-agent (클라이언트 영향 시)
  → sori-ios-agent (iOS 영향 시)
  → sori-integration-qa-agent
  → sori-docs-report-agent
```

### 2. WebSocket 프로토콜 변경
```
sori-realtime-agent
  → sori-contract-guard-agent
  → sori-frontend-agent
  → sori-ios-agent
  → sori-integration-qa-agent
  → sori-docs-report-agent
```

### 3. UI 변경
```
sori-frontend-agent
  → sori-ui-verifier-agent
  → sori-integration-qa-agent (플로우 변경 시)
  → sori-docs-report-agent
```

### 4. DB 스키마 변경
```
sori-db-agent
  → sori-backend-agent (모델 동기화)
  → sori-integration-qa-agent
  → sori-docs-report-agent
```

### 5. 배포
```
sori-docker-restart-agent (로컬 검증)
  → sori-aws-ec2-deploy-agent (EC2 배포)
  → sori-integration-qa-agent (배포 검증)
  → sori-docs-report-agent
```

## 허용된 WebSocket 타입 (중요!)
`sori-backend-agent`와 `sori-realtime-agent`는 다음 WS 타입만 사용:
- `ping`, `pong`, `message`, `ack`
- `stream_chunk`, `stream_end`
- `end_call`, `ended`, `history`

**신규 타입 추가는 금지**됩니다.

## 계약 관리
- **OpenAPI**: `contracts/openapi.snapshot.json` - `bash scripts/export-openapi.sh`로 갱신
- **WebSocket**: `contracts/ws.messages.md` - 수동 정렬 및 `cd backend && pytest tests/test_ws_contract.py -v`로 검증

## PR Definition of Done
- **UI 변경**: `npm run lint`, `npm run build` 통과, E2E는 Playwright 구성 시에만
- **계약 변경**: REST는 `openapi.snapshot.json`, WS는 `ws.messages.md` 점검
- **QA 검증**: `sori-integration-qa-agent` 요약 리포트 포함

## Must-Run Checks (에이전트별)

### Backend
```bash
cd backend && pytest
```

### Frontend
```bash
cd frontend && npm run lint
cd frontend && npm run build
```

### 계약
```bash
bash scripts/export-openapi.sh
cd backend && pytest tests/test_ws_contract.py -v
```

### Docker
```bash
docker compose config
docker compose ps
docker compose logs --tail=200 <service>
curl -f http://localhost:8000/health
curl -f http://localhost:3000
```

### EC2 배포
```bash
aws --version
aws sts get-caller-identity
aws configure get region
ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "whoami"
ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "cd ~/sori && docker compose ps"
curl -f http://52.79.227.179:8000/health
```

### iOS
```bash
xcodebuild -list -project iOS/Sori.xcodeproj
```

## 보안 주의사항
- **로컬 설정 커밋 금지**: iOS baseURL 변경은 로컬 검증 전용
- **민감 정보 마스킹**: 보고서에서 토큰/키/호스트/IP는 `<REDACTED>` 처리
- **백업 필수**: DB 스키마 변경 전 `bash scripts/backup-db.sh` 실행

## 파일 생성 규칙 (중요!)
모든 에이전트는 파일 생성 시 반드시 Bash 명령어를 사용해야 합니다.
Write/Edit 도구는 사용 불가합니다.

## Handoff Template (모든 에이전트 공통)
```
- Context:
- Goal:
- Non-goals:
- AC:
- Test plan:
- Rollback:
- Security trigger:
- Next agent:
- Deployed URL:
- /health result:
- Git SHA:
- Services restarted:
- Manual steps:
- iOS baseURL applied:
- Device run checklist:
```

## 추가 참고사항
1. **E2E 테스트**: Playwright 구성 전까지 생략 (사유 명시)
2. **스냅샷 업데이트**: 의도된 변경일 때만 수행
3. **WS 계약**: `backend/app/routes/websocket.py` 동작과 일치 필수
4. **환경 변수**: `.env.example` 변경 시 모든 서비스 영향 가능

## 최근 변경사항
- **2024-12-28**: iOS 프로젝트 이름 변경 (`Somi` → `Sori`)
- **2024-12-28**: WebSocket v2 구현 진행 중 (`backend/app/routes/websocket_v2.py`)
- **2024-12-28**: AI 에이전트 기능 추가 중 (`backend/app/services/agents/`)
- **2024-12-28**: 문서 구조 정리 (`docs/backend/`, `docs/frontend/`, `docs/ios/`)

## 문제 발생 시
1. 해당 에이전트의 `.claude/agents/` 정의 확인
2. 관련 스킬의 `.claude/skills/*/SKILL.md` 확인
3. `.claude/README.md`의 라우팅 플레이북 참조
4. `docs/claude-agent-audit-2024-12-28.md`에서 알려진 이슈 확인
