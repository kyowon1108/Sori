# SORI Project Documentation

**Updated**: 2024-12-28

## Overview

SORI is an AI-powered elderly care system that provides regular check-in calls and health monitoring for elderly individuals living alone. The system uses a **multi-agent AI architecture** with OpenAI GPT-4o for intelligent conversations and comprehensive care.

## Documentation Structure

```
docs/
├── README.md                           # This file - Main documentation index
├── changelog-2024-12-28.md             # Latest changes and fixes
├── call-testing-guide.md               # Guide for testing call functionality
├── claude-agent-audit-2024-12-28.md    # Claude agent configuration audit
├── claude-configuration-summary.md     # Quick reference for Claude agents
├── backend/
│   └── architecture.md                 # Backend architecture & multi-agent AI system
├── frontend/
│   └── architecture.md                 # Frontend Next.js dashboard architecture
└── ios/
    └── README.md                       # iOS app documentation (Sori app)
```

## Quick Reference

### System Architecture

**Stack**:
- **Backend**: FastAPI + PostgreSQL + Redis + Celery
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **iOS**: SwiftUI (Sori app)
- **AI**: OpenAI GPT-4o with multi-agent architecture

**Key Components**:
1. **Caregiver Dashboard** (Next.js) - Web interface for caregivers
2. **Backend API** (FastAPI) - REST API + WebSocket for real-time communication
3. **AI Agent System** - Multi-agent PPAR (Perceive-Plan-Act-Reflect) loop
4. **iOS App** (Sori) - Elderly-facing voice call interface
5. **Background Workers** (Celery) - Async tasks for call analysis

### Recent Changes (2024-12-28)

See [changelog-2024-12-28.md](./changelog-2024-12-28.md) for detailed changes:

1. **Backend**: Fixed Python datetime deprecation warnings
2. **Frontend**: Fixed API endpoint mismatches and TypeScript imports
3. **iOS**: Updated deprecated AVAudioSession APIs for iOS 17+
4. **Multi-Agent AI**: Introduced Perceive-Plan-Act-Reflect architecture
5. **EC2**: Deployed all changes to production

## Architecture Highlights

### Multi-Agent AI System (NEW)

The backend now uses a sophisticated multi-agent architecture:

```
User Input → Perceive → Plan → Act → Reflect → Response
                         ↓
                   [Orchestrator]
                         ↓
              [Specialized Workers]
                         ↓
           [Tool Registry & Skills]
```

**Agents**:
- **OpenAI Agent** - Main conversation agent (GPT-4o)
- **Orchestrator** - Coordinates specialized workers
- **Health Monitor Worker** - Detects health concerns
- **Emotion Support Worker** - Provides emotional support
- **Schedule Worker** - Handles scheduling
- **Evaluator Agent** - Quality assurance

**See**: [backend/architecture.md](./backend/architecture.md) for full details

### Authentication System
- JWT-based authentication
- Password hashing with bcrypt
- Device access tokens for elderly devices
- **Source**: `backend/app/routes/auth.py`, `backend/app/core/security.py`

### Real-time Communication

**WebSocket V2** (Current):
- OpenAI Function Calling for tools
- Automatic quality evaluation
- Retry logic for better responses
- Agent phase tracking (Perceive/Plan/Act/Reflect)
- **Source**: `backend/app/routes/websocket_v2.py`

**WebSocket V1** (Legacy):
- Basic streaming with AI responses
- **Source**: `backend/app/routes/websocket.py`

### Call Analysis System
- Post-call AI analysis with Celery
- Sentiment detection
- Risk scoring
- Action item extraction
- **Source**: `backend/app/tasks/analysis.py`

### Frontend Dashboard
- Next.js 14 with App Router
- Zustand state management
- Real-time agent status display
- Call history and analysis viewer
- **Source**: `frontend/app/(main)/dashboard/page.tsx`

### iOS App (Sori)
- SwiftUI-based voice call interface
- Speech-to-text and text-to-speech
- Push notifications for scheduled calls
- Device pairing with dashboard
- **Source**: `iOS/Sori/`

## Key Features

### For Caregivers (Web Dashboard)
1. **Elderly Management** - Add, edit, manage elderly profiles
2. **Call Scheduling** - Schedule regular check-in calls
3. **Call History** - View all past conversations
4. **AI Analysis** - Automatic post-call health & emotion analysis
5. **Risk Alerts** - Get notified of urgent concerns
6. **Real-time Monitoring** - See live agent status during calls

### For Elderly (iOS App)
1. **Voice Calls** - Natural conversation with AI
2. **Health Check-ins** - Report health status
3. **Emotional Support** - Compassionate AI companion
4. **Emergency Detection** - Automatic alerts for urgent situations
5. **Easy Pairing** - Simple device setup with QR code

## API Documentation

### REST Endpoints

**Authentication**:
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT
- `GET /api/auth/me` - Get current user

**Calls**:
- `GET /api/calls` - List calls
- `POST /api/calls` - Start new call
- `GET /api/calls/:id` - Get call details
- `PUT /api/calls/:id/end` - End active call

**Elderly**:
- `GET /api/elderly` - List elderly
- `POST /api/elderly` - Add elderly
- `GET /api/elderly/:id` - Get elderly details
- `PUT /api/elderly/:id` - Update elderly
- `DELETE /api/elderly/:id` - Delete elderly

**Pairing**:
- `POST /api/pairing/generate` - Generate pairing code
- `POST /api/pairing/public/verify` - Verify and pair device

### WebSocket

**Endpoint**: `ws://host/ws/v2/{call_id}?token={jwt}`

**Message Types**:
- `ping` / `pong` - Heartbeat
- `message` - User message
- `stream_chunk` - AI response chunk
- `stream_end` - AI response complete
- `agent_phase` - Current agent phase (perceive/plan/act/reflect)
- `tool_call` - Tool execution started
- `tool_result` - Tool execution result
- `end_call` - End conversation

## AI Tools & Skills

### Tools (Function Calling)
**Source**: `backend/app/services/tools/base_tools.py`

- `end_call` - Gracefully end conversation
- `get_elderly_info` - Retrieve elderly profile
- `check_health_status` - Log health concerns
- `schedule_followup` - Schedule next call
- `notify_caregiver` - Alert caregiver

### Skills (Domain Knowledge)
**Source**: `backend/app/skills/`

- **Emergency** - Emergency situation handling
- **Emotional Support** - Comfort and empathy
- **Health Monitoring** - Health tracking protocols
- **Voice Commands** - Command recognition

Skills are loaded dynamically based on conversation context (progressive disclosure).

## Testing

### Backend Tests
```bash
cd backend
pytest
```

**Coverage**: 169 tests passing

### Frontend Tests
```bash
cd frontend
npm run test:e2e
```

**Coverage**: E2E tests with Playwright

### Manual Testing
See [call-testing-guide.md](./call-testing-guide.md) for step-by-step call testing instructions.

## Deployment

### Production Server
- **Host**: EC2 (52.79.227.179)
- **Services**: Docker Compose
- **SSL**: Handled by nginx

### Health Check
```bash
curl http://52.79.227.179:8000/health
# Expected: {"status":"ok"}
```

### Services Status
| Service | Port | Status |
|---------|------|--------|
| Backend | 8000 | ✅ Healthy |
| Frontend | 3000 | ✅ Running |
| PostgreSQL | 5432 | ✅ Healthy |
| Redis | 6379 | ✅ Healthy |
| Nginx | 80, 443 | ✅ Running |
| Celery Worker | - | ✅ Running |

## Development Setup

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for frontend)
- Python 3.12+ (for backend)
- Xcode (for iOS)

### Environment Variables

**Backend** (`.env`):
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
OPENAI_API_KEY=sk-...
ACCESS_TOKEN_SECRET=...
```

**Frontend** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Running Locally

**Full Stack**:
```bash
docker-compose up -d
```

**Backend Only**:
```bash
cd backend
uvicorn app.main:app --reload
```

**Frontend Only**:
```bash
cd frontend
npm run dev
```

**iOS**:
```bash
open iOS/Sori.xcodeproj
# Run in Xcode simulator
```

## Database Schema

**Key Tables**:
- `users` - Caregiver accounts
- `elderly` - Elderly profiles
- `elderly_devices` - Registered iOS devices
- `pairing_codes` - Device pairing codes
- `calls` - Call records
- `messages` - Conversation messages
- `call_analyses` - AI analysis results

See `backend/app/models/` for full schema definitions.

## Contributing

When making changes:

1. **Read existing docs** in this folder
2. **Update docs** if changing architecture
3. **Run tests** before committing
4. **Update changelog** for significant changes
5. **Follow naming conventions** in existing code

## Links

### System Documentation
- **Backend Architecture**: [backend/architecture.md](./backend/architecture.md)
- **Frontend Architecture**: [frontend/architecture.md](./frontend/architecture.md)
- **iOS Documentation**: [ios/README.md](./ios/README.md)
- **Latest Changelog**: [changelog-2024-12-28.md](./changelog-2024-12-28.md)
- **Call Testing Guide**: [call-testing-guide.md](./call-testing-guide.md)

### Claude Agent Documentation
- **Claude Agent Configuration**: [../.claude/README.md](../.claude/README.md) - Main routing guide
- **Agent Audit Report**: [claude-agent-audit-2024-12-28.md](./claude-agent-audit-2024-12-28.md) - Configuration verification
- **Quick Reference**: [claude-configuration-summary.md](./claude-configuration-summary.md) - Agent selection guide

---

**Maintained By**: SORI Docs Agent  
**Last Updated**: 2024-12-28  
**Project**: SORI - AI-Powered Elderly Care System
