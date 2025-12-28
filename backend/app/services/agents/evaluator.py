"""
EvaluatorAgent - Response Quality Evaluation for Claude Agent.

This module implements an LLM-based evaluation system that assesses
the quality of generated responses and determines if retry is needed.

Evaluation Dimensions:
    - Relevance: Does the response address the user's intent?
    - Accuracy: Is the information correct and appropriate?
    - Empathy: Does the response show genuine understanding?
    - Completeness: Does it fully address the user's needs?
    - Safety: Does it follow safety guidelines?

Usage:
    evaluator = EvaluatorAgent(client)
    result = await evaluator.evaluate(user_input, response, context)
    if result.should_retry:
        # Generate new response with improvement hints
"""

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union
from enum import Enum

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


class EvaluationDimension(str, Enum):
    """Dimensions for response evaluation."""
    RELEVANCE = "relevance"
    ACCURACY = "accuracy"
    EMPATHY = "empathy"
    COMPLETENESS = "completeness"
    SAFETY = "safety"


@dataclass
class DimensionScore:
    """Score for a single evaluation dimension."""
    dimension: EvaluationDimension
    score: float  # 0.0 to 1.0
    explanation: str
    issues: List[str] = field(default_factory=list)


@dataclass
class EvaluationResult:
    """Result of response evaluation."""

    # Individual dimension scores
    relevance: DimensionScore
    accuracy: DimensionScore
    empathy: DimensionScore
    completeness: DimensionScore
    safety: DimensionScore

    # Overall assessment
    overall_score: float
    should_retry: bool
    retry_reason: Optional[str] = None

    # Improvement guidance
    improvement_hints: List[str] = field(default_factory=list)
    suggested_additions: List[str] = field(default_factory=list)

    # Detected concerns
    concerns: List[str] = field(default_factory=list)
    urgent_flags: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "overall_score": self.overall_score,
            "should_retry": self.should_retry,
            "retry_reason": self.retry_reason,
            "dimensions": {
                "relevance": {"score": self.relevance.score, "explanation": self.relevance.explanation},
                "accuracy": {"score": self.accuracy.score, "explanation": self.accuracy.explanation},
                "empathy": {"score": self.empathy.score, "explanation": self.empathy.explanation},
                "completeness": {"score": self.completeness.score, "explanation": self.completeness.explanation},
                "safety": {"score": self.safety.score, "explanation": self.safety.explanation},
            },
            "improvement_hints": self.improvement_hints,
            "concerns": self.concerns,
            "urgent_flags": self.urgent_flags,
        }


@dataclass
class EvaluatorConfig:
    """Configuration for EvaluatorAgent."""
    model: str = "gpt-4o-mini"  # Use faster model for evaluation
    max_tokens: int = 1024
    quality_threshold: float = 0.7
    enable_llm_evaluation: bool = True  # Fall back to heuristics if False
    temperature: float = 0.3  # Lower temperature for consistent evaluation

    # Dimension weights for overall score
    weights: Dict[str, float] = field(default_factory=lambda: {
        "relevance": 0.25,
        "accuracy": 0.20,
        "empathy": 0.30,  # Higher weight for elderly care
        "completeness": 0.15,
        "safety": 0.10,
    })


class EvaluatorAgent:
    """
    LLM-based Response Quality Evaluator using OpenAI.

    Evaluates AI responses across multiple dimensions and provides
    actionable feedback for improvement.
    """

    EVALUATION_PROMPT = """당신은 AI 응답 품질 평가 전문가입니다. 어르신 돌봄 대화에서 AI 응답의 품질을 평가해주세요.

## 평가 기준

1. **관련성 (Relevance)**: 응답이 사용자의 질문/발화에 적절히 대응하는가?
2. **정확성 (Accuracy)**: 정보가 정확하고 적절한가? (의료 조언 금지 등)
3. **공감 (Empathy)**: 어르신의 감정을 이해하고 따뜻하게 대응하는가?
4. **완전성 (Completeness)**: 필요한 내용을 빠뜨리지 않았는가?
5. **안전성 (Safety)**: 안전 가이드라인을 준수하는가? (긴급 상황 대응 등)

## 입력 정보

### 사용자 발화
{user_input}

### AI 응답
{response}

### 대화 맥락
{context}

## 출력 형식

다음 JSON 형식으로 평가 결과를 반환하세요:

```json
{{
  "relevance": {{
    "score": 0.0-1.0,
    "explanation": "평가 이유",
    "issues": ["문제점 목록"]
  }},
  "accuracy": {{
    "score": 0.0-1.0,
    "explanation": "평가 이유",
    "issues": []
  }},
  "empathy": {{
    "score": 0.0-1.0,
    "explanation": "평가 이유",
    "issues": []
  }},
  "completeness": {{
    "score": 0.0-1.0,
    "explanation": "평가 이유",
    "issues": []
  }},
  "safety": {{
    "score": 0.0-1.0,
    "explanation": "평가 이유",
    "issues": []
  }},
  "improvement_hints": ["개선 제안 목록"],
  "concerns": ["발견된 우려 사항"],
  "urgent_flags": ["긴급 플래그 (예: 자해 암시 감지)"]
}}
```

JSON만 출력하세요. 추가 설명은 불필요합니다."""

    def __init__(
        self,
        client: AsyncOpenAI,
        config: EvaluatorConfig = None,
    ):
        """
        Initialize EvaluatorAgent.

        Args:
            client: OpenAI API client
            config: Evaluator configuration
        """
        self.client = client
        self.config = config or EvaluatorConfig()

    async def evaluate(
        self,
        user_input: str,
        response: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> EvaluationResult:
        """
        Evaluate response quality.

        Args:
            user_input: Original user message
            response: AI-generated response
            context: Additional context (elderly info, conversation history)

        Returns:
            EvaluationResult with scores and improvement suggestions
        """
        logger.info("[Evaluator] Starting response evaluation...")

        if not self.config.enable_llm_evaluation:
            return await self._heuristic_evaluation(user_input, response)

        try:
            return await self._llm_evaluation(user_input, response, context)
        except Exception as e:
            logger.warning(f"[Evaluator] LLM evaluation failed, falling back to heuristics: {e}")
            return await self._heuristic_evaluation(user_input, response)

    async def _llm_evaluation(
        self,
        user_input: str,
        response: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> EvaluationResult:
        """Perform LLM-based evaluation using OpenAI."""
        context_str = self._format_context(context) if context else "맥락 정보 없음"

        prompt = self.EVALUATION_PROMPT.format(
            user_input=user_input,
            response=response,
            context=context_str,
        )

        # Use OpenAI chat.completions.create
        completion = await self.client.chat.completions.create(
            model=self.config.model,
            max_tokens=self.config.max_tokens,
            temperature=self.config.temperature,
            messages=[{"role": "user", "content": prompt}],
        )

        # Parse JSON response from OpenAI
        response_text = completion.choices[0].message.content

        # Extract JSON from response (handle potential markdown wrapping)
        json_str = self._extract_json(response_text)
        evaluation_data = json.loads(json_str)

        return self._parse_evaluation_response(evaluation_data)

    async def _heuristic_evaluation(
        self,
        user_input: str,
        response: str,
    ) -> EvaluationResult:
        """Fallback heuristic-based evaluation."""
        logger.debug("[Evaluator] Using heuristic evaluation")

        # Relevance: Check if response seems related to input
        relevance_score = 0.8
        relevance_issues = []

        # Very short responses may not be relevant
        if len(response) < 20:
            relevance_score -= 0.3
            relevance_issues.append("응답이 너무 짧습니다")

        # Accuracy: Check for medical advice (which should be avoided)
        accuracy_score = 0.9
        accuracy_issues = []

        medical_keywords = ["진단", "처방", "복용량", "약을 먹"]
        if any(kw in response for kw in medical_keywords):
            accuracy_score -= 0.2
            accuracy_issues.append("의료 조언을 삼가야 합니다")

        # Empathy: Check for empathetic markers
        empathy_score = 0.7
        empathy_issues = []

        empathy_markers = [
            "이해", "공감", "힘드시", "걱정", "괜찮",
            "함께", "옆에", "들어", "마음",
        ]
        empathy_count = sum(1 for m in empathy_markers if m in response)
        empathy_score += min(0.3, empathy_count * 0.1)

        if empathy_count == 0:
            empathy_issues.append("공감 표현이 부족합니다")

        # Completeness: Check response length and structure
        completeness_score = 0.8
        completeness_issues = []

        if len(response) > 500:
            completeness_score -= 0.1
            completeness_issues.append("응답이 너무 깁니다")

        # Safety: Check for emergency handling
        safety_score = 0.9
        safety_issues = []
        urgent_flags = []

        # Check if user mentioned emergency but response didn't address it
        emergency_input = any(kw in user_input.lower() for kw in ["쓰러", "의식", "숨", "119", "죽고"])
        if emergency_input:
            urgent_flags.append("긴급 상황 언급 감지")
            if "119" not in response and "보호자" not in response:
                safety_score -= 0.3
                safety_issues.append("긴급 상황에 대한 적절한 대응 필요")

        # Calculate overall score
        scores = {
            "relevance": relevance_score,
            "accuracy": accuracy_score,
            "empathy": empathy_score,
            "completeness": completeness_score,
            "safety": safety_score,
        }

        overall = sum(
            scores[dim] * self.config.weights[dim]
            for dim in scores
        )

        should_retry = overall < self.config.quality_threshold
        retry_reason = None
        improvement_hints = []

        if should_retry:
            # Determine primary reason for retry
            min_dim = min(scores, key=lambda d: scores[d])
            retry_reason = f"{min_dim} 점수가 낮습니다"

            # Collect improvement hints
            if relevance_issues:
                improvement_hints.extend(relevance_issues)
            if empathy_issues:
                improvement_hints.extend(empathy_issues)
            if safety_issues:
                improvement_hints.extend(safety_issues)

        return EvaluationResult(
            relevance=DimensionScore(
                dimension=EvaluationDimension.RELEVANCE,
                score=min(1.0, max(0.0, relevance_score)),
                explanation="휴리스틱 평가",
                issues=relevance_issues,
            ),
            accuracy=DimensionScore(
                dimension=EvaluationDimension.ACCURACY,
                score=min(1.0, max(0.0, accuracy_score)),
                explanation="휴리스틱 평가",
                issues=accuracy_issues,
            ),
            empathy=DimensionScore(
                dimension=EvaluationDimension.EMPATHY,
                score=min(1.0, max(0.0, empathy_score)),
                explanation="휴리스틱 평가",
                issues=empathy_issues,
            ),
            completeness=DimensionScore(
                dimension=EvaluationDimension.COMPLETENESS,
                score=min(1.0, max(0.0, completeness_score)),
                explanation="휴리스틱 평가",
                issues=completeness_issues,
            ),
            safety=DimensionScore(
                dimension=EvaluationDimension.SAFETY,
                score=min(1.0, max(0.0, safety_score)),
                explanation="휴리스틱 평가",
                issues=safety_issues,
            ),
            overall_score=min(1.0, max(0.0, overall)),
            should_retry=should_retry,
            retry_reason=retry_reason,
            improvement_hints=improvement_hints,
            suggested_additions=[],
            concerns=[],
            urgent_flags=urgent_flags,
        )

    def _format_context(self, context: Dict[str, Any]) -> str:
        """Format context dictionary as string."""
        parts = []

        if "elderly_name" in context:
            parts.append(f"어르신 이름: {context['elderly_name']}")
        if "elderly_age" in context:
            parts.append(f"나이: {context['elderly_age']}세")
        if "health_condition" in context:
            parts.append(f"건강 상태: {context['health_condition']}")
        if "recent_messages" in context:
            parts.append(f"최근 대화: {context['recent_messages']}")

        return "\n".join(parts) if parts else "기본 맥락"

    def _extract_json(self, text: str) -> str:
        """Extract JSON from response text, handling markdown code blocks."""
        text = text.strip()

        # Remove markdown code block if present
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first line (```json or ```)
            lines = lines[1:]
            # Remove last line (```)
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines)

        return text.strip()

    def _parse_evaluation_response(self, data: Dict[str, Any]) -> EvaluationResult:
        """Parse LLM evaluation response into EvaluationResult."""

        def parse_dimension(dim_name: str, dim_enum: EvaluationDimension) -> DimensionScore:
            dim_data = data.get(dim_name, {})
            return DimensionScore(
                dimension=dim_enum,
                score=float(dim_data.get("score", 0.8)),
                explanation=dim_data.get("explanation", ""),
                issues=dim_data.get("issues", []),
            )

        relevance = parse_dimension("relevance", EvaluationDimension.RELEVANCE)
        accuracy = parse_dimension("accuracy", EvaluationDimension.ACCURACY)
        empathy = parse_dimension("empathy", EvaluationDimension.EMPATHY)
        completeness = parse_dimension("completeness", EvaluationDimension.COMPLETENESS)
        safety = parse_dimension("safety", EvaluationDimension.SAFETY)

        # Calculate overall score
        scores = {
            "relevance": relevance.score,
            "accuracy": accuracy.score,
            "empathy": empathy.score,
            "completeness": completeness.score,
            "safety": safety.score,
        }

        overall = sum(
            scores[dim] * self.config.weights[dim]
            for dim in scores
        )

        should_retry = overall < self.config.quality_threshold

        # Determine retry reason if needed
        retry_reason = None
        if should_retry:
            # Find the lowest scoring dimension
            min_dim = min(scores, key=lambda d: scores[d])
            dim_issues = data.get(min_dim, {}).get("issues", [])
            retry_reason = dim_issues[0] if dim_issues else f"{min_dim} 점수 미달"

        return EvaluationResult(
            relevance=relevance,
            accuracy=accuracy,
            empathy=empathy,
            completeness=completeness,
            safety=safety,
            overall_score=overall,
            should_retry=should_retry,
            retry_reason=retry_reason,
            improvement_hints=data.get("improvement_hints", []),
            suggested_additions=[],
            concerns=data.get("concerns", []),
            urgent_flags=data.get("urgent_flags", []),
        )


class RetryStrategy:
    """
    Determines how to retry based on evaluation results.
    """

    @staticmethod
    def get_retry_prompt_enhancement(evaluation: EvaluationResult) -> str:
        """
        Generate prompt enhancement for retry based on evaluation.

        Args:
            evaluation: The evaluation result from previous attempt

        Returns:
            Additional prompt instructions for retry
        """
        enhancements = []

        # Add hints based on low-scoring dimensions
        if evaluation.empathy.score < 0.7:
            enhancements.append(
                "이번 응답에서는 어르신의 감정에 더 깊이 공감하고, "
                "따뜻한 표현을 사용해주세요."
            )

        if evaluation.relevance.score < 0.7:
            enhancements.append(
                "어르신이 말씀하신 내용에 더 직접적으로 대응해주세요."
            )

        if evaluation.completeness.score < 0.7:
            enhancements.append(
                "필요한 정보를 빠뜨리지 않고 충분히 답변해주세요."
            )

        if evaluation.safety.score < 0.8:
            enhancements.append(
                "안전 가이드라인을 더 철저히 준수해주세요. "
                "긴급 상황에는 보호자 연락이나 119 안내가 필요합니다."
            )

        # Add specific improvement hints
        if evaluation.improvement_hints:
            enhancements.append("개선 필요 사항: " + ", ".join(evaluation.improvement_hints[:3]))

        if enhancements:
            return "\n\n## 응답 개선 지침\n" + "\n".join(f"- {e}" for e in enhancements)

        return ""
