"""
Schedule Worker.

Specialized worker for detecting scheduling needs and managing
follow-up actions.
"""

import logging
from typing import Dict, List, Optional

from .base import BaseWorker, WorkerResult, WorkerPriority

logger = logging.getLogger(__name__)


class ScheduleWorker(BaseWorker):
    """
    Worker that handles scheduling and follow-up related tasks.

    Responsibilities:
    - Detect conversation endings and farewell intentions
    - Identify needs for follow-up calls
    - Manage reminder scheduling
    - Track conversation patterns for optimal calling times
    """

    name = "schedule_worker"
    description = "일정 관리 및 후속 조치 추적"
    priority = WorkerPriority.NORMAL

    # Schedule-related trigger keywords
    trigger_keywords = [
        # Farewell
        "이만", "끊을게", "끊어야", "다음에", "나중에",
        "안녕히", "수고", "그만", "가볼게",
        # Time references
        "내일", "모레", "다음 주", "오늘", "이따가",
        "아침", "점심", "저녁", "밤",
        # Scheduling
        "약속", "일정", "예약", "병원", "진료",
        # Reminders
        "잊어버", "까먹", "기억", "알려",
    ]

    # Farewell patterns
    farewell_keywords = [
        "이만", "끊을게", "끊자", "끊어야",
        "다음에", "나중에", "가볼게",
        "안녕히", "수고하세요",
    ]

    # Follow-up indicators
    followup_keywords = [
        "다음에 또", "내일 전화", "다시 연락",
        "확인해", "알아볼", "연락드릴",
    ]

    async def analyze(
        self,
        user_input: str,
        context: Optional[Dict] = None,
    ) -> WorkerResult:
        """
        Analyze user input for scheduling needs.

        Args:
            user_input: The user's message
            context: Optional conversation context

        Returns:
            WorkerResult with scheduling analysis
        """
        logger.debug(f"[ScheduleWorker] Analyzing: {user_input[:50]}...")

        input_lower = user_input.lower()

        # Detect intent
        wants_to_end = any(kw in input_lower for kw in self.farewell_keywords)
        needs_followup = self._needs_followup(input_lower, context)
        mentions_schedule = self._mentions_schedule(input_lower)

        # Determine priority
        priority = WorkerPriority.HIGH if wants_to_end else WorkerPriority.NORMAL

        # Build recommendations
        tool_recommendations = []
        suggested_actions = []
        response_hints = []

        if wants_to_end:
            tool_recommendations.append("end_call")
            suggested_actions.append("따뜻한 작별 인사")
            suggested_actions.append("건강 당부")
            response_hints.append("다음 통화 약속 언급")
            response_hints.append("긍정적 마무리")

            # Check if followup should be scheduled
            if needs_followup or (context and context.get("had_health_concern")):
                tool_recommendations.append("schedule_followup")
                suggested_actions.append("후속 전화 예약")

        if mentions_schedule:
            response_hints.append("일정 관련 내용 경청")
            if "병원" in input_lower or "진료" in input_lower:
                suggested_actions.append("병원 일정 확인")
                response_hints.append("병원 방문 응원")

        # Detect specific follow-up needs from context
        if context:
            if context.get("health_concerns_raised"):
                tool_recommendations.append("schedule_followup")
                response_hints.append("건강 상태 후속 확인 언급")

            if context.get("emotional_distress_noted"):
                tool_recommendations.append("schedule_followup")
                response_hints.append("정서 상태 확인 전화 예약 고려")

        # Determine detected intent
        if wants_to_end:
            intent = "end_conversation"
        elif mentions_schedule:
            intent = "schedule_discussion"
        else:
            intent = None

        return self._create_result(
            success=True,
            priority=priority,
            detected_intent=intent,
            confidence=0.9 if wants_to_end else (0.6 if mentions_schedule else 0.3),
            suggested_actions=suggested_actions,
            tool_recommendations=tool_recommendations,
            response_hints=response_hints,
            tone_recommendation="warm_farewell" if wants_to_end else None,
            metadata={
                "wants_to_end": wants_to_end,
                "needs_followup": needs_followup,
                "mentions_schedule": mentions_schedule,
            }
        )

    def _needs_followup(self, text: str, context: Optional[Dict]) -> bool:
        """Determine if follow-up is needed."""
        # Explicit follow-up mentions
        if any(kw in text for kw in self.followup_keywords):
            return True

        # Context-based determination
        if context:
            if context.get("health_concerns_raised"):
                return True
            if context.get("emotional_distress_noted"):
                return True
            if context.get("missed_medication"):
                return True

        return False

    def _mentions_schedule(self, text: str) -> bool:
        """Check if text mentions scheduling topics."""
        schedule_patterns = [
            "병원", "진료", "약속", "일정",
            "내일", "모레", "다음 주",
            "예약", "알려", "잊어버",
        ]
        return any(p in text for p in schedule_patterns)

    def get_priority(self, user_input: str) -> WorkerPriority:
        """Get dynamic priority based on input."""
        input_lower = user_input.lower()

        # Farewell is high priority to ensure proper call ending
        if any(kw in input_lower for kw in self.farewell_keywords):
            return WorkerPriority.HIGH

        return WorkerPriority.NORMAL
