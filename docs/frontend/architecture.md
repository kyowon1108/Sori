# Frontend Architecture Documentation

**Generated**: 2024-12-28  
**Source**: Code analysis of `frontend/**`

## Overview

Next.js 14 dashboard for caregivers to monitor elderly care with real-time agent status tracking.

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
// Key endpoints (UPDATED 2024-12-28)
getList(elderly_id?, skip, limit)  // GET /api/calls
getById(id)                         // GET /api/calls/:id
startCall(elderly_id, call_type)    // POST /api/calls
endCall(id)                         // PUT /api/calls/:id/end
```

**Recent fixes**:
- Line 27: Fixed start call endpoint from `/api/calls/start` to `/api/calls`
- Line 35: Fixed end call method from POST to PUT

### WebSocket Service
**File**: `frontend/src/services/websocket.ts`

**Features**:
- Connection management
- Message handling
- Reconnection logic
- **Agent phase tracking** (NEW)

**Agent Phase Support**:
```typescript
// Message types
type AgentPhase = 'perceive' | 'plan' | 'act' | 'reflect' | 'complete' | 'error';

// Handles phase updates from backend
ws.on('agent_phase', (data) => {
  store.setAgentPhase(data.phase);
});
```

**Recent fixes**:
- Line 2: Added `AgentPhase` type import
- Line 145: Fixed type casting for phase updates

## State Management

**File**: `frontend/src/store/useStore.ts`

Zustand store for:
- Authentication state
- Current call state
- **Agent processing state** (NEW)
- **Tool executions** (NEW)

**New State Fields**:
```typescript
interface Store {
  // Existing fields...
  agentPhase: AgentPhase | null;
  currentTools: ToolExecution[];
  
  // New methods
  setAgentPhase: (phase: AgentPhase | null) => void;
  addToolExecution: (tool: ToolExecution) => void;
  clearToolExecutions: () => void;
}
```

## Types

### Call Types
**File**: `frontend/src/types/calls.ts`

Key types:
- `Call` - Call record
- `CallAnalysis` - AI analysis result
- **`AgentPhase`** - Agent processing phases (NEW)
- **`ToolExecution`** - Tool execution status (NEW)

**New Types**:
```typescript
export type AgentPhase = 
  | 'perceive'   // Analyzing input
  | 'plan'       // Planning response
  | 'act'        // Generating response
  | 'reflect'    // Evaluating quality
  | 'complete'   // Finished
  | 'error';     // Error occurred

export interface ToolExecution {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  input?: any;
  output?: any;
  error?: string;
}
```

## Components

### Chat Components
- `ChatView` - Main chat interface
- `MessageList` - Message display
- `MessageBubble` - Individual messages
- **`AgentStatus`** - AI agent status indicator (NEW)

#### AgentStatus Component (NEW)
**File**: `frontend/src/components/Chat/AgentStatus.tsx`

Displays current agent processing phase:
```tsx
<AgentStatus 
  phase={agentPhase} 
  tools={currentTools} 
/>
```

**Visual Indicators**:
- Perceive: Brain icon, analyzing
- Plan: Lightbulb icon, planning
- Act: Sparkles icon, responding
- Reflect: Check circle, evaluating

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

## Integration with Backend Multi-Agent Architecture

### WebSocket Message Flow

**Phase Updates**:
```
Backend Agent → Sends phase update → WebSocket → Frontend Store
                                                        ↓
                                              AgentStatus Component
```

**Tool Executions**:
```
Backend Tool → Executes → Sends result → Frontend displays status
```

**Message Types Handled**:
1. `agent_phase` - Current processing phase
2. `tool_call` - Tool execution started
3. `tool_result` - Tool execution completed
4. `stream_chunk` - Response chunk
5. `stream_end` - Response complete

### Real-time Status Display

The frontend now provides real-time visibility into:
- Which phase the agent is in (Perceive/Plan/Act/Reflect)
- Which tools are being executed
- Tool execution results
- Quality evaluation status

## Recent Changes (2024-12-28)

### API Endpoint Fixes
**File**: `frontend/src/services/calls.ts`

1. **Start Call Endpoint** (Line 27):
   - Before: `/api/calls/start` ❌
   - After: `/api/calls` ✅

2. **End Call Method** (Line 35):
   - Before: POST ❌
   - After: PUT ✅

### TypeScript Type Safety
**File**: `frontend/src/services/websocket.ts`

- Added `AgentPhase` type import (Line 2)
- Fixed type casting for phase updates (Line 145)

### Docker Build
- Successfully builds with no TypeScript errors
- All type definitions properly imported

## Testing

### E2E Tests (Playwright)
**Directory**: `frontend/tests/`

Verified scenarios:
- Dashboard loads correctly
- Elderly management works
- Call history displays
- Call detail with AI analysis renders
- Conversation transcript displays

---
**Note**: All paths relative to project root
