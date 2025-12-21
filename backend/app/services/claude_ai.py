import json
import re
from typing import AsyncGenerator
from app.core.config import settings


class ClaudeService:
    """AI Service - supports OpenAI (primary) or Claude (fallback)"""

    def __init__(self):
        self.use_openai = bool(settings.OPENAI_API_KEY)

        if self.use_openai:
            from openai import OpenAI
            self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
            print("[AI Service] Using OpenAI")
        elif settings.CLAUDE_API_KEY:
            import anthropic
            self.claude_client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)
            print("[AI Service] Using Claude")
        else:
            print("[AI Service] WARNING: No API key configured!")

    async def stream_chat_response(self, messages: list) -> AsyncGenerator[str, None]:
        """Stream chat response from AI"""
        system_prompt = """당신은 친절하고 감정적으로 공감하는 AI 상담사입니다.
어르신들의 이야기를 경청하고, 그들의 감정에 공감하며, 긍정적인 격려를 제공합니다.
항상 존댓말을 사용하고, 어르신의 건강과 안전을 최우선으로 고려합니다.
답변은 2-3문장으로 짧고 따뜻하게 해주세요."""

        formatted_messages = [
            {"role": msg["role"], "content": msg["content"]}
            for msg in messages
        ]

        if self.use_openai:
            # OpenAI streaming
            openai_messages = [{"role": "system", "content": system_prompt}] + formatted_messages

            stream = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=openai_messages,
                max_tokens=1024,
                stream=True
            )

            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        else:
            # Claude streaming
            with self.claude_client.messages.stream(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                system=system_prompt,
                messages=formatted_messages
            ) as stream:
                for text in stream.text_stream:
                    yield text

    def analyze_conversation(self, conversation: str, elderly_context: str = "") -> dict:
        """Analyze conversation and return risk assessment"""
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

        if self.use_openai:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": analysis_prompt}],
                max_tokens=1024
            )
            response_text = response.choices[0].message.content
        else:
            response = self.claude_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                messages=[{"role": "user", "content": analysis_prompt}]
            )
            response_text = response.content[0].text

        # Parse JSON response
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            try:
                result = json.loads(json_match.group())
                result["risk_score"] = int(result.get("risk_score", 0))
                return result
            except (json.JSONDecodeError, ValueError):
                pass

        return {
            "summary": "분석을 수행할 수 없습니다.",
            "risk_score": 0,
            "concerns": "",
            "recommendations": ""
        }

    def analyze_call(self, messages: list) -> dict:
        """Legacy method for call analysis"""
        conversation = self._format_messages(messages)
        return self.analyze_conversation(conversation)

    def _format_messages(self, messages: list) -> str:
        return "\n".join([
            f"{'사용자' if m['role'] == 'user' else 'AI'}: {m['content']}"
            for m in messages
        ])
