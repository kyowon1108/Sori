#!/usr/bin/env python3
import os
import re
import sys
from typing import Dict, List, Tuple

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
AGENTS_DIR = os.path.join(ROOT, ".claude", "agents")
SKILLS_DIR = os.path.join(ROOT, ".claude", "skills")

MODEL_ALIASES = {"sonnet", "opus", "haiku", "inherit"}

AGENT_NAME_RE = re.compile(r"^[a-z-]+$")
SKILL_NAME_RE = re.compile(r"^[a-z0-9-]+$")

RESERVED_WORDS = {"anthropic", "claude"}

IMPERATIVE_STARTS = {
    "use",
    "manage",
    "handle",
    "maintain",
    "own",
    "enforce",
    "create",
    "update",
    "review",
    "keep",
    "run",
    "build",
}


def read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8") as handle:
        return handle.read()


def parse_frontmatter(text: str) -> Tuple[Dict[str, str], List[str]]:
    lines = text.splitlines()
    errors: List[str] = []
    if not lines or lines[0].strip() != "---":
        return {}, ["Frontmatter must start with '---' on line 1"]

    end_index = None
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            end_index = idx
            break

    if end_index is None:
        return {}, ["Frontmatter must have a closing '---' before body"]

    fm_lines = lines[1:end_index]
    fm: Dict[str, str] = {}
    for raw in fm_lines:
        stripped = raw.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("-"):
            errors.append("YAML list syntax detected; use comma-separated values")
            continue
        if ":" not in raw:
            errors.append(f"Invalid frontmatter line: {raw}")
            continue
        key, value = raw.split(":", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            errors.append("Frontmatter contains an empty key")
            continue
        if key in fm:
            errors.append(f"Duplicate frontmatter key: {key}")
        fm[key] = value

    return fm, errors


def validate_comma_list(value: str, field: str) -> List[str]:
    errors: List[str] = []
    if not value:
        errors.append(f"{field} must not be empty")
        return errors
    if value.startswith("[") or value.endswith("]"):
        errors.append(f"{field} must be comma-separated, not a YAML list")
    return errors


def validate_agent(path: str) -> List[str]:
    errors: List[str] = []
    fm, fm_errors = parse_frontmatter(read_text(path))
    errors.extend(fm_errors)
    if fm_errors:
        return errors

    name = fm.get("name", "")
    description = fm.get("description", "")
    if not name:
        errors.append("Missing required field: name")
    elif not AGENT_NAME_RE.match(name):
        errors.append("name must be lowercase letters and hyphens only")

    if not description:
        errors.append("Missing required field: description")

    tools = fm.get("tools")
    if tools is not None:
        errors.extend(validate_comma_list(tools, "tools"))

    model = fm.get("model")
    if model is not None:
        model_value = model.strip().lower()
        if model_value not in MODEL_ALIASES:
            errors.append("model must be one of: sonnet, opus, haiku, inherit")

    permission_mode = fm.get("permissionMode")
    if permission_mode is not None:
        errors.extend(validate_comma_list(permission_mode, "permissionMode"))

    skills = fm.get("skills")
    if skills is not None:
        errors.extend(validate_comma_list(skills, "skills"))

    return errors


def validate_skill(path: str) -> List[str]:
    errors: List[str] = []
    fm, fm_errors = parse_frontmatter(read_text(path))
    errors.extend(fm_errors)
    if fm_errors:
        return errors

    name = fm.get("name", "")
    description = fm.get("description", "")

    if not name:
        errors.append("Missing required field: name")
    else:
        if len(name) > 64:
            errors.append("name must be <= 64 characters")
        if not SKILL_NAME_RE.match(name):
            errors.append("name must be lowercase letters, numbers, and hyphens only")
        lower_name = name.lower()
        for reserved in RESERVED_WORDS:
            if reserved in lower_name:
                errors.append("name must not include reserved words: anthropic, claude")
                break

    if not description:
        errors.append("Missing required field: description")
    else:
        if len(description) > 1024:
            errors.append("description must be <= 1024 characters")
        first_word_match = re.match(r"([A-Za-z]+)", description.strip())
        if first_word_match:
            first_word = first_word_match.group(1).lower()
            if first_word in IMPERATIVE_STARTS:
                errors.append("description should be in third person (avoid imperative starts)")

    allowed_tools = fm.get("allowed-tools")
    if allowed_tools is not None:
        errors.extend(validate_comma_list(allowed_tools, "allowed-tools"))

    skill_dir = os.path.basename(os.path.dirname(path))
    if name and skill_dir != name:
        errors.append("Skill directory name must match frontmatter name")

    return errors


def iter_agent_files() -> List[str]:
    if not os.path.isdir(AGENTS_DIR):
        return []
    return sorted(
        os.path.join(AGENTS_DIR, entry)
        for entry in os.listdir(AGENTS_DIR)
        if entry.endswith(".md")
    )


def iter_skill_files() -> List[str]:
    results: List[str] = []
    if not os.path.isdir(SKILLS_DIR):
        return results
    for root, _, files in os.walk(SKILLS_DIR):
        for filename in files:
            if filename == "SKILL.md":
                results.append(os.path.join(root, filename))
    return sorted(results)


def relpath(path: str) -> str:
    return os.path.relpath(path, ROOT)


def main() -> int:
    agent_files = iter_agent_files()
    skill_files = iter_skill_files()

    failures = 0

    for path in agent_files:
        errors = validate_agent(path)
        if errors:
            failures += 1
            print(f"FAIL: {relpath(path)}")
            for reason in errors:
                print(f"  - {reason}")
        else:
            print(f"PASS: {relpath(path)}")

    for path in skill_files:
        errors = validate_skill(path)
        if errors:
            failures += 1
            print(f"FAIL: {relpath(path)}")
            for reason in errors:
                print(f"  - {reason}")
        else:
            print(f"PASS: {relpath(path)}")

    if not agent_files:
        print("WARN: No subagent files found under .claude/agents")

    if not skill_files:
        print("WARN: No skill files found under .claude/skills")

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
