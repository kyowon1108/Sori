export const RISK_LEVELS = {
  low: '낮음',
  medium: '보통',
  high: '높음',
} as const;

export const CALL_TYPES = {
  voice: '음성',
  video: '영상',
  text: '문자',
} as const;

export const CALL_STATUS = {
  pending: '대기',
  ongoing: '진행 중',
  completed: '완료',
  failed: '실패',
  ended: '종료',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
    ME: '/api/auth/me',
    UPDATE_FCM: '/api/auth/update-fcm-token',
  },
  ELDERLY: {
    LIST: '/api/elderly',
    DETAIL: (id: number) => `/api/elderly/${id}`,
  },
  CALLS: {
    LIST: '/api/calls',
    DETAIL: (id: number) => `/api/calls/${id}`,
    START: '/api/calls/start',
    END: (id: number) => `/api/calls/${id}/end`,
  },
} as const;
