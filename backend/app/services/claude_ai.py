import anthropic
import json
import re
from typing import AsyncGenerator
from app.core.config import settings


class ClaudeService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)

    async def stream_chat_response(self, messages: list) -> AsyncGenerator[str, None]:
        """Claude API를 사용한 스트리밍 응답"""
        system_prompt = """당신은 친절하고 감정적으로 공감하는 AI 상담사입니다.
어르신들의 이야기를 경청하고, 그들의 감정에 공감하며, 긍정적인 격려를 제공합니다.
항상 존댓말을 사용하고, 어르신의 건강과 안전을 최우선으로 고려합니다."""

        formatted_messages = [
            {
                "role": msg["role"],
                "content": msg["content"]
            }
            for msg in messages
        ]

        with self.client.messages.stream(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            system=system_prompt,
            messages=formatted_messages
        ) as stream:
            for text in stream.text_stream:
                yield text

    def analyze_call(self, messages: list) -> dict:
        """통화 분석 (legacy method)"""
        analysis_prompt = f"""다음 상담 대화를 분석해주세요.

대화 내용:
{self._format_messages(messages)}

다음 항목을 JSON 형식으로 제공해주세요:
{{
  "risk_level": "low|medium|high|critical",
  "sentiment_score": -1.0 ~ 1.0 사이의 숫자,
  "summary": "대화 요약",
  "recommendations": ["추천사항1", "추천사항2"]
}}

반드시 유효한 JSON 형식으로만 응답해주세요."""

        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": analysis_prompt
                }
            ]
        )

        # JSON 파싱
        response_text = response.content[0].text

        # JSON 블록 추출
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        # 기본값 반환
        return {
            "risk_level": "low",
            "sentiment_score": 0.0,
            "summary": "분석을 수행할 수 없습니다.",
            "recommendations": []
        }

    def analyze_conversation(self, conversation: str, elderly_context: str = "") -> dict:
        """
        Analyze a conversation and return risk assessment.
        Returns: {summary, risk_score (0-100), concerns, recommendations}
        """
        context_section = f"\n어르신 정보: {elderly_context}" if elderly_context else ""

        analysis_prompt = f"""다음 상담 대화를 분석해주세요.{context_section}

대화 내용:
{conversation}

다음 항목을 JSON 형식으로 제공해주세요:
{{
  "summary": "대화 요약 (2-3문장)",
  "risk_score": 0-100 사이의 정수 (0=안전, 100=매우 위험),
  "concerns": "우려사항 (없으면 빈 문자열)",
  "recommendations": "권장 조치사항"
}}

위험 점수 기준:
- 0-30: 건강하고 긍정적인 대화
- 31-50: 약간의 주의 필요 (외로움, 가벼운 건강 불편)
- 51-70: 주의 필요 (우울감, 건강 문제 언급)
- 71-90: 높은 관심 필요 (심한 우울, 고립감, 건강 악화)
- 91-100: 즉각적 개입 필요 (자해 암시, 심각한 건강 위기)

반드시 유효한 JSON 형식으로만 응답해주세요."""

        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": analysis_prompt
                }
            ]
        )

        response_text = response.content[0].text

        # JSON 블록 추출
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            try:
                result = json.loads(json_match.group())
                # Ensure risk_score is an integer
                result["risk_score"] = int(result.get("risk_score", 0))
                return result
            except (json.JSONDecodeError, ValueError):
                pass

        # 기본값 반환
        return {
            "summary": "분석을 수행할 수 없습니다.",
            "risk_score": 0,
            "concerns": "",
            "recommendations": ""
        }

    def _format_messages(self, messages: list) -> str:
        return "\n".join([
            f"{'사용자' if m['role'] == 'user' else 'AI'}: {m['content']}"
            for m in messages
        ])
