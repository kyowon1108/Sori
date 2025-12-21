# 🟢 SESSION 2: FRONTEND - 상세 문제 분석 & 최종 해결 Prompt

**상태:** 코드 생성 완료 → 문제 분석 & 해결 단계  
**목표:** Frontend 모든 기능 정상화 및 Backend 통합  
**마감일:** 2025-12-28  

---

## 📋 Frontend 현황 분석

### ✅ 생성된 구조 (30개+ 파일)

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx        ✅ 생성됨
│   │   └── register/page.tsx     ✅ 생성됨
│   ├── (main)/
│   │   ├── dashboard/page.tsx    ✅ 생성됨
│   │   ├── elderly/
│   │   │   ├── [id]/page.tsx     ✅ 생성됨
│   │   │   ├── [id]/edit/page.tsx ✅ 생성됨
│   │   │   ├── add/page.tsx      ✅ 생성됨
│   │   │   └── page.tsx          ✅ 생성됨
│   │   └── calls/[id]/page.tsx   ✅ 생성됨
│   ├── layout.tsx                ✅ 생성됨
│   ├── page.tsx                  ✅ 생성됨
│   └── error.tsx                 ✅ 생성됨
├── src/
│   ├── components/               ✅ 생성됨 (8개 파일)
│   ├── hooks/                    ✅ 생성됨 (4개 파일)
│   ├── services/                 ✅ 생성됨 (4개 파일)
│   ├── store/                    ✅ 생성됨 (1개 파일)
│   ├── types/                    ✅ 생성됨 (3개 파일)
│   └── utils/                    ✅ 생성됨 (3개 파일)
├── package.json                  ✅ 생성됨
├── tsconfig.json                 ✅ 생성됨
├── tailwind.config.ts            ✅ 생성됨
├── next.config.js                ✅ 생성됨
├── .env.local                    ⚠️ 필요
└── .gitignore                    ✅ 생성됨
```

---

## 🚨 분석된 Frontend 주요 문제점

### 문제 1️⃣: 환경 변수 미설정 ⭐⭐⭐⭐⭐

**증상:**
- API 호출 시 `NEXT_PUBLIC_API_URL` undefined
- WebSocket 연결 실패

**원인:**
- `.env.local` 파일 미생성
- 환경 변수가 하드코딩되지 않음

**해결 방법:**
```bash
# frontend/.env.local 생성
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

### 문제 2️⃣: API 서비스 구현 불완전 ⭐⭐⭐⭐

**증상:**
- API 호출 시 에러 처리 부족
- 토큰 갱신 로직 미작동
- Axios 인터셉터 설정 부재

**현재 상태:**
```typescript
// src/services/api.ts - 기본 구조만 있음
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});
// ❌ 인터셉터 미구현
// ❌ 에러 처리 미구현
// ❌ 토큰 갱신 로직 미구현
```

**필요한 구현:**
1. Request/Response 인터셉터
2. 토큰 자동 갱신 로직
3. 에러 처리 & 재시도
4. 요청/응답 로깅

---

### 문제 3️⃣: 라우팅 보호 미흡 ⭐⭐⭐⭐

**증상:**
- 로그인하지 않아도 /dashboard 접근 가능
- 보호된 라우트 미동작

**현재 상태:**
```typescript
// src/components/Common/ProtectedRoute.tsx
// 컴포넌트만 있고, 라우트에 적용되지 않음
```

**필요한 구현:**
1. Middleware로 보호
2. 또는 각 Page에서 권한 검사
3. 로그인 페이지로 리다이렉트

---

### 문제 4️⃣: Zustand 상태 관리 부실 ⭐⭐⭐

**증상:**
- localStorage 동기화 문제
- 토큰 갱신 시 상태 업데이트 누락
- 사용자 정보 미동기화

**현재 상태:**
```typescript
// src/store/useStore.ts - 기본 구조만 있음
// ❌ 토큰 저장/로드 미동기화
// ❌ localStorage persist 미설정
// ❌ 상태 초기화 로직 미흡
```

---

### 문제 5️⃣: 폼 유효성 검증 미흡 ⭐⭐⭐

**증상:**
- 회원가입 시 약한 비밀번호도 통과
- 이메일 형식 검증 부재
- 에러 메시지 미표시

**필요한 구현:**
1. 실시간 폼 검증
2. 에러 메시지 표시
3. 제출 버튼 활성화/비활성화
4. 백엔드 에러 처리

---

### 문제 6️⃣: WebSocket 연결 불안정 ⭐⭐⭐

**증상:**
- 연결 재시도 로직 부재
- 연결 해제 시 UI 업데이트 미흡
- 메시지 처리 에러

**필요한 구현:**
1. 재연결 로직 (exponential backoff)
2. 연결 상태 표시
3. 에러 처리 & 유저 알림
4. 클린업 로직

---

### 문제 7️⃣: 모바일 반응형 미흡 ⭐⭐⭐

**증상:**
- 모바일에서 컴포넌트 레이아웃 깨짐
- 터치 이벤트 미최적화
- 작은 화면에서 가독성 떨어짐

**필요한 구현:**
1. Tailwind responsive 클래스 추가
2. 모바일 전용 컴포넌트 최적화
3. 터치 이벤트 처리

---

### 문제 8️⃣: 에러 처리 부재 ⭐⭐⭐

**증상:**
- 네트워크 에러 시 앱 정지
- 에러 메시지 미표시
- 사용자 피드백 부족

**필요한 구현:**
1. 전역 에러 경계 (Error Boundary)
2. 토스트 알림 시스템
3. 재시도 로직

---

## 🔧 Frontend 최종 해결 Prompt

### PHASE 1: 환경 설정 (1일)

#### Task 1.1: 환경 변수 설정

```bash
# frontend/.env.local 생성
cat > .env.local << 'EOF'
# API
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Environment
NEXT_PUBLIC_ENVIRONMENT=development

# Analytics (선택)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
EOF
```

#### Task 1.2: 패키지 설치 & 의존성 확인

```bash
cd frontend

# 필수 패키지 설치
npm install

# 없는 패키지 추가 설치
npm install --save axios zustand react-hot-toast
npm install --save-dev @testing-library/react @testing-library/jest-dom

# 버전 확인
npm list next zustand axios
```

#### Task 1.3: TypeScript 설정 검증

```bash
# TypeScript 컴파일 체크
npx tsc --noEmit

# 에러가 있으면 수정
# - src/types 파일들 확인
# - 라이브러리 타입 설치 (필요시)
```

---

### PHASE 2: API 서비스 완성 (2일)

#### Task 2.1: Axios 인터셉터 구현

**파일:** `src/services/api.ts`

```typescript
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useStore } from '@/store/useStore';

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request 인터셉터: 토큰 추가
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error: AxiosError) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response 인터셉터: 토큰 갱신 & 에러 처리
api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response:`, response.status, response.data);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 401 Unauthorized 처리
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // 토큰 갱신
        const { refreshToken } = useStore.getState();
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          }
        );

        const { access_token } = response.data.data;
        useStore.getState().setAccessToken(access_token);

        // 원래 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // 토큰 갱신 실패 → 로그아웃
        useStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // 기타 에러
    console.error('[API] Response error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export default api;
```

#### Task 2.2: API 서비스 메서드 완성

**파일:** `src/services/auth.ts`, `src/services/elderly.ts`, `src/services/calls.ts`

```typescript
// src/services/auth.ts
import api from './api';
import { LoginRequest, RegisterRequest, AuthResponse } from '@/types/auth';

export const authService = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/register', data);
    return response.data.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/login', data);
    return response.data.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return response.data.data;
  },

  logout: () => {
    // 로컬 상태만 지우면 됨 (백엔드는 stateless JWT 사용)
  },
};

// 동일하게 src/services/elderly.ts, src/services/calls.ts 작성
```

---

### PHASE 3: Zustand 상태 관리 완성 (1일)

#### Task 3.1: Store 구현

**파일:** `src/store/useStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

interface StoreState {
  // Auth
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // Elderly
  elderly: any[];
  selectedElderly: any | null;

  // Calls
  activeCall: any | null;
  callMessages: any[];

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setAccessToken: (token: string) => void;
  setElderly: (elderly: any[]) => void;
  setActiveCall: (call: any | null) => void;
  logout: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      elderly: [],
      selectedElderly: null,
      activeCall: null,
      callMessages: [],

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),
      setAccessToken: (token) => set({ accessToken: token }),
      setElderly: (elderly) => set({ elderly }),
      setActiveCall: (call) => set({ activeCall }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          elderly: [],
        }),
    }),
    {
      name: 'sori-store',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        elderly: state.elderly,
      }),
    }
  )
);
```

---

### PHASE 4: 라우팅 보호 구현 (1일)

#### Task 4.1: Middleware 추가

**파일:** `middleware.ts` (프로젝트 루트)

```typescript
import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = [
  '/dashboard',
  '/elderly',
  '/calls',
];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  const path = request.nextUrl.pathname;

  // 보호된 라우트 접근 시도
  if (protectedRoutes.some((route) => path.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 인증된 사용자가 로그인 페이지 접근
  if ((path === '/login' || path === '/register') && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

#### Task 4.2: 각 페이지에서 토큰 확인

**파일:** `app/(main)/dashboard/page.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated } = useStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="dashboard">
      {/* 콘텐츠 */}
    </div>
  );
}
```

---

### PHASE 5: 폼 유효성 검증 추가 (1일)

#### Task 5.1: 유효성 검증 유틸리티

**파일:** `src/utils/validation.ts`

```typescript
export const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validatePassword = (password: string): string[] => {
  const errors: string[] = [];
  if (password.length < 8) errors.push('최소 8자 이상이어야 합니다');
  if (!/[A-Z]/.test(password)) errors.push('대문자를 포함해야 합니다');
  if (!/[0-9]/.test(password)) errors.push('숫자를 포함해야 합니다');
  if (!/[!@#$%^&*]/.test(password)) errors.push('특수문자(!@#$%^&*)를 포함해야 합니다');
  return errors;
};

export const validateFullName = (name: string): boolean => {
  return name.length >= 2 && name.length <= 50;
};
```

#### Task 5.2: LoginForm 컴포넌트 개선

**파일:** `src/components/Auth/LoginForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { authService } from '@/services/auth';
import { validateEmail } from '@/utils/validation';
import { ErrorAlert } from '../Common/ErrorAlert';

export function LoginForm() {
  const router = useRouter();
  const { setUser, setTokens } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailError(
      value && !validateEmail(value) ? '올바른 이메일 형식이 아닙니다' : ''
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 폼 검증
    if (!email || !password) {
      setError('모든 필드를 입력해주세요');
      return;
    }

    if (!validateEmail(email)) {
      setError('올바른 이메일 형식이 아닙니다');
      return;
    }

    try {
      setLoading(true);
      const data = await authService.login({ email, password });
      setUser(data.user);
      setTokens(data.access_token, data.refresh_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || '로그인에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorAlert message={error} />}

      <div>
        <label className="block text-sm font-medium">이메일</label>
        <input
          type="email"
          value={email}
          onChange={(e) => handleEmailChange(e.target.value)}
          disabled={loading}
          className={`w-full px-4 py-2 border rounded ${
            emailError ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !email || !password}
        className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '로그인 중...' : '로그인'}
      </button>
    </form>
  );
}
```

---

### PHASE 6: WebSocket 연결 안정화 (1day)

#### Task 6.1: WebSocket 서비스 개선

**파일:** `src/services/websocket.ts`

```typescript
import { useStore } from '@/store/useStore';

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private callId: string | null = null;

  connect(callId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.callId = callId;
        const token = useStore.getState().accessToken;
        this.url = `${process.env.NEXT_PUBLIC_WS_URL}/ws/${callId}`;

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WS] Connected');
          this.reconnectAttempts = 0;
          
          // 인증
          if (token) {
            this.send({
              type: 'auth',
              token,
            });
          }
          resolve();
        };

        this.ws.onerror = (error) => {
          console.error('[WS] Error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[WS] Disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[WS] WebSocket not connected');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.callId = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.callId) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(this.callId!).catch((error) => {
          console.error('[WS] Reconnect failed:', error);
        });
      }, delay);
    } else {
      console.error('[WS] Max reconnection attempts reached');
    }
  }
}

export const wsService = new WebSocketService();
```

#### Task 6.2: ChatView에서 WebSocket 사용

**파일:** `src/components/Chat/ChatView.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { wsService } from '@/services/websocket';
import { useStore } from '@/store/useStore';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface ChatViewProps {
  callId: string;
}

export function ChatView({ callId }: ChatViewProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const connect = async () => {
      try {
        await wsService.connect(callId);
        setIsConnected(true);

        // 메시지 리스너
        const handleMessage = (event: MessageEvent) => {
          const data = JSON.parse(event.data);
          setMessages((prev) => [...prev, data]);
        };

        wsService.ws?.addEventListener('message', handleMessage);

        return () => {
          wsService.ws?.removeEventListener('message', handleMessage);
          wsService.disconnect();
        };
      } catch (err: any) {
        setError('WebSocket 연결에 실패했습니다');
        console.error('WebSocket connection error:', err);
      }
    };

    connect();
  }, [callId]);

  const handleSendMessage = (content: string) => {
    if (!isConnected) {
      setError('연결이 끊어졌습니다. 다시 연결 중...');
      return;
    }

    wsService.send({
      type: 'message',
      role: 'user',
      content,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {!isConnected && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2">
          연결 중...
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2">
          {error}
        </div>
      )}
      <MessageList messages={messages} />
      <MessageInput onSend={handleSendMessage} disabled={!isConnected} />
    </div>
  );
}
```

---

### PHASE 7: 모바일 반응형 & 접근성 (1day)

#### Task 7.1: 모바일 최적화

**파일:** `src/components/Elderly/ElderlyCard.tsx` 수정

```typescript
export function ElderlyCard({ elderly }: ElderlyCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex-1 w-full">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 break-words">
            {elderly.name}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{elderly.age}세</p>
          <p className="text-sm text-gray-600">{elderly.phone}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            통화
          </button>
          <button className="flex-1 sm:flex-none px-3 py-2 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300">
            수정
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### Task 7.2: Accessibility 개선

```typescript
// 모든 버튼에 aria-label 추가
<button aria-label="어르신과 통화하기">통화</button>

// 폼 입력에 htmlFor 연결
<label htmlFor="email">이메일</label>
<input id="email" type="email" />

// 이미지에 alt 텍스트
<img src="/elderly.jpg" alt="등록된 어르신 사진" />

// 제목 구조
<h1>앱 제목</h1>
<h2>페이지 제목</h2>
<h3>섹션 제목</h3>
```

---

### PHASE 8: 에러 처리 & 토스트 알림 (1day)

#### Task 8.1: Toast 알림 시스템

**파일:** `src/components/Common/Toast.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

const toastStore: {
  messages: ToastMessage[];
  listeners: (() => void)[];
  add: (msg: Omit<ToastMessage, 'id'>) => void;
  remove: (id: string) => void;
} = {
  messages: [],
  listeners: [],
  add(msg: Omit<ToastMessage, 'id'>) {
    const id = Math.random().toString(36).substr(2, 9);
    const message: ToastMessage = { ...msg, id, duration: msg.duration || 3000 };
    this.messages.push(message);
    this.listeners.forEach((l) => l());

    setTimeout(() => this.remove(id), message.duration);
  },
  remove(id: string) {
    this.messages = this.messages.filter((m) => m.id !== id);
    this.listeners.forEach((l) => l());
  },
};

export function Toast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener = () => setMessages([...toastStore.messages]);
    toastStore.listeners.push(listener);
    return () => {
      toastStore.listeners = toastStore.listeners.filter((l) => l !== listener);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`px-4 py-2 rounded text-white ${
            msg.type === 'success'
              ? 'bg-green-500'
              : msg.type === 'error'
              ? 'bg-red-500'
              : msg.type === 'warning'
              ? 'bg-yellow-500'
              : 'bg-blue-500'
          }`}
        >
          {msg.message}
        </div>
      ))}
    </div>
  );
}

export const showToast = (msg: Omit<ToastMessage, 'id'>) => {
  toastStore.add(msg);
};
```

#### Task 8.2: Error Boundary

**파일:** `src/components/ErrorBoundary.tsx`

```typescript
'use client';

import React, { ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              문제가 발생했습니다
            </h1>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || '알 수 없는 오류'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              다시 시도
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 🧪 테스트 체크리스트

### 로컬 실행 테스트

```bash
cd frontend

# 1. 개발 서버 시작
npm run dev
# http://localhost:3000 접속

# 2. 각 페이지 테스트
## 회원가입 (http://localhost:3000/register)
- 이메일 검증 확인
- 비밀번호 강도 표시 확인
- 제출 버튼 활성화 확인

## 로그인 (http://localhost:3000/login)
- 이메일/비밀번호 검증
- 에러 메시지 표시
- 토큰 저장 확인

## 대시보드 (http://localhost:3000/dashboard)
- 로그인 상태 확인
- 어르신 목록 표시
- 토큰 갱신 작동 확인

## 어르신 관리
- 어르신 등록
- 어르신 수정
- 어르신 삭제

## 실시간 통화
- WebSocket 연결 성공
- 메시지 송수신
- 연결 해제 처리
```

### Backend 통합 테스트

```bash
# Backend 먼저 시작
cd backend
python -m uvicorn app.main:app --reload

# 다른 터미널에서 Frontend 시작
cd frontend
npm run dev

# 통합 테스트
## 1. 회원가입 → 로그인
## 2. 어르신 등록
## 3. 어르신 조회 (Backend에서도 확인)
## 4. 통화 시작
## 5. WebSocket 메시지 송수신
```

---

## 📝 최종 체크리스트

- [ ] `.env.local` 파일 생성 & 환경 변수 설정
- [ ] `npm install` 완료
- [ ] `npx tsc --noEmit` 컴파일 성공
- [ ] Axios 인터셉터 구현 완료
- [ ] API 서비스 메서드 구현 완료
- [ ] Zustand Store localStorage persist 설정
- [ ] 라우팅 보호 (Middleware 또는 Page level)
- [ ] 폼 유효성 검증 추가
- [ ] WebSocket 재연결 로직 구현
- [ ] 모바일 반응형 CSS 추가
- [ ] Error Boundary & Toast 알림 구현
- [ ] 모든 페이지 로컬 테스트 통과
- [ ] Backend와 통합 테스트 통과
- [ ] `npm run build` 성공 (빌드 에러 없음)

---

## 🚀 최종 목표

**2025-12-28까지:**
1. ✅ 모든 페이지 렌더링 정상
2. ✅ Backend API 완벽 연동
3. ✅ 토큰 자동 갱신 작동
4. ✅ 실시간 통화 (WebSocket) 정상
5. ✅ 모바일 반응형 완성
6. ✅ 에러 처리 완벽
7. ✅ npm run build 성공

**다음 단계:** 12/28-12/31 통합 테스트 진행

---

**이 가이드를 따라 모든 문제를 해결하고, Frontend를 완전히 정상화하면 Backend와 완벽한 통합이 가능합니다!**