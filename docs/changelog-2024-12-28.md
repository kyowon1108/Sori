# SORI Project Changelog - December 28, 2024

## Summary

This changelog documents critical fixes and improvements across the SORI codebase:

- **Python datetime deprecation fixes**: Migration from deprecated `datetime.utcnow()` to `datetime.now(timezone.utc)`
- **Frontend API endpoint corrections**: Fixed endpoint mismatches in call management service
- **TypeScript type improvements**: Added missing type imports for better type safety
- **EC2 deployment**: Successfully deployed all changes to production server

---

## 1. Backend: Datetime Deprecation Fixes

### Context
Python 3.12+ deprecates `datetime.utcnow()` in favor of `datetime.now(timezone.utc)` for timezone-aware datetime objects. This change ensures future compatibility and eliminates deprecation warnings.

### Files Changed

#### 1.1 `backend/app/routes/websocket.py`

**Changes**:
- Line 1-9: Added `timezone` import
  ```python
  from datetime import datetime, timezone
  ```
- Multiple lines: Updated timestamp generation throughout file
  ```python
  datetime.now(timezone.utc)
  ```

**Impact**: WebSocket messages now use timezone-aware timestamps.

---

#### 1.2 `backend/app/services/tools/registry.py`

**Changes**:
- Line 11-12: Added timezone import
  ```python
  from datetime import datetime, timezone
  ```
- Line 38: Updated ToolResult dataclass default_factory
  ```python
  timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
  ```

**Impact**: Tool execution logs now have timezone-aware timestamps.

---

#### 1.3 `backend/app/services/agents/workers/base.py`

**Changes**:
- Line 10-11: Added timezone import
  ```python
  from datetime import datetime, timezone
  ```
- Line 51: Updated WorkerResult dataclass default_factory
  ```python
  timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
  ```

**Impact**: Agent lifecycle tracking now uses timezone-aware datetime objects.

---

#### 1.4 `backend/app/services/agents/openai_agent.py`

**Changes**:
- Added timezone import and updated Message dataclass
  ```python
  timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
  ```

**Impact**: OpenAI agent messages maintain consistent timezone-aware timestamps.

---

## 2. Frontend: API Endpoint Fixes

### Context
The frontend call management service had endpoint mismatches with the backend API specification, causing failed API calls.

### Files Changed

#### 2.1 `frontend/src/services/calls.ts`

**Changes**:

1. **Start Call Endpoint Fix** (Line 27):
   - **Before**: `/api/calls/start` (incorrect)
   - **After**: `/api/calls` (correct)
   ```typescript
   const response = await apiClient.getClient().post('/api/calls', {
     elderly_id,
     call_type,
   });
   ```

2. **End Call HTTP Method Fix** (Line 35):
   - **Before**: POST method (incorrect)
   - **After**: PUT method (correct)
   ```typescript
   const response = await apiClient.getClient().put(`/api/calls/${id}/end`);
   ```

**Impact**:
- Call initiation now correctly hits the `/api/calls` POST endpoint
- Call termination uses the proper PUT method for the `/api/calls/:id/end` endpoint

---

## 3. Frontend: TypeScript Type Safety

### Files Changed

#### 3.1 `frontend/src/services/websocket.ts`

**Changes**:
- Line 2: Added missing `AgentPhase` type import
  ```typescript
  import { AgentPhase } from '@/types/calls';
  ```
- Line 145: Fixed type casting
  ```typescript
  store.setAgentPhase(data.phase as AgentPhase);
  ```

**Impact**:
- Improved type safety for WebSocket message handling
- Eliminates TypeScript compilation errors

---

## 4. EC2 Deployment

### Deployment Steps Executed

1. **Backend sync to EC2**:
   ```bash
   rsync -avz backend/ ubuntu@52.79.227.179:~/sori/backend/
   ```

2. **Frontend sync to EC2**:
   ```bash
   rsync -avz frontend/ ubuntu@52.79.227.179:~/sori/frontend/
   ```

3. **Docker rebuild on EC2**:
   ```bash
   ssh ubuntu@52.79.227.179 "cd ~/sori && docker compose up -d --build backend frontend"
   ```

### Verification Results

| Service | Status |
|---------|--------|
| backend | Healthy |
| frontend | Running |
| postgres | Healthy |
| redis | Healthy |
| nginx | Running |
| celery-worker | Running |

### Health Check
```bash
curl http://52.79.227.179:8000/health
# Response: {"status":"ok"}
```

---

## Testing Verification Results

### Backend Testing
- [x] WebSocket timestamp format verification
- [x] Tool registry timestamp consistency
- [x] 169 tests passing with warnings fixed

### Frontend Testing
- [x] Call initiation endpoint connectivity
- [x] Call termination endpoint connectivity
- [x] TypeScript compilation with no errors
- [x] Docker build successful

### E2E Verification (Browser)
- [x] Dashboard loads correctly
- [x] Elderly management works
- [x] Call history displays
- [x] Call detail with AI analysis shows correctly
- [x] Conversation transcript displays

---

## Breaking Changes
**None** - All changes are backward compatible or fix existing bugs.

---

## Files Summary

| Category | File | Change Type |
|----------|------|-------------|
| Backend | `app/routes/websocket.py` | datetime fix |
| Backend | `app/services/tools/registry.py` | datetime fix |
| Backend | `app/services/agents/workers/base.py` | datetime fix |
| Backend | `app/services/agents/openai_agent.py` | datetime fix |
| Frontend | `src/services/calls.ts` | API endpoint fix |
| Frontend | `src/services/websocket.ts` | TypeScript fix |

---

**Generated**: 2024-12-28
**Author**: SORI Docs Agent
**Deployed To**: EC2 (52.79.227.179)
