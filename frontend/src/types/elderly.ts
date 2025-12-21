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
  medications?: Array<{ name: string; dosage: string; frequency: string }>;
  emergency_contact?: string;
  notes?: string;
}
