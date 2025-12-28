"""
OpenAI Agent Service with Perceive-Plan-Act-Reflect Loop.

This module implements an agentic AI service for elderly care conversations
using OpenAI's GPT models and function calling capabilities.

Architecture:
    Perceive → Plan → Act → Reflect → (loop if needed)

Features:
    - Real-time streaming responses
    - OpenAI Function Calling for tool use
    - Automatic error recovery and retry
    - Quality evaluation and re-planning
    - Context-aware conversation management
"""

import json
import logging
import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import (
    Any,
    AsyncGenerator,
    Dict,
    List,
    Optional,
    Tuple,
)
from enum import Enum

from openai import AsyncOpenAI, APIError, RateLimitError
import tiktoken

from app.core.config import settings
from app.services.tools.registry import ToolRegistry, ToolResult, get_registry
from app.services.tools.base_tools import register_all_tools
from app.skills import SkillLoader, get_skill_loader
from app.services.agents.evaluator import (
    EvaluatorAgent,
    EvaluatorConfig,
    EvaluationResult,
    RetryStrategy,
)
from app.services.agents.orchestrator import (
    OrchestratorAgent,
    OrchestratorConfig,
    OrchestratorResult,
    get_orchestrator,
)

logger = logging.getLogger(__name__)


class AgentPhase(str, Enum):
    """Agent processing phases."""
    PERCEIVE = "perceive"
    PLAN = "plan"
    ACT = "act"
    REFLECT = "reflect"
    COMPLETE = "complete"
    ERROR = "error"


@dataclass
class AgentConfig:
    """Configuration for OpenAI Agent."""
    model: str = "gpt-4o"
    max_tokens: int = 4096
    max_retries: int = 3
    retry_delay_base: float = 1.0
    quality_threshold: float = 0.7
    max_tool_calls_per_turn: int = 5
    enable_reflection: bool = True
    timeout_seconds: float = 60.0
    temperature: float = 0.7

    # System prompt components
    base_system_prompt: str = ""
    elderly_context_template: str = ""

    # Evaluator settings
    evaluator_model: str = "gpt-4o-mini"  # Use faster model for evaluation
    enable_llm_evaluation: bool = True


@dataclass
class Message:
    """Represents a conversation message."""
    role: str  # "user", "assistant", "system"
    content: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_results: Optional[List[Dict[str, Any]]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_openai_format(self) -> Dict[str, Any]:
        """Convert to OpenAI API message format."""
        return {
            "role": self.role,
            "content": self.content,
        }


@dataclass
class ConversationContext:
    """Context for an ongoing conversation."""
    conversation_id: str
    elderly_id: Optional[int] = None
    elderly_name: Optional[str] = None
    elderly_age: Optional[int] = None
    health_condition: Optional[str] = None
    medications: Optional[List[str]] = None
    call_id: Optional[int] = None
    is_greeting: bool = False

    def to_context_string(self) -> str:
        """Generate context string for system prompt."""
        parts = []
        if self.elderly_name:
            parts.append(f"이름: {self.elderly_name}")
        if self.elderly_age:
            parts.append(f"나이: {self.elderly_age}세")
        if self.health_condition:
            parts.append(f"건강 상태: {self.health_condition}")
        if self.medications:
            parts.append(f"복용 약물: {', '.join(self.medications)}")

        return ", ".join(parts) if parts else "정보 없음"


class OpenAIAgentService:
    """
    OpenAI Agent with Perceive-Plan-Act-Reflect loop.

    This service handles elderly care conversations with:
    - Empathetic response generation
    - Function calling for tools
    - Automatic quality evaluation
    - Error recovery and retry logic
    """

    # Default system prompt for elderly care
    DEFAULT_SYSTEM_PROMPT = """당신은 친절하고 공감 능력이 뛰어난 AI 상담사입니다. 독거 어르신들의 이야기를 경청하고, 그들의 감정에 깊이 공감하며, 따뜻한 격려를 제공합니다.

## 대화 원칙

1. **존중과 공감**: 항상 존댓말을 사용하고, 어르신의 이야기에 진심으로 공감합니다.
2. **경청**: 어르신이 하시는 말씀을 끝까지 듣고, 그 내용을 이해했음을 표현합니다.
3. **간결함**: 답변은 2-3문장으로 짧고 따뜻하게 합니다. 어르신이 이해하기 쉽게 말합니다.
4. **건강 주의**: 건강과 안전에 대한 이야기가 나오면 세심하게 주의를 기울입니다.
5. **긍정적 마무리**: 대화를 긍정적으로 마무리하고, 어르신에게 힘이 되는 말을 합니다.

## 도구 사용 지침

다음 상황에서 적절한 도구를 사용하세요:

- **통화 종료**: 어르신이 "이만 끊을게요", "다음에 얘기해요" 등 종료 의사를 표현하면 `end_call` 도구를 사용합니다.
- **건강 문제**: 어르신이 신체적/정신적 불편함을 호소하면 `check_health_status` 도구로 기록합니다.
- **후속 조치**: 추가 확인이 필요하면 `schedule_followup` 도구로 예약합니다.
- **긴급 상황**: 심각한 건강 문제나 위험 상황이면 `notify_caregiver` 도구를 즉시 사용합니다.

## 주의사항

- 의료 진단이나 처방을 하지 않습니다. 건강 문제는 보호자나 의료진과 상담하도록 권유합니다.
- 어르신의 이야기를 함부로 판단하지 않습니다.
- 어르신이 원하지 않으면 무리하게 대화를 이어가지 않습니다."""

    def __init__(
        self,
        config: AgentConfig = None,
        tool_registry: ToolRegistry = None,
        skill_loader: SkillLoader = None,
    ):
        """
        Initialize OpenAI Agent Service.

        Args:
            config: Agent configuration
            tool_registry: Registry of available tools
            skill_loader: Loader for skill definitions
        """
        self.config = config or AgentConfig()
        self.tool_registry = tool_registry or get_registry()
        self.skill_loader = skill_loader or get_skill_loader()

        # Initialize OpenAI client
        if settings.OPENAI_API_KEY:
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("OpenAI Agent initialized with GPT-4o")
        else:
            raise ValueError("OPENAI_API_KEY is required for OpenAIAgentService")

        # Initialize tiktoken for token counting
        try:
            self.encoding = tiktoken.encoding_for_model(self.config.model)
        except KeyError:
            self.encoding = tiktoken.get_encoding("cl100k_base")

        # Initialize EvaluatorAgent (using OpenAI)
        evaluator_config = EvaluatorConfig(
            model=self.config.evaluator_model,
            quality_threshold=self.config.quality_threshold,
            enable_llm_evaluation=self.config.enable_llm_evaluation,
        )
        self.evaluator = EvaluatorAgent(self.client, evaluator_config)
        logger.info(f"EvaluatorAgent initialized (LLM eval: {self.config.enable_llm_evaluation})")

        # Register default tools if registry is empty
        if len(self.tool_registry) == 0:
            register_all_tools(self.tool_registry)

        # Conversation state
        self._conversations: Dict[str, List[Message]] = {}

        # Retry enhancement storage (for improved prompts on retry)
        self._retry_enhancements: Dict[str, str] = {}

        # Initialize Orchestrator for worker coordination
        self.orchestrator = get_orchestrator()
        logger.info(f"Orchestrator initialized with {len(self.orchestrator.workers)} workers")

        # Log loaded skills
        logger.info(f"Loaded {len(self.skill_loader.skills)} skills")

    def count_tokens(self, text: str) -> int:
        """Count tokens in text using tiktoken."""
        return len(self.encoding.encode(text))

    def _get_system_prompt(
        self,
        context: ConversationContext,
        user_input: str = ""
    ) -> str:
        """Generate system prompt with context and relevant skills."""
        prompt = self.config.base_system_prompt or self.DEFAULT_SYSTEM_PROMPT

        # Add elderly context
        if context.elderly_name or context.elderly_age:
            prompt += f"\n\n## 현재 통화 중인 어르신\n{context.to_context_string()}"

        # Add greeting instruction if this is the start
        if context.is_greeting:
            prompt += "\n\n## 현재 상황\n지금은 통화가 시작되는 시점입니다. 어르신에게 먼저 따뜻하게 인사하고 안부를 물어주세요."

        # Add relevant skills based on user input (progressive disclosure)
        if user_input:
            matching_skills = self.skill_loader.get_matching_skills(
                user_input,
                max_skills=2,  # Limit to 2 most relevant skills
                min_score=0.2
            )

            if matching_skills:
                prompt += "\n\n## 관련 스킬 지침\n"
                for skill in matching_skills:
                    prompt += f"\n### {skill.name}\n"
                    prompt += f"{skill.instructions[:500]}"  # Limit to 500 chars
                    if len(skill.instructions) > 500:
                        prompt += "..."

        # Add retry enhancement if this is a retry attempt
        retry_enhancement = self._retry_enhancements.get(context.conversation_id)
        if retry_enhancement:
            prompt += retry_enhancement

        return prompt

    def _get_tools_for_openai(self) -> List[Dict[str, Any]]:
        """Convert tools to OpenAI Function Calling format."""
        return [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": {
                        "type": "object",
                        "properties": tool.input_schema.get("properties", {}),
                        "required": tool.input_schema.get("required", [])
                    }
                }
            }
            for tool in self.tool_registry._tools.values()
        ]

    def _get_conversation(self, conversation_id: str) -> List[Message]:
        """Get or create conversation history."""
        if conversation_id not in self._conversations:
            self._conversations[conversation_id] = []
        return self._conversations[conversation_id]

    def _add_message(self, conversation_id: str, message: Message) -> None:
        """Add message to conversation history."""
        conversation = self._get_conversation(conversation_id)
        conversation.append(message)

        # Limit history to prevent token overflow
        max_messages = 50
        if len(conversation) > max_messages:
            self._conversations[conversation_id] = conversation[-max_messages:]

    async def perceive(
        self,
        user_input: str,
        context: ConversationContext,
    ) -> Dict[str, Any]:
        """
        Phase 1: Perceive - Analyze user input.

        Extracts:
        - User intent
        - Emotional tone
        - Key topics
        - Potential concerns
        """
        logger.info(f"[Perceive] Input: {user_input[:100]}...")

        # Add user message to history
        self._add_message(
            context.conversation_id,
            Message(role="user", content=user_input)
        )

        # Quick perception analysis
        perception = {
            "input": user_input,
            "intent": self._detect_intent(user_input),
            "emotional_tone": self._detect_emotion(user_input),
            "is_health_related": self._is_health_related(user_input),
            "wants_to_end": self._wants_to_end_call(user_input),
            "token_count": self.count_tokens(user_input),
            "timestamp": datetime.utcnow().isoformat(),
        }

        logger.debug(f"[Perceive] Result: {perception}")
        return perception

    async def plan(
        self,
        perception: Dict[str, Any],
        context: ConversationContext,
    ) -> Dict[str, Any]:
        """
        Phase 2: Plan - Determine response strategy using Orchestrator.

        Uses specialized workers to analyze:
        - Health concerns (HealthMonitorWorker)
        - Emotional state (EmotionSupportWorker)
        - Scheduling needs (ScheduleWorker)

        Returns a unified plan with tool recommendations and response guidance.
        """
        logger.info(f"[Plan] Planning response for intent: {perception.get('intent')}")

        user_input = perception.get("input", "")

        # Build context for orchestrator
        orchestrator_context = {
            "elderly_name": context.elderly_name,
            "elderly_age": context.elderly_age,
            "health_condition": context.health_condition,
            "is_greeting": context.is_greeting,
        }

        # Run orchestrator with all workers in parallel
        orchestrator_result = await self.orchestrator.orchestrate(
            user_input,
            orchestrator_context,
        )

        # Build plan from orchestrator result
        plan = {
            "use_tools": orchestrator_result.tool_recommendations,
            "response_style": orchestrator_result.tone_recommendation or "empathetic",
            "priority": orchestrator_result.overall_priority.name.lower(),
            "actions": [],
            "response_hints": orchestrator_result.response_hints,
            "concerns": orchestrator_result.concerns,
            "urgent_flags": orchestrator_result.urgent_flags,
            "orchestrator_result": orchestrator_result,
        }

        # Fallback: Add basic plan elements from perception if orchestrator missed them
        if perception.get("wants_to_end") and "end_call" not in plan["use_tools"]:
            plan["use_tools"].append("end_call")
            plan["actions"].append("say_goodbye")

        if perception.get("is_health_related") and "check_health_status" not in plan["use_tools"]:
            plan["use_tools"].append("check_health_status")

        # Emergency check fallback
        if self._is_emergency(user_input):
            if "notify_caregiver" not in plan["use_tools"]:
                plan["use_tools"].insert(0, "notify_caregiver")
            plan["priority"] = "urgent"
            plan["response_style"] = "urgent_caring"

        logger.info(
            f"[Plan] Result: priority={plan['priority']}, "
            f"tools={plan['use_tools']}, "
            f"workers_used={orchestrator_result.workers_activated}"
        )
        return plan

    async def act(
        self,
        user_input: str,
        context: ConversationContext,
        plan: Dict[str, Any] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Phase 3: Act - Generate response with OpenAI streaming and function calling.

        Yields:
            Streaming response text chunks
        """
        logger.info("[Act] Generating response with OpenAI...")

        # Prepare messages for OpenAI
        conversation = self._get_conversation(context.conversation_id)
        messages = [
            {"role": "system", "content": self._get_system_prompt(context, user_input)}
        ]
        messages.extend([msg.to_openai_format() for msg in conversation])

        # If this is a greeting and no user messages yet, add prompt
        if context.is_greeting and len(conversation) == 0:
            messages.append({"role": "user", "content": "통화가 시작되었습니다."})

        # Get available tools in OpenAI format
        tools = self._get_tools_for_openai()

        accumulated_response = ""
        tool_calls_accumulated = []
        tool_results = []

        try:
            # Create streaming response with OpenAI
            stream = await self.client.chat.completions.create(
                model=self.config.model,
                max_tokens=self.config.max_tokens,
                temperature=self.config.temperature,
                messages=messages,
                tools=tools if tools else None,
                stream=True,
            )

            current_tool_calls = {}

            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None

                if delta:
                    # Handle text content
                    if delta.content:
                        text = delta.content
                        accumulated_response += text
                        yield text

                    # Handle function calls (streamed in chunks)
                    if delta.tool_calls:
                        for tool_call_delta in delta.tool_calls:
                            idx = tool_call_delta.index
                            if idx not in current_tool_calls:
                                current_tool_calls[idx] = {
                                    "id": "",
                                    "function": {"name": "", "arguments": ""}
                                }

                            if tool_call_delta.id:
                                current_tool_calls[idx]["id"] = tool_call_delta.id
                            if tool_call_delta.function:
                                if tool_call_delta.function.name:
                                    current_tool_calls[idx]["function"]["name"] = tool_call_delta.function.name
                                if tool_call_delta.function.arguments:
                                    current_tool_calls[idx]["function"]["arguments"] += tool_call_delta.function.arguments

            # Process completed tool calls
            for idx, tool_call in current_tool_calls.items():
                tool_name = tool_call["function"]["name"]
                try:
                    tool_input = json.loads(tool_call["function"]["arguments"])
                except json.JSONDecodeError:
                    tool_input = {}

                logger.info(f"[Act] Executing tool: {tool_name}")

                # Execute the tool
                result = await self.tool_registry.execute(tool_name, **tool_input)
                tool_results.append({
                    "tool_call_id": tool_call["id"],
                    "result": result.to_dict(),
                })

                # Handle special tool results
                if tool_name == "end_call" and result.success:
                    yield "\n[CALL_END]"

                tool_calls_accumulated.append({
                    "id": tool_call["id"],
                    "name": tool_name,
                    "input": tool_input,
                })

        except RateLimitError as e:
            logger.warning(f"[Act] Rate limited: {e}")
            await asyncio.sleep(5)
            yield "\n잠시 후 다시 시도해 주세요."
            return
        except APIError as e:
            logger.error(f"[Act] API Error: {e}")
            yield f"\n죄송합니다. 일시적인 오류가 발생했습니다."
            return
        except Exception as e:
            logger.error(f"[Act] Error: {e}")
            yield f"\n죄송합니다. 일시적인 오류가 발생했습니다."
            return

        # Add assistant message to history
        self._add_message(
            context.conversation_id,
            Message(
                role="assistant",
                content=accumulated_response,
                tool_calls=tool_calls_accumulated if tool_calls_accumulated else None,
                tool_results=tool_results if tool_results else None,
            )
        )

    async def reflect(
        self,
        user_input: str,
        response: str,
        context: ConversationContext,
    ) -> EvaluationResult:
        """
        Phase 4: Reflect - Evaluate response quality using EvaluatorAgent.

        Returns:
            EvaluationResult with detailed scores and improvement suggestions
        """
        if not self.config.enable_reflection:
            from app.services.agents.evaluator import DimensionScore, EvaluationDimension

            return EvaluationResult(
                relevance=DimensionScore(EvaluationDimension.RELEVANCE, 1.0, "반영 비활성화"),
                accuracy=DimensionScore(EvaluationDimension.ACCURACY, 1.0, "반영 비활성화"),
                empathy=DimensionScore(EvaluationDimension.EMPATHY, 1.0, "반영 비활성화"),
                completeness=DimensionScore(EvaluationDimension.COMPLETENESS, 1.0, "반영 비활성화"),
                safety=DimensionScore(EvaluationDimension.SAFETY, 1.0, "반영 비활성화"),
                overall_score=1.0,
                should_retry=False,
            )

        logger.info("[Reflect] Evaluating response quality with EvaluatorAgent...")

        # Build context for evaluation
        eval_context = {
            "elderly_name": context.elderly_name,
            "elderly_age": context.elderly_age,
            "health_condition": context.health_condition,
        }

        # Get recent conversation for context
        conversation = self._get_conversation(context.conversation_id)
        if len(conversation) > 1:
            recent = conversation[-3:]
            eval_context["recent_messages"] = " | ".join(
                f"{m.role}: {m.content[:50]}..." for m in recent
            )

        # Use EvaluatorAgent for quality assessment
        evaluation = await self.evaluator.evaluate(
            user_input=user_input,
            response=response,
            context=eval_context,
        )

        logger.info(
            f"[Reflect] Evaluation: overall={evaluation.overall_score:.2f}, "
            f"retry={evaluation.should_retry}, reason={evaluation.retry_reason}"
        )

        # If retry is needed, generate enhancement prompt for next attempt
        if evaluation.should_retry:
            enhancement = RetryStrategy.get_retry_prompt_enhancement(evaluation)
            if enhancement:
                self._retry_enhancements[context.conversation_id] = enhancement
                logger.debug(f"[Reflect] Retry enhancement generated: {enhancement[:100]}...")
        else:
            self._retry_enhancements.pop(context.conversation_id, None)

        # Log urgent flags if any
        if evaluation.urgent_flags:
            logger.warning(f"[Reflect] Urgent flags detected: {evaluation.urgent_flags}")

        return evaluation

    async def process_message(
        self,
        user_input: str,
        context: ConversationContext,
    ) -> AsyncGenerator[str, None]:
        """
        Main entry point: Process message through Perceive-Plan-Act-Reflect loop.

        Args:
            user_input: User's message
            context: Conversation context

        Yields:
            Streaming response text chunks
        """
        logger.info(f"[Agent] Processing message for conversation {context.conversation_id}")

        retries = 0
        accumulated_response = ""

        while retries <= self.config.max_retries:
            try:
                # Phase 1: Perceive
                perception = await self.perceive(user_input, context)

                # Phase 2: Plan
                plan = await self.plan(perception, context)

                # Phase 3: Act (streaming)
                accumulated_response = ""
                async for chunk in self.act(user_input, context, plan):
                    accumulated_response += chunk
                    yield chunk

                # Phase 4: Reflect (using EvaluatorAgent)
                evaluation = await self.reflect(user_input, accumulated_response, context)

                # Log detailed evaluation metrics
                logger.debug(
                    f"[Agent] Evaluation scores - "
                    f"relevance: {evaluation.relevance.score:.2f}, "
                    f"empathy: {evaluation.empathy.score:.2f}, "
                    f"safety: {evaluation.safety.score:.2f}, "
                    f"overall: {evaluation.overall_score:.2f}"
                )

                # Handle urgent flags
                if evaluation.urgent_flags:
                    for flag in evaluation.urgent_flags:
                        logger.warning(f"[Agent] URGENT: {flag} in conversation {context.conversation_id}")

                # Check if retry is needed
                if evaluation.should_retry and retries < self.config.max_retries:
                    retries += 1
                    logger.info(
                        f"[Agent] Retrying (attempt {retries}/{self.config.max_retries}), "
                        f"reason: {evaluation.retry_reason}"
                    )
                    yield "\n\n"

                    # Clear last assistant message for retry
                    conversation = self._get_conversation(context.conversation_id)
                    if conversation and conversation[-1].role == "assistant":
                        conversation.pop()

                    await asyncio.sleep(self.config.retry_delay_base * retries)
                    continue

                # Success - exit loop
                break

            except Exception as e:
                logger.error(f"[Agent] Error on attempt {retries + 1}: {e}")
                retries += 1

                if retries > self.config.max_retries:
                    yield "\n죄송합니다. 잠시 후 다시 시도해 주세요."
                    break

                await asyncio.sleep(self.config.retry_delay_base * retries)

    async def generate_greeting(
        self,
        context: ConversationContext,
    ) -> AsyncGenerator[str, None]:
        """Generate initial greeting for a new conversation."""
        context.is_greeting = True

        async for chunk in self.process_message("", context):
            yield chunk

    def clear_conversation(self, conversation_id: str) -> None:
        """Clear conversation history."""
        if conversation_id in self._conversations:
            del self._conversations[conversation_id]
            logger.info(f"Cleared conversation: {conversation_id}")

    def get_conversation_history(self, conversation_id: str) -> List[Message]:
        """Get conversation history."""
        return self._get_conversation(conversation_id).copy()

    # =========================================================================
    # Helper Methods for Perception
    # =========================================================================

    def _detect_intent(self, text: str) -> str:
        """Detect user intent from text."""
        text_lower = text.lower()

        if any(kw in text_lower for kw in ["끊", "그만", "이만", "안녕"]):
            return "end_conversation"
        if any(kw in text_lower for kw in ["도와", "도움", "부탁"]):
            return "request_help"
        if any(kw in text_lower for kw in ["?", "뭐", "어떻게", "왜", "언제"]):
            return "question"
        if any(kw in text_lower for kw in ["고마워", "감사", "좋아"]):
            return "positive_feedback"
        if any(kw in text_lower for kw in ["싫", "별로", "아니"]):
            return "negative_feedback"

        return "general_conversation"

    def _detect_emotion(self, text: str) -> str:
        """Detect emotional tone from text."""
        text_lower = text.lower()

        if any(kw in text_lower for kw in ["슬퍼", "우울", "외로", "힘들"]):
            return "sad"
        if any(kw in text_lower for kw in ["화나", "짜증", "답답"]):
            return "angry"
        if any(kw in text_lower for kw in ["걱정", "불안", "무서"]):
            return "anxious"
        if any(kw in text_lower for kw in ["기뻐", "좋아", "행복", "감사"]):
            return "happy"

        return "neutral"

    def _is_health_related(self, text: str) -> bool:
        """Check if text mentions health-related topics."""
        health_keywords = [
            "아파", "아프", "아픔", "통증", "병원", "약", "치료",
            "어지러", "두통", "열", "기침", "설사", "변비",
            "잠", "못 자", "피곤", "힘들", "우울",
        ]
        return any(kw in text.lower() for kw in health_keywords)

    def _wants_to_end_call(self, text: str) -> bool:
        """Check if user wants to end the call."""
        end_keywords = [
            "끊을게", "끊어야", "끊자", "끊을래",
            "이만", "그만", "다음에", "나중에",
            "안녕히", "수고", "고마워요",
        ]
        return any(kw in text.lower() for kw in end_keywords)

    def _is_emergency(self, text: str) -> bool:
        """Check for emergency situations."""
        emergency_keywords = [
            "쓰러", "의식", "못 움직", "숨", "가슴이 아",
            "119", "응급", "죽", "자해", "자살",
        ]
        return any(kw in text.lower() for kw in emergency_keywords)
