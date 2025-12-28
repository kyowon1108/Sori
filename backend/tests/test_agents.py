"""
Integration tests for OpenAI Agent Service.

Tests the Perceive-Plan-Act-Reflect loop, tool execution,
and conversation management.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from app.services.agents import (
    OpenAIAgentService,
    AgentConfig,
    ConversationContext,
    Message,
)
from app.services.agents.evaluator import (
    EvaluatorAgent,
    EvaluatorConfig,
    EvaluationResult,
    DimensionScore,
    EvaluationDimension,
)
from app.services.agents.openai_agent import AgentPhase


class TestAgentConfig:
    """Test AgentConfig dataclass."""

    def test_default_config(self):
        config = AgentConfig()
        assert config.model == "gpt-4o"
        assert config.max_tokens == 4096
        assert config.max_retries == 3
        assert config.quality_threshold == 0.7
        assert config.enable_reflection is True
        assert config.temperature == 0.7

    def test_custom_config(self, agent_config):
        assert agent_config.model == "gpt-4o"
        assert agent_config.max_tokens == 1024
        assert agent_config.max_retries == 2
        assert agent_config.quality_threshold == 0.6


class TestMessage:
    """Test Message dataclass."""

    def test_message_creation(self):
        msg = Message(role="user", content="안녕하세요")
        assert msg.role == "user"
        assert msg.content == "안녕하세요"
        assert isinstance(msg.timestamp, datetime)
        assert msg.tool_calls is None

    def test_message_to_openai_format(self):
        msg = Message(role="assistant", content="반갑습니다!")
        openai_format = msg.to_openai_format()

        assert openai_format["role"] == "assistant"
        assert openai_format["content"] == "반갑습니다!"


class TestConversationContext:
    """Test ConversationContext dataclass."""

    def test_context_creation(self, conversation_context):
        assert conversation_context.conversation_id == "test_call_123"
        assert conversation_context.elderly_name == "김영희"
        assert conversation_context.elderly_age == 75
        assert "고혈압" in conversation_context.health_condition

    def test_to_context_string(self, conversation_context):
        context_str = conversation_context.to_context_string()

        assert "김영희" in context_str
        assert "75" in context_str
        assert "고혈압" in context_str

    def test_empty_context_string(self):
        context = ConversationContext(conversation_id="test_123")
        context_str = context.to_context_string()

        assert context_str == "정보 없음"


class TestOpenAIAgentService:
    """Test OpenAIAgentService with mocked OpenAI client."""

    @pytest.fixture
    def mock_agent_service(self, agent_config, mock_openai_client):
        """Create agent service with mocked dependencies."""
        with patch("app.services.agents.openai_agent.AsyncOpenAI") as mock_openai:
            mock_openai.return_value = mock_openai_client

            with patch("app.services.agents.openai_agent.settings") as mock_settings:
                mock_settings.OPENAI_API_KEY = "test-key"

                with patch("app.services.agents.openai_agent.get_registry") as mock_registry:
                    mock_registry.return_value = MagicMock()
                    mock_registry.return_value._tools = {}
                    mock_registry.return_value.__len__ = MagicMock(return_value=0)

                    with patch("app.services.agents.openai_agent.get_skill_loader") as mock_skill:
                        mock_skill.return_value = MagicMock()
                        mock_skill.return_value.skills = []
                        mock_skill.return_value.get_matching_skills = MagicMock(return_value=[])

                        with patch("app.services.agents.openai_agent.get_orchestrator") as mock_orch:
                            mock_orch.return_value = MagicMock()
                            mock_orch.return_value.workers = []

                            with patch("app.services.agents.openai_agent.register_all_tools"):
                                agent = OpenAIAgentService(config=agent_config)
                                agent.client = mock_openai_client
                                return agent

    def test_init_without_api_key(self):
        """Test that initialization fails without API key."""
        with patch("app.services.agents.openai_agent.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = ""

            with pytest.raises(ValueError, match="OPENAI_API_KEY"):
                OpenAIAgentService()

    def test_count_tokens(self, mock_agent_service):
        """Test token counting."""
        token_count = mock_agent_service.count_tokens("안녕하세요, 테스트입니다.")
        assert isinstance(token_count, int)
        assert token_count > 0

    def test_get_system_prompt(self, mock_agent_service, conversation_context):
        """Test system prompt generation."""
        prompt = mock_agent_service._get_system_prompt(conversation_context, "안녕하세요")

        assert "AI 상담사" in prompt
        assert "김영희" in prompt
        assert "75" in prompt

    def test_get_system_prompt_with_greeting(self, mock_agent_service, conversation_context):
        """Test system prompt includes greeting instruction."""
        conversation_context.is_greeting = True
        prompt = mock_agent_service._get_system_prompt(conversation_context, "")

        assert "인사" in prompt or "통화가 시작" in prompt

    def test_get_tools_for_openai(self, mock_agent_service):
        """Test OpenAI tool format generation."""
        # Add mock tool
        mock_tool = MagicMock()
        mock_tool.name = "test_tool"
        mock_tool.description = "Test tool description"
        mock_tool.input_schema = {
            "properties": {"param": {"type": "string"}},
            "required": ["param"]
        }
        mock_agent_service.tool_registry._tools = {"test_tool": mock_tool}

        tools = mock_agent_service._get_tools_for_openai()

        assert len(tools) == 1
        assert tools[0]["type"] == "function"
        assert tools[0]["function"]["name"] == "test_tool"
        assert "parameters" in tools[0]["function"]

    def test_conversation_management(self, mock_agent_service, conversation_context):
        """Test conversation history management."""
        conv_id = conversation_context.conversation_id

        # Initially empty
        history = mock_agent_service.get_conversation_history(conv_id)
        assert len(history) == 0

        # Add message
        msg = Message(role="user", content="테스트 메시지")
        mock_agent_service._add_message(conv_id, msg)

        history = mock_agent_service.get_conversation_history(conv_id)
        assert len(history) == 1
        assert history[0].content == "테스트 메시지"

        # Clear conversation
        mock_agent_service.clear_conversation(conv_id)
        history = mock_agent_service.get_conversation_history(conv_id)
        assert len(history) == 0


class TestPerception:
    """Test perception phase (intent and emotion detection)."""

    @pytest.fixture
    def mock_agent_service(self, agent_config):
        """Create minimal agent service for perception tests."""
        with patch("app.services.agents.openai_agent.AsyncOpenAI"):
            with patch("app.services.agents.openai_agent.settings") as mock_settings:
                mock_settings.OPENAI_API_KEY = "test-key"

                with patch("app.services.agents.openai_agent.get_registry") as mock_registry:
                    mock_registry.return_value = MagicMock()
                    mock_registry.return_value._tools = {}
                    mock_registry.return_value.__len__ = MagicMock(return_value=0)

                    with patch("app.services.agents.openai_agent.get_skill_loader") as mock_skill:
                        mock_skill.return_value = MagicMock()
                        mock_skill.return_value.skills = []

                        with patch("app.services.agents.openai_agent.get_orchestrator") as mock_orch:
                            mock_orch.return_value = MagicMock()
                            mock_orch.return_value.workers = []

                            with patch("app.services.agents.openai_agent.register_all_tools"):
                                return OpenAIAgentService(config=agent_config)

    def test_detect_intent_end_conversation(self, mock_agent_service):
        """Test end conversation intent detection."""
        assert mock_agent_service._detect_intent("이제 끊을게요") == "end_conversation"
        assert mock_agent_service._detect_intent("이만 할게요") == "end_conversation"
        assert mock_agent_service._detect_intent("안녕히 계세요") == "end_conversation"

    def test_detect_intent_request_help(self, mock_agent_service):
        """Test help request intent detection."""
        assert mock_agent_service._detect_intent("도와주세요") == "request_help"
        assert mock_agent_service._detect_intent("부탁드려요") == "request_help"

    def test_detect_intent_question(self, mock_agent_service):
        """Test question intent detection."""
        assert mock_agent_service._detect_intent("뭐 해야 해요?") == "question"
        assert mock_agent_service._detect_intent("어떻게 해요") == "question"

    def test_detect_emotion_sad(self, mock_agent_service):
        """Test sad emotion detection."""
        assert mock_agent_service._detect_emotion("너무 외로워요") == "sad"
        assert mock_agent_service._detect_emotion("우울해요") == "sad"
        assert mock_agent_service._detect_emotion("힘들어요") == "sad"

    def test_detect_emotion_happy(self, mock_agent_service):
        """Test happy emotion detection."""
        assert mock_agent_service._detect_emotion("기뻐요!") == "happy"
        assert mock_agent_service._detect_emotion("좋아요") == "happy"
        assert mock_agent_service._detect_emotion("감사해요") == "happy"

    def test_detect_emotion_neutral(self, mock_agent_service):
        """Test neutral emotion detection."""
        assert mock_agent_service._detect_emotion("네, 알겠어요") == "neutral"
        assert mock_agent_service._detect_emotion("오늘 날씨가 좋네요") == "neutral"

    def test_is_health_related(self, mock_agent_service):
        """Test health-related content detection."""
        assert mock_agent_service._is_health_related("머리가 아파요") is True
        assert mock_agent_service._is_health_related("병원에 갔어요") is True
        assert mock_agent_service._is_health_related("약을 먹었어요") is True
        assert mock_agent_service._is_health_related("잠을 못 자요") is True
        assert mock_agent_service._is_health_related("오늘 뭐 했어요?") is False

    def test_wants_to_end_call(self, mock_agent_service):
        """Test call end detection."""
        assert mock_agent_service._wants_to_end_call("이제 끊을게요") is True
        assert mock_agent_service._wants_to_end_call("다음에 얘기해요") is True
        assert mock_agent_service._wants_to_end_call("안녕히 계세요") is True
        assert mock_agent_service._wants_to_end_call("계속 얘기해요") is False

    def test_is_emergency(self, mock_agent_service):
        """Test emergency detection."""
        assert mock_agent_service._is_emergency("쓰러졌어요") is True
        assert mock_agent_service._is_emergency("가슴이 아파요") is True
        assert mock_agent_service._is_emergency("119 불러주세요") is True
        assert mock_agent_service._is_emergency("응급상황이에요") is True
        assert mock_agent_service._is_emergency("오늘 날씨가 좋아요") is False

    @pytest.mark.asyncio
    async def test_perceive(self, mock_agent_service, conversation_context):
        """Test perceive phase."""
        perception = await mock_agent_service.perceive("머리가 아파요", conversation_context)

        assert "input" in perception
        assert perception["intent"] in ["general_conversation", "request_help"]
        assert perception["is_health_related"] is True
        assert "token_count" in perception


class TestEvaluatorAgent:
    """Test EvaluatorAgent for response quality evaluation."""

    @pytest.fixture
    def evaluator(self):
        """Create evaluator with mocked client."""
        mock_client = MagicMock()
        config = EvaluatorConfig(
            model="gpt-4o-mini",
            quality_threshold=0.7,
            enable_llm_evaluation=False,  # Disable LLM for unit tests
        )
        return EvaluatorAgent(mock_client, config)

    @pytest.mark.asyncio
    async def test_evaluate_good_response(self, evaluator):
        """Test evaluation of a good response."""
        result = await evaluator.evaluate(
            user_input="안녕하세요, 오늘 기분이 어떠세요?",
            response="안녕하세요, 김할머니. 오늘 기분이 좋으시다니 정말 기쁘네요. 오늘 하루도 건강하게 보내세요.",
            context={"elderly_name": "김할머니"},
        )

        assert isinstance(result, EvaluationResult)
        assert result.overall_score > 0.5
        assert result.should_retry is False

    @pytest.mark.asyncio
    async def test_evaluate_short_response(self, evaluator):
        """Test evaluation of a too-short response."""
        result = await evaluator.evaluate(
            user_input="오늘 기분이 어떠세요?",
            response="네",  # Too short
            context={},
        )

        assert isinstance(result, EvaluationResult)
        # Short responses should score lower on relevance
        assert result.relevance.score < 0.8

    @pytest.mark.asyncio
    async def test_evaluate_detects_urgent(self, evaluator):
        """Test that urgent situations are detected."""
        result = await evaluator.evaluate(
            user_input="가슴이 아프고 숨이 안 쉬어져요",
            response="많이 힘드시겠어요.",
            context={},
        )

        assert isinstance(result, EvaluationResult)
        # Should flag as urgent
        assert len(result.urgent_flags) > 0 or result.safety.score < 1.0


class TestAgentPhases:
    """Test agent processing phases."""

    def test_agent_phase_enum(self):
        """Test AgentPhase enum values."""
        assert AgentPhase.PERCEIVE.value == "perceive"
        assert AgentPhase.PLAN.value == "plan"
        assert AgentPhase.ACT.value == "act"
        assert AgentPhase.REFLECT.value == "reflect"
        assert AgentPhase.COMPLETE.value == "complete"
        assert AgentPhase.ERROR.value == "error"


class TestDimensionScore:
    """Test DimensionScore for evaluation metrics."""

    def test_dimension_score_creation(self):
        """Test DimensionScore dataclass."""
        score = DimensionScore(
            dimension=EvaluationDimension.EMPATHY,
            score=0.85,
            explanation="공감적 표현이 잘 되어 있음"
        )

        assert score.dimension == EvaluationDimension.EMPATHY
        assert score.score == 0.85
        assert "공감" in score.explanation

    def test_evaluation_dimensions(self):
        """Test all evaluation dimensions exist."""
        assert EvaluationDimension.RELEVANCE is not None
        assert EvaluationDimension.ACCURACY is not None
        assert EvaluationDimension.EMPATHY is not None
        assert EvaluationDimension.COMPLETENESS is not None
        assert EvaluationDimension.SAFETY is not None
