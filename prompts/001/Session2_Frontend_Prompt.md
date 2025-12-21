# 🟢 SESSION 2: FRONTEND WEB (Next.js) - 구현 Prompt

**목표:** Next.js 14 + TypeScript를 사용한 보호자 관리 대시보드 구현  
**기한:** 2025-01-31  
**역할:** Frontend 개발자  
**의존:** Session 1 (Backend API) - 모든 엔드포인트를 호출  

---

## 📋 최우선 준수 규칙

### 🚫 MUST DO / MUST NOT
1. **API 호출 정확성** (Backend와 일치)
   - 엔드포인트 경로, HTTP 메서드, 요청/응답 필드명 100% 일치
   - 환경 변수: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`

2. **상태 관리** (Zustand 사용, localStorage persist)
   - 토큰 저장 (accessToken, refreshToken)
   - 사용자 정보, 어르신 목록, 현재 통화 상태
   - 새로고침 시에도 상태 유지

3. **토큰 자동 갱신** (매우 중요!)
   - access_token 만료 시 자동으로 refresh_token 사용
   - 갱신 실패 시 로그인 페이지로 리다이렉트
   - Axios 인터셉터로 구현

4. **WebSocket 연결** (실시간 메시지)
   - /ws/{call_id}로 연결
   - Authorization 헤더에 토큰 포함
   - 메시지 포맷: {type, role, content}
   - 연결 해제 시 UI 업데이트

5. **권한 검증** (Frontend 단에서)
   - 로그인하지 않은 사용자는 /login으로 리다이렉트
   - ProtectedRoute 컴포넌트로 보호된 페이지 감싸기

---

## 🛠️ 개발 순서 (Phase별)

### **Phase 1: 프로젝트 초기화 (1-2일)**

#### 1.1 Next.js 프로젝트 생성
```bash
npx create-next-app@latest sori-frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"

cd sori-frontend

# 추가 패키지 설치
npm install zustand axios clsx date-fns
npm install -D tailwind-merge
```

#### 1.2 폴더 구조
```
app/
├── (auth)/
│   ├── layout.tsx
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
├── (main)/
│   ├── layout.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── elderly/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   └── edit/
│   │   │       └── page.tsx
│   │   └── add/
│   │       └── page.tsx
│   └── calls/
│       └── [id]/
│           └── page.tsx
├── layout.tsx
├── page.tsx
└── error.tsx

src/
├── components/
│   ├── Auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── Elderly/
│   │   ├── ElderlyCard.tsx
│   │   ├── ElderlyForm.tsx
│   │   ├── ElderlyList.tsx
│   │   └── ElderlyDetail.tsx
│   ├── Chat/
│   │   ├── ChatView.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   └── CallSummary.tsx
│   └── Common/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       ├── Loading.tsx
│       ├── ErrorAlert.tsx
│       └── ProtectedRoute.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useElderly.ts
│   ├── useCalls.ts
│   └── useWebSocket.ts
├── services/
│   ├── api.ts
│   ├── auth.ts
│   ├── elderly.ts
│   └── calls.ts
├── store/
│   ├── useStore.ts
│   └── types.ts
├── types/
│   ├── auth.ts
│   ├── elderly.ts
│   └── calls.ts
└── utils/
    ├── validation.ts
    ├── formatters.ts
    └── constants.ts

.env.local
next.config.js
tailwind.config.js
tsconfig.json
```

#### 1.3 .env.local
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_ENVIRONMENT=development
```

#### 1.4 types/auth.ts
```typescript
export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  fcm_token?: string;
  device_type?: string;
  push_enabled: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
```

#### 1.5 types/elderly.ts
```typescript
export interface CallSchedule {
  enabled: boolean;
  times: string[];  // ["09:00", "14:00"]
}

export interface Elderly {
  id: number;
  caregiver_id: number;
  name: string;
  age?: number;
  phone?: string;
  call_schedule: CallSchedule;
  health_condition?: string;
  medications?: Array<{ name: string; dosage: string; frequency: string }>;
  emergency_contact?: string;
  risk_level: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ElderlyCreateRequest {
  name: string;
  age?: number;
  phone?: string;
  call_schedule?: CallSchedule;
  health_condition?: string;
  medications?: any[];
  emergency_contact?: string;
  notes?: string;
}
```

#### 1.6 types/calls.ts
```typescript
export interface ChatMessage {
  id: number;
  call_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface CallAnalysis {
  id: number;
  call_id: number;
  risk_level: string;
  sentiment_score: number;
  summary?: string;
  recommendations?: string[];
  analyzed_at: string;
}

export interface Call {
  id: number;
  elderly_id: number;
  call_type: string;
  started_at: string;
  ended_at?: string;
  duration?: number;
  status: string;
  is_successful: boolean;
  messages?: ChatMessage[];
  analysis?: CallAnalysis;
  created_at: string;
}
```

---

### **Phase 2: API 서비스 (1-2일)**

#### 2.1 services/api.ts (Axios 클라이언트)
```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { useStore } from '@/store/useStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000');

class APIClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 요청 인터셉터
    this.client.interceptors.request.use(
      (config) => {
        const store = useStore.getState();
        if (store.accessToken) {
          config.headers.Authorization = `Bearer ${store.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 응답 인터셉터 (토큰 갱신)
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // 401 에러이고 이미 재시도하지 않은 경우
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // 토큰 갱신 중이 아니면 시작
            if (!this.isRefreshing) {
              this.isRefreshing = true;
              const store = useStore.getState();
              
              if (store.refreshToken) {
                this.refreshPromise = this.refreshToken(store.refreshToken);
                const newToken = await this.refreshPromise;
                this.isRefreshing = false;
                this.refreshPromise = null;

                // 새 토큰으로 원래 요청 재시도
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return this.client(originalRequest);
              }
            } else if (this.refreshPromise) {
              // 이미 갱신 중이면 그 결과 기다리기
              const newToken = await this.refreshPromise;
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // 토큰 갱신 실패 → 로그인 페이지로
            useStore.getState().logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(refreshToken: string): Promise<string> {
    try {
      const response = await this.client.post('/api/auth/refresh', {
        refresh_token: refreshToken,
      });
      
      const { access_token, refresh_token } = response.data.data || response.data;
      useStore.getState().setTokens(access_token, refresh_token);
      
      return access_token;
    } catch (error) {
      useStore.getState().logout();
      throw error;
    }
  }

  getClient(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = new APIClient();
```

#### 2.2 services/auth.ts
```typescript
import { apiClient } from './api';
import { AuthTokens, User } from '@/types/auth';

export const authService = {
  async register(email: string, password: string, full_name: string): Promise<User> {
    const response = await apiClient.getClient().post('/api/auth/register', {
      email,
      password,
      full_name,
    });
    return response.data.data;
  },

  async login(email: string, password: string): Promise<AuthTokens> {
    const response = await apiClient.getClient().post('/api/auth/login', {
      email,
      password,
    });
    return response.data.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.getClient().get('/api/auth/me');
    return response.data.data;
  },

  async updateFCMToken(fcm_token: string, device_type: string): Promise<void> {
    await apiClient.getClient().post('/api/auth/update-fcm-token', {
      fcm_token,
      device_type,
    });
  },
};
```

#### 2.3 services/elderly.ts
```typescript
import { apiClient } from './api';
import { Elderly, ElderlyCreateRequest } from '@/types/elderly';

export const elderlyService = {
  async getList(skip: number = 0, limit: number = 10): Promise<Elderly[]> {
    const response = await apiClient.getClient().get('/api/elderly', {
      params: { skip, limit },
    });
    return response.data.data;
  },

  async getById(id: number): Promise<Elderly> {
    const response = await apiClient.getClient().get(`/api/elderly/${id}`);
    return response.data.data;
  },

  async create(data: ElderlyCreateRequest): Promise<Elderly> {
    const response = await apiClient.getClient().post('/api/elderly', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<ElderlyCreateRequest>): Promise<Elderly> {
    const response = await apiClient.getClient().put(`/api/elderly/${id}`, data);
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.getClient().delete(`/api/elderly/${id}`);
  },
};
```

#### 2.4 services/calls.ts
```typescript
import { apiClient } from './api';
import { Call } from '@/types/calls';

export const callsService = {
  async getList(elderly_id?: number, skip: number = 0, limit: number = 10): Promise<Call[]> {
    const params: any = { skip, limit };
    if (elderly_id) params.elderly_id = elderly_id;
    
    const response = await apiClient.getClient().get('/api/calls', { params });
    return response.data.data;
  },

  async getById(id: number): Promise<Call> {
    const response = await apiClient.getClient().get(`/api/calls/${id}`);
    return response.data.data;
  },

  async startCall(elderly_id: number, call_type: string = 'voice'): Promise<any> {
    const response = await apiClient.getClient().post('/api/calls/start', {
      elderly_id,
      call_type,
    });
    return response.data.data;
  },

  async endCall(id: number): Promise<Call> {
    const response = await apiClient.getClient().post(`/api/calls/${id}/end`);
    return response.data.data;
  },
};
```

---

### **Phase 3: Zustand 상태 관리 (1일)**

#### 3.1 store/useStore.ts
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/auth';
import { Elderly } from '@/types/elderly';
import { Call } from '@/types/calls';

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
  chatMessages: any[];

  // UI
  sidebarOpen: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (access: string, refresh: string) => void;
  setAuthLoading: (loading: boolean) => void;
  logout: () => void;

  setElderlyList: (list: Elderly[]) => void;
  setCurrentElderly: (elderly: Elderly | null) => void;
  setElderlyLoading: (loading: boolean) => void;

  setCurrentCall: (call: Call | null) => void;
  setCallsList: (list: Call[]) => void;
  setCallsLoading: (loading: boolean) => void;
  addChatMessage: (message: any) => void;
  clearChatMessages: () => void;

  setSidebarOpen: (open: boolean) => void;
  setError: (error: string | null) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // Auth initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      authLoading: false,

      // Elderly initial state
      elderlyList: [],
      currentElderly: null,
      elderlyLoading: false,

      // Calls initial state
      currentCall: null,
      callsList: [],
      callsLoading: false,
      chatMessages: [],

      // UI initial state
      sidebarOpen: true,
      error: null,

      // Auth actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setTokens: (access, refresh) =>
        set({ accessToken: access, refreshToken: refresh }),
      setAuthLoading: (loading) => set({ authLoading: loading }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          elderlyList: [],
          currentElderly: null,
          currentCall: null,
          callsList: [],
          chatMessages: [],
        }),

      // Elderly actions
      setElderlyList: (list) => set({ elderlyList: list }),
      setCurrentElderly: (elderly) => set({ currentElderly: elderly }),
      setElderlyLoading: (loading) => set({ elderlyLoading: loading }),

      // Calls actions
      setCurrentCall: (call) => set({ currentCall: call }),
      setCallsList: (list) => set({ callsList: list }),
      setCallsLoading: (loading) => set({ callsLoading: loading }),
      addChatMessage: (message) =>
        set((state) => ({
          chatMessages: [...state.chatMessages, message],
        })),
      clearChatMessages: () => set({ chatMessages: [] }),

      // UI actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'sori-store',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

---

### **Phase 4: Hooks (1-2일)**

#### 4.1 hooks/useAuth.ts
```typescript
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { authService } from '@/services/auth';

export const useAuth = () => {
  const router = useRouter();
  const store = useStore();

  const register = useCallback(
    async (email: string, password: string, full_name: string) => {
      try {
        store.setAuthLoading(true);
        await authService.register(email, password, full_name);
        // 회원가입 성공 후 로그인 페이지로
        router.push('/login');
      } catch (error: any) {
        store.setError(error.response?.data?.message || '회원가입 실패');
      } finally {
        store.setAuthLoading(false);
      }
    },
    [store, router]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        store.setAuthLoading(true);
        const response = await authService.login(email, password);
        store.setTokens(response.access_token, response.refresh_token);
        store.setUser(response.user);
        router.push('/dashboard');
      } catch (error: any) {
        store.setError(error.response?.data?.message || '로그인 실패');
      } finally {
        store.setAuthLoading(false);
      }
    },
    [store, router]
  );

  const logout = useCallback(() => {
    store.logout();
    router.push('/login');
  }, [store, router]);

  return { register, login, logout, ...store };
};
```

#### 4.2 hooks/useElderly.ts
```typescript
import { useCallback, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { elderlyService } from '@/services/elderly';
import { ElderlyCreateRequest } from '@/types/elderly';

export const useElderly = () => {
  const store = useStore();

  const fetchList = useCallback(async () => {
    try {
      store.setElderlyLoading(true);
      const list = await elderlyService.getList();
      store.setElderlyList(list);
    } catch (error: any) {
      store.setError(error.response?.data?.message || '어르신 목록 조회 실패');
    } finally {
      store.setElderlyLoading(false);
    }
  }, [store]);

  const fetchById = useCallback(async (id: number) => {
    try {
      store.setElderlyLoading(true);
      const elderly = await elderlyService.getById(id);
      store.setCurrentElderly(elderly);
    } catch (error: any) {
      store.setError(error.response?.data?.message || '어르신 정보 조회 실패');
    } finally {
      store.setElderlyLoading(false);
    }
  }, [store]);

  const create = useCallback(
    async (data: ElderlyCreateRequest) => {
      try {
        store.setElderlyLoading(true);
        const elderly = await elderlyService.create(data);
        await fetchList();
        return elderly;
      } catch (error: any) {
        store.setError(error.response?.data?.message || '어르신 등록 실패');
        throw error;
      } finally {
        store.setElderlyLoading(false);
      }
    },
    [store, fetchList]
  );

  const update = useCallback(
    async (id: number, data: Partial<ElderlyCreateRequest>) => {
      try {
        store.setElderlyLoading(true);
        const elderly = await elderlyService.update(id, data);
        await fetchById(id);
        return elderly;
      } catch (error: any) {
        store.setError(error.response?.data?.message || '어르신 정보 수정 실패');
        throw error;
      } finally {
        store.setElderlyLoading(false);
      }
    },
    [store, fetchById]
  );

  const delete_ = useCallback(
    async (id: number) => {
      try {
        store.setElderlyLoading(true);
        await elderlyService.delete(id);
        await fetchList();
      } catch (error: any) {
        store.setError(error.response?.data?.message || '어르신 삭제 실패');
        throw error;
      } finally {
        store.setElderlyLoading(false);
      }
    },
    [store, fetchList]
  );

  return {
    ...store,
    fetchList,
    fetchById,
    create,
    update,
    delete: delete_,
  };
};
```

#### 4.3 hooks/useWebSocket.ts
```typescript
import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';

export const useWebSocket = (callId: number | null) => {
  const store = useStore();
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!callId || !store.accessToken) return;

    const wsUrl = new URL(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000');
    wsUrl.pathname = `/ws/${callId}`;
    wsUrl.searchParams.append('token', store.accessToken);

    try {
      wsRef.current = new WebSocket(wsUrl.toString());

      wsRef.current.onopen = () => {
        console.log('[WebSocket] Connected');
      };

      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'message') {
          store.addChatMessage({
            role: message.role,
            content: message.content,
            is_streaming: message.is_streaming || false,
          });
        } else if (message.type === 'call_ended') {
          disconnect();
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        store.setError('WebSocket 연결 오류');
      };

      wsRef.current.onclose = () => {
        console.log('[WebSocket] Disconnected');
      };
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      store.setError('WebSocket 연결 실패');
    }
  }, [callId, store.accessToken, store]);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'message',
          content,
        })
      );
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [callId, connect, disconnect]);

  return { sendMessage, disconnect };
};
```

---

### **Phase 5-8: 컴포넌트 및 페이지 구현**

[다음 파일에서 계속...]

각 컴포넌트는 다음과 같은 패턴을 따릅니다:

#### 컴포넌트 패턴
```typescript
'use client'; // Server Component 아닌 경우

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
// import services, hooks...

export default function ComponentName() {
  const store = useStore();
  const router = useRouter();
  const [state, setState] = useState(...);

  useEffect(() => {
    // 데이터 페칭, 권한 확인 등
  }, []);

  const handleAction = async () => {
    try {
      // API 호출
    } catch (error) {
      store.setError('에러 메시지');
    }
  };

  return (
    <div className="...">
      {/* UI */}
    </div>
  );
}
```

---

## 🧪 테스트 기준

### Frontend 테스트 체크리스트
- [ ] 로그인/회원가입 플로우
- [ ] 어르신 CRUD 기능
- [ ] 토큰 자동 갱신
- [ ] WebSocket 메시지 송수신
- [ ] 에러 처리 및 표시
- [ ] 모바일 반응형 디자인
- [ ] localStorage 데이터 영속성

### 통합 테스트 시나리오
1. 회원가입 → 로그인 → 대시보드 접근
2. 어르신 추가 → 상세 조회 → 수정 → 삭제
3. 통화 시작 → WebSocket 연결 → 메시지 송수신 → 통화 종료

---

## 🚀 개발 및 배포

```bash
# 개발
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm run start

# Vercel 배포
npm install -g vercel
vercel --prod
```

---

**🎯 완성 기준:**
- ✅ 모든 페이지 구현 및 테스트 완료
- ✅ Backend API와 완벽하게 통합
- ✅ 토큰 자동 갱신 및 권한 검증
- ✅ WebSocket 실시간 메시지 송수신
- ✅ Zustand로 상태 관리
- ✅ 모바일 반응형 디자인
- ✅ 에러 처리 및 UX

**다음 단계:** iOS 앱은 같은 Backend API를 사용하여 구현합니다!