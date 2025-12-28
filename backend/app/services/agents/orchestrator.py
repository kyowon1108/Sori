"""
Orchestrator Agent.

Coordinates multiple specialized worker agents for comprehensive
analysis of user input in elderly care conversations.

Architecture:
    User Input → Orchestrator → [Workers in parallel] → Aggregate Results → Response Plan
"""

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .workers import (
    BaseWorker,
    WorkerResult,
    WorkerPriority,
    HealthMonitorWorker,
    EmotionSupportWorker,
    ScheduleWorker,
)

logger = logging.getLogger(__name__)


@dataclass
class OrchestratorResult:
    """Aggregated result from all workers."""

    # Worker results
    worker_results: List[WorkerResult]

    # Aggregated recommendations
    primary_intent: Optional[str] = None
    overall_priority: WorkerPriority = WorkerPriority.NORMAL

    # Combined tool recommendations (deduplicated, ordered by priority)
    tool_recommendations: List[str] = field(default_factory=list)

    # Merged response guidance
    response_hints: List[str] = field(default_factory=list)
    tone_recommendation: Optional[str] = None

    # All concerns and urgent flags
    concerns: List[str] = field(default_factory=list)
    urgent_flags: List[str] = field(default_factory=list)

    # Execution metadata
    workers_activated: List[str] = field(default_factory=list)
    execution_time_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "primary_intent": self.primary_intent,
            "overall_priority": self.overall_priority.value,
            "tool_recommendations": self.tool_recommendations,
            "response_hints": self.response_hints,
            "tone_recommendation": self.tone_recommendation,
            "concerns": self.concerns,
            "urgent_flags": self.urgent_flags,
            "workers_activated": self.workers_activated,
            "execution_time_ms": self.execution_time_ms,
            "worker_results": [r.to_dict() for r in self.worker_results],
        }

    def has_urgent_concerns(self) -> bool:
        """Check if any urgent concerns were detected."""
        return bool(self.urgent_flags) or self.overall_priority >= WorkerPriority.URGENT


@dataclass
class OrchestratorConfig:
    """Configuration for the Orchestrator."""
    # Parallel execution settings
    max_parallel_workers: int = 5
    worker_timeout_seconds: float = 5.0

    # Selection settings
    min_activation_confidence: float = 0.3
    always_run_workers: List[str] = field(default_factory=list)

    # Result aggregation
    max_response_hints: int = 5
    max_tool_recommendations: int = 3


class OrchestratorAgent:
    """
    Orchestrates multiple worker agents for comprehensive input analysis.

    The orchestrator:
    1. Activates relevant workers based on input
    2. Runs workers in parallel for efficiency
    3. Aggregates results into a coherent response plan
    4. Prioritizes recommendations based on urgency
    """

    def __init__(
        self,
        config: OrchestratorConfig = None,
        workers: List[BaseWorker] = None,
    ):
        """
        Initialize the Orchestrator.

        Args:
            config: Orchestrator configuration
            workers: List of worker agents (default: all available workers)
        """
        self.config = config or OrchestratorConfig()

        # Initialize workers
        if workers is not None:
            self.workers = workers
        else:
            self.workers = self._create_default_workers()

        logger.info(
            f"Orchestrator initialized with {len(self.workers)} workers: "
            f"{[w.name for w in self.workers]}"
        )

    def _create_default_workers(self) -> List[BaseWorker]:
        """Create default set of worker agents."""
        return [
            HealthMonitorWorker(),
            EmotionSupportWorker(),
            ScheduleWorker(),
        ]

    async def orchestrate(
        self,
        user_input: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> OrchestratorResult:
        """
        Orchestrate worker analysis of user input.

        Args:
            user_input: The user's message
            context: Optional conversation context

        Returns:
            OrchestratorResult with aggregated analysis
        """
        import time
        start_time = time.time()

        logger.info(f"[Orchestrator] Processing: {user_input[:50]}...")

        # Determine which workers to activate
        active_workers = self._select_workers(user_input, context)
        logger.debug(f"[Orchestrator] Activating workers: {[w.name for w in active_workers]}")

        if not active_workers:
            # No workers activated, return empty result
            return OrchestratorResult(
                worker_results=[],
                workers_activated=[],
                execution_time_ms=(time.time() - start_time) * 1000,
            )

        # Run workers in parallel
        worker_results = await self._run_workers_parallel(
            active_workers,
            user_input,
            context,
        )

        # Aggregate results
        result = self._aggregate_results(worker_results)
        result.workers_activated = [w.name for w in active_workers]
        result.execution_time_ms = (time.time() - start_time) * 1000

        logger.info(
            f"[Orchestrator] Completed in {result.execution_time_ms:.1f}ms, "
            f"priority: {result.overall_priority.name}, "
            f"urgent flags: {len(result.urgent_flags)}"
        )

        return result

    def _select_workers(
        self,
        user_input: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[BaseWorker]:
        """Select which workers should process the input."""
        selected = []

        for worker in self.workers:
            # Always run workers if configured
            if worker.name in self.config.always_run_workers:
                selected.append(worker)
                continue

            # Check if worker should activate
            if worker.should_activate(user_input, context):
                selected.append(worker)

        return selected

    async def _run_workers_parallel(
        self,
        workers: List[BaseWorker],
        user_input: str,
        context: Optional[Dict[str, Any]],
    ) -> List[WorkerResult]:
        """Run multiple workers in parallel with timeout."""
        async def run_worker(worker: BaseWorker) -> Optional[WorkerResult]:
            try:
                return await asyncio.wait_for(
                    worker.analyze(user_input, context),
                    timeout=self.config.worker_timeout_seconds,
                )
            except asyncio.TimeoutError:
                logger.warning(f"[Orchestrator] Worker {worker.name} timed out")
                return None
            except Exception as e:
                logger.error(f"[Orchestrator] Worker {worker.name} failed: {e}")
                return None

        # Run all workers concurrently
        tasks = [run_worker(w) for w in workers]
        results = await asyncio.gather(*tasks)

        # Filter out failed workers
        return [r for r in results if r is not None]

    def _aggregate_results(
        self,
        worker_results: List[WorkerResult],
    ) -> OrchestratorResult:
        """Aggregate results from all workers."""
        if not worker_results:
            return OrchestratorResult(worker_results=[])

        # Sort by priority for processing
        sorted_results = sorted(
            worker_results,
            key=lambda r: (r.priority, r.confidence),
            reverse=True,
        )

        # Determine primary intent from highest priority worker
        primary_intent = None
        for result in sorted_results:
            if result.detected_intent and result.confidence > 0.5:
                primary_intent = result.detected_intent
                break

        # Get highest priority
        overall_priority = max(r.priority for r in sorted_results)

        # Aggregate tool recommendations (deduplicate, maintain priority order)
        seen_tools = set()
        tool_recommendations = []
        for result in sorted_results:
            for tool in result.tool_recommendations:
                if tool not in seen_tools:
                    seen_tools.add(tool)
                    tool_recommendations.append(tool)
                if len(tool_recommendations) >= self.config.max_tool_recommendations:
                    break

        # Aggregate response hints (deduplicate, limit count)
        seen_hints = set()
        response_hints = []
        for result in sorted_results:
            for hint in result.response_hints:
                if hint not in seen_hints:
                    seen_hints.add(hint)
                    response_hints.append(hint)
                if len(response_hints) >= self.config.max_response_hints:
                    break

        # Determine tone (use highest priority worker's recommendation)
        tone_recommendation = None
        for result in sorted_results:
            if result.tone_recommendation:
                tone_recommendation = result.tone_recommendation
                break

        # Collect all concerns and urgent flags
        concerns = []
        urgent_flags = []
        for result in sorted_results:
            concerns.extend(result.concerns)
            urgent_flags.extend(result.urgent_flags)

        # Deduplicate
        concerns = list(dict.fromkeys(concerns))
        urgent_flags = list(dict.fromkeys(urgent_flags))

        return OrchestratorResult(
            worker_results=worker_results,
            primary_intent=primary_intent,
            overall_priority=overall_priority,
            tool_recommendations=tool_recommendations,
            response_hints=response_hints,
            tone_recommendation=tone_recommendation,
            concerns=concerns,
            urgent_flags=urgent_flags,
        )

    def add_worker(self, worker: BaseWorker) -> None:
        """Add a new worker to the orchestrator."""
        self.workers.append(worker)
        logger.info(f"[Orchestrator] Added worker: {worker.name}")

    def remove_worker(self, worker_name: str) -> bool:
        """Remove a worker by name."""
        for i, worker in enumerate(self.workers):
            if worker.name == worker_name:
                self.workers.pop(i)
                logger.info(f"[Orchestrator] Removed worker: {worker_name}")
                return True
        return False

    def get_worker(self, worker_name: str) -> Optional[BaseWorker]:
        """Get a worker by name."""
        for worker in self.workers:
            if worker.name == worker_name:
                return worker
        return None


# Singleton instance
_orchestrator: Optional[OrchestratorAgent] = None


def get_orchestrator() -> OrchestratorAgent:
    """Get or create the global orchestrator instance."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = OrchestratorAgent()
    return _orchestrator
