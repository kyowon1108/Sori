# Backend Architecture Documentation

**Generated**: 2024-12-28  
**Source**: Code analysis of `backend/app/**`

## Overview

FastAPI-based backend for the SORI elderly care system with **multi-agent AI architecture** powered by OpenAI GPT-4o.

## Core Components

### Application Entry Point
**File**: `backend/app/main.py`

- FastAPI application with CORS middleware
- WebSocket support for real-time communication
- Route handlers for auth, calls, elderly, pairing

### Configuration
**File**: `backend/app/core/config.py`

Key settings:
- `OPENAI_API_KEY` - OpenAI GPT-4o API key
- `DATABASE_URL` - PostgreSQL connection
- `ACCESS_TOKEN_SECRET` - JWT signing
- `REDIS_URL` - Celery broker

### Security
**File**: `backend/app/core/security.py`

- JWT token generation/validation
- bcrypt password hashing
- OAuth2 bearer scheme

## API Routes

### Authentication
**File**: `backend/app/routes/auth.py`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/auth/me` | GET | Current user |

### Calls
**File**: `backend/app/routes/calls.py`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/calls` | GET | List calls |
| `/api/calls` | POST | Start call |
| `/api/calls/{id}/end` | PUT | End call |

### WebSocket V1 (Legacy)
**File**: `backend/app/routes/websocket.py`

Basic real-time communication:
- Heartbeat ping/pong
- Message deduplication (LRUSet)
- AI response streaming
- Call end detection (`[CALL_END]` marker)

### WebSocket V2 (Current)
**File**: `backend/app/routes/websocket_v2.py`

Enhanced WebSocket with multi-agent architecture:
- OpenAI Function Calling for tools
- Automatic call ending detection
- Health status monitoring
- Quality evaluation and retry
- Heartbeat and connection management

**Endpoint**: `/ws/v2/{call_id}`

## Multi-Agent AI Architecture

### Architecture Pattern: Perceive-Plan-Act-Reflect (PPAR)

```
User Input → Perceive → Plan → Act → Reflect → Response
                          ↓
                    [Orchestrator]
                          ↓
                [Specialized Workers]
                          ↓
              [Tool Registry & Skills]
```

### 1. OpenAI Agent Service
**File**: `backend/app/services/agents/openai_agent.py`

Main AI agent implementing the PPAR loop:

#### Phase 1: Perceive
- Analyzes user input
- Extracts intent, emotional tone, topics
- Detects health concerns and urgency
- **Source**: `perceive()` method (lines 304-338)

#### Phase 2: Plan
- Uses Orchestrator to coordinate specialized workers
- Determines response strategy
- Recommends tools to use
- Sets priority level (normal, elevated, urgent, emergency)
- **Source**: `plan()` method (lines 340-405)

#### Phase 3: Act
- Generates response using OpenAI GPT-4o streaming
- Executes function calls via Tool Registry
- Streams response chunks to client
- **Source**: `act()` method (lines 407-530)

#### Phase 4: Reflect
- Evaluates response quality using EvaluatorAgent
- Checks for safety, empathy, relevance
- Triggers retry if quality threshold not met
- **Source**: `reflect()` method (lines 532-599)

**Key Features**:
- Streaming responses for real-time experience
- Automatic retry with quality evaluation
- Context-aware conversation management
- Progressive skill disclosure (loads only relevant skills)

### 2. Orchestrator Agent
**File**: `backend/app/services/agents/orchestrator.py`

Coordinates multiple specialized worker agents for comprehensive analysis:

```
User Input → Orchestrator → [Workers in parallel] → Aggregated Results
```

**Workers**:
1. **HealthMonitorWorker** - Detects health concerns and symptoms
2. **EmotionSupportWorker** - Analyzes emotional state and provides support guidance
3. **ScheduleWorker** - Handles scheduling and follow-up requests

**Process**:
1. Selects relevant workers based on input
2. Runs workers in parallel (max 5.0s timeout)
3. Aggregates results by priority
4. Returns unified response plan with tool recommendations

**Source**: `orchestrate()` method (lines 134-184)

### 3. Worker Agents
**Directory**: `backend/app/services/agents/workers/`

#### Base Worker
**File**: `backend/app/services/agents/workers/base.py`

Abstract base class for all workers:
- `should_activate()` - Determines if worker is relevant
- `analyze()` - Performs analysis
- Returns `WorkerResult` with priority, tools, hints

#### Health Monitor Worker
**File**: `backend/app/services/agents/workers/health_worker.py`

Monitors health-related conversations:
- Detects symptoms and health concerns
- Assigns urgency levels (normal → emergency)
- Recommends `check_health_status` and `notify_caregiver` tools

#### Emotion Support Worker
**File**: `backend/app/services/agents/workers/emotion_worker.py`

Provides emotional support guidance:
- Analyzes emotional tone (sad, anxious, happy, etc.)
- Recommends empathetic response style
- Suggests appropriate conversation direction

#### Schedule Worker
**File**: `backend/app/services/agents/workers/schedule_worker.py`

Handles scheduling requests:
- Detects scheduling intent
- Recommends `schedule_followup` tool
- Extracts preferred time information

### 4. Evaluator Agent
**File**: `backend/app/services/agents/evaluator.py`

Quality assurance agent that evaluates generated responses:

**Evaluation Dimensions** (lines 31-38):
- **Relevance**: Response addresses user input
- **Accuracy**: Information is correct
- **Empathy**: Shows understanding and care
- **Completeness**: Nothing important missing
- **Safety**: No harmful content

**Scoring**:
- Each dimension scored 0.0 - 1.0
- Overall score is weighted average
- Threshold: 0.6 (configurable)

**Retry Logic**:
- If score < threshold, triggers retry
- Generates enhancement prompt for improvement
- Max retries: 2 (configurable)

**Source**: `evaluate()` method (lines 223-310)

### 5. Tool Registry
**File**: `backend/app/services/tools/registry.py`

Manages available tools for function calling:

**Features**:
- Tool registration and discovery
- Input validation using JSON schemas
- Execution with timeout protection
- Error handling and logging

**Core Methods**:
- `register(tool)` - Register new tool
- `execute(name, **kwargs)` - Execute tool by name
- `get_tool(name)` - Retrieve tool definition

**Source**: Lines 135-341

### 6. Base Tools
**File**: `backend/app/services/tools/base_tools.py`

Core tools for elderly care conversations:

| Tool | Purpose | Function |
|------|---------|----------|
| `end_call` | End conversation gracefully | `execute_end_call()` |
| `get_elderly_info` | Retrieve elderly profile | `execute_get_elderly_info()` |
| `check_health_status` | Log health concerns | `execute_check_health_status()` |
| `schedule_followup` | Schedule next call | `execute_schedule_followup()` |
| `notify_caregiver` | Alert caregiver | `execute_notify_caregiver()` |

**Source**: Lines 21-414

### 7. Skill Loader
**File**: `backend/app/skills/loader.py`

Loads domain-specific skills from markdown files:

**Skill Categories**:
- `emergency/` - Emergency situation handling
- `emotional_support/` - Emotional support techniques
- `health_monitoring/` - Health monitoring protocols
- `voice_commands/` - Voice command handling

**Features**:
- Progressive disclosure (loads only relevant skills)
- Intent-based matching with scoring
- Markdown-based skill definitions
- Hot-reloading capability

**Source**: Lines 131-444

## AI Service (Deprecated)

**File**: `backend/app/services/ai_service.py` (Still in use for analysis tasks)

- OpenAI GPT-4 for call analysis
- Streaming chat responses
- Elderly-context personalization
- Call greeting generation

**Note**: Being migrated to multi-agent architecture.

## Background Tasks

**File**: `backend/app/tasks/analysis.py`

Celery tasks:
- `analyze_call` - Post-call AI analysis
- Sentiment detection
- Risk scoring

## Database Models

| Model | File | Description |
|-------|------|-------------|
| User | `models/user.py` | Caregiver accounts |
| Elderly | `models/elderly.py` | Elderly profiles |
| Call | `models/call.py` | Call records |
| Message | `models/message.py` | Chat messages |
| CallAnalysis | `models/call_analysis.py` | AI analysis results |
| PairingCode | `models/pairing_code.py` | Device pairing codes |
| ElderlyDevice | `models/elderly_device.py` | Registered devices |

## Data Flow

### Call Initialization
```
Client → POST /api/calls → Create Call → Return call_id
```

### WebSocket Conversation (V2)
```
Client → WS /ws/v2/{call_id} → Verify Auth → Accept Connection
                                          ↓
                                  Send Greeting (if new)
                                          ↓
User Message → Perceive → Plan (Orchestrator + Workers)
                          ↓
                 Act (OpenAI + Tools) → Stream Response
                          ↓
                 Reflect (Evaluator) → Retry if needed
                          ↓
              Save to DB → Return to Client
```

### Call End Flow
```
[CALL_END] detected → Update Call status → Trigger analysis task
                                        ↓
                              Celery → analyze_call → Save CallAnalysis
```

## Key Technologies

- **Framework**: FastAPI 0.100+
- **AI**: OpenAI GPT-4o (gpt-4o model)
- **Database**: PostgreSQL + SQLAlchemy
- **Task Queue**: Celery + Redis
- **WebSocket**: FastAPI WebSocket support
- **Auth**: JWT with bcrypt

## Performance Considerations

### Token Management
- Conversation history limited to 50 messages
- Skill instructions capped at 500 chars per skill
- Max 2 skills loaded per turn (progressive disclosure)

### Parallel Processing
- Workers run in parallel with 5.0s timeout
- Max 5 workers per orchestration
- Orchestrator uses `asyncio.gather()` for concurrency

### Quality Assurance
- EvaluatorAgent runs after each response
- Max 2 retries with exponential backoff
- Quality threshold: 0.6 (60%)

## Recent Changes (2024-12-28)

1. **Datetime Migration**: Migrated from `datetime.utcnow()` to `datetime.now(timezone.utc)` for Python 3.12+ compatibility
   - `backend/app/routes/websocket.py`
   - `backend/app/services/tools/registry.py`
   - `backend/app/services/agents/workers/base.py`
   - `backend/app/services/agents/openai_agent.py`

2. **Multi-Agent Architecture**: Introduced PPAR loop with Orchestrator and Workers

3. **WebSocket V2**: Enhanced endpoint with OpenAI Function Calling

---
**Note**: All paths relative to project root
