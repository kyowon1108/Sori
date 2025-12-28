# Backend Architecture Documentation

**Generated**: 2024-12-28
**Source**: Code analysis of `backend/app/**`

## Overview

FastAPI-based backend for the SORI elderly care system.

## Core Components

### Application Entry Point
**File**: `backend/app/main.py`

- FastAPI application with CORS middleware
- WebSocket support for real-time communication
- Route handlers for auth, calls, elderly, pairing

### Configuration
**File**: `backend/app/core/config.py`

Key settings:
- `OPENAI_API_KEY` - Primary AI service
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

### WebSocket
**File**: `backend/app/routes/websocket.py`

Real-time communication:
- Heartbeat ping/pong
- Message deduplication (LRUSet)
- AI response streaming
- Call end detection (`[CALL_END]` marker)

## AI Service

**File**: `backend/app/services/ai_service.py`

- OpenAI GPT-4 as primary
- Streaming chat responses
- Elderly-context personalization
- Call greeting generation

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

## Data Flow

```
Client → WebSocket → AI Service → Stream Response
                  ↓
            Save Message → DB
                  ↓
         Call End → Celery Task → Analysis → DB
```

---
**Note**: All paths relative to project root
