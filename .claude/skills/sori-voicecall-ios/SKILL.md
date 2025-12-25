---
name: sori-voicecall-ios
description: Handles SORI iOS VoiceCall flow updates, TTS/STT, and WS client handling.
---
# 목적/범위
- iOS SwiftUI VoiceCallView 흐름, TTS/STT, WS 클라이언트, 페어링 흐름을 다룬다.
- 대상: `iOS/Somi/**`, `iOS/Somi.xcodeproj`.

# Preconditions
- 변경 대상 화면/플로우와 기대 동작이 합의되어 있어야 한다.
- REST/WS 계약 변경 여부를 사전에 확인해야 한다.

# Inputs (필수/선택)
- 필수: 변경 대상 화면/기능, 기대 동작.
- 선택: 오디오 세션 요구사항, 테스트 시나리오.

# Steps (Plan → Implement → Verify)
1) Plan: VoiceCallView/VoiceCallViewModel, APIService, PendingCallService 영향 범위를 확인한다.
2) Implement: iOS 앱 변경을 적용하고 음성/WS 처리 흐름을 점검한다.
3) Verify: 시뮬레이터 스모크 테스트와 로그 확인을 수행한다.

# Commands
- `xcodebuild -list -project iOS/Somi.xcodeproj`

# Expected outputs
- 변경 파일 목록과 음성/WS 처리 요약.
- 시뮬레이터 스모크 테스트 결과.

# DoD / AC
- VoiceCallView 주요 흐름이 정상 동작한다.
- TTS/STT, 오디오 세션, WS 메시지 처리에서 주요 오류가 없다.

# Guardrails
- REST/WS payload 변경 시 `sori-openapi-snapshot-guard`, `sori-backend-ws-contract`를 함께 사용한다.
- 계약 변경이 있으면 `sori-backend-agent`에 공유한다.
