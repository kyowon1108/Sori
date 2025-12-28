# Frontend Architecture Documentation

**Generated**: 2024-12-28
**Source**: Code analysis of `frontend/**`

## Overview

Next.js 14 dashboard for caregivers to monitor elderly care.

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **API Client**: Axios

## Project Structure

```
frontend/
├── app/                    # App Router pages
│   ├── (auth)/            # Auth pages (login, register)
│   └── (main)/            # Main dashboard pages
├── src/
│   ├── components/        # React components
│   ├── services/          # API services
│   ├── store/             # Zustand store
│   ├── types/             # TypeScript types
│   └── hooks/             # Custom hooks
└── tests/                 # Playwright tests
```

## Key Pages

### Dashboard
**File**: `frontend/app/(main)/dashboard/page.tsx`

Features:
- Today's call summary
- Upcoming scheduled calls
- Recent events timeline
- Risk alerts

### Elderly Management
**File**: `frontend/app/(main)/elderly/page.tsx`

- Elderly list with filters
- Profile details
- Call history per elderly
- Device connection status

### Call Detail
**File**: `frontend/app/(main)/calls/[id]/page.tsx`

- Call summary with AI analysis
- Conversation transcript
- Risk score display
- Recommended actions

## Services

### API Client
**File**: `frontend/src/services/api.ts`

- Axios instance with interceptors
- Auth token management
- Base URL configuration

### Calls Service
**File**: `frontend/src/services/calls.ts`

```typescript
// Key endpoints
getList(elderly_id?, skip, limit)  // GET /api/calls
getById(id)                         // GET /api/calls/:id
startCall(elderly_id, call_type)    // POST /api/calls
endCall(id)                         // PUT /api/calls/:id/end
```

### WebSocket Service
**File**: `frontend/src/services/websocket.ts`

- Connection management
- Message handling
- Reconnection logic
- Agent phase tracking

## State Management

**File**: `frontend/src/store/useStore.ts`

Zustand store for:
- Authentication state
- Current call state
- Agent processing state
- Tool executions

## Types

**File**: `frontend/src/types/calls.ts`

Key types:
- `Call` - Call record
- `CallAnalysis` - AI analysis result
- `AgentPhase` - Agent processing phases
- `ToolExecution` - Tool execution status

## Components

### Chat Components
- `ChatView` - Main chat interface
- `MessageList` - Message display
- `MessageBubble` - Individual messages
- `AgentStatus` - AI agent status

### Elderly Components
- `ElderlyList` - List view with filters
- `ElderlyCard` - Card component
- `ElderlyDetail` - Full profile view
- `ElderlyForm` - Add/edit form

### Call Components
- `CallReportSummary` - Analysis summary
- `CallTranscript` - Conversation view
- `CallRiskPanel` - Risk indicators
- `CallActionItems` - Recommended actions

---
**Note**: All paths relative to project root
