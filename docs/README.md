# SORI Project Documentation

**Generated**: 2024-12-28

## Documentation Structure

```
docs/
├── README.md                    # This file
├── changelog-2024-12-28.md     # Latest changelog
├── call-testing-guide.md       # Call testing guide
├── backend/                     # Backend documentation
│   └── architecture.md
├── frontend/                    # Frontend documentation
│   └── architecture.md
└── ios/                         # iOS documentation
    └── README.md
```

## Quick Reference

### Recent Changes (2024-12-28)
1. **Backend**: Fixed Python datetime deprecation warnings
2. **Frontend**: Fixed API endpoint mismatches
3. **Frontend**: Added missing TypeScript imports
4. **EC2**: Deployed all changes to production

## Key Features

### Authentication System
- JWT-based authentication
- Password hashing with bcrypt
- **Source**: `backend/app/routes/auth.py`, `backend/app/core/security.py`

### Call System
- WebSocket real-time communication
- AI-powered conversation analysis
- **Source**: `backend/app/routes/websocket.py`, `backend/app/services/ai_service.py`

### Dashboard
- Next.js 14 with App Router
- Zustand state management
- **Source**: `frontend/app/(main)/dashboard/page.tsx`

---
**Maintained By**: SORI Docs Agent
