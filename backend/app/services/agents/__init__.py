"""
SORI Agent System.

This module provides:
- OpenAIAgentService: Main agent with Perceive-Plan-Act-Reflect loop (GPT-4o)
- EvaluatorAgent: LLM-based response quality evaluation
- OrchestratorAgent: Coordinates specialized worker agents
- Workers: HealthMonitorWorker, EmotionSupportWorker, ScheduleWorker
- Message handling and conversation management
"""

from .openai_agent import OpenAIAgentService, AgentConfig, Message, ConversationContext
from .evaluator import (
    EvaluatorAgent,
    EvaluatorConfig,
    EvaluationResult,
    DimensionScore,
    EvaluationDimension,
    RetryStrategy,
)
from .orchestrator import (
    OrchestratorAgent,
    OrchestratorConfig,
    OrchestratorResult,
    get_orchestrator,
)
from .workers import (
    BaseWorker,
    WorkerResult,
    WorkerPriority,
    HealthMonitorWorker,
    EmotionSupportWorker,
    ScheduleWorker,
)

__all__ = [
    # Main Agent (OpenAI)
    "OpenAIAgentService",
    "AgentConfig",
    "Message",
    "ConversationContext",
    # Evaluator
    "EvaluatorAgent",
    "EvaluatorConfig",
    "EvaluationResult",
    "DimensionScore",
    "EvaluationDimension",
    "RetryStrategy",
    # Orchestrator
    "OrchestratorAgent",
    "OrchestratorConfig",
    "OrchestratorResult",
    "get_orchestrator",
    # Workers
    "BaseWorker",
    "WorkerResult",
    "WorkerPriority",
    "HealthMonitorWorker",
    "EmotionSupportWorker",
    "ScheduleWorker",
]
