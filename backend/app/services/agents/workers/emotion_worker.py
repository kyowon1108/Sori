"""
Emotion Support Worker.

Specialized worker for detecting emotional states and providing
empathetic support recommendations.
"""

import logging
from typing import Dict, List, Optional, Tuple

from .base import BaseWorker, WorkerResult, WorkerPriority

logger = logging.getLogger(__name__)


class EmotionSupportWorker(BaseWorker):
    """
    Worker that detects emotional states and provides support recommendations.

    Responsibilities:
    - Detect emotional states (sadness, loneliness, anxiety, etc.)
    - Identify crisis situations (suicidal ideation, severe depression)
    - Recommend empathetic response strategies
    - Suggest appropriate follow-up actions
    """

    name = "emotion_support"
    description = "감정 상태 감지 및 정서적 지지 제공"
    priority = WorkerPriority.HIGH

    # Emotion-related trigger keywords
    trigger_keywords = [
        # Sadness/Loneliness
        "외로", "쓸쓸", "심심", "혼자", "우울", "슬퍼", "슬픔",
        # Anxiety/Fear
        "걱정", "불안", "무서", "두려", "겁나",
        # Frustration/Anger
        "화나", "짜증", "답답", "억울", "속상",
        # Despair
        "힘들", "지쳐", "포기", "싫어", "죽고",
        # Positive
        "기뻐", "행복", "좋아", "감사", "고마",
    ]

    # Crisis keywords requiring immediate intervention
    crisis_keywords = [
        "죽고 싶", "죽을", "자살", "끝내고",
        "살기 싫", "없어지고", "안 살고",
    ]

    # Emotion patterns and their support strategies
    emotion_patterns = {
        "loneliness": {
            "keywords": ["외로", "쓸쓸", "혼자", "심심"],
            "response_hints": [
                "연결감 표현하기",
                "정기적인 대화 약속 언급",
                "어르신의 가치 인정하기",
            ],
            "tone": "warm_connecting",
        },
        "sadness": {
            "keywords": ["슬퍼", "슬픔", "우울", "눈물"],
            "response_hints": [
                "감정 인정하고 공감하기",
                "울어도 괜찮다고 안심시키기",
                "옆에 있다는 것 표현하기",
            ],
            "tone": "gentle_empathetic",
        },
        "anxiety": {
            "keywords": ["걱정", "불안", "무서", "두려"],
            "response_hints": [
                "걱정을 경청하고 인정하기",
                "함께 해결책 찾기 제안",
                "안정감 주는 표현 사용",
            ],
            "tone": "reassuring_calm",
        },
        "frustration": {
            "keywords": ["화나", "짜증", "답답", "억울"],
            "response_hints": [
                "감정 표현을 격려하기",
                "판단하지 않고 들어주기",
                "상황에 대한 이해 표현",
            ],
            "tone": "understanding_patient",
        },
        "despair": {
            "keywords": ["힘들", "지쳐", "포기", "싫어"],
            "response_hints": [
                "어려움을 인정하고 공감하기",
                "작은 희망 요소 발견해주기",
                "보호자 연락 고려",
            ],
            "tone": "compassionate_supportive",
        },
        "positive": {
            "keywords": ["기뻐", "행복", "좋아", "감사"],
            "response_hints": [
                "기쁨을 함께 나누기",
                "긍정적 감정 강화하기",
                "좋은 일 더 이야기하도록 격려",
            ],
            "tone": "joyful_sharing",
        },
    }

    async def analyze(
        self,
        user_input: str,
        context: Optional[Dict] = None,
    ) -> WorkerResult:
        """
        Analyze user input for emotional content.

        Args:
            user_input: The user's message
            context: Optional conversation context

        Returns:
            WorkerResult with emotional analysis
        """
        logger.debug(f"[EmotionWorker] Analyzing: {user_input[:50]}...")

        input_lower = user_input.lower()

        # Check for crisis first
        is_crisis = any(kw in input_lower for kw in self.crisis_keywords)

        # Detect emotions
        detected_emotions = self._detect_emotions(input_lower)

        # Get primary emotion and confidence
        primary_emotion, confidence = self._get_primary_emotion(detected_emotions)

        # Determine priority
        if is_crisis:
            priority = WorkerPriority.CRITICAL
        elif primary_emotion in ["despair", "sadness"]:
            priority = WorkerPriority.HIGH
        elif primary_emotion:
            priority = WorkerPriority.NORMAL
        else:
            priority = WorkerPriority.LOW

        # Build recommendations
        tool_recommendations = []
        suggested_actions = []
        response_hints = []
        urgent_flags = []

        if is_crisis:
            tool_recommendations.append("notify_caregiver")
            suggested_actions.append("보호자 즉시 연락")
            suggested_actions.append("대화 유지하며 안정시키기")
            response_hints.append("절대 혼자 두지 않겠다는 표현")
            response_hints.append("전문 상담 연결 안내")
            urgent_flags.append("crisis_emotional_state")
            urgent_flags.append("suicide_ideation_possible")

        if primary_emotion and primary_emotion in self.emotion_patterns:
            pattern = self.emotion_patterns[primary_emotion]
            response_hints.extend(pattern["response_hints"])

            if primary_emotion == "despair":
                tool_recommendations.append("check_health_status")
                suggested_actions.append("정서 상태 기록")
                tool_recommendations.append("schedule_followup")
                suggested_actions.append("후속 전화 예약 고려")

        # Record emotional state for monitoring
        if detected_emotions and context:
            suggested_actions.append("감정 상태 기록")

        # Determine tone recommendation
        tone = None
        if primary_emotion and primary_emotion in self.emotion_patterns:
            tone = self.emotion_patterns[primary_emotion]["tone"]

        concerns = []
        if is_crisis:
            concerns.append("위기 상황 감지")
        if primary_emotion in ["despair", "sadness"]:
            concerns.append(f"주요 감정: {primary_emotion}")

        return self._create_result(
            success=True,
            priority=priority,
            detected_intent=f"emotional_{primary_emotion}" if primary_emotion else None,
            confidence=confidence,
            suggested_actions=suggested_actions,
            tool_recommendations=tool_recommendations,
            response_hints=response_hints,
            tone_recommendation=tone,
            concerns=concerns,
            urgent_flags=urgent_flags,
            metadata={
                "detected_emotions": detected_emotions,
                "primary_emotion": primary_emotion,
                "is_crisis": is_crisis,
            }
        )

    def _detect_emotions(self, text: str) -> List[Tuple[str, float]]:
        """Detect emotions and their strength from text."""
        detected = []

        for emotion, pattern in self.emotion_patterns.items():
            matches = sum(1 for kw in pattern["keywords"] if kw in text)
            if matches > 0:
                # Higher confidence with more keyword matches
                confidence = min(1.0, 0.5 + matches * 0.15)
                detected.append((emotion, confidence))

        return sorted(detected, key=lambda x: x[1], reverse=True)

    def _get_primary_emotion(
        self,
        emotions: List[Tuple[str, float]]
    ) -> Tuple[Optional[str], float]:
        """Get the primary (highest confidence) emotion."""
        if not emotions:
            return None, 0.0

        return emotions[0]

    def get_priority(self, user_input: str) -> WorkerPriority:
        """Get dynamic priority based on emotional intensity."""
        input_lower = user_input.lower()

        if any(kw in input_lower for kw in self.crisis_keywords):
            return WorkerPriority.CRITICAL

        detected = self._detect_emotions(input_lower)
        if not detected:
            return WorkerPriority.LOW

        primary_emotion, confidence = detected[0]

        if primary_emotion == "despair":
            return WorkerPriority.HIGH
        elif confidence > 0.7:
            return WorkerPriority.HIGH
        elif confidence > 0.5:
            return WorkerPriority.NORMAL
        else:
            return WorkerPriority.LOW
