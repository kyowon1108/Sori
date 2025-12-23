export const mockUser = {
  id: 1,
  email: 'e2e@sori.local',
  full_name: '테스트 보호자',
};

export const mockElderlyList = [
  {
    id: 1,
    caregiver_id: 1,
    name: '김영희',
    age: 78,
    phone: '010-1111-2222',
    address: '서울특별시 강남구',
    call_schedule: { enabled: true, times: ['09:00'] },
    health_condition: '고혈압',
    risk_level: 'low',
    device: {
      id: 10,
      elderly_id: 1,
      device_type: 'ios',
      is_active: true,
      registered_at: '2024-01-01T08:00:00Z',
    },
    next_scheduled_call: '2024-01-01T09:00:00Z',
    missed_calls_count: 0,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-01-01T08:00:00Z',
  },
  {
    id: 2,
    caregiver_id: 1,
    name: '박철수',
    age: 82,
    phone: '010-3333-4444',
    address: '서울특별시 송파구',
    call_schedule: { enabled: true, times: ['14:00'] },
    health_condition: '당뇨',
    risk_level: 'high',
    next_scheduled_call: '2024-01-01T14:00:00Z',
    missed_calls_count: 2,
    created_at: '2024-01-01T08:30:00Z',
    updated_at: '2024-01-01T08:30:00Z',
  },
];

export const mockCallsList = [
  {
    id: 101,
    elderly_id: 1,
    elderly_name: '김영희',
    call_type: 'voice',
    trigger_type: 'auto',
    status: 'completed',
    is_successful: true,
    created_at: '2024-01-01T08:40:00Z',
    updated_at: '2024-01-01T08:50:00Z',
    analysis: {
      id: 201,
      call_id: 101,
      risk_level: 'low',
      sentiment_score: 0.8,
      summary: '상태 안정, 약 복용 확인됨',
      analyzed_at: '2024-01-01T08:55:00Z',
      key_topics: ['약 복용', '식사'],
      emotional_state: 'calm',
    },
  },
  {
    id: 102,
    elderly_id: 2,
    elderly_name: '박철수',
    call_type: 'voice',
    trigger_type: 'manual',
    status: 'missed',
    is_successful: false,
    created_at: '2024-01-01T09:10:00Z',
    updated_at: '2024-01-01T09:20:00Z',
  },
];

export const mockPairingStatus = {
  elderly_id: 1,
  has_active_code: false,
  code_expires_at: null,
  paired_devices: [
    {
      id: 10,
      platform: 'ios',
      device_name: 'Sori Test iPhone',
      last_used_at: '2024-01-01T08:00:00Z',
    },
  ],
  device_count: 1,
};
