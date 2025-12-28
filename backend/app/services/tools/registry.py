"""
Tool Registry System for SORI Agent.

Provides tool registration, lookup, and execution management.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Union
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class ToolExecutionError(Exception):
    """Tool execution failed."""
    def __init__(self, tool_name: str, message: str, original_error: Exception = None):
        self.tool_name = tool_name
        self.message = message
        self.original_error = original_error
        super().__init__(f"Tool '{tool_name}' failed: {message}")


class ToolValidationError(Exception):
    """Tool input validation failed."""
    pass


@dataclass
class ToolResult:
    """Result of tool execution."""
    tool_name: str
    success: bool
    result: Any = None
    error: Optional[str] = None
    execution_time_ms: float = 0.0
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tool_name": self.tool_name,
            "success": self.success,
            "result": self.result,
            "error": self.error,
            "execution_time_ms": self.execution_time_ms,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class Tool:
    """
    Tool definition for AI Agent (supports OpenAI and Claude).

    Attributes:
        name: Unique tool identifier
        description: Human-readable description for the AI
        input_schema: JSON Schema for tool input validation
        execute_func: Async or sync function to execute
        category: Tool category for organization
        tags: Tags for filtering and discovery
        requires_confirmation: Whether to ask user before executing
    """
    name: str
    description: str
    input_schema: Dict[str, Any]
    execute_func: Callable
    category: str = "general"
    tags: List[str] = field(default_factory=list)
    requires_confirmation: bool = False
    timeout_seconds: float = 30.0

    def to_openai_format(self) -> Dict[str, Any]:
        """Convert to OpenAI Function Calling format."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": self.input_schema.get("properties", {}),
                    "required": self.input_schema.get("required", []),
                },
            },
        }

    def to_claude_format(self) -> Dict[str, Any]:
        """Convert to Claude API tool format (for backward compatibility)."""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
        }

    async def execute(self, **kwargs) -> ToolResult:
        """
        Execute the tool with given parameters.

        Returns:
            ToolResult with success/failure status and result data
        """
        start_time = datetime.now(timezone.utc)

        try:
            # Validate input against schema (basic validation)
            self._validate_input(kwargs)

            # Execute with timeout
            if asyncio.iscoroutinefunction(self.execute_func):
                result = await asyncio.wait_for(
                    self.execute_func(**kwargs),
                    timeout=self.timeout_seconds
                )
            else:
                # Run sync function in executor
                loop = asyncio.get_event_loop()
                result = await asyncio.wait_for(
                    loop.run_in_executor(None, lambda: self.execute_func(**kwargs)),
                    timeout=self.timeout_seconds
                )

            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000

            logger.info(f"Tool '{self.name}' executed successfully in {execution_time:.2f}ms")

            return ToolResult(
                tool_name=self.name,
                success=True,
                result=result,
                execution_time_ms=execution_time,
            )

        except asyncio.TimeoutError:
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
            error_msg = f"Execution timed out after {self.timeout_seconds}s"
            logger.error(f"Tool '{self.name}' timeout: {error_msg}")

            return ToolResult(
                tool_name=self.name,
                success=False,
                error=error_msg,
                execution_time_ms=execution_time,
            )

        except Exception as e:
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
            error_msg = str(e)
            logger.error(f"Tool '{self.name}' error: {error_msg}")

            return ToolResult(
                tool_name=self.name,
                success=False,
                error=error_msg,
                execution_time_ms=execution_time,
            )

    def _validate_input(self, kwargs: Dict[str, Any]) -> None:
        """Basic input validation against schema."""
        required = self.input_schema.get("required", [])
        properties = self.input_schema.get("properties", {})

        for req_field in required:
            if req_field not in kwargs:
                raise ToolValidationError(f"Missing required field: {req_field}")

        # Type validation
        for field_name, value in kwargs.items():
            if field_name in properties:
                expected_type = properties[field_name].get("type")
                if expected_type and not self._check_type(value, expected_type):
                    raise ToolValidationError(
                        f"Field '{field_name}' expected type '{expected_type}', got '{type(value).__name__}'"
                    )

    def _check_type(self, value: Any, expected_type: str) -> bool:
        """Check if value matches expected JSON Schema type."""
        type_map = {
            "string": str,
            "integer": int,
            "number": (int, float),
            "boolean": bool,
            "array": list,
            "object": dict,
        }
        expected = type_map.get(expected_type)
        if expected is None:
            return True  # Unknown type, allow
        return isinstance(value, expected)


class ToolRegistry:
    """
    Central registry for all tools available to the agent.

    Features:
    - Tool registration and lookup
    - Category-based organization
    - Tag-based filtering
    - Claude API format export
    """

    def __init__(self):
        self._tools: Dict[str, Tool] = {}
        self._categories: Dict[str, List[str]] = {}
        self._tags: Dict[str, List[str]] = {}

    def register(self, tool: Tool) -> None:
        """Register a new tool."""
        if tool.name in self._tools:
            logger.warning(f"Tool '{tool.name}' already registered, overwriting")

        self._tools[tool.name] = tool

        # Update category index
        if tool.category not in self._categories:
            self._categories[tool.category] = []
        if tool.name not in self._categories[tool.category]:
            self._categories[tool.category].append(tool.name)

        # Update tags index
        for tag in tool.tags:
            if tag not in self._tags:
                self._tags[tag] = []
            if tool.name not in self._tags[tag]:
                self._tags[tag].append(tool.name)

        logger.info(f"Tool registered: {tool.name} (category: {tool.category})")

    def unregister(self, name: str) -> bool:
        """Remove a tool from registry."""
        if name not in self._tools:
            return False

        tool = self._tools.pop(name)

        # Clean up indexes
        if tool.category in self._categories:
            self._categories[tool.category] = [
                t for t in self._categories[tool.category] if t != name
            ]

        for tag in tool.tags:
            if tag in self._tags:
                self._tags[tag] = [t for t in self._tags[tag] if t != name]

        logger.info(f"Tool unregistered: {name}")
        return True

    def get(self, name: str) -> Optional[Tool]:
        """Get tool by name."""
        return self._tools.get(name)

    def get_all(self) -> List[Tool]:
        """Get all registered tools."""
        return list(self._tools.values())

    def get_by_category(self, category: str) -> List[Tool]:
        """Get tools by category."""
        tool_names = self._categories.get(category, [])
        return [self._tools[name] for name in tool_names if name in self._tools]

    def get_by_tags(self, tags: List[str], match_all: bool = False) -> List[Tool]:
        """Get tools matching tags."""
        if match_all:
            # All tags must match
            matching_names = set(self._tools.keys())
            for tag in tags:
                tag_tools = set(self._tags.get(tag, []))
                matching_names &= tag_tools
        else:
            # Any tag matches
            matching_names = set()
            for tag in tags:
                matching_names.update(self._tags.get(tag, []))

        return [self._tools[name] for name in matching_names if name in self._tools]

    def to_claude_format(self, tool_names: List[str] = None) -> List[Dict[str, Any]]:
        """
        Export tools in Claude API format.

        Args:
            tool_names: Optional list of specific tools to export.
                       If None, exports all tools.
        """
        if tool_names is None:
            tools = self._tools.values()
        else:
            tools = [self._tools[name] for name in tool_names if name in self._tools]

        return [tool.to_claude_format() for tool in tools]

    async def execute(self, name: str, **kwargs) -> ToolResult:
        """Execute a tool by name."""
        tool = self.get(name)
        if tool is None:
            return ToolResult(
                tool_name=name,
                success=False,
                error=f"Tool '{name}' not found",
            )

        return await tool.execute(**kwargs)

    def get_categories(self) -> List[str]:
        """Get all registered categories."""
        return list(self._categories.keys())

    def get_tags(self) -> List[str]:
        """Get all registered tags."""
        return list(self._tags.keys())

    def __len__(self) -> int:
        return len(self._tools)

    def __contains__(self, name: str) -> bool:
        return name in self._tools


# Global registry instance
_global_registry: Optional[ToolRegistry] = None


def get_registry() -> ToolRegistry:
    """Get or create the global tool registry."""
    global _global_registry
    if _global_registry is None:
        _global_registry = ToolRegistry()
    return _global_registry


def reset_registry() -> None:
    """Reset the global registry (for testing)."""
    global _global_registry
    _global_registry = None
