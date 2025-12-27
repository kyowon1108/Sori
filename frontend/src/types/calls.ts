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
// CallAnalysis (백엔드 스키마 기준)
// ===========================================
export interface CallAnalysis {
  id: number;
  call_id: number;
  summary?: string;
  risk_score: number; // 0-100
  concerns?: string;
  recommendations?: string;
  created_at: string;
  // 확장 필드 (프론트엔드에서 파생)
  risk_reasons?: RiskReason[];
  action_items?: ActionItem[];
}

// risk_score를 risk_level로 변환하는 헬퍼 함수
export function getRiskLevel(riskScore: number): RiskLevel {
  if (riskScore >= 70) return 'high';
  if (riskScore >= 40) return 'medium';
  return 'low';
}

// risk_score를 0-1 스케일 감정 점수로 변환 (높은 리스크 = 낮은 감정)
export function getSentimentFromRiskScore(riskScore: number): number {
  return 1 - (riskScore / 100);
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
