"""
Tool Registry and Management System for SORI Agent.

This module provides:
- Tool definition and registration
- Tool execution with error handling
- Claude API format conversion
"""

from .registry import Tool, ToolRegistry, get_registry
from .base_tools import (
    EndCallTool,
    GetElderlyInfoTool,
    CheckHealthStatusTool,
    ScheduleFollowUpTool,
    NotifyCaregiverTool,
    register_all_tools,
)

__all__ = [
    "Tool",
    "ToolRegistry",
    "get_registry",
    "EndCallTool",
    "GetElderlyInfoTool",
    "CheckHealthStatusTool",
    "ScheduleFollowUpTool",
    "NotifyCaregiverTool",
    "register_all_tools",
]
