# README Update - December 28, 2024

## Summary

Updated the root README.md to reflect the current state of the SORI project, including the new multi-agent AI system and recent improvements.

## Key Additions

### 1. Multi-Agent AI Architecture Section

Added comprehensive documentation of the new AI system architecture:

**Core Components**:
- **OpenAI Agent Service** - GPT-4o based conversation engine with Perceive-Plan-Act-Reflect loop
  - Source: `backend/app/services/agents/openai_agent.py`
  - Features: Function calling, streaming, quality evaluation, auto-retry

- **Orchestrator Agent** - Parallel worker coordination
  - Source: `backend/app/services/agents/orchestrator.py`
  - Features: Intent analysis, priority management, tool recommendations

- **Specialized Workers** - Domain-specific analysis
  - Source: `backend/app/services/agents/workers/`
  - Types: HealthMonitorWorker, EmotionSupportWorker, ScheduleWorker

- **Evaluator Agent** - Response quality assessment
  - Source: `backend/app/services/agents/evaluator.py`
  - Metrics: Accuracy, empathy, relevance, safety

**Tool System**:
- Source: `backend/app/services/tools/`
- ToolRegistry with OpenAI Function Calling integration
- Built-in tools: get_elderly_info, get_schedule, detect_call_end

**Skill System**:
- Source: `backend/app/skills/`
- Modular skill architecture: health_monitoring, emotional_support, emergency, voice_commands

### 2. WebSocket V2 Documentation

Added documentation for the new WebSocket endpoint:
- Endpoint: `/ws/v2/{call_id}?token=...`
- Source: `backend/app/routes/websocket_v2.py`
- Features: Agent loop integration, heartbeat, message deduplication

**Message Types**:
- `message` - User message
- `stream_chunk` - AI response chunk (streaming)
- `stream_end` - Streaming complete
- `agent_phase` - Agent processing phase (perceive/plan/act/reflect)
- `tool_call` - Tool invocation info
- `ended` - Call ended
- `ping`/`pong` - Heartbeat

### 3. Updated Project Structure

Enhanced the project structure tree to include:
```
backend/app/
├── services/
│   ├── ai_service.py         # Legacy AI Service
│   ├── agents/               # Multi-Agent System
│   │   ├── openai_agent.py
│   │   ├── orchestrator.py
│   │   ├── evaluator.py
│   │   └── workers/
│   └── tools/                # OpenAI Function Tools
├── skills/                   # Skill Modules
│   ├── health_monitoring/
│   ├── emotional_support/
│   ├── emergency/
│   └── voice_commands/
└── routes/
    ├── websocket.py          # Legacy WebSocket
    └── websocket_v2.py       # Multi-Agent WebSocket
```

### 4. Recent Updates Section (2024-12-28)

**New Features**:
- Multi-Agent AI System with Perceive-Plan-Act-Reflect loop
- WebSocket V2 with improved connection management
- Tool System with OpenAI Function Calling
- Skill System with modular architecture
- Quality Evaluation with automatic retry

**Bug Fixes**:
- Race condition fixes in call access control
- Python 3.12+ datetime deprecation fixes
- Frontend API endpoint corrections
- TypeScript missing imports

**References**:
- `docs/changelog-2024-12-28.md` - Detailed changelog
- `docs/call-testing-guide.md` - Call testing guide

### 5. Enhanced Testing Section

Added test file documentation:
- `tests/test_agents.py` - Multi-Agent system tests
- `tests/test_tools.py` - Tool Registry tests
- `tests/test_orchestrator.py` - Orchestrator tests
- `tests/test_websocket_v2.py` - WebSocket V2 tests

### 6. Development Status Updates

**Completed Items**:
- [x] Multi-Agent AI System (GPT-4o)
- [x] Tool & Skill Architecture
- [x] AI call end detection
- [x] In-progress call access control

**Planned Items**:
- [ ] Advanced Tool System (database queries, external API integration)

## File References

All documentation includes explicit file path citations:
- `backend/app/services/agents/openai_agent.py` - OpenAI Agent Service
- `backend/app/services/agents/orchestrator.py` - Orchestrator Agent
- `backend/app/services/agents/evaluator.py` - Evaluator Agent
- `backend/app/services/agents/workers/` - Specialized Workers
- `backend/app/services/tools/` - Tool System
- `backend/app/skills/` - Skill Modules
- `backend/app/routes/websocket_v2.py` - WebSocket V2
- `backend/app/services/ai_service.py` - Legacy AI Service

## Changes Summary

| Section | Change Type | Description |
|---------|-------------|-------------|
| AI Analysis System | **New** | Multi-Agent AI Architecture documentation |
| WebSocket | **Enhanced** | Added WebSocket V2 documentation |
| Project Structure | **Enhanced** | Added agents, tools, skills directories |
| Recent Updates | **New** | 2024-12-28 changelog section |
| Testing | **Enhanced** | Added multi-agent test files |
| Development Status | **Updated** | Added completed multi-agent items |

## Validation

- Total lines: 452
- Language: Korean with English technical terms
- Format: Professional markdown
- All file paths: Cited with absolute paths
- Sections: Comprehensive and well-organized

---

**Generated**: 2024-12-28
**Author**: SORI Docs Agent
**Source Files Reviewed**: 15+
**Documentation Coverage**: Backend, Frontend, iOS, Infrastructure
