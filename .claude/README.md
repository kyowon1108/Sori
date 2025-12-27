# SORI Claude Routing

## EC2 Server Info
- **URL**: `http://52.79.227.179`
- **Backend API**: `http://52.79.227.179:8000`
- **SSH**: `ssh -i ~/.ssh/sori-ec2-key.pem ubuntu@52.79.227.179`
- **Project Path**: `/home/ubuntu/sori`

## Test Accounts
| Role | Email | Password |
| --- | --- | --- |
| Caregiver (보호자) | `test@sori.com` | `Test1234` |

## Agent Directory
- `sori-backend-agent`: FastAPI/WS/Celery 변경과 최소 WS 계약 규율.
- `sori-frontend-agent`: Next.js UI/UX 변경 및 검증 핸드오프.
- `sori-ui-verifier-agent`: 프론트엔드 lint/build 검증 및 (구성 시) E2E 증빙.
- `sori-integration-qa-agent`: 크로스 서피스 QA 조율.
- `sori-contract-guard-agent`: OpenAPI/WS 계약 드리프트 및 테스트 가드.
- `sori-docs-agent`: 코드 기반 구현 문서 생성.
- `sori-ios-agent`: iOS VoiceCall 흐름, TTS/STT, WS 연동.
- `sori-db-agent`: DB 스키마/마이그레이션/롤백 관리.
- `sori-docker-devops-agent`: docker-compose/CI/환경 wiring.
- `sori-docker-restart-agent`: 변경 후 선택적 재시작/재빌드 및 헬스 체크.
- `sori-security-agent`: 보안 민감 변경 리뷰.
- `sori-realtime-agent`: WS 라이프사이클/스트리밍/하트비트 불변식.
- `sori-aws-ec2-deploy-agent`: AWS EC2 배포 및 iOS 실기기 검증.
- `sori-docs-report-agent`: 작업 완료 리포트 생성 및 docs 전용 커밋 준비.

## Routing Playbook
| 시나리오 | 주 에이전트 | 후속/의존 |
| --- | --- | --- |
| Backend API 변경 | `sori-backend-agent` | `sori-openapi-snapshot-guard` skill + `sori-frontend-agent`/`sori-ios-agent` + `sori-integration-qa-agent` |
| WebSocket 프로토콜 변경 | `sori-realtime-agent` 또는 `sori-backend-agent` | `sori-backend-ws-contract` skill + `sori-frontend-agent` + `sori-ios-agent` + `sori-integration-qa-agent` |
| DB 스키마 변경 | `sori-db-agent` | `sori-backend-agent` + `sori-integration-qa-agent` |
| Frontend UI-only 변경 | `sori-frontend-agent` | `sori-ui-verifier-agent` + (플로우 변경 시) `sori-integration-qa-agent` |
| iOS voicecall 플로우 변경 | `sori-ios-agent` | payload 변경 시 `sori-openapi-snapshot-guard`/`sori-backend-ws-contract` + `sori-integration-qa-agent` |
| Docker/infra 구조 변경(compose/CI/env) | `sori-docker-devops-agent` | `sori-integration-qa-agent` |
| Docker 서비스 재시작/재빌드 | `sori-docker-restart-agent` | `sori-integration-qa-agent` |
| 보안 민감 변경 | `sori-security-agent` | 도메인 에이전트 + `sori-integration-qa-agent` |
| AWS EC2 배포 | `sori-aws-ec2-deploy-agent` | `sori-integration-qa-agent` |
| 모든 작업 완료 후 | `sori-docs-report-agent` | 없음 |

## E2E Examples
1) 대시보드 UI 변경
   - 순서: `sori-frontend-agent` → `sori-ui-verifier-agent` → `sori-integration-qa-agent`
   - 산출물: lint/build 결과, 콘솔/네트워크 오류 요약, (Playwright 구성 시) E2E 증빙
2) WS 메시지 변경
   - 순서: `sori-realtime-agent` → `sori-contract-guard-agent` → `sori-frontend-agent`/`sori-ios-agent` → `sori-integration-qa-agent`
   - 산출물: `contracts/ws.messages.md` 정렬 요약, WS 계약 테스트 결과, 클라이언트 영향 요약
3) DB 스키마 변경
   - 순서: `sori-db-agent` → `sori-backend-agent` → `sori-integration-qa-agent`
   - 산출물: 마이그레이션 노트, 롤백 절차, 검증 커맨드 결과

## PR Definition of Done
- UI: 변경 범위에 따라 `npm run lint`/`npm run build` 증빙 확보, E2E는 Playwright 구성 시에만 수행
- Contracts: REST 변경 시 `contracts/openapi.snapshot.json` 갱신, WS 변경 시 `contracts/ws.messages.md` 점검
- QA: `sori-integration-qa-agent` 요약 리포트 포함
