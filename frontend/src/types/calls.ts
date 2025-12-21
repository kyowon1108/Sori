// ===========================================
// Call Status (백엔드 명세 기준)
// ===========================================
export type CallStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'missed';

export type CallType = 'voice' | 'video' | 'text';

export type TriggerType = 'auto' | 'manual' | 'emergency';

// ===========================================
// ChatMessage
// ===========================================
export interface ChatMessage {
  id: number;
  call_id: number;
  role: 'user' | 'assistant';
  content: string;
  is_streaming?: boolean;
  created_at: string;
}

// ===========================================
// CallAnalysis
// ===========================================
export interface CallAnalysis {
  id: number;
  call_id: number;
  risk_level: 'low' | 'medium' | 'high';
  sentiment_score: number;
  summary?: string;
  key_topics?: string[];
  recommendations?: string[];
  health_mentions?: string[];
  emotional_state?: string;
  analyzed_at: string;
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
