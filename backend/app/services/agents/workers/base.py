"""
Base Worker Agent.

Defines the interface and common functionality for all specialized workers.
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import IntEnum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class WorkerPriority(IntEnum):
    """Priority levels for worker execution."""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4
    CRITICAL = 5


@dataclass
class WorkerResult:
    """Result from a worker agent's analysis."""
    worker_name: str
    success: bool
    priority: WorkerPriority

    # Analysis results
    detected_intent: Optional[str] = None
    confidence: float = 0.0

    # Actions and recommendations
    suggested_actions: List[str] = field(default_factory=list)
    tool_recommendations: List[str] = field(default_factory=list)

    # Response modifications
    response_hints: List[str] = field(default_factory=list)
    tone_recommendation: Optional[str] = None

    # Concerns and flags
    concerns: List[str] = field(default_factory=list)
    urgent_flags: List[str] = field(default_factory=list)

    # Metadata
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "worker_name": self.worker_name,
            "success": self.success,
            "priority": self.priority.value,
            "detected_intent": self.detected_intent,
            "confidence": self.confidence,
            "suggested_actions": self.suggested_actions,
            "tool_recommendations": self.tool_recommendations,
            "response_hints": self.response_hints,
            "tone_recommendation": self.tone_recommendation,
            "concerns": self.concerns,
            "urgent_flags": self.urgent_flags,
            "metadata": self.metadata,
        }


class BaseWorker(ABC):
    """
    Abstract base class for specialized worker agents.

    Workers analyze user input for specific domains and provide
    recommendations to the orchestrator.
    """

    name: str = "base_worker"
    description: str = "Base worker agent"
    priority: WorkerPriority = WorkerPriority.NORMAL

    # Keywords that trigger this worker
    trigger_keywords: List[str] = []

    def __init__(self):
        """Initialize the worker."""
        self.logger = logging.getLogger(f"{__name__}.{self.name}")

    def should_activate(self, user_input: str, context: Optional[Dict] = None) -> bool:
        """
        Determine if this worker should be activated for the given input.

        Args:
            user_input: The user's message
            context: Optional conversation context

        Returns:
            True if this worker should process the input
        """
        input_lower = user_input.lower()
        return any(kw in input_lower for kw in self.trigger_keywords)

    @abstractmethod
    async def analyze(
        self,
        user_input: str,
        context: Optional[Dict] = None,
    ) -> WorkerResult:
        """
        Analyze the user input and provide recommendations.

        Args:
            user_input: The user's message
            context: Optional conversation context

        Returns:
            WorkerResult with analysis and recommendations
        """
        pass

    def get_priority(self, user_input: str) -> WorkerPriority:
        """
        Get the priority level for this worker given the input.

        Override in subclasses for dynamic priority based on input.
        """
        return self.priority

    def _create_result(
        self,
        success: bool = True,
        **kwargs
    ) -> WorkerResult:
        """Helper to create a WorkerResult with common fields."""
        return WorkerResult(
            worker_name=self.name,
            success=success,
            priority=kwargs.pop("priority", self.priority),
            **kwargs
        )
