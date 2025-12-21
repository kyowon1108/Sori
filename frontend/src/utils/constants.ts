// ===========================================
// 위험도 (Risk Levels)
// ===========================================
export const RISK_LEVELS = {
  low: '낮음',
  medium: '보통',
  high: '높음',
} as const;

export const RISK_LEVEL_COLORS = {
  low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  high: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
} as const;

// ===========================================
// 통화 유형 (Call Types)
// ===========================================
export const CALL_TYPES = {
  voice: '음성',
  video: '영상',
  text: '문자',
} as const;

// ===========================================
// 통화 상태 (Call Status) - 백엔드 명세 기준
// ===========================================
export const CALL_STATUS = {
  scheduled: '예정됨',
  in_progress: '진행 중',
  completed: '완료',
  failed: '실패',
  cancelled: '취소',
  missed: '미응답',
} as const;

export const CALL_STATUS_COLORS = {
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  in_progress: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
  missed: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
} as const;

// ===========================================
// 트리거 유형 (Trigger Types)
// ===========================================
export const TRIGGER_TYPES = {
  auto: '자동',
  manual: '수동',
  emergency: '긴급',
} as const;

// ===========================================
// 이벤트 유형 (Event Types)
// ===========================================
export const EVENT_TYPES = {
  call_scheduled: '상담 예정',
  call_started: '상담 시작',
  call_completed: '상담 완료',
  call_missed: '미응답',
  call_failed: '상담 실패',
  call_cancelled: '상담 취소',
  analysis_completed: '분석 완료',
  analysis_failed: '분석 실패',
  risk_level_changed: '위험도 변경',
  device_inactive: '디바이스 비활성',
  device_registered: '디바이스 등록',
} as const;

export const EVENT_SEVERITY = {
  info: '정보',
  warning: '주의',
  error: '위험',
  success: '성공',
} as const;

export const EVENT_SEVERITY_COLORS = {
  info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'text-blue-500' },
  warning: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: 'text-orange-500' },
  error: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-500' },
  success: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: 'text-green-500' },
} as const;

// ===========================================
// 빈 상태 메시지 (Empty State Messages)
// ===========================================
export const EMPTY_STATES = {
  calls: {
    title: '통화 기록이 없습니다',
    description: '아직 진행된 상담이 없습니다.',
  },
  elderly: {
    title: '등록된 어르신이 없습니다',
    description: '새 어르신을 등록해주세요.',
  },
  alerts: {
    title: '알림이 없습니다',
    description: '현재 확인이 필요한 알림이 없습니다.',
  },
  events: {
    title: '이벤트가 없습니다',
    description: '아직 기록된 이벤트가 없습니다.',
  },
  scheduled_today: {
    title: '오늘 예정된 상담이 없습니다',
    description: '어르신의 상담 스케줄을 설정해주세요.',
  },
  action_needed: {
    title: '조치가 필요한 항목이 없습니다',
    description: '현재 모든 상황이 정상입니다.',
  },
} as const;

// ===========================================
// 토스트 메시지 (Toast Messages)
// ===========================================
export const TOAST_MESSAGES = {
  // 성공
  elderly_created: '어르신이 등록되었습니다.',
  elderly_updated: '어르신 정보가 수정되었습니다.',
  elderly_deleted: '어르신이 삭제되었습니다.',
  schedule_updated: '스케줄이 저장되었습니다.',
  call_started: '상담이 시작되었습니다.',
  call_ended: '상담이 종료되었습니다.',

  // 에러
  fetch_failed: '데이터를 불러오는데 실패했습니다.',
  save_failed: '저장에 실패했습니다.',
  delete_failed: '삭제에 실패했습니다.',
  connection_failed: '연결에 실패했습니다. 다시 시도해주세요.',
  session_expired: '세션이 만료되었습니다. 다시 로그인해주세요.',

  // 경고
  unsaved_changes: '저장되지 않은 변경사항이 있습니다.',
} as const;

// ===========================================
// 접근성 라벨 (Accessibility Labels)
// ===========================================
export const A11Y_LABELS = {
  close: '닫기',
  open_menu: '메뉴 열기',
  loading: '로딩 중',
  refresh: '새로고침',
  previous: '이전',
  next: '다음',
  filter: '필터',
  search: '검색',
  add: '추가',
  edit: '수정',
  delete: '삭제',
  save: '저장',
  cancel: '취소',
  confirm: '확인',
} as const;

// ===========================================
// API 엔드포인트 (API Endpoints)
// ===========================================
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
    SCHEDULE: (id: number) => `/api/elderly/${id}/schedule`,
    DEVICE: (id: number) => `/api/elderly/${id}/device`,
  },
  CALLS: {
    LIST: '/api/calls',
    DETAIL: (id: number) => `/api/calls/${id}`,
    START: '/api/calls/start',
    END: (id: number) => `/api/calls/${id}/end`,
    ANALYSIS: (id: number) => `/api/calls/${id}/analysis`,
  },
  DASHBOARD: {
    SUMMARY: '/api/dashboard/summary',
    EVENTS: '/api/dashboard/events',
  },
  ALERTS: {
    LIST: '/api/alerts',
    MARK_READ: (id: number) => `/api/alerts/${id}/read`,
    MARK_ALL_READ: '/api/alerts/read-all',
  },
} as const;

// ===========================================
// 날짜/시간 포맷 (Date/Time Formats)
// ===========================================
export const DATE_FORMATS = {
  date: 'yyyy년 M월 d일',
  time: 'HH:mm',
  datetime: 'yyyy년 M월 d일 HH:mm',
  short_date: 'M/d',
  short_datetime: 'M/d HH:mm',
  relative: 'relative', // for date-fns formatDistanceToNow
} as const;
