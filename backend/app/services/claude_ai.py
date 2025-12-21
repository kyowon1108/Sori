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
        """통화 분석"""
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

    def _format_messages(self, messages: list) -> str:
        return "\n".join([
            f"{'사용자' if m['role'] == 'user' else 'AI'}: {m['content']}"
            for m in messages
        ])
