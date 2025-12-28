"""
Skill Loader and Management System.

This module provides:
- Loading skills from markdown files
- Skill metadata extraction
- Intent-based skill matching
- Progressive disclosure for context efficiency
"""

import os
import re
import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
import json

logger = logging.getLogger(__name__)


@dataclass
class Skill:
    """
    Represents a single skill definition.

    Skills are loaded from markdown files with the following structure:
    - Metadata section (title, category, tags, triggers)
    - Instructions section (detailed prompts for the agent)
    - Examples section (example interactions)
    - Edge cases section (error handling guidance)
    """
    name: str
    category: str
    description: str
    tags: List[str] = field(default_factory=list)
    triggers: List[str] = field(default_factory=list)
    required_tools: List[str] = field(default_factory=list)
    instructions: str = ""
    examples: List[Dict[str, str]] = field(default_factory=list)
    edge_cases: List[Dict[str, str]] = field(default_factory=list)
    priority: int = 0
    enabled: bool = True

    def get_metadata(self) -> Dict[str, any]:
        """
        Get skill metadata for progressive disclosure.
        Returns minimal information (~100 tokens) for initial context.
        """
        return {
            "name": self.name,
            "category": self.category,
            "description": self.description[:100] + "..." if len(self.description) > 100 else self.description,
            "tags": self.tags,
            "triggers": self.triggers[:3],  # Limit to 3 example triggers
            "priority": self.priority,
        }

    def get_full_prompt(self) -> str:
        """
        Get full skill prompt for agent use.
        """
        prompt = f"## {self.name} Skill\n\n"
        prompt += f"**Description**: {self.description}\n\n"

        if self.required_tools:
            prompt += f"**Required Tools**: {', '.join(self.required_tools)}\n\n"

        prompt += f"### Instructions\n{self.instructions}\n\n"

        if self.examples:
            prompt += "### Examples\n"
            for ex in self.examples:
                prompt += f"- **User**: {ex.get('user', '')}\n"
                prompt += f"  **Response**: {ex.get('response', '')}\n\n"

        if self.edge_cases:
            prompt += "### Edge Cases\n"
            for ec in self.edge_cases:
                prompt += f"- **Scenario**: {ec.get('scenario', '')}\n"
                prompt += f"  **Handling**: {ec.get('handling', '')}\n\n"

        return prompt

    def matches_intent(self, user_input: str) -> bool:
        """Check if skill matches user intent based on triggers and tags."""
        input_lower = user_input.lower()

        # Check triggers
        for trigger in self.triggers:
            if trigger.lower() in input_lower:
                return True

        # Check tags
        for tag in self.tags:
            if tag.lower() in input_lower:
                return True

        return False

    def get_match_score(self, user_input: str) -> float:
        """Calculate match score for ranking skills."""
        input_lower = user_input.lower()
        score = 0.0

        # Trigger matches (weighted heavily)
        for trigger in self.triggers:
            if trigger.lower() in input_lower:
                score += 0.5

        # Tag matches
        for tag in self.tags:
            if tag.lower() in input_lower:
                score += 0.2

        # Category bonus for specific categories
        category_weights = {
            "emergency": 0.3,
            "health_monitoring": 0.2,
            "emotional_support": 0.15,
            "voice_commands": 0.1,
        }
        score += category_weights.get(self.category, 0)

        # Priority bonus
        score += self.priority * 0.1

        return min(1.0, score)


class SkillLoader:
    """
    Loads and manages skills from markdown files.

    Skills are organized in directories by category:
    skills/
    ├── voice_commands/
    │   ├── greeting.md
    │   └── farewell.md
    ├── health_monitoring/
    │   ├── symptoms.md
    │   └── medication.md
    └── ...
    """

    def __init__(self, skills_dir: str = None):
        """
        Initialize skill loader.

        Args:
            skills_dir: Path to skills directory. Defaults to app/skills/
        """
        if skills_dir is None:
            skills_dir = Path(__file__).parent
        else:
            skills_dir = Path(skills_dir)

        self.skills_dir = skills_dir
        self.skills: Dict[str, Skill] = {}
        self.skills_by_category: Dict[str, List[str]] = {}
        self.skills_by_tag: Dict[str, List[str]] = {}

        self._load_all_skills()

    def _load_all_skills(self) -> None:
        """Load all skills from the skills directory."""
        logger.info(f"Loading skills from {self.skills_dir}")

        # Iterate through category directories
        for category_dir in self.skills_dir.iterdir():
            if not category_dir.is_dir():
                continue

            if category_dir.name.startswith("_") or category_dir.name.startswith("."):
                continue

            category = category_dir.name

            # Load skill files in this category
            for skill_file in category_dir.glob("*.md"):
                try:
                    skill = self._load_skill_file(skill_file, category)
                    if skill and skill.enabled:
                        self._register_skill(skill)
                except Exception as e:
                    logger.error(f"Failed to load skill {skill_file}: {e}")

        logger.info(f"Loaded {len(self.skills)} skills")

    def _load_skill_file(self, file_path: Path, category: str) -> Optional[Skill]:
        """
        Load a single skill from a markdown file.

        Expected format:
        ```markdown
        # Skill Name

        ## Metadata
        - **Category**: category_name
        - **Tags**: [tag1, tag2]
        - **Triggers**: ["trigger1", "trigger2"]
        - **Required Tools**: [tool1, tool2]
        - **Priority**: 1

        ## Description
        Brief description of the skill.

        ## Instructions
        Detailed instructions for the agent.

        ## Examples
        - User: "example input"
          Response: "example response"

        ## Edge Cases
        - Scenario: "edge case description"
          Handling: "how to handle"
        ```
        """
        content = file_path.read_text(encoding="utf-8")

        # Extract skill name from title
        name_match = re.search(r'^#\s+(.+?)(?:\n|$)', content, re.MULTILINE)
        name = name_match.group(1).strip() if name_match else file_path.stem

        # Parse sections
        sections = self._parse_sections(content)

        # Extract metadata
        metadata = self._parse_metadata(sections.get("Metadata", ""))

        # Build skill object
        skill = Skill(
            name=name,
            category=metadata.get("category", category),
            description=sections.get("Description", "").strip(),
            tags=metadata.get("tags", []),
            triggers=metadata.get("triggers", []),
            required_tools=metadata.get("required_tools", []),
            instructions=sections.get("Instructions", "").strip(),
            examples=self._parse_examples(sections.get("Examples", "")),
            edge_cases=self._parse_edge_cases(sections.get("Edge Cases", "")),
            priority=metadata.get("priority", 0),
            enabled=metadata.get("enabled", True),
        )

        logger.debug(f"Loaded skill: {skill.name} (category: {skill.category})")
        return skill

    def _parse_sections(self, content: str) -> Dict[str, str]:
        """Parse markdown content into sections by ## headers."""
        sections = {}
        current_section = None
        current_content = []

        for line in content.split("\n"):
            if line.startswith("## "):
                if current_section:
                    sections[current_section] = "\n".join(current_content)
                current_section = line[3:].strip()
                current_content = []
            elif current_section:
                current_content.append(line)

        if current_section:
            sections[current_section] = "\n".join(current_content)

        return sections

    def _parse_metadata(self, metadata_text: str) -> Dict[str, any]:
        """Parse metadata section into a dictionary."""
        metadata = {}

        for line in metadata_text.split("\n"):
            line = line.strip()
            if not line.startswith("- **"):
                continue

            # Parse "- **Key**: value" format
            match = re.match(r'-\s*\*\*(.+?)\*\*:\s*(.+)', line)
            if not match:
                continue

            key = match.group(1).lower().replace(" ", "_")
            value = match.group(2).strip()

            # Parse lists (JSON format)
            if value.startswith("[") and value.endswith("]"):
                try:
                    metadata[key] = json.loads(value)
                except json.JSONDecodeError:
                    # Try parsing as comma-separated
                    metadata[key] = [v.strip().strip('"\'') for v in value[1:-1].split(",")]
            # Parse booleans
            elif value.lower() in ("true", "false"):
                metadata[key] = value.lower() == "true"
            # Parse integers
            elif value.isdigit():
                metadata[key] = int(value)
            else:
                metadata[key] = value

        return metadata

    def _parse_examples(self, examples_text: str) -> List[Dict[str, str]]:
        """Parse examples section into a list of examples."""
        examples = []
        current_example = {}

        for line in examples_text.split("\n"):
            line = line.strip()
            if line.startswith("- User:"):
                if current_example:
                    examples.append(current_example)
                current_example = {"user": line[7:].strip().strip('"')}
            elif line.startswith("Response:"):
                current_example["response"] = line[9:].strip().strip('"')

        if current_example:
            examples.append(current_example)

        return examples

    def _parse_edge_cases(self, edge_cases_text: str) -> List[Dict[str, str]]:
        """Parse edge cases section."""
        edge_cases = []
        current_case = {}

        for line in edge_cases_text.split("\n"):
            line = line.strip()
            if line.startswith("- Scenario:"):
                if current_case:
                    edge_cases.append(current_case)
                current_case = {"scenario": line[11:].strip().strip('"')}
            elif line.startswith("Handling:"):
                current_case["handling"] = line[9:].strip().strip('"')

        if current_case:
            edge_cases.append(current_case)

        return edge_cases

    def _register_skill(self, skill: Skill) -> None:
        """Register a skill in all indexes."""
        self.skills[skill.name] = skill

        # Category index
        if skill.category not in self.skills_by_category:
            self.skills_by_category[skill.category] = []
        self.skills_by_category[skill.category].append(skill.name)

        # Tag index
        for tag in skill.tags:
            if tag not in self.skills_by_tag:
                self.skills_by_tag[tag] = []
            self.skills_by_tag[tag].append(skill.name)

    def get_skill(self, name: str) -> Optional[Skill]:
        """Get a skill by name."""
        return self.skills.get(name)

    def get_all_skills(self) -> List[Skill]:
        """Get all loaded skills."""
        return list(self.skills.values())

    def get_skills_by_category(self, category: str) -> List[Skill]:
        """Get all skills in a category."""
        skill_names = self.skills_by_category.get(category, [])
        return [self.skills[name] for name in skill_names if name in self.skills]

    def get_skills_by_tag(self, tag: str) -> List[Skill]:
        """Get all skills with a specific tag."""
        skill_names = self.skills_by_tag.get(tag, [])
        return [self.skills[name] for name in skill_names if name in self.skills]

    def get_matching_skills(
        self,
        user_input: str,
        max_skills: int = 3,
        min_score: float = 0.1
    ) -> List[Skill]:
        """
        Get skills that match user input, sorted by relevance.

        Args:
            user_input: User's message
            max_skills: Maximum number of skills to return
            min_score: Minimum match score to include

        Returns:
            List of matching skills, sorted by match score
        """
        scored_skills = []

        for skill in self.skills.values():
            score = skill.get_match_score(user_input)
            if score >= min_score:
                scored_skills.append((score, skill))

        # Sort by score descending
        scored_skills.sort(key=lambda x: x[0], reverse=True)

        return [skill for _, skill in scored_skills[:max_skills]]

    def get_all_metadata(self) -> List[Dict[str, any]]:
        """
        Get metadata for all skills (for progressive disclosure).
        Returns minimal information for initial context loading.
        """
        return [skill.get_metadata() for skill in self.skills.values()]

    def get_categories(self) -> List[str]:
        """Get all available categories."""
        return list(self.skills_by_category.keys())

    def get_tags(self) -> Set[str]:
        """Get all available tags."""
        return set(self.skills_by_tag.keys())

    def reload(self) -> None:
        """Reload all skills from disk."""
        self.skills.clear()
        self.skills_by_category.clear()
        self.skills_by_tag.clear()
        self._load_all_skills()


# Global skill loader instance
_skill_loader: Optional[SkillLoader] = None


def get_skill_loader() -> SkillLoader:
    """Get or create the global skill loader."""
    global _skill_loader
    if _skill_loader is None:
        _skill_loader = SkillLoader()
    return _skill_loader


def reset_skill_loader() -> None:
    """Reset the global skill loader (for testing)."""
    global _skill_loader
    _skill_loader = None
