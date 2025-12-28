"""
Health Monitor Worker.

Specialized worker for detecting and analyzing health-related concerns
in elderly conversations.
"""

import logging
from typing import Dict, List, Optional, Tuple

from .base import BaseWorker, WorkerResult, WorkerPriority

logger = logging.getLogger(__name__)


class HealthMonitorWorker(BaseWorker):
    """
    Worker that monitors for health-related concerns in conversations.

    Responsibilities:
    - Detect physical symptoms and complaints
    - Identify potential emergency situations
    - Recommend appropriate tools (check_health_status, notify_caregiver)
    - Track symptom patterns over time
    """

    name = "health_monitor"
    description = "건강 관련 문제 감지 및 모니터링"
    priority = WorkerPriority.HIGH

    # Health-related trigger keywords
    trigger_keywords = [
        # Physical symptoms
        "아파", "아프", "아픔", "통증", "쑤셔", "결려",
        # Specific body parts
        "머리", "가슴", "배", "다리", "팔", "허리", "목",
        # Conditions
        "어지러", "두통", "열", "기침", "설사", "변비",
        "숨", "호흡", "심장", "혈압",
        # General health
        "약", "병원", "의사", "치료", "수술", "검사",
        "피곤", "힘들", "못 자", "잠",
    ]

    # Emergency keywords that require immediate attention
    emergency_keywords = [
        "쓰러", "의식", "못 움직", "숨을 못",
        "가슴이 아", "119", "응급", "구급",
    ]

    # Symptom severity mapping
    symptom_severity = {
        "가슴이 아파": ("urgent", "심장 관련 증상 가능"),
        "숨을 못 쉬": ("emergency", "호흡 곤란"),
        "쓰러졌": ("emergency", "낙상/실신 가능"),
        "의식이 없": ("emergency", "의식 상실"),
        "머리가 아파": ("moderate", "두통"),
        "어지러": ("moderate", "어지러움"),
        "피곤": ("low", "피로감"),
        "잠을 못": ("moderate", "수면 장애"),
    }

    async def analyze(
        self,
        user_input: str,
        context: Optional[Dict] = None,
    ) -> WorkerResult:
        """
        Analyze user input for health-related concerns.

        Args:
            user_input: The user's message
            context: Optional conversation context

        Returns:
            WorkerResult with health analysis
        """
        logger.debug(f"[HealthWorker] Analyzing: {user_input[:50]}...")

        input_lower = user_input.lower()

        # Check for emergency first
        is_emergency = any(kw in input_lower for kw in self.emergency_keywords)

        # Detect symptoms and severity
        detected_symptoms = self._detect_symptoms(input_lower)
        overall_severity = self._calculate_severity(detected_symptoms, is_emergency)

        # Determine priority based on severity
        priority = self._severity_to_priority(overall_severity)

        # Build recommendations
        tool_recommendations = []
        suggested_actions = []
        response_hints = []
        urgent_flags = []

        if is_emergency:
            tool_recommendations.append("notify_caregiver")
            suggested_actions.append("119 안내 또는 보호자 긴급 연락")
            response_hints.append("침착하게 안정시키면서 즉각적인 도움 안내")
            urgent_flags.append("emergency_health_situation")

        if detected_symptoms:
            tool_recommendations.append("check_health_status")
            suggested_actions.append("증상 기록")

            if overall_severity in ["urgent", "high"]:
                tool_recommendations.append("notify_caregiver")
                suggested_actions.append("보호자 알림")
                response_hints.append("병원 방문 권유")

            response_hints.append("건강 관련 공감 표현 사용")
            response_hints.append("의료 조언 대신 전문가 상담 권유")

        # Build result
        concerns = [f"{sym}: {severity}" for sym, severity in detected_symptoms]

        return self._create_result(
            success=True,
            priority=priority,
            detected_intent="health_concern" if detected_symptoms else None,
            confidence=0.9 if is_emergency else (0.7 if detected_symptoms else 0.3),
            suggested_actions=suggested_actions,
            tool_recommendations=tool_recommendations,
            response_hints=response_hints,
            tone_recommendation="concerned_caring" if detected_symptoms else None,
            concerns=concerns,
            urgent_flags=urgent_flags,
            metadata={
                "detected_symptoms": [s[0] for s in detected_symptoms],
                "severity": overall_severity,
                "is_emergency": is_emergency,
            }
        )

    def _detect_symptoms(self, text: str) -> List[Tuple[str, str]]:
        """Detect symptoms and their severity from text."""
        detected = []

        for pattern, (severity, description) in self.symptom_severity.items():
            if pattern in text:
                detected.append((description, severity))

        return detected

    def _calculate_severity(
        self,
        symptoms: List[Tuple[str, str]],
        is_emergency: bool
    ) -> str:
        """Calculate overall severity from detected symptoms."""
        if is_emergency:
            return "emergency"

        if not symptoms:
            return "none"

        severity_order = ["emergency", "urgent", "high", "moderate", "low"]

        for severity in severity_order:
            if any(s[1] == severity for s in symptoms):
                return severity

        return "low"

    def _severity_to_priority(self, severity: str) -> WorkerPriority:
        """Convert severity to worker priority."""
        mapping = {
            "emergency": WorkerPriority.CRITICAL,
            "urgent": WorkerPriority.URGENT,
            "high": WorkerPriority.HIGH,
            "moderate": WorkerPriority.NORMAL,
            "low": WorkerPriority.LOW,
            "none": WorkerPriority.LOW,
        }
        return mapping.get(severity, WorkerPriority.NORMAL)

    def get_priority(self, user_input: str) -> WorkerPriority:
        """Get dynamic priority based on input severity."""
        input_lower = user_input.lower()

        if any(kw in input_lower for kw in self.emergency_keywords):
            return WorkerPriority.CRITICAL

        symptoms = self._detect_symptoms(input_lower)
        severity = self._calculate_severity(symptoms, is_emergency=False)

        return self._severity_to_priority(severity)
