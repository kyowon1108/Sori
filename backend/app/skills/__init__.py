"""
Skills System for SORI Agent.

Skills are markdown-based instruction files that provide
context-specific prompts and behaviors for the agent.

Features:
- Progressive disclosure (metadata first, then full content)
- Category-based organization
- Intent-based skill matching
- Dynamic skill loading
"""

from .loader import SkillLoader, Skill, get_skill_loader

__all__ = [
    "SkillLoader",
    "Skill",
    "get_skill_loader",
]
