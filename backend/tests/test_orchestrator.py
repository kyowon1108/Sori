"""
Tests for Orchestrator and Worker Agents.

Tests worker activation, parallel execution, and result aggregation.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from app.services.agents.workers import (
    BaseWorker,
    WorkerResult,
    WorkerPriority,
    HealthMonitorWorker,
    EmotionSupportWorker,
    ScheduleWorker,
)
from app.services.agents.orchestrator import (
    OrchestratorAgent,
    OrchestratorConfig,
    OrchestratorResult,
    get_orchestrator,
)


class TestWorkerPriority:
    """Test WorkerPriority enum."""

    def test_priority_values(self):
        assert WorkerPriority.LOW == 1
        assert WorkerPriority.NORMAL == 2
        assert WorkerPriority.HIGH == 3
        assert WorkerPriority.URGENT == 4
        assert WorkerPriority.CRITICAL == 5

    def test_priority_comparison(self):
        assert WorkerPriority.HIGH > WorkerPriority.NORMAL
        assert WorkerPriority.URGENT > WorkerPriority.HIGH
        assert WorkerPriority.CRITICAL > WorkerPriority.URGENT


class TestWorkerResult:
    """Test WorkerResult dataclass."""

    def test_basic_result(self):
        result = WorkerResult(
            worker_name="test_worker",
            success=True,
            priority=WorkerPriority.NORMAL,
        )

        assert result.worker_name == "test_worker"
        assert result.success is True
        assert result.priority == WorkerPriority.NORMAL
        assert result.concerns == []
        assert result.urgent_flags == []

    def test_full_result(self):
        result = WorkerResult(
            worker_name="health_worker",
            success=True,
            priority=WorkerPriority.HIGH,
            detected_intent="health_concern",
            confidence=0.85,
            suggested_actions=["log_health_issue"],
            tool_recommendations=["check_health_status"],
            response_hints=["Show empathy about health"],
            tone_recommendation="caring",
            concerns=["Pain reported"],
            urgent_flags=["Potential emergency"],
        )

        assert result.detected_intent == "health_concern"
        assert result.confidence == 0.85
        assert "check_health_status" in result.tool_recommendations
        assert len(result.urgent_flags) == 1

    def test_to_dict(self):
        result = WorkerResult(
            worker_name="test_worker",
            success=True,
            priority=WorkerPriority.HIGH,
            detected_intent="test_intent",
            confidence=0.9,
        )

        result_dict = result.to_dict()

        assert result_dict["worker_name"] == "test_worker"
        assert result_dict["priority"] == 3  # HIGH = 3
        assert result_dict["detected_intent"] == "test_intent"
        assert result_dict["confidence"] == 0.9


class TestHealthMonitorWorker:
    """Test HealthMonitorWorker."""

    @pytest.fixture
    def worker(self):
        return HealthMonitorWorker()

    def test_should_activate_health_keywords(self, worker):
        assert worker.should_activate("머리가 아파요") is True
        assert worker.should_activate("병원에 갔어요") is True
        assert worker.should_activate("약을 먹었어요") is True
        assert worker.should_activate("잠을 못 잤어요") is True

    def test_should_not_activate_general(self, worker):
        assert worker.should_activate("오늘 날씨가 좋네요") is False
        assert worker.should_activate("밥 먹었어요") is False

    @pytest.mark.asyncio
    async def test_analyze_health_issue(self, worker):
        result = await worker.analyze("머리가 아파요")

        assert result.success is True
        assert result.worker_name == "health_monitor"
        assert result.priority >= WorkerPriority.NORMAL

    @pytest.mark.asyncio
    async def test_analyze_emergency(self, worker):
        result = await worker.analyze("가슴이 아프고 숨이 안 쉬어져요")

        assert result.success is True
        # Emergency should trigger higher priority
        assert result.priority >= WorkerPriority.HIGH or len(result.urgent_flags) > 0


class TestEmotionSupportWorker:
    """Test EmotionSupportWorker."""

    @pytest.fixture
    def worker(self):
        return EmotionSupportWorker()

    def test_should_activate_sad(self, worker):
        assert worker.should_activate("너무 외로워요") is True
        assert worker.should_activate("우울해요") is True
        assert worker.should_activate("힘들어요") is True

    def test_should_activate_anxious(self, worker):
        assert worker.should_activate("걱정이 돼요") is True
        assert worker.should_activate("불안해요") is True

    def test_should_activate_happy(self, worker):
        assert worker.should_activate("기뻐요") is True
        assert worker.should_activate("행복해요") is True

    @pytest.mark.asyncio
    async def test_analyze_negative_emotion(self, worker):
        result = await worker.analyze("너무 외롭고 우울해요")

        assert result.success is True
        assert result.worker_name == "emotion_support"
        assert result.tone_recommendation is not None or len(result.response_hints) > 0

    @pytest.mark.asyncio
    async def test_analyze_positive_emotion(self, worker):
        result = await worker.analyze("오늘 기분이 너무 좋아요!")

        assert result.success is True
        assert result.worker_name == "emotion_support"


class TestScheduleWorker:
    """Test ScheduleWorker."""

    @pytest.fixture
    def worker(self):
        return ScheduleWorker()

    def test_should_activate_schedule_keywords(self, worker):
        assert worker.should_activate("다음에 또 얘기해요") is True
        assert worker.should_activate("내일 전화해주세요") is True
        assert worker.should_activate("약속 있어요") is True

    def test_should_activate_time_keywords(self, worker):
        # Note: ScheduleWorker activates on specific schedule keywords
        assert worker.should_activate("다음에 전화해요") is True
        assert worker.should_activate("내일 연락할게요") is True

    @pytest.mark.asyncio
    async def test_analyze_scheduling_request(self, worker):
        result = await worker.analyze("내일 오전에 다시 전화해주세요")

        assert result.success is True
        assert result.worker_name == "schedule_worker"


class TestOrchestratorConfig:
    """Test OrchestratorConfig."""

    def test_default_config(self):
        config = OrchestratorConfig()

        assert config.max_parallel_workers == 5
        assert config.worker_timeout_seconds == 5.0
        assert config.min_activation_confidence == 0.3
        assert config.max_response_hints == 5
        assert config.max_tool_recommendations == 3

    def test_custom_config(self):
        config = OrchestratorConfig(
            max_parallel_workers=3,
            worker_timeout_seconds=10.0,
            always_run_workers=["health_monitor"],
        )

        assert config.max_parallel_workers == 3
        assert config.worker_timeout_seconds == 10.0
        assert "health_monitor" in config.always_run_workers


class TestOrchestratorResult:
    """Test OrchestratorResult."""

    def test_empty_result(self):
        result = OrchestratorResult(worker_results=[])

        assert result.primary_intent is None
        assert result.overall_priority == WorkerPriority.NORMAL
        assert result.tool_recommendations == []
        assert result.has_urgent_concerns() is False

    def test_result_with_data(self):
        worker_result = WorkerResult(
            worker_name="test_worker",
            success=True,
            priority=WorkerPriority.HIGH,
            detected_intent="health_concern",
        )

        result = OrchestratorResult(
            worker_results=[worker_result],
            primary_intent="health_concern",
            overall_priority=WorkerPriority.HIGH,
            tool_recommendations=["check_health_status"],
            urgent_flags=["Possible emergency"],
        )

        assert result.primary_intent == "health_concern"
        assert result.overall_priority == WorkerPriority.HIGH
        assert result.has_urgent_concerns() is True

    def test_to_dict(self):
        result = OrchestratorResult(
            worker_results=[],
            primary_intent="test_intent",
            overall_priority=WorkerPriority.NORMAL,
            execution_time_ms=50.0,
        )

        result_dict = result.to_dict()

        assert result_dict["primary_intent"] == "test_intent"
        assert result_dict["overall_priority"] == 2  # NORMAL
        assert result_dict["execution_time_ms"] == 50.0


class TestOrchestratorAgent:
    """Test OrchestratorAgent."""

    @pytest.fixture
    def orchestrator(self):
        """Create orchestrator with default workers."""
        return OrchestratorAgent()

    @pytest.fixture
    def mock_orchestrator(self):
        """Create orchestrator with mock workers."""
        mock_worker = MagicMock(spec=BaseWorker)
        mock_worker.name = "mock_worker"
        mock_worker.should_activate = MagicMock(return_value=True)
        mock_worker.analyze = AsyncMock(return_value=WorkerResult(
            worker_name="mock_worker",
            success=True,
            priority=WorkerPriority.NORMAL,
            detected_intent="mock_intent",
            confidence=0.8,
        ))

        return OrchestratorAgent(workers=[mock_worker])

    def test_init_with_default_workers(self, orchestrator):
        assert len(orchestrator.workers) == 3
        worker_names = [w.name for w in orchestrator.workers]
        assert "health_monitor" in worker_names
        assert "emotion_support" in worker_names
        assert "schedule_worker" in worker_names

    def test_init_with_custom_workers(self, mock_orchestrator):
        assert len(mock_orchestrator.workers) == 1
        assert mock_orchestrator.workers[0].name == "mock_worker"

    @pytest.mark.asyncio
    async def test_orchestrate_basic(self, mock_orchestrator):
        result = await mock_orchestrator.orchestrate(
            "테스트 메시지",
            {"elderly_name": "김할머니"}
        )

        assert isinstance(result, OrchestratorResult)
        assert "mock_worker" in result.workers_activated
        assert result.execution_time_ms >= 0

    @pytest.mark.asyncio
    async def test_orchestrate_health_input(self, orchestrator):
        result = await orchestrator.orchestrate(
            "머리가 아파요",
            {"elderly_name": "김할머니"}
        )

        assert "health_monitor" in result.workers_activated

    @pytest.mark.asyncio
    async def test_orchestrate_emotion_input(self, orchestrator):
        result = await orchestrator.orchestrate(
            "너무 외로워요",
            {"elderly_name": "김할머니"}
        )

        assert "emotion_support" in result.workers_activated

    @pytest.mark.asyncio
    async def test_orchestrate_schedule_input(self, orchestrator):
        result = await orchestrator.orchestrate(
            "내일 다시 전화해주세요",
            {"elderly_name": "김할머니"}
        )

        assert "schedule_worker" in result.workers_activated

    @pytest.mark.asyncio
    async def test_orchestrate_no_activation(self, orchestrator):
        result = await orchestrator.orchestrate(
            "네",  # Very short, neutral input
            {}
        )

        # Might not activate any workers
        assert result.workers_activated is not None
        assert result.execution_time_ms >= 0

    @pytest.mark.asyncio
    async def test_orchestrate_parallel_execution(self):
        """Test that workers run in parallel."""
        execution_times = []

        class SlowWorker(BaseWorker):
            name = "slow_worker_1"
            trigger_keywords = ["test"]

            async def analyze(self, user_input, context=None):
                execution_times.append(asyncio.get_event_loop().time())
                await asyncio.sleep(0.1)
                return self._create_result()

        class SlowWorker2(BaseWorker):
            name = "slow_worker_2"
            trigger_keywords = ["test"]

            async def analyze(self, user_input, context=None):
                execution_times.append(asyncio.get_event_loop().time())
                await asyncio.sleep(0.1)
                return self._create_result()

        orchestrator = OrchestratorAgent(
            workers=[SlowWorker(), SlowWorker2()]
        )

        import time
        start = time.time()
        result = await orchestrator.orchestrate("test message", {})
        elapsed = time.time() - start

        # If parallel, should take ~0.1s. If sequential, ~0.2s
        assert elapsed < 0.2  # Parallel execution

    @pytest.mark.asyncio
    async def test_orchestrate_worker_timeout(self):
        """Test that slow workers are timed out."""
        class VerySlowWorker(BaseWorker):
            name = "very_slow"
            trigger_keywords = ["test"]

            async def analyze(self, user_input, context=None):
                await asyncio.sleep(10)  # Very slow
                return self._create_result()

        config = OrchestratorConfig(worker_timeout_seconds=0.1)
        orchestrator = OrchestratorAgent(
            config=config,
            workers=[VerySlowWorker()]
        )

        result = await orchestrator.orchestrate("test", {})

        # Worker should have timed out, result should be empty
        assert len(result.worker_results) == 0

    def test_add_worker(self, orchestrator):
        initial_count = len(orchestrator.workers)

        class CustomWorker(BaseWorker):
            name = "custom"
            async def analyze(self, user_input, context=None):
                return self._create_result()

        orchestrator.add_worker(CustomWorker())

        assert len(orchestrator.workers) == initial_count + 1
        assert orchestrator.get_worker("custom") is not None

    def test_remove_worker(self, orchestrator):
        initial_count = len(orchestrator.workers)

        result = orchestrator.remove_worker("health_monitor")

        assert result is True
        assert len(orchestrator.workers) == initial_count - 1
        assert orchestrator.get_worker("health_monitor") is None

    def test_remove_nonexistent_worker(self, orchestrator):
        result = orchestrator.remove_worker("nonexistent")

        assert result is False

    def test_get_worker(self, orchestrator):
        worker = orchestrator.get_worker("health_monitor")

        assert worker is not None
        assert worker.name == "health_monitor"

    def test_get_nonexistent_worker(self, orchestrator):
        worker = orchestrator.get_worker("nonexistent")

        assert worker is None


class TestResultAggregation:
    """Test result aggregation logic."""

    def test_aggregate_prioritizes_by_priority(self):
        config = OrchestratorConfig()
        orchestrator = OrchestratorAgent(config=config, workers=[])

        results = [
            WorkerResult(
                worker_name="low_priority",
                success=True,
                priority=WorkerPriority.LOW,
                detected_intent="low_intent",
                confidence=0.9,
            ),
            WorkerResult(
                worker_name="high_priority",
                success=True,
                priority=WorkerPriority.HIGH,
                detected_intent="high_intent",
                confidence=0.8,
            ),
        ]

        aggregated = orchestrator._aggregate_results(results)

        # Should pick high priority intent
        assert aggregated.primary_intent == "high_intent"
        assert aggregated.overall_priority == WorkerPriority.HIGH

    def test_aggregate_deduplicates_tools(self):
        config = OrchestratorConfig(max_tool_recommendations=5)
        orchestrator = OrchestratorAgent(config=config, workers=[])

        results = [
            WorkerResult(
                worker_name="worker1",
                success=True,
                priority=WorkerPriority.NORMAL,
                tool_recommendations=["tool_a", "tool_b"],
            ),
            WorkerResult(
                worker_name="worker2",
                success=True,
                priority=WorkerPriority.NORMAL,
                tool_recommendations=["tool_b", "tool_c"],
            ),
        ]

        aggregated = orchestrator._aggregate_results(results)

        # Should have no duplicates
        assert len(aggregated.tool_recommendations) == 3
        assert "tool_a" in aggregated.tool_recommendations
        assert "tool_b" in aggregated.tool_recommendations
        assert "tool_c" in aggregated.tool_recommendations

    def test_aggregate_limits_recommendations(self):
        config = OrchestratorConfig(max_tool_recommendations=2)
        orchestrator = OrchestratorAgent(config=config, workers=[])

        results = [
            WorkerResult(
                worker_name="worker1",
                success=True,
                priority=WorkerPriority.HIGH,
                tool_recommendations=["tool_a", "tool_b", "tool_c"],
            ),
        ]

        aggregated = orchestrator._aggregate_results(results)

        assert len(aggregated.tool_recommendations) <= 2

    def test_aggregate_collects_urgent_flags(self):
        config = OrchestratorConfig()
        orchestrator = OrchestratorAgent(config=config, workers=[])

        results = [
            WorkerResult(
                worker_name="worker1",
                success=True,
                priority=WorkerPriority.NORMAL,
                urgent_flags=["flag1"],
            ),
            WorkerResult(
                worker_name="worker2",
                success=True,
                priority=WorkerPriority.NORMAL,
                urgent_flags=["flag2", "flag3"],
            ),
        ]

        aggregated = orchestrator._aggregate_results(results)

        assert len(aggregated.urgent_flags) == 3
        assert "flag1" in aggregated.urgent_flags
        assert "flag2" in aggregated.urgent_flags
        assert "flag3" in aggregated.urgent_flags
