"""
Tests for Tool Registry and Tool Execution.

Tests tool registration, lookup, execution, and format conversion.
"""

import pytest
import asyncio
from datetime import datetime

from app.services.tools.registry import (
    Tool,
    ToolRegistry,
    ToolResult,
    ToolExecutionError,
    ToolValidationError,
    get_registry,
    reset_registry,
)


class TestToolResult:
    """Test ToolResult dataclass."""

    def test_successful_result(self):
        result = ToolResult(
            tool_name="test_tool",
            success=True,
            result={"data": "test"},
            execution_time_ms=50.0,
        )

        assert result.success is True
        assert result.tool_name == "test_tool"
        assert result.result == {"data": "test"}
        assert result.error is None

    def test_failed_result(self):
        result = ToolResult(
            tool_name="test_tool",
            success=False,
            error="Something went wrong",
            execution_time_ms=10.0,
        )

        assert result.success is False
        assert result.error == "Something went wrong"
        assert result.result is None

    def test_to_dict(self):
        result = ToolResult(
            tool_name="test_tool",
            success=True,
            result="test_value",
            execution_time_ms=25.0,
        )

        result_dict = result.to_dict()

        assert result_dict["tool_name"] == "test_tool"
        assert result_dict["success"] is True
        assert result_dict["result"] == "test_value"
        assert result_dict["execution_time_ms"] == 25.0
        assert "timestamp" in result_dict


class TestTool:
    """Test Tool dataclass and execution."""

    def test_tool_creation(self):
        def sample_func(message: str) -> str:
            return f"Echo: {message}"

        tool = Tool(
            name="echo",
            description="Echoes a message",
            input_schema={
                "type": "object",
                "properties": {
                    "message": {"type": "string"}
                },
                "required": ["message"]
            },
            execute_func=sample_func,
            category="utility",
            tags=["test", "echo"],
        )

        assert tool.name == "echo"
        assert tool.description == "Echoes a message"
        assert tool.category == "utility"
        assert "test" in tool.tags

    def test_to_openai_format(self):
        tool = Tool(
            name="get_weather",
            description="Gets weather information",
            input_schema={
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "City name"}
                },
                "required": ["location"]
            },
            execute_func=lambda **kwargs: "Sunny",
        )

        openai_format = tool.to_openai_format()

        assert openai_format["type"] == "function"
        assert openai_format["function"]["name"] == "get_weather"
        assert openai_format["function"]["description"] == "Gets weather information"
        assert "parameters" in openai_format["function"]
        assert "location" in openai_format["function"]["parameters"]["properties"]

    def test_to_claude_format(self):
        tool = Tool(
            name="calculate",
            description="Performs calculation",
            input_schema={
                "type": "object",
                "properties": {
                    "expression": {"type": "string"}
                },
                "required": ["expression"]
            },
            execute_func=lambda **kwargs: 42,
        )

        claude_format = tool.to_claude_format()

        assert claude_format["name"] == "calculate"
        assert claude_format["description"] == "Performs calculation"
        assert "input_schema" in claude_format

    @pytest.mark.asyncio
    async def test_execute_sync_function(self):
        def sync_tool(value: int) -> int:
            return value * 2

        tool = Tool(
            name="double",
            description="Doubles a number",
            input_schema={
                "type": "object",
                "properties": {"value": {"type": "integer"}},
                "required": ["value"]
            },
            execute_func=sync_tool,
        )

        result = await tool.execute(value=5)

        assert result.success is True
        assert result.result == 10
        assert result.execution_time_ms >= 0

    @pytest.mark.asyncio
    async def test_execute_async_function(self):
        async def async_tool(name: str) -> str:
            await asyncio.sleep(0.01)
            return f"Hello, {name}"

        tool = Tool(
            name="greet",
            description="Greets a person",
            input_schema={
                "type": "object",
                "properties": {"name": {"type": "string"}},
                "required": ["name"]
            },
            execute_func=async_tool,
        )

        result = await tool.execute(name="김영희")

        assert result.success is True
        assert result.result == "Hello, 김영희"

    @pytest.mark.asyncio
    async def test_execute_with_missing_required_field(self):
        def sample_func(required_field: str) -> str:
            return required_field

        tool = Tool(
            name="test",
            description="Test tool",
            input_schema={
                "type": "object",
                "properties": {"required_field": {"type": "string"}},
                "required": ["required_field"]
            },
            execute_func=sample_func,
        )

        result = await tool.execute()  # Missing required_field

        assert result.success is False
        assert "required_field" in result.error

    @pytest.mark.asyncio
    async def test_execute_with_type_validation(self):
        def sample_func(count: int) -> int:
            return count

        tool = Tool(
            name="counter",
            description="Counts",
            input_schema={
                "type": "object",
                "properties": {"count": {"type": "integer"}},
                "required": ["count"]
            },
            execute_func=sample_func,
        )

        result = await tool.execute(count="not an integer")

        assert result.success is False
        assert "type" in result.error.lower()

    @pytest.mark.asyncio
    async def test_execute_with_timeout(self):
        async def slow_tool() -> str:
            await asyncio.sleep(10)  # Slow operation
            return "done"

        tool = Tool(
            name="slow",
            description="Slow tool",
            input_schema={"type": "object", "properties": {}},
            execute_func=slow_tool,
            timeout_seconds=0.1,  # Very short timeout
        )

        result = await tool.execute()

        assert result.success is False
        assert "timed out" in result.error.lower()

    @pytest.mark.asyncio
    async def test_execute_with_exception(self):
        def error_tool() -> str:
            raise ValueError("Something went wrong")

        tool = Tool(
            name="error",
            description="Error tool",
            input_schema={"type": "object", "properties": {}},
            execute_func=error_tool,
        )

        result = await tool.execute()

        assert result.success is False
        assert "Something went wrong" in result.error


class TestToolRegistry:
    """Test ToolRegistry for tool management."""

    @pytest.fixture
    def registry(self):
        """Create a fresh registry for each test."""
        return ToolRegistry()

    @pytest.fixture
    def sample_tool(self):
        """Create a sample tool for testing."""
        return Tool(
            name="sample",
            description="Sample tool",
            input_schema={
                "type": "object",
                "properties": {"param": {"type": "string"}},
            },
            execute_func=lambda **kwargs: "result",
            category="utility",
            tags=["test", "sample"],
        )

    def test_register_tool(self, registry, sample_tool):
        registry.register(sample_tool)

        assert "sample" in registry
        assert len(registry) == 1

    def test_register_overwrites_existing(self, registry, sample_tool):
        registry.register(sample_tool)

        # Register with same name but different description
        new_tool = Tool(
            name="sample",
            description="New description",
            input_schema=sample_tool.input_schema,
            execute_func=sample_tool.execute_func,
        )
        registry.register(new_tool)

        assert len(registry) == 1
        assert registry.get("sample").description == "New description"

    def test_unregister_tool(self, registry, sample_tool):
        registry.register(sample_tool)

        result = registry.unregister("sample")

        assert result is True
        assert "sample" not in registry
        assert len(registry) == 0

    def test_unregister_nonexistent(self, registry):
        result = registry.unregister("nonexistent")

        assert result is False

    def test_get_tool(self, registry, sample_tool):
        registry.register(sample_tool)

        tool = registry.get("sample")

        assert tool is not None
        assert tool.name == "sample"

    def test_get_nonexistent(self, registry):
        tool = registry.get("nonexistent")

        assert tool is None

    def test_get_all_tools(self, registry):
        tool1 = Tool(
            name="tool1",
            description="Tool 1",
            input_schema={},
            execute_func=lambda **kwargs: None,
        )
        tool2 = Tool(
            name="tool2",
            description="Tool 2",
            input_schema={},
            execute_func=lambda **kwargs: None,
        )

        registry.register(tool1)
        registry.register(tool2)

        all_tools = registry.get_all()

        assert len(all_tools) == 2
        assert any(t.name == "tool1" for t in all_tools)
        assert any(t.name == "tool2" for t in all_tools)

    def test_get_by_category(self, registry):
        tool1 = Tool(
            name="health_check",
            description="Health check",
            input_schema={},
            execute_func=lambda **kwargs: None,
            category="health",
        )
        tool2 = Tool(
            name="schedule_check",
            description="Schedule check",
            input_schema={},
            execute_func=lambda **kwargs: None,
            category="schedule",
        )

        registry.register(tool1)
        registry.register(tool2)

        health_tools = registry.get_by_category("health")
        schedule_tools = registry.get_by_category("schedule")

        assert len(health_tools) == 1
        assert health_tools[0].name == "health_check"
        assert len(schedule_tools) == 1
        assert schedule_tools[0].name == "schedule_check"

    def test_get_by_tags(self, registry):
        tool1 = Tool(
            name="tool1",
            description="Tool 1",
            input_schema={},
            execute_func=lambda **kwargs: None,
            tags=["urgent", "health"],
        )
        tool2 = Tool(
            name="tool2",
            description="Tool 2",
            input_schema={},
            execute_func=lambda **kwargs: None,
            tags=["health", "schedule"],
        )

        registry.register(tool1)
        registry.register(tool2)

        # Any tag match
        health_tools = registry.get_by_tags(["health"])
        assert len(health_tools) == 2

        # All tags must match
        urgent_health = registry.get_by_tags(["urgent", "health"], match_all=True)
        assert len(urgent_health) == 1
        assert urgent_health[0].name == "tool1"

    def test_to_claude_format(self, registry):
        tool1 = Tool(
            name="tool1",
            description="Tool 1",
            input_schema={"type": "object", "properties": {}},
            execute_func=lambda **kwargs: None,
        )
        tool2 = Tool(
            name="tool2",
            description="Tool 2",
            input_schema={"type": "object", "properties": {}},
            execute_func=lambda **kwargs: None,
        )

        registry.register(tool1)
        registry.register(tool2)

        claude_tools = registry.to_claude_format()

        assert len(claude_tools) == 2
        assert all("name" in t for t in claude_tools)
        assert all("input_schema" in t for t in claude_tools)

    def test_to_claude_format_specific_tools(self, registry):
        tool1 = Tool(
            name="tool1",
            description="Tool 1",
            input_schema={},
            execute_func=lambda **kwargs: None,
        )
        tool2 = Tool(
            name="tool2",
            description="Tool 2",
            input_schema={},
            execute_func=lambda **kwargs: None,
        )

        registry.register(tool1)
        registry.register(tool2)

        claude_tools = registry.to_claude_format(tool_names=["tool1"])

        assert len(claude_tools) == 1
        assert claude_tools[0]["name"] == "tool1"

    @pytest.mark.asyncio
    async def test_execute_tool(self, registry):
        async def async_tool(message: str) -> str:
            return f"Received: {message}"

        tool = Tool(
            name="receiver",
            description="Receives messages",
            input_schema={
                "type": "object",
                "properties": {"message": {"type": "string"}},
            },
            execute_func=async_tool,
        )

        registry.register(tool)

        result = await registry.execute("receiver", message="Hello")

        assert result.success is True
        assert result.result == "Received: Hello"

    @pytest.mark.asyncio
    async def test_execute_nonexistent_tool(self, registry):
        result = await registry.execute("nonexistent")

        assert result.success is False
        assert "not found" in result.error.lower()

    def test_get_categories(self, registry):
        tool1 = Tool(
            name="tool1",
            description="Tool 1",
            input_schema={},
            execute_func=lambda **kwargs: None,
            category="health",
        )
        tool2 = Tool(
            name="tool2",
            description="Tool 2",
            input_schema={},
            execute_func=lambda **kwargs: None,
            category="schedule",
        )

        registry.register(tool1)
        registry.register(tool2)

        categories = registry.get_categories()

        assert "health" in categories
        assert "schedule" in categories

    def test_get_tags(self, registry):
        tool = Tool(
            name="tool1",
            description="Tool 1",
            input_schema={},
            execute_func=lambda **kwargs: None,
            tags=["urgent", "health", "elderly"],
        )

        registry.register(tool)

        tags = registry.get_tags()

        assert "urgent" in tags
        assert "health" in tags
        assert "elderly" in tags


class TestGlobalRegistry:
    """Test global registry singleton."""

    def test_get_registry_singleton(self):
        reset_registry()

        registry1 = get_registry()
        registry2 = get_registry()

        assert registry1 is registry2

    def test_reset_registry(self):
        registry1 = get_registry()
        reset_registry()
        registry2 = get_registry()

        assert registry1 is not registry2
