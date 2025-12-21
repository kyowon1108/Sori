// ===========================================
// Call Status (백엔드 명세 기준)
// ===========================================
export type CallStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'missed';

export type CallType = 'voice' | 'video' | 'text';

export type TriggerType = 'auto' | 'manual' | 'emergency';

// ===========================================
// Message Role (확장 가능한 union 타입)
// ===========================================
export type MessageRole = 'user' | 'assistant' | 'elderly' | 'caregiver' | 'system';

// ===========================================
// ChatMessage
// ===========================================
export interface ChatMessage {
  id: number;
  call_id: number;
  role: MessageRole;
  content: string;
  is_streaming?: boolean;
  created_at: string;
}

// ===========================================
// Risk Level Types
// ===========================================
export type RiskLevel = 'low' | 'medium' | 'high';

// ===========================================
// Risk Reason (분석 근거)
// ===========================================
export interface RiskReason {
  label: string;
  message_index?: number;
  message_id?: string;
}

// ===========================================
// Action Item Priority
// ===========================================
export type ActionPriority = 'high' | 'med' | 'low';

// ===========================================
// Action Item CTA Types
// ===========================================
export type ActionCTAType = 'open_elderly' | 'open_schedule' | 'note' | 'call';

export interface ActionCTA {
  type: ActionCTAType;
  targetId?: number;
}

// ===========================================
// Action Item
// ===========================================
export interface ActionItem {
  title: string;
  description?: string;
  priority: ActionPriority;
  cta?: ActionCTA;
}

// ===========================================
// CallAnalysis
// ===========================================
export interface CallAnalysis {
  id: number;
  call_id: number;
  risk_level: RiskLevel;
  sentiment_score: number;
  summary?: string;
  key_topics?: string[];
  recommendations?: string[];
  health_mentions?: string[];
  emotional_state?: string;
  analyzed_at: string;
  // 확장 필드 (백엔드에서 제공시 사용)
  risk_reasons?: RiskReason[];
  action_items?: ActionItem[];
}

// ===========================================
// Call
// ===========================================
export interface Call {
  id: number;
  elderly_id: number;
  elderly_name?: string; // 조인된 데이터
  call_type: CallType;
  trigger_type: TriggerType;
  status: CallStatus;
  scheduled_for?: string; // ISO datetime (예정 시간)
  started_at?: string;
  ended_at?: string;
  duration?: number; // seconds
  is_successful: boolean;
  messages?: ChatMessage[];
  analysis?: CallAnalysis;
  created_at: string;
  updated_at?: string;
}

// ===========================================
// API Request/Response Types
// ===========================================
export interface CallListParams {
  elderly_id?: number;
  status?: CallStatus | CallStatus[];
  trigger_type?: TriggerType;
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
}

export interface CallStartRequest {
  elderly_id: number;
  call_type?: CallType;
  trigger_type?: TriggerType;
}

export interface CallListResponse {
  items: Call[];
  total: number;
  skip: number;
  limit: number;
}
