# SORI Frontend

SORI 프로젝트의 Next.js 14 기반 프론트엔드 애플리케이션입니다. 노인 케어 관리를 위한 웹 인터페이스를 제공합니다.

**파일 경로**: `/Users/kapr/Projects/University/HUSS/frontend`

---

## 목차

1. [기술 스택](#기술-스택)
2. [프로젝트 구조](#프로젝트-구조)
3. [설치 및 실행](#설치-및-실행)
4. [환경 변수](#환경-변수)
5. [주요 기능](#주요-기능)
6. [아키텍처](#아키텍처)
7. [컴포넌트 구조](#컴포넌트-구조)
8. [상태 관리](#상태-관리)
9. [API 통신](#api-통신)
10. [WebSocket 연동](#websocket-연동)
11. [라우팅 및 인증](#라우팅-및-인증)
12. [스타일링](#스타일링)
13. [최근 변경사항](#최근-변경사항)

---

## 기술 스택

**핵심 프레임워크 및 라이브러리** (참고: `frontend/package.json`)

- **Next.js**: 16.1.0 (App Router)
- **React**: 19.2.3
- **TypeScript**: ^5
- **Tailwind CSS**: ^4
- **Zustand**: ^5.0.9 (상태 관리)
- **Axios**: ^1.13.2 (HTTP 클라이언트)
- **Zod**: ^4.2.1 (스키마 검증)
- **date-fns**: ^4.1.0 (날짜 처리)
- **react-hot-toast**: ^2.6.0 (알림)
- **clsx**: ^2.1.1 (클래스명 유틸리티)

**개발 도구**

- **ESLint**: ^9
- **Tailwind Merge**: ^3.4.0
- **PostCSS**: ^4

---

## 프로젝트 구조

```
frontend/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 인증 관련 페이지 그룹
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (main)/                   # 메인 애플리케이션 그룹
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── elderly/
│   │   │   ├── page.tsx          # 노인 목록
│   │   │   ├── add/page.tsx      # 노인 추가
│   │   │   ├── [id]/page.tsx     # 노인 상세
│   │   │   ├── [id]/edit/page.tsx
│   │   │   └── layout.tsx
│   │   ├── calls/
│   │   │   ├── page.tsx          # 통화 목록
│   │   │   └── [id]/page.tsx     # 통화 상세/채팅
│   │   ├── alerts/
│   │   │   └── page.tsx
│   │   └── layout.tsx            # 메인 레이아웃 (Header + Sidebar)
│   ├── layout.tsx                # 루트 레이아웃
│   ├── page.tsx                  # 홈 페이지
│   ├── error.tsx                 # 에러 페이지
│   └── globals.css               # 전역 스타일
├── src/
│   ├── components/               # React 컴포넌트
│   │   ├── Auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── Common/               # 공통 컴포넌트
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Loading.tsx
│   │   │   ├── ErrorAlert.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── ToastProvider.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── Dashboard/
│   │   │   ├── TodaySummary.tsx
│   │   │   ├── ActionQueue.tsx
│   │   │   ├── EventTimeline.tsx
│   │   │   └── UpcomingCalls.tsx
│   │   ├── Elderly/
│   │   │   ├── ElderlyList.tsx
│   │   │   ├── ElderlyCard.tsx
│   │   │   ├── ElderlyDetail.tsx
│   │   │   ├── ElderlyForm.tsx
│   │   │   └── Tabs/
│   │   │       ├── SummaryTab.tsx
│   │   │       ├── CallsTab.tsx
│   │   │       ├── DevicesTab.tsx
│   │   │       ├── ScheduleTab.tsx
│   │   │       ├── NotificationsTab.tsx
│   │   │       └── index.ts
│   │   ├── Calls/
│   │   │   ├── CallReportSummary.tsx
│   │   │   ├── CallRiskPanel.tsx
│   │   │   ├── CallTranscript.tsx
│   │   │   ├── CallActionItems.tsx
│   │   │   ├── AnalysisSkeleton.tsx
│   │   │   └── index.ts
│   │   └── Chat/
│   │       ├── ChatView.tsx
│   │       ├── MessageList.tsx
│   │       ├── MessageBubble.tsx
│   │       ├── MessageInput.tsx
│   │       ├── CallSummary.tsx
│   │       └── AgentStatus.tsx     # 신규: Agent 상태 표시
│   ├── hooks/                    # Custom React Hooks
│   │   ├── useAuth.ts
│   │   ├── useElderly.ts
│   │   ├── useCalls.ts
│   │   ├── useWebSocket.ts
│   │   └── useHydration.ts
│   ├── services/                 # API 및 서비스 레이어
│   │   ├── api.ts                # Axios 클라이언트 (인터셉터 포함)
│   │   ├── auth.ts
│   │   ├── elderly.ts
│   │   ├── calls.ts
│   │   └── websocket.ts          # WebSocket 서비스
│   ├── store/
│   │   └── useStore.ts           # Zustand 전역 상태
│   ├── types/                    # TypeScript 타입 정의
│   │   ├── auth.ts
│   │   ├── elderly.ts
│   │   ├── calls.ts
│   │   └── events.ts
│   ├── schemas/                  # Zod 스키마
│   │   └── elderly.ts
│   └── utils/                    # 유틸리티 함수
│       ├── constants.ts
│       ├── formatters.ts
│       ├── dateUtils.ts
│       ├── eventMapper.ts
│       └── validation.ts
├── middleware.ts                 # Next.js 미들웨어 (인증 체크)
├── next.config.ts                # Next.js 설정
├── tailwind.config.ts            # Tailwind CSS 설정
├── tsconfig.json                 # TypeScript 설정
├── package.json
└── Dockerfile                    # Docker 빌드 설정
```

**참고 파일 경로**:
- 디렉터리 구조: `frontend/app/`, `frontend/src/`
- 설정 파일: `frontend/package.json`, `frontend/next.config.ts`, `frontend/middleware.ts`

---

## 설치 및 실행

### 로컬 개발 환경

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (포트 3000)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start

# 린트 검사
npm run lint
```

**참고**: `frontend/package.json` 스크립트 섹션

### Docker 환경

```bash
# 이미지 빌드
docker build -t sori-frontend .

# 컨테이너 실행
docker run -p 3000:3000 sori-frontend
```

**참고**: `frontend/Dockerfile`

---

## 환경 변수

프로젝트 루트에 `.env.local` 파일을 생성하세요:

```bash
# API 서버 URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# WebSocket 서버 URL
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# API 타임아웃 (밀리초)
NEXT_PUBLIC_API_TIMEOUT=30000
```

**참고**: `.env.local` (로컬), `.env.production` (프로덕션)

**사용 위치**:
- `frontend/src/services/api.ts` (API_BASE_URL, API_TIMEOUT)
- `frontend/src/services/websocket.ts` (NEXT_PUBLIC_WS_URL)

---

## 주요 기능

### 1. 인증 및 권한 관리

- **로그인/회원가입**: JWT 기반 인증
- **자동 토큰 갱신**: Axios 인터셉터를 통한 자동 refresh
- **미들웨어 기반 라우트 보호**: 인증되지 않은 사용자 리다이렉트

**참고 파일**:
- `frontend/src/services/auth.ts`
- `frontend/src/services/api.ts` (토큰 갱신 로직)
- `frontend/middleware.ts` (라우트 보호)
- `frontend/src/hooks/useAuth.ts`

### 2. 노인 관리

- 노인 정보 CRUD
- 디바이스 연동 상태 확인
- 통화 이력 조회
- 스케줄 관리

**참고 파일**:
- `frontend/src/services/elderly.ts`
- `frontend/src/components/Elderly/*`
- `frontend/app/(main)/elderly/`
- `frontend/src/hooks/useElderly.ts`

### 3. 통화 관리 및 실시간 채팅

- 통화 목록 조회 및 필터링
- 실시간 채팅 인터페이스 (WebSocket)
- 통화 분석 결과 표시 (위험도, 감정, 요약)
- AI Agent 상태 실시간 표시 (새로운 기능)

**참고 파일**:
- `frontend/src/services/calls.ts`
- `frontend/src/components/Calls/*`
- `frontend/src/components/Chat/*`
- `frontend/app/(main)/calls/[id]/page.tsx`
- `frontend/src/hooks/useCalls.ts`, `frontend/src/hooks/useWebSocket.ts`

### 4. 대시보드

- 오늘의 통화 요약
- 조치 필요 항목 큐
- 최근 이벤트 타임라인
- 예정된 통화 목록

**참고 파일**:
- `frontend/src/components/Dashboard/*`
- `frontend/app/(main)/dashboard/page.tsx`

---

## 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────┐
│          Next.js App Router                 │
│  (SSR, CSR, Routing, Middleware)            │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│          React Components                   │
│  (Pages, Layouts, UI Components)            │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│          Custom Hooks                       │
│  (useAuth, useElderly, useCalls, etc.)      │
└─────────────────────────────────────────────┘
              ↓
┌─────────────┬───────────────┬───────────────┐
│   Zustand   │   Services    │   WebSocket   │
│   Store     │   (API)       │   Service     │
└─────────────┴───────────────┴───────────────┘
              ↓
┌─────────────────────────────────────────────┐
│          Backend API Server                 │
│      (REST API + WebSocket)                 │
└─────────────────────────────────────────────┘
```

**참고 파일**:
- 라우팅: `frontend/app/`
- 상태 관리: `frontend/src/store/useStore.ts`
- API 서비스: `frontend/src/services/`
- WebSocket: `frontend/src/services/websocket.ts`

---

## 컴포넌트 구조

### 계층 구조

```
App Layout (layout.tsx)
├── Auth Layout ((auth)/layout.tsx)
│   ├── Login Page
│   └── Register Page
└── Main Layout ((main)/layout.tsx)
    ├── Header (Common/Header.tsx)
    ├── Sidebar (Common/Sidebar.tsx)
    └── Content Area
        ├── Dashboard
        ├── Elderly
        │   ├── List
        │   ├── Detail (with Tabs)
        │   └── Form (Add/Edit)
        └── Calls
            ├── List
            └── Detail (Chat Interface)
```

**참고 파일**:
- 루트 레이아웃: `frontend/app/layout.tsx`
- 인증 레이아웃: `frontend/app/(auth)/layout.tsx`
- 메인 레이아웃: `frontend/app/(main)/layout.tsx`

### 주요 컴포넌트

#### Common Components

**Header** (`frontend/src/components/Common/Header.tsx`)
- 상단 네비게이션 바
- 사용자 정보 표시
- 로그아웃 버튼

**Sidebar** (`frontend/src/components/Common/Sidebar.tsx`)
- 좌측 네비게이션 메뉴
- 대시보드, 노인 관리, 통화 기록 링크

**Loading, ErrorAlert, Badge, EmptyState, Skeleton**
- 재사용 가능한 UI 컴포넌트

**참고**: `frontend/src/components/Common/`

#### Dashboard Components

- **TodaySummary**: 오늘의 통화 통계 카드
- **ActionQueue**: 조치가 필요한 항목 리스트
- **EventTimeline**: 최근 이벤트 타임라인
- **UpcomingCalls**: 예정된 통화 목록

**참고**: `frontend/src/components/Dashboard/`

#### Elderly Components

- **ElderlyList**: 노인 목록 그리드
- **ElderlyCard**: 노인 정보 카드
- **ElderlyDetail**: 노인 상세 정보 (탭 포함)
- **ElderlyForm**: 노인 정보 생성/수정 폼
- **Tabs**: SummaryTab, CallsTab, DevicesTab, ScheduleTab, NotificationsTab

**참고**: `frontend/src/components/Elderly/`

#### Calls Components

- **CallReportSummary**: 통화 요약 정보
- **CallRiskPanel**: 위험도 표시 패널
- **CallTranscript**: 통화 녹취록 표시
- **CallActionItems**: 조치 항목 표시
- **AnalysisSkeleton**: 분석 로딩 스켈레톤

**참고**: `frontend/src/components/Calls/`

#### Chat Components

- **ChatView**: 채팅 인터페이스 메인 컨테이너
- **MessageList**: 메시지 리스트 (스크롤 관리)
- **MessageBubble**: 개별 메시지 버블
- **MessageInput**: 메시지 입력 필드
- **CallSummary**: 통화 요약 카드
- **AgentStatus**: AI Agent 상태 표시 컴포넌트 (신규)
  - Agent phase (perceive, plan, act, complete, error)
  - Tool execution 상태
  - 처리 중 스피너

**참고**: `frontend/src/components/Chat/`

---

## 상태 관리

### Zustand Store

**위치**: `frontend/src/store/useStore.ts`

전역 상태를 관리하는 Zustand 스토어입니다. 로컬 스토리지에 persist 설정되어 있습니다.

#### 상태 구조

```typescript
interface StoreState {
  // Auth
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  authLoading: boolean;

  // Elderly
  elderlyList: Elderly[];
  currentElderly: Elderly | null;
  elderlyLoading: boolean;

  // Calls
  currentCall: Call | null;
  callsList: Call[];
  callsLoading: boolean;
  chatMessages: Array<{ role: string; content: string; is_streaming?: boolean }>;

  // Agent Status (신규)
  agentPhase: AgentPhase | null;
  isAgentProcessing: boolean;
  toolExecutions: ToolExecution[];

  // UI
  sidebarOpen: boolean;
  error: string | null;
}
```

**참고**: `frontend/src/store/useStore.ts`

#### 주요 액션

- **Auth**: `setUser`, `setTokens`, `logout`
- **Elderly**: `setElderlyList`, `setCurrentElderly`
- **Calls**: `setCurrentCall`, `addChatMessage`, `setChatMessages`
- **Agent Status**: `setAgentPhase`, `setAgentProcessing`, `addToolExecution`, `updateToolExecution`
- **UI**: `setSidebarOpen`, `setError`

#### Persist 설정

인증 정보는 로컬 스토리지에 저장됩니다:

```typescript
partialize: (state) => ({
  user: state.user,
  accessToken: state.accessToken,
  refreshToken: state.refreshToken,
  isAuthenticated: state.isAuthenticated,
})
```

**참고**: `frontend/src/store/useStore.ts` (line 153-161)

---

## API 통신

### API Client

**위치**: `frontend/src/services/api.ts`

Axios 기반 API 클라이언트로, 다음 기능을 제공합니다:

#### 요청 인터셉터

- 모든 요청에 `Authorization: Bearer <token>` 헤더 자동 추가

```typescript
this.client.interceptors.request.use((config) => {
  const store = useStore.getState();
  if (store.accessToken) {
    config.headers.Authorization = `Bearer ${store.accessToken}`;
  }
  return config;
});
```

**참고**: `frontend/src/services/api.ts` (line 22-31)

#### 응답 인터셉터 (토큰 갱신)

- 401 에러 발생 시 자동으로 refresh token을 사용해 토큰 갱신
- 갱신된 토큰으로 원래 요청 재시도
- 갱신 실패 시 로그아웃 처리

```typescript
if (error.response?.status === 401 && !originalRequest._retry) {
  originalRequest._retry = true;
  const newToken = await this.refreshToken(store.refreshToken);
  originalRequest.headers.Authorization = `Bearer ${newToken}`;
  return this.client(originalRequest);
}
```

**참고**: `frontend/src/services/api.ts` (line 34-77)

### Service 계층

#### Auth Service (`frontend/src/services/auth.ts`)

- `login(credentials)`: 로그인
- `register(userData)`: 회원가입
- `logout()`: 로그아웃
- `getCurrentUser()`: 현재 사용자 정보 조회

#### Elderly Service (`frontend/src/services/elderly.ts`)

- `getElderlyList()`: 노인 목록 조회
- `getElderlyById(id)`: 노인 상세 정보 조회
- `createElderly(data)`: 노인 정보 생성
- `updateElderly(id, data)`: 노인 정보 수정
- `deleteElderly(id)`: 노인 정보 삭제

#### Calls Service (`frontend/src/services/calls.ts`)

- `getCallsList(params)`: 통화 목록 조회 (필터링, 페이징)
- `getCallById(id)`: 통화 상세 정보 조회
- `createPendingCall(elderlyId)`: 대기 중인 통화 생성
- `endCall(callId)`: 통화 종료

**참고**: `frontend/src/services/`

---

## WebSocket 연동

### WebSocketService

**위치**: `frontend/src/services/websocket.ts`

실시간 채팅 및 AI Agent 상태를 위한 WebSocket 싱글톤 서비스입니다.

#### 주요 기능

**연결 관리**

```typescript
// 연결
wsService.connect(callId);

// 연결 해제
wsService.disconnect();
```

**참고**: `frontend/src/services/websocket.ts` (line 40-51, 236-251)

**메시지 전송**

```typescript
await wsService.send({
  type: 'message',
  role: 'guardian',
  content: '안녕하세요',
});
```

**참고**: `frontend/src/services/websocket.ts` (line 260-287)

**메시지 리스닝**

```typescript
const unsubscribe = wsService.addMessageListener((message) => {
  console.log('Received:', message);
});
```

**참고**: `frontend/src/services/websocket.ts` (line 295-298)

#### 자동 재연결

WebSocket 연결이 끊어진 경우 자동으로 재연결을 시도합니다 (최대 5회):

```typescript
private _handleReconnection() {
  if (this.reconnectAttempts >= this.maxReconnectAttempts) {
    console.error('Max reconnect attempts reached');
    return;
  }
  const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
  setTimeout(() => this._initiateConnection(), delay);
}
```

**참고**: `frontend/src/services/websocket.ts` (line 220-234)

#### 메시지 타입

**클라이언트 → 서버**

- `message`: 사용자 메시지 전송
- `pong`: ping에 대한 응답
- `end_call`: 통화 종료 요청

**서버 → 클라이언트**

- `message`: 일반 메시지
- `stream_chunk`: 스트리밍 중인 메시지 청크
- `stream_end`: 스트리밍 완료
- `agent_phase`: Agent 단계 업데이트 (perceive, plan, act, complete, error)
- `tool_execution`: Tool 실행 상태 업데이트
- `ping`: 연결 유지 확인
- `ack`: 메시지 수신 확인

**참고**: `frontend/src/services/websocket.ts` (line 92-199)

#### 스트리밍 처리

AI 응답이 스트리밍되는 경우, 청크별로 누적하여 실시간으로 UI에 표시합니다:

```typescript
if (data.type === 'stream_chunk' && data.response_id) {
  const current = this.currentStreamContent.get(data.response_id) || '';
  this.currentStreamContent.set(data.response_id, current + data.content);
  
  this.messageListeners.forEach(listener => listener({
    type: 'message',
    role: data.role,
    content: current + data.content,
    is_streaming: true,
  }));
}
```

**참고**: `frontend/src/services/websocket.ts` (line 114-126)

#### Agent 상태 처리 (신규)

Agent의 현재 단계와 Tool 실행 상태를 실시간으로 Zustand store에 반영합니다:

```typescript
// Agent phase 업데이트
if (data.type === 'agent_phase') {
  const store = useStore.getState();
  store.setAgentPhase(data.phase as AgentPhase);
  if (data.phase === 'perceive' || data.phase === 'plan') {
    store.setAgentProcessing(true);
  } else if (data.phase === 'complete' || data.phase === 'error') {
    store.setAgentProcessing(false);
    setTimeout(() => store.clearToolExecutions(), 2000);
  }
}

// Tool execution 업데이트
if (data.type === 'tool_execution') {
  const tool = data.tool;
  if (tool.status === 'pending' || tool.status === 'executing') {
    store.addToolExecution({ ... });
  } else {
    store.updateToolExecution(tool.id, { ... });
  }
}
```

**참고**: `frontend/src/services/websocket.ts` (line 143-192)

---

## 라우팅 및 인증

### Next.js App Router

Next.js 14의 App Router를 사용하여 파일 기반 라우팅을 구현합니다.

#### Route Groups

- **(auth)**: 인증 페이지 (`/login`, `/register`)
- **(main)**: 메인 애플리케이션 (`/dashboard`, `/elderly`, `/calls`)

**참고**: `frontend/app/(auth)/`, `frontend/app/(main)/`

#### Dynamic Routes

- `/elderly/[id]`: 노인 상세 페이지
- `/elderly/[id]/edit`: 노인 수정 페이지
- `/calls/[id]`: 통화 상세/채팅 페이지

**참고**: `frontend/app/(main)/elderly/[id]/`, `frontend/app/(main)/calls/[id]/`

### Middleware 기반 인증

**위치**: `frontend/middleware.ts`

Next.js 미들웨어를 사용하여 서버 사이드에서 라우트 보호를 구현합니다.

#### Protected Routes

```typescript
const protectedRoutes = ['/dashboard', '/elderly', '/calls'];
```

**참고**: `frontend/middleware.ts` (line 3-7)

#### 인증 체크

```typescript
if (protectedRoutes.some((route) => path.startsWith(route))) {
  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('from', path);
    return NextResponse.redirect(url);
  }
}
```

**참고**: `frontend/middleware.ts` (line 15-21)

#### 로그인 리다이렉트

이미 로그인된 사용자가 `/login` 또는 `/register`에 접근하면 `/dashboard`로 리다이렉트합니다:

```typescript
if ((path === '/login' || path === '/register') && token) {
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
```

**참고**: `frontend/middleware.ts` (line 25-27)

---

## 스타일링

### Tailwind CSS

**설정 파일**: `frontend/tailwind.config.ts`, `frontend/app/globals.css`

Tailwind CSS 4를 사용하여 유틸리티 기반 스타일링을 구현합니다.

#### 테마 설정

```css
:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

**참고**: `frontend/app/globals.css` (line 3-13)

#### 다크 모드 비활성화

현재는 라이트 테마만 사용합니다:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: #ffffff;
    --foreground: #171717;
  }
}
```

**참고**: `frontend/app/globals.css` (line 16-21)

### 유틸리티

- **clsx**: 조건부 클래스명 결합
- **tailwind-merge**: Tailwind 클래스 충돌 방지

---

## 최근 변경사항

### 2024-12-28

1. **AI Agent 상태 표시 기능 추가**
   - `AgentStatus.tsx` 컴포넌트 추가
   - Agent phase 및 tool execution 상태 실시간 표시
   - WebSocket 메시지 타입 확장 (`agent_phase`, `tool_execution`)
   - Zustand store에 agent 상태 관리 추가

   **참고 파일**:
   - `frontend/src/components/Chat/AgentStatus.tsx` (신규)
   - `frontend/src/services/websocket.ts` (line 143-192)
   - `frontend/src/store/useStore.ts` (line 27-29, 52-58, 128-147)
   - `frontend/src/types/calls.ts`

2. **입력 필드 스타일 수정**
   - 모든 입력 필드에 흰색 배경과 어두운 텍스트 적용
   - 가독성 향상

3. **통화 접근 제어 개선**
   - 진행 중인 통화에 대한 접근 권한 검증 강화
   - `getById` 대신 `getCallById` 사용

**참고**: `docs/changelog-2024-12-28.md`

---

## 개발 가이드

### 새로운 페이지 추가

1. `app/` 디렉터리에 폴더 생성 (route group 고려)
2. `page.tsx` 파일 생성
3. 필요 시 `layout.tsx` 추가

### 새로운 컴포넌트 추가

1. `src/components/` 하위에 적절한 카테고리 폴더에 생성
2. 타입 정의는 `src/types/`에 추가
3. 재사용 가능한 로직은 `src/hooks/`에 custom hook으로 분리

### API 엔드포인트 추가

1. `src/services/` 하위 적절한 서비스 파일에 함수 추가
2. 타입 정의는 `src/types/`에 추가
3. Axios 클라이언트는 `src/services/api.ts`의 싱글톤 사용

### 상태 관리

- 전역 상태는 `src/store/useStore.ts`에 추가
- 로컬 상태는 `useState` 또는 custom hook 사용
- 서버 상태는 가능한 React Query 패턴 적용 (향후 고려)

---

## 트러블슈팅

### WebSocket 연결 오류

- `NEXT_PUBLIC_WS_URL` 환경 변수 확인
- 백엔드 서버 WebSocket 엔드포인트 확인 (`/ws/{call_id}`)
- 브라우저 개발자 도구 Network 탭에서 WS 연결 상태 확인

### 토큰 갱신 실패

- `NEXT_PUBLIC_API_URL` 환경 변수 확인
- 백엔드 `/api/auth/refresh` 엔드포인트 동작 확인
- 로컬 스토리지의 `sori-store` 확인

### 빌드 오류

```bash
# 캐시 삭제 후 재빌드
rm -rf .next
npm run build
```

---

## 기여 가이드

1. 브랜치 생성: `git checkout -b feature/your-feature`
2. 변경사항 커밋: `git commit -m "Add feature"`
3. 브랜치 푸시: `git push origin feature/your-feature`
4. Pull Request 생성

---

## 라이선스

이 프로젝트는 SORI 프로젝트의 일부입니다.

---

## 참고 문서

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Axios Documentation](https://axios-http.com/docs/intro)

---

## 연락처

프로젝트 관련 문의: SORI 개발팀
