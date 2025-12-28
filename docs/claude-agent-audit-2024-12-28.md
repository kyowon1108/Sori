# SORI Claude Agent Audit - 2024-12-28

## Overview
이 문서는 `.claude/` 디렉터리의 에이전트 및 스킬 정의를 검토한 결과를 기록합니다.

## Agent Inventory (14 agents)

### 1. sori-backend-agent
- **파일**: `.claude/agents/sori-backend-agent.md`
- **목적**: FastAPI/WebSocket/Celery 변경 구현
- **스킬**: `sori-backend-ws-contract`
- **Must-run**: `cd backend && pytest`
- **상태**: 정의가 명확하고 스킬과 일치함

### 2. sori-frontend-agent
- **파일**: `.claude/agents/sori-frontend-agent.md`
- **목적**: Next.js UI/UX 변경 구현
- **스킬**: `sori-frontend-ux`
- **Must-run**: `cd frontend && npm run lint`, `npm run build`
- **상태**: 정의가 명확하고 스킬과 일치함

### 3. sori-ui-verifier-agent
- **파일**: `.claude/agents/sori-ui-verifier-agent.md`
- **목적**: 프론트엔드 lint/build 검증 및 E2E 증빙
- **스킬**: `sori-ui-e2e-verification`
- **Must-run**: `cd frontend && npm run lint`, `npm run build`
- **상태**: 정의가 명확하고 스킬과 일치함

### 4. sori-integration-qa-agent
- **파일**: `.claude/agents/sori-integration-qa-agent.md`
- **목적**: 크로스 서피스 QA 조율
- **스킬**: `sori-ui-e2e-verification`
- **Must-run**: `cd frontend && npm run lint`, `npm run build`
- **상태**: 정의가 명확하고 스킬과 일치함

### 5. sori-contract-guard-agent
- **파일**: `.claude/agents/sori-contract-guard-agent.md`
- **목적**: OpenAPI/WS 계약 드리프트 및 테스트 가드
- **스킬**: `sori-openapi-snapshot-guard`
- **Must-run**: `bash scripts/export-openapi.sh`, `cd backend && pytest tests/test_ws_contract.py -v`
- **상태**: 정의가 명확하고 스킬과 일치함

### 6. sori-docs-agent
- **파일**: `.claude/agents/sori-docs-agent.md`
- **목적**: 코드 기반 구현 문서 생성
- **스킬**: `sori-docs-generator`
- **Must-run**: `mkdir -p docs`, `ls -la docs`
- **상태**: 정의가 명확하고 스킬과 일치함

### 7. sori-ios-agent
- **파일**: `.claude/agents/sori-ios-agent.md`
- **목적**: iOS VoiceCall 흐름, TTS/STT, WS 연동
- **스킬**: `sori-voicecall-ios`
- **Must-run**: `xcodebuild -list -project iOS/Sori.xcodeproj`
- **상태**: 정의가 명확하고 스킬과 일치함
- **주의**: iOS 디렉터리가 `Somi/`에서 `Sori/`로 변경되었을 가능성 있음 (git status에서 삭제/추가 확인됨)

### 8. sori-db-agent
- **파일**: `.claude/agents/sori-db-agent.md`
- **목적**: DB 스키마/마이그레이션/롤백 관리
- **스킬**: `sori-db-migrations`
- **Must-run**: `bash scripts/backup-db.sh`, `docker-compose up -d postgres`
- **상태**: 정의가 명확하고 스킬과 일치함

### 9. sori-docker-devops-agent
- **파일**: `.claude/agents/sori-docker-devops-agent.md`
- **목적**: docker-compose/CI/환경 wiring
- **스킬**: `sori-docker-ci`
- **Must-run**: `docker-compose up -d --build`, `docker-compose ps`
- **상태**: 정의가 명확하고 스킬과 일치함

### 10. sori-docker-restart-agent
- **파일**: `.claude/agents/sori-docker-restart-agent.md`
- **목적**: 변경 후 선택적 재시작/재빌드 및 헬스 체크
- **스킬**: `sori-docker-service-restart`
- **Must-run**: `docker compose config`, `docker compose ps`, `curl -f http://localhost:8000/health`
- **EC2 정보**: SSH_KEY: `~/.ssh/sori-ec2-key.pem`, HOST: `52.79.227.179`
- **상태**: 정의가 명확하고 스킬과 일치함

### 11. sori-security-agent
- **파일**: `.claude/agents/sori-security-agent.md`
- **목적**: 보안 민감 변경 리뷰
- **스킬**: `sori-security-review`
- **Must-run**: `rg -n "logger|print|console" backend frontend`, `rg -n "token|secret|api_key" backend frontend`
- **상태**: 정의가 명확하고 스킬과 일치함

### 12. sori-realtime-agent
- **파일**: `.claude/agents/sori-realtime-agent.md`
- **목적**: WS 라이프사이클/스트리밍/하트비트 불변식
- **스킬**: `sori-backend-ws-contract`
- **Must-run**: `rg -n "HEARTBEAT" backend/app/routes/websocket.py`, `rg -n "stream_end" backend/app/routes/websocket.py`
- **상태**: 정의가 명확하고 스킬과 일치함
- **주의**: 허용된 WS 타입 목록이 명시되어 있음 (`ping`, `pong`, `message`, `ack`, `stream_chunk`, `stream_end`, `end_call`, `ended`, `history`)

### 13. sori-aws-ec2-deploy-agent
- **파일**: `.claude/agents/sori-aws-ec2-deploy-agent.md`
- **목적**: AWS EC2 배포 및 iOS 실기기 검증
- **스킬**: `sori-aws-ec2-deploy`
- **Must-run**: `aws --version`, `aws sts get-caller-identity`, `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179 "whoami"`
- **EC2 정보**: SSH_KEY: `~/.ssh/sori-ec2-key.pem`, HOST: `52.79.227.179`, PROJECT_PATH: `~/sori`, BASE_URL: `http://52.79.227.179:8000`
- **상태**: 정의가 명확하고 스킬과 일치함

### 14. sori-docs-report-agent
- **파일**: `.claude/agents/sori-docs-report-agent.md`
- **목적**: 작업 완료 리포트 생성 및 docs 전용 커밋 준비
- **스킬**: `sori-docs-report`
- **Must-run**: `mkdir -p docs/reports`, `date +%F`, `git rev-parse --abbrev-ref HEAD`, `git diff --name-only`
- **상태**: 정의가 명확하고 스킬과 일치함

## Skill Inventory (11 skills)

### 1. sori-backend-ws-contract
- **파일**: `.claude/skills/sori-backend-ws-contract/SKILL.md`
- **목적**: FastAPI/WebSocket/Celery backend 변경과 WS 계약 규율
- **Commands**: `cd backend && pytest`
- **사용 에이전트**: `sori-backend-agent`, `sori-realtime-agent`
- **상태**: 일치

### 2. sori-frontend-ux
- **파일**: `.claude/skills/sori-frontend-ux/SKILL.md`
- **목적**: Next.js UI/UX 변경
- **Commands**: `cd frontend && npm run lint`, `npm run build`
- **사용 에이전트**: `sori-frontend-agent`
- **상태**: 일치

### 3. sori-ui-e2e-verification
- **파일**: `.claude/skills/sori-ui-e2e-verification/SKILL.md`
- **목적**: UI 자산 로드 오류와 주요 사용자 흐름 검증
- **Commands**: `cd frontend && npm run lint`, `npm run build`
- **사용 에이전트**: `sori-ui-verifier-agent`, `sori-integration-qa-agent`
- **상태**: 일치
- **주의**: Playwright는 구성된 경우에만 수행

### 4. sori-openapi-snapshot-guard
- **파일**: `.claude/skills/sori-openapi-snapshot-guard/SKILL.md`
- **목적**: OpenAPI 스냅샷 드리프트와 WS 계약 체크
- **Commands**: `bash scripts/export-openapi.sh`, `cd backend && pytest tests/test_ws_contract.py -v`
- **사용 에이전트**: `sori-contract-guard-agent`
- **상태**: 일치

### 5. sori-docs-generator
- **파일**: `.claude/skills/sori-docs-generator/SKILL.md`
- **목적**: 코드 기반 구현 문서 생성 (파일 경로 인용 포함)
- **Commands**: `rg --files -g 'backend/app/**'`, `mkdir -p docs && ls -la docs`
- **사용 에이전트**: `sori-docs-agent`
- **상태**: 일치

### 6. sori-voicecall-ios
- **파일**: `.claude/skills/sori-voicecall-ios/SKILL.md`
- **목적**: iOS VoiceCall 흐름, TTS/STT, WS 클라이언트 처리
- **Commands**: `xcodebuild -list -project iOS/Sori.xcodeproj`
- **사용 에이전트**: `sori-ios-agent`
- **상태**: 일치

### 7. sori-db-migrations
- **파일**: `.claude/skills/sori-db-migrations/SKILL.md`
- **목적**: DB 스키마 변경과 마이그레이션/롤백 절차
- **Commands**: `bash scripts/backup-db.sh`, `docker-compose up -d postgres`
- **사용 에이전트**: `sori-db-agent`
- **상태**: 일치

### 8. sori-docker-ci
- **파일**: `.claude/skills/sori-docker-ci/SKILL.md`
- **목적**: docker-compose/CI 변경과 환경 변수 영향 정리
- **Commands**: `docker-compose up -d --build`, `docker-compose ps`
- **사용 에이전트**: `sori-docker-devops-agent`
- **상태**: 일치

### 9. sori-docker-service-restart
- **파일**: `.claude/skills/sori-docker-service-restart/SKILL.md`
- **목적**: git diff 기반 선택적 서비스 재시작/재빌드
- **Commands**: `docker compose config`, `docker compose ps`, `curl -f http://localhost:8000/health`
- **사용 에이전트**: `sori-docker-restart-agent`
- **EC2 정보**: SSH_KEY: `~/.ssh/sori-ec2-key.pem`, HOST: `52.79.227.179`
- **상태**: 일치

### 10. sori-security-review
- **파일**: `.claude/skills/sori-security-review/SKILL.md`
- **목적**: 인증/인가, 토큰 처리, 로그/PII 노출 검토
- **Commands**: `rg -n "logger|print|console" backend frontend`, `rg -n "token|secret|api_key" backend frontend`
- **사용 에이전트**: `sori-security-agent`
- **상태**: 일치

### 11. sori-docs-report
- **파일**: `.claude/skills/sori-docs-report/SKILL.md`
- **목적**: 표준 보고서 생성 (`docs/reports/`)
- **Commands**: `mkdir -p docs/reports`, `date +%F`, `git rev-parse --abbrev-ref HEAD`
- **사용 에이전트**: `sori-docs-report-agent`
- **상태**: 일치

## README.md Routing Playbook 검증

`.claude/README.md`의 라우팅 플레이북이 정확한지 확인:

| 시나리오 | 주 에이전트 | 후속/의존 | 검증 결과 |
|---------|-----------|---------|----------|
| Backend API 변경 | `sori-backend-agent` | `sori-openapi-snapshot-guard` skill + `sori-frontend-agent`/`sori-ios-agent` + `sori-integration-qa-agent` | ✓ 일치 |
| WebSocket 프로토콜 변경 | `sori-realtime-agent` 또는 `sori-backend-agent` | `sori-backend-ws-contract` skill + `sori-frontend-agent` + `sori-ios-agent` + `sori-integration-qa-agent` | ✓ 일치 |
| DB 스키마 변경 | `sori-db-agent` | `sori-backend-agent` + `sori-integration-qa-agent` | ✓ 일치 |
| Frontend UI-only 변경 | `sori-frontend-agent` | `sori-ui-verifier-agent` + (플로우 변경 시) `sori-integration-qa-agent` | ✓ 일치 |
| iOS voicecall 플로우 변경 | `sori-ios-agent` | payload 변경 시 `sori-openapi-snapshot-guard`/`sori-backend-ws-contract` + `sori-integration-qa-agent` | ✓ 일치 |
| Docker/infra 구조 변경 | `sori-docker-devops-agent` | `sori-integration-qa-agent` | ✓ 일치 |
| Docker 서비스 재시작/재빌드 | `sori-docker-restart-agent` | `sori-integration-qa-agent` | ✓ 일치 |
| 보안 민감 변경 | `sori-security-agent` | 도메인 에이전트 + `sori-integration-qa-agent` | ✓ 일치 |
| AWS EC2 배포 | `sori-aws-ec2-deploy-agent` | `sori-integration-qa-agent` | ✓ 일치 |
| 모든 작업 완료 후 | `sori-docs-report-agent` | 없음 | ✓ 일치 |

## 발견된 불일치 및 개선 사항

### 1. iOS 프로젝트 경로 변경 (검토 필요)
- **현상**: git status에서 `iOS/Somi/` 삭제, `iOS/Sori/` 추가 확인
- **영향**: `sori-ios-agent`와 `sori-voicecall-ios` 스킬에서 `iOS/Sori.xcodeproj` 참조
- **권장**: 프로젝트 이름 변경이 의도된 것인지 확인 필요

### 2. 새로운 WebSocket v2 구현 (문서화 필요)
- **현상**: `backend/app/routes/websocket_v2.py` 파일 발견 (untracked)
- **영향**: `sori-realtime-agent` 및 WS 계약 관리에 영향 가능
- **권장**: v2 구현 완료 시 README.md와 관련 에이전트 문서 업데이트 필요

### 3. 새로운 AI Agent 구현 (문서화 필요)
- **현상**: `backend/app/services/agents/`, `backend/app/services/ai_service.py`, `backend/app/services/tools/`, `backend/app/skills/` 디렉터리 발견 (untracked)
- **영향**: 백엔드 아키텍처에 AI 에이전트 기능 추가
- **권장**: AI 에이전트 기능이 안정화되면 `sori-backend-agent` 문서와 README.md에 반영 필요

### 4. 문서 구조 정리 (완료)
- **현상**: `docs/backend/`, `docs/frontend/`, `docs/ios/` 디렉터리 생성됨
- **상태**: 구조가 명확하고 `sori-docs-agent`의 출력 기대에 부합함
- **권장**: 추가 문서화 작업 계속 진행

### 5. Handoff Template 일관성
- **현상**: 모든 에이전트가 동일한 handoff template 사용
- **상태**: ✓ 일관성 유지됨
- **권장**: 계속 유지

## 권장 사항

1. **즉시 조치 필요**:
   - iOS 프로젝트 이름 변경 (`Somi` → `Sori`) 확인 및 문서 정합성 검토
   - WebSocket v2와 AI 에이전트 구현이 production-ready가 되면 문서화

2. **단기 조치**:
   - `sori-docs-report-agent`를 사용하여 최근 변경 내용 보고서 생성
   - `.claude/README.md`의 "Test Accounts" 섹션에 추가 계정이 필요한지 검토

3. **장기 조치**:
   - E2E 테스트 (Playwright) 구성 완료 시 `sori-ui-e2e-verification` 스킬 업데이트
   - CI/CD 파이프라인에 계약 체크 통합 (이미 skill에 언급되어 있음)

## 결론

전반적으로 `.claude/` 디렉터리의 에이전트 및 스킬 정의는 **높은 수준의 일관성과 정확성**을 유지하고 있습니다:

- **14개 에이전트**: 모두 명확한 목적과 책임 정의
- **11개 스킬**: 에이전트와 정확히 매핑됨
- **라우팅 플레이북**: 시나리오별 에이전트 흐름이 명확함
- **Handoff Template**: 모든 에이전트에서 일관되게 사용됨
- **EC2 배포 정보**: `sori-aws-ec2-deploy-agent`와 `sori-docker-restart-agent`에 명확히 문서화됨

주요 개선 영역은 진행 중인 구현 (WebSocket v2, AI 에이전트)을 문서에 반영하는 것입니다.
