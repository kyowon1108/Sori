// ===========================================
// Risk Level
// ===========================================
export type RiskLevel = 'low' | 'medium' | 'high';

// ===========================================
// CallSchedule
// ===========================================
export interface CallSchedule {
  enabled: boolean;
  times: string[];  // ["09:00", "14:00"]
}

// ===========================================
// Device (어르신 디바이스 정보)
// ===========================================
export interface ElderlyDevice {
  id: number;
  elderly_id: number;
  device_type: 'ios' | 'android' | 'web';
  device_token?: string;
  is_active: boolean;
  last_active_at?: string;
  registered_at: string;
}

// ===========================================
// Medication
// ===========================================
export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

// ===========================================
// Elderly
// ===========================================
export interface Elderly {
  id: number;
  caregiver_id: number;
  name: string;
  age?: number;
  phone?: string;
  address?: string;
  call_schedule: CallSchedule;
  health_condition?: string;
  medications?: Medication[];
  emergency_contact?: string;
  risk_level: RiskLevel;
  notes?: string;
  // 계산된 필드 (API에서 제공)
  device?: ElderlyDevice;
  next_scheduled_call?: string; // ISO datetime
  last_call_at?: string;
  missed_calls_count?: number;
  created_at: string;
  updated_at: string;
}

// ===========================================
// API Request Types
// ===========================================
export interface ElderlyCreateRequest {
  name: string;
  age?: number;
  phone?: string;
  address?: string;
  call_schedule?: CallSchedule;
  health_condition?: string;
  medications?: Medication[];
  emergency_contact?: string;
  notes?: string;
}

export interface ElderlyUpdateRequest extends Partial<ElderlyCreateRequest> {}

export interface ElderlyScheduleUpdateRequest {
  enabled: boolean;
  times: string[];
}

// ===========================================
// Filter/List Types
// ===========================================
export interface ElderlyListParams {
  search?: string;
  risk_level?: RiskLevel | RiskLevel[];
  has_device?: boolean;
  has_missed_calls?: boolean;
  schedule_enabled?: boolean;
  skip?: number;
  limit?: number;
}

export interface ElderlyListResponse {
  items: Elderly[];
  total: number;
  skip: number;
  limit: number;
}
