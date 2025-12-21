// ===========================================
// Event Types - 프론트엔드 통합 이벤트 모델
// ===========================================

export type EventType =
  | 'call_scheduled'
  | 'call_started'
  | 'call_completed'
  | 'call_missed'
  | 'call_failed'
  | 'call_cancelled'
  | 'analysis_completed'
  | 'analysis_failed'
  | 'risk_level_changed'
  | 'device_inactive'
  | 'device_registered';

export type EventSeverity = 'info' | 'warning' | 'error' | 'success';

// ===========================================
// CTA (Call To Action)
// ===========================================
export interface EventCTA {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

// ===========================================
// Event
// ===========================================
export interface Event {
  id: string;
  type: EventType;
  severity: EventSeverity;
  timestamp: string; // ISO datetime
  elderly_id?: number;
  elderly_name?: string;
  call_id?: number;
  title: string;
  description: string;
  cta?: EventCTA;
  is_read?: boolean;
  metadata?: Record<string, unknown>;
}

// ===========================================
// Alert (알림 - 읽음 상태가 있는 이벤트)
// ===========================================
export interface Alert extends Event {
  is_read: boolean;
  read_at?: string;
  requires_action?: boolean;
}

// ===========================================
// Action Needed Item (조치 필요 항목)
// ===========================================
export type ActionType =
  | 'missed_call'
  | 'no_device'
  | 'analysis_pending'
  | 'analysis_failed'
  | 'high_risk';

export interface ActionNeededItem {
  id: string;
  type: ActionType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  elderly_id: number;
  elderly_name: string;
  call_id?: number;
  title: string;
  description: string;
  created_at: string;
  cta: EventCTA;
}

// ===========================================
// Dashboard Summary
// ===========================================
export interface DashboardSummary {
  today: {
    scheduled: number;
    in_progress: number;
    completed: number;
    missed: number;
    failed: number;
  };
  elderly: {
    total: number;
    high_risk: number;
    no_device: number;
  };
  action_needed: ActionNeededItem[];
  recent_events: Event[];
}
