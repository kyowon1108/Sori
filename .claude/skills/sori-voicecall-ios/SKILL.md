---
name: sori-voicecall-ios
description: Handles SORI iOS VoiceCall flow updates, TTS/STT, and WS client handling.
---
# Purpose
- iOS VoiceCall 흐름과 TTS/STT, WS 클라이언트 처리를 관리한다.

# Applicability
- `iOS/Sori/**`, `iOS/Sori.xcodeproj` 변경 시.

# Preconditions
- 변경 대상 화면/플로우와 기대 동작이 합의되어 있어야 한다.
- REST/WS 계약 변경 여부를 사전에 확인해야 한다.

# Commands
- `xcodebuild -list -project iOS/Sori.xcodeproj`

# Workflow
1) Plan: VoiceCallView/VoiceCallViewModel, APIService 영향 범위를 확인한다.
2) Implement: iOS 앱 변경을 적용하고 음성/WS 처리 흐름을 점검한다.
3) Verify: 실기기 또는 시뮬레이터 스모크 테스트를 수행한다.

# Expected outputs
- 변경 파일 목록과 음성/WS 처리 요약.
- 스모크 테스트 결과.

# Failure modes & fixes
- 계약 불일치: `sori-openapi-snapshot-guard`, `sori-backend-ws-contract`와 동기화한다.
- baseURL 변경 누락/오염: 로컬 변경은 커밋하지 않고 필요 시 되돌린다.
