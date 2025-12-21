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
  call_scheduled: '통화 예정',
  call_started: '통화 시작',
  call_completed: '통화 완료',
  call_missed: '미응답',
  call_failed: '통화 실패',
  call_cancelled: '통화 취소',
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
    title: '자동 통화 기록이 없습니다',
    description: '아직 진행된 자동 통화가 없습니다.',
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
    title: '오늘 예정된 자동 통화가 없습니다',
    description: '어르신의 자동 통화 스케줄을 설정해주세요.',
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
  call_started: '자동 통화가 시작되었습니다.',
  call_ended: '자동 통화가 종료되었습니다.',

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

// ===========================================
// UI 라벨 (Centralized UI Copy)
// ===========================================
export const UI_COPY = {
  // 네비게이션
  nav: {
    dashboard: '대시보드',
    elderlyManagement: '어르신 관리',
    callHistory: '통화 내역',
    alerts: '알림센터',
  },
  // 대시보드
  dashboard: {
    title: '대시보드',
    todaySummary: '오늘의 자동 통화',
    totalCalls: '총 통화 수',
    todayProgress: (count: number) => `오늘 ${count}건 진행`,
  },
  // 어르신 상세
  elderly: {
    tabs: {
      summary: '요약',
      schedule: '스케줄',
      calls: '통화 내역',
      devices: '기기 연결',
      notifications: '알림',
    },
    autoCallOn: '자동 통화 ON',
    autoCallOff: '자동 통화 OFF',
    nextAutoCall: '다음 자동 통화',
    autoCallDisabled: '자동 통화 비활성',
    lastCall: '마지막 통화',
    callStats: '통화 통계',
    noCallRecord: '통화 기록 없음',
  },
  // 스케줄
  schedule: {
    title: '자동 통화 스케줄',
    autoCall: '자동 통화',
    dailyCallTime: '일일 통화 시간',
    totalDailyCalls: (count: number) => `총 ${count}회의 통화가 매일 진행됩니다`,
    next7Days: '다음 7일 예정된 통화',
    next7DaysTotal: (count: number) => `다음 7일간 총 ${count}건의 통화가 예정되어 있습니다`,
    disabled: '자동 통화가 비활성화되어 있습니다',
    disabledDesc: '자동 통화를 활성화하면 정해진 시간에 SORI가 자동으로 어르신께 전화를 걸어 안부를 확인합니다.',
    autoAICallDesc: '설정된 시간에 자동으로 AI 통화가 시작됩니다. 최대 5개까지 설정할 수 있습니다.',
    enableAutoCallDesc: '자동 통화가 비활성화되어 있습니다. 활성화하면 설정된 시간에 자동으로 통화가 시작됩니다.',
  },
  // 알림 설정
  notifications: {
    missedCall: {
      label: '미응답 알림',
      description: '예정된 통화에 어르신이 응답하지 않으면 알림을 받습니다',
    },
    highRisk: {
      label: '고위험 알림',
      description: '통화 분석 결과 위험 수준이 높으면 즉시 알림을 받습니다',
    },
    callComplete: {
      label: '통화 완료 알림',
      description: '통화가 완료되면 요약과 함께 알림을 받습니다',
    },
    dailySummary: {
      label: '일일 요약',
      description: '매일 저녁 그날의 통화 내용을 요약해서 알림을 받습니다',
    },
  },
  // 디바이스
  devices: {
    connectionComplete: '연결 완료! 이제 정해진 시간에 자동으로 통화가 시작됩니다',
  },
  // 이벤트 메시지
  events: {
    callScheduled: (time: string) => `${time}에 통화 예정`,
    callScheduledDefault: '통화가 예정되어 있습니다',
    callInProgress: '현재 통화가 진행 중입니다',
    callCompleted: (minutes: number) => `${minutes}분간 통화 완료`,
    callCompletedDefault: '통화가 완료되었습니다',
    callMissed: '예정된 통화에 응답하지 않았습니다',
    callFailed: '통화 연결에 실패했습니다',
    callCancelled: '통화가 취소되었습니다',
  },
  // 조치 필요
  actions: {
    missedCall: '미응답 통화',
    missedCallDesc: (name: string, count: number) => `${name}님이 ${count}건의 통화에 응답하지 않았습니다`,
    callFailed: '통화 실패',
    callFailedDesc: (name: string) => `${name}님과의 통화 연결에 실패했습니다`,
  },
  // 요약탭 관련
  summary: {
    highRiskAlert: (count: number) => `최근 통화에서 ${count}건의 고위험 상황이 감지되었습니다.`,
    checkCallHistory: '통화 내역을 확인해주세요.',
    checkHighRiskCalls: '최근 고위험 통화 확인',
    autoCallScheduleDesc: '매일 다음 시간에 자동으로 AI 통화가 진행됩니다 (KST):',
    autoCallDisabledDesc: '자동 통화가 비활성화되어 있습니다. 스케줄을 설정하면 자동으로 통화가 진행됩니다.',
  },
} as const;
