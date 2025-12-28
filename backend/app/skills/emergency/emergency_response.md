# 긴급 상황 대응 Skill

## Metadata
- **Category**: emergency
- **Tags**: ["긴급", "응급", "위험", "119", "도움"]
- **Triggers**: ["쓰러", "의식", "숨", "가슴", "119", "응급", "도와줘", "살려"]
- **Required Tools**: ["notify_caregiver", "end_call"]
- **Priority**: 5
- **Enabled**: true

## Description
어르신이 긴급한 의료 상황이나 위험한 상황에 처했을 때 신속하게 대응하고 보호자에게 알리는 스킬입니다.

## Instructions
긴급 상황 시 다음 순서로 대응하세요:

1. **상황 파악**: 빠르고 명확하게 상황을 확인하세요.
2. **안정감 제공**: 당황하지 말고 침착하게 말씀하세요.
3. **119 안내**: 필요시 119에 전화하도록 안내하세요.
4. **보호자 알림**: 즉시 `notify_caregiver`를 urgency=critical로 호출
5. **통화 유지**: 가능하면 도움이 올 때까지 통화를 유지하세요.

긴급 상황 인지 신호:
- "쓰러졌어요", "의식이 없어요"
- "숨을 못 쉬겠어요", "가슴이 아파요"
- "피가 나요", "다쳤어요"
- "도와줘요", "살려주세요"
- 자해/자살 암시

## Examples
- User: "숨을 못 쉬겠어요"
  Response: "어르신, 지금 숨쉬기가 힘드신 거죠? 천천히 심호흡 해보세요. 지금 바로 119에 전화하시거나, 제가 보호자분께 연락드릴게요. 절대 움직이지 마시고 계세요." (+ notify_caregiver: urgency=critical, notification_type=emergency)

- User: "쓰러졌어요"
  Response: "어르신! 지금 어디 다치신 데는 없으세요? 움직이지 마시고 누워 계세요. 지금 바로 보호자분께 연락드릴게요. 119도 부르시는 게 좋겠어요." (+ notify_caregiver: urgency=critical, notification_type=emergency)

- User: "죽고 싶어요"
  Response: "어르신, 지금 정말 힘드신 거 알겠어요. 그런 생각이 드실 만큼 힘드셨구나. 절대 혼자 그런 생각 하지 마시고, 지금 바로 보호자분께 연락드릴게요. 저도 계속 옆에 있을게요." (+ notify_caregiver: urgency=critical, message="어르신이 자살 암시를 하셨습니다")

## Edge Cases
- Scenario: 어르신이 응답이 없을 때
  Handling: "어르신? 제 말 들리세요?" 반복 후 보호자 긴급 연락

- Scenario: 오인 상황 (장난 또는 착각)
  Handling: 일단 진지하게 대응 후, 확인되면 "다행이에요, 걱정했어요"로 마무리

- Scenario: 어르신이 119 전화를 거부할 때
  Handling: "그래도 안전을 위해 보호자분께는 연락드릴게요"로 최소한의 조치

- Scenario: 통화가 갑자기 끊겼을 때
  Handling: 자동으로 보호자에게 "통화 중 연결 끊김" 알림 전송
