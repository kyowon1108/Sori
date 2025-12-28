"""
Base Tools for SORI Elderly Care Agent.

These tools provide core functionality for:
- Call management
- Elderly information retrieval
- Health status checks
- Follow-up scheduling
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass

from .registry import Tool

logger = logging.getLogger(__name__)


# ============================================================================
# Tool Execution Functions
# ============================================================================

async def execute_end_call(
    reason: str = "user_request",
    summary: Optional[str] = None,
    schedule_followup: bool = False
) -> Dict[str, Any]:
    """
    End the current call gracefully.

    Args:
        reason: Reason for ending (user_request, timeout, emergency, completed)
        summary: Optional conversation summary
        schedule_followup: Whether to schedule a follow-up call

    Returns:
        Dict with call_ended status and details
    """
    logger.info(f"Ending call: reason={reason}, followup={schedule_followup}")

    return {
        "call_ended": True,
        "reason": reason,
        "summary": summary,
        "followup_scheduled": schedule_followup,
        "timestamp": datetime.utcnow().isoformat(),
    }


async def execute_get_elderly_info(
    elderly_id: int,
    include_health: bool = True,
    include_medications: bool = True,
    include_recent_calls: bool = False
) -> Dict[str, Any]:
    """
    Retrieve elderly person's information.

    Args:
        elderly_id: The elderly person's ID
        include_health: Include health condition info
        include_medications: Include medication list
        include_recent_calls: Include recent call history

    Returns:
        Dict with elderly person's information
    """
    logger.info(f"Getting elderly info: id={elderly_id}")

    # This will be replaced with actual DB lookup
    # For now, return placeholder that will be populated by the WebSocket handler
    return {
        "elderly_id": elderly_id,
        "status": "info_retrieved",
        "include_health": include_health,
        "include_medications": include_medications,
        "include_recent_calls": include_recent_calls,
        "timestamp": datetime.utcnow().isoformat(),
    }


async def execute_check_health_status(
    elderly_id: int,
    symptoms: Optional[list] = None,
    urgency_level: str = "normal"
) -> Dict[str, Any]:
    """
    Check and log health status concerns.

    Args:
        elderly_id: The elderly person's ID
        symptoms: List of reported symptoms
        urgency_level: normal, elevated, urgent, emergency

    Returns:
        Dict with health assessment status
    """
    logger.info(f"Health check: elderly_id={elderly_id}, urgency={urgency_level}")

    urgency_score = {
        "normal": 0,
        "elevated": 30,
        "urgent": 60,
        "emergency": 90
    }.get(urgency_level, 0)

    return {
        "elderly_id": elderly_id,
        "health_check_logged": True,
        "symptoms": symptoms or [],
        "urgency_level": urgency_level,
        "urgency_score": urgency_score,
        "requires_caregiver_notification": urgency_level in ["urgent", "emergency"],
        "timestamp": datetime.utcnow().isoformat(),
    }


async def execute_schedule_followup(
    elderly_id: int,
    reason: str,
    preferred_time: Optional[str] = None,
    priority: str = "normal"
) -> Dict[str, Any]:
    """
    Schedule a follow-up call.

    Args:
        elderly_id: The elderly person's ID
        reason: Reason for follow-up
        preferred_time: Preferred time (morning, afternoon, evening, or HH:MM)
        priority: normal, high, urgent

    Returns:
        Dict with scheduling confirmation
    """
    logger.info(f"Scheduling followup: elderly_id={elderly_id}, priority={priority}")

    # Calculate next available time based on preference
    now = datetime.utcnow()
    time_mapping = {
        "morning": 9,
        "afternoon": 14,
        "evening": 19,
    }

    if preferred_time in time_mapping:
        target_hour = time_mapping[preferred_time]
        scheduled_time = now.replace(hour=target_hour, minute=0, second=0)
        if scheduled_time <= now:
            scheduled_time += timedelta(days=1)
    else:
        # Default to next day same time
        scheduled_time = now + timedelta(days=1)

    return {
        "elderly_id": elderly_id,
        "scheduled": True,
        "scheduled_time": scheduled_time.isoformat(),
        "reason": reason,
        "priority": priority,
        "timestamp": datetime.utcnow().isoformat(),
    }


async def execute_notify_caregiver(
    elderly_id: int,
    notification_type: str,
    message: str,
    urgency: str = "normal"
) -> Dict[str, Any]:
    """
    Send notification to caregiver.

    Args:
        elderly_id: The elderly person's ID
        notification_type: Type of notification (health_alert, call_summary, emergency)
        message: Notification message content
        urgency: Notification urgency level

    Returns:
        Dict with notification status
    """
    logger.info(f"Notifying caregiver: elderly_id={elderly_id}, type={notification_type}")

    return {
        "elderly_id": elderly_id,
        "notification_sent": True,
        "notification_type": notification_type,
        "message": message,
        "urgency": urgency,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ============================================================================
# Tool Definitions
# ============================================================================

EndCallTool = Tool(
    name="end_call",
    description="""통화를 종료합니다. 어르신이 통화 종료 의사를 밝히거나, 대화가 자연스럽게 마무리되었을 때 사용합니다.

사용 시점:
- 어르신이 "이만 끊을게요", "그만 얘기해요", "다음에 얘기해요" 등 종료 의사를 표현할 때
- 인사를 마치고 대화가 자연스럽게 끝났을 때
- 어르신의 건강 상태가 급박하여 실제 도움이 필요할 때 (emergency)

주의: 이 도구를 호출하면 통화가 즉시 종료됩니다.""",
    input_schema={
        "type": "object",
        "properties": {
            "reason": {
                "type": "string",
                "enum": ["user_request", "completed", "timeout", "emergency"],
                "description": "통화 종료 사유"
            },
            "summary": {
                "type": "string",
                "description": "대화 요약 (선택)"
            },
            "schedule_followup": {
                "type": "boolean",
                "description": "후속 통화 예약 여부",
                "default": False
            }
        },
        "required": ["reason"]
    },
    execute_func=execute_end_call,
    category="call_management",
    tags=["call", "termination", "critical"],
    requires_confirmation=False,
    timeout_seconds=5.0
)


GetElderlyInfoTool = Tool(
    name="get_elderly_info",
    description="""어르신의 정보를 조회합니다. 대화 중 어르신의 건강 상태, 복용 약물, 최근 통화 기록 등을 확인할 때 사용합니다.

사용 시점:
- 어르신의 건강 상태에 대해 맥락이 필요할 때
- 이전 대화 내용을 참고해야 할 때
- 복용 약물 정보가 필요할 때""",
    input_schema={
        "type": "object",
        "properties": {
            "elderly_id": {
                "type": "integer",
                "description": "어르신 ID"
            },
            "include_health": {
                "type": "boolean",
                "description": "건강 정보 포함 여부",
                "default": True
            },
            "include_medications": {
                "type": "boolean",
                "description": "복용 약물 정보 포함 여부",
                "default": True
            },
            "include_recent_calls": {
                "type": "boolean",
                "description": "최근 통화 기록 포함 여부",
                "default": False
            }
        },
        "required": ["elderly_id"]
    },
    execute_func=execute_get_elderly_info,
    category="information",
    tags=["elderly", "info", "health"],
    timeout_seconds=10.0
)


CheckHealthStatusTool = Tool(
    name="check_health_status",
    description="""어르신이 언급한 건강 문제를 기록하고 평가합니다.

사용 시점:
- 어르신이 신체적 불편함을 호소할 때
- 평소와 다른 증상을 언급할 때
- 정서적/심리적 어려움을 표현할 때

urgency_level:
- normal: 일상적인 대화 중 언급
- elevated: 주의가 필요한 상태
- urgent: 빠른 조치가 필요
- emergency: 즉각적인 개입 필요""",
    input_schema={
        "type": "object",
        "properties": {
            "elderly_id": {
                "type": "integer",
                "description": "어르신 ID"
            },
            "symptoms": {
                "type": "array",
                "items": {"type": "string"},
                "description": "보고된 증상 목록"
            },
            "urgency_level": {
                "type": "string",
                "enum": ["normal", "elevated", "urgent", "emergency"],
                "description": "긴급도 수준",
                "default": "normal"
            }
        },
        "required": ["elderly_id"]
    },
    execute_func=execute_check_health_status,
    category="health",
    tags=["health", "symptoms", "monitoring", "critical"],
    timeout_seconds=10.0
)


ScheduleFollowUpTool = Tool(
    name="schedule_followup",
    description="""후속 통화를 예약합니다. 어르신과의 대화 중 추가 확인이 필요하거나 정기적인 안부 확인이 필요할 때 사용합니다.

사용 시점:
- 어르신이 다음 통화를 원할 때
- 건강 상태 추적이 필요할 때
- 특정 이벤트 후 확인이 필요할 때""",
    input_schema={
        "type": "object",
        "properties": {
            "elderly_id": {
                "type": "integer",
                "description": "어르신 ID"
            },
            "reason": {
                "type": "string",
                "description": "후속 통화 사유"
            },
            "preferred_time": {
                "type": "string",
                "description": "선호 시간 (morning, afternoon, evening, 또는 HH:MM)"
            },
            "priority": {
                "type": "string",
                "enum": ["normal", "high", "urgent"],
                "description": "우선순위",
                "default": "normal"
            }
        },
        "required": ["elderly_id", "reason"]
    },
    execute_func=execute_schedule_followup,
    category="scheduling",
    tags=["schedule", "followup", "call"],
    timeout_seconds=10.0
)


NotifyCaregiverTool = Tool(
    name="notify_caregiver",
    description="""보호자에게 알림을 전송합니다. 중요한 정보나 우려사항을 보호자에게 즉시 알려야 할 때 사용합니다.

사용 시점:
- 어르신의 건강 상태에 주의가 필요할 때
- 긴급 상황이 발생했을 때
- 중요한 대화 내용을 공유해야 할 때""",
    input_schema={
        "type": "object",
        "properties": {
            "elderly_id": {
                "type": "integer",
                "description": "어르신 ID"
            },
            "notification_type": {
                "type": "string",
                "enum": ["health_alert", "call_summary", "emergency", "info"],
                "description": "알림 유형"
            },
            "message": {
                "type": "string",
                "description": "알림 메시지 내용"
            },
            "urgency": {
                "type": "string",
                "enum": ["normal", "high", "critical"],
                "description": "긴급도",
                "default": "normal"
            }
        },
        "required": ["elderly_id", "notification_type", "message"]
    },
    execute_func=execute_notify_caregiver,
    category="notification",
    tags=["notification", "caregiver", "alert"],
    timeout_seconds=15.0
)


def register_all_tools(registry) -> None:
    """Register all base tools to the given registry."""
    tools = [
        EndCallTool,
        GetElderlyInfoTool,
        CheckHealthStatusTool,
        ScheduleFollowUpTool,
        NotifyCaregiverTool,
    ]

    for tool in tools:
        registry.register(tool)

    logger.info(f"Registered {len(tools)} base tools")
