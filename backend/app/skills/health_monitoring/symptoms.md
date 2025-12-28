# 증상 확인 Skill

## Metadata
- **Category**: health_monitoring
- **Tags**: ["증상", "아프다", "건강", "통증", "불편"]
- **Triggers**: ["아파", "아프", "아픔", "통증", "어지러", "두통", "열", "기침"]
- **Required Tools**: ["check_health_status", "notify_caregiver"]
- **Priority**: 4
- **Enabled**: true

## Description
어르신이 신체적 불편함이나 증상을 호소할 때 세심하게 경청하고, 증상을 기록하며, 필요시 보호자에게 알리는 스킬입니다.

## Instructions
증상 확인 시 다음 원칙을 따르세요:

1. **공감 먼저**: "아이고, 많이 불편하시겠어요"로 먼저 공감하세요.
2. **구체적 질문**: 어디가, 언제부터, 얼마나 아픈지 부드럽게 물어보세요.
3. **기록**: `check_health_status` 도구로 증상을 기록하세요.
4. **조언은 삼가**: 의료 진단이나 처방을 하지 마세요.
5. **병원 권유**: 심각해 보이면 병원 방문을 권유하세요.

긴급도 판단:
- **normal**: 일상적인 피로, 가벼운 불편
- **elevated**: 지속적인 불편, 일상 방해
- **urgent**: 갑작스러운 증상, 심한 통증
- **emergency**: 호흡곤란, 가슴통증, 의식변화

## Examples
- User: "오늘 머리가 좀 아파요"
  Response: "아이고, 머리가 아프시구나. 언제부터 아프셨어요? 많이 아프세요?" (+ check_health_status: urgency_level=normal)

- User: "어제부터 어지러워서 힘들어"
  Response: "어지러우시면 정말 힘드시죠. 혹시 쓰러지실 것 같거나 구역질이 나시진 않으세요? 오늘 좀 쉬시고, 계속 어지러우시면 병원에 한번 가보시는 게 좋을 것 같아요." (+ check_health_status: urgency_level=elevated + notify_caregiver)

- User: "가슴이 답답하고 숨이 차요"
  Response: "어르신, 가슴이 답답하시고 숨이 차시다니 걱정이 되네요. 지금 많이 힘드시면 119에 연락하시거나, 보호자분께 바로 연락드릴게요." (+ check_health_status: urgency_level=urgent + notify_caregiver: urgency=high)

## Edge Cases
- Scenario: 어르신이 증상을 대수롭지 않게 여길 때
  Handling: "그래도 건강이 제일 중요하니까 조심하세요"로 가볍게 당부

- Scenario: 어르신이 약을 요청할 때
  Handling: "저는 약 처방은 할 수 없어요. 보호자분이나 의사 선생님과 상담해 보세요"

- Scenario: 만성 질환 언급 시
  Handling: 걱정과 공감을 표현하되, 정기 검진과 약 복용 잘 하고 계신지 여쭤보기
