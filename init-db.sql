-- users 테이블
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'caregiver',
    fcm_token VARCHAR(512),
    device_type VARCHAR(20),
    push_enabled BOOLEAN DEFAULT TRUE,
    fcm_token_updated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- elderly 테이블
CREATE TABLE IF NOT EXISTS elderly (
    id SERIAL PRIMARY KEY,
    caregiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    age INTEGER,
    phone VARCHAR(20),
    call_schedule JSONB DEFAULT '{"enabled": true, "times": ["09:00", "14:00", "19:00"]}',
    health_condition TEXT,
    medications JSONB,
    emergency_contact VARCHAR(255),
    risk_level VARCHAR(20) DEFAULT 'low',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- elderly_devices 테이블 (FCM 푸시 토큰)
CREATE TABLE IF NOT EXISTS elderly_devices (
    id SERIAL PRIMARY KEY,
    elderly_id INTEGER NOT NULL REFERENCES elderly(id) ON DELETE CASCADE,
    fcm_token VARCHAR(512) NOT NULL UNIQUE,
    platform VARCHAR(20) DEFAULT 'ios',
    device_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);

-- calls 테이블
CREATE TABLE IF NOT EXISTS calls (
    id SERIAL PRIMARY KEY,
    elderly_id INTEGER NOT NULL REFERENCES elderly(id) ON DELETE CASCADE,
    call_type VARCHAR(50) DEFAULT 'voice',
    trigger_type VARCHAR(50) DEFAULT 'manual',
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    duration INTEGER,
    scheduled_for TIMESTAMP,
    status VARCHAR(50) DEFAULT 'in_progress',
    is_successful BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- messages 테이블
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    call_id INTEGER NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- call_analysis 테이블
CREATE TABLE IF NOT EXISTS call_analysis (
    id SERIAL PRIMARY KEY,
    call_id INTEGER NOT NULL UNIQUE REFERENCES calls(id) ON DELETE CASCADE,
    summary TEXT,
    risk_score INTEGER DEFAULT 0,
    concerns TEXT,
    recommendations TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- elderly_pairing_codes 테이블 (6자리 페어링 코드)
CREATE TABLE IF NOT EXISTS elderly_pairing_codes (
    id SERIAL PRIMARY KEY,
    elderly_id INTEGER NOT NULL REFERENCES elderly(id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_elderly_caregiver_id ON elderly(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_elderly_devices_elderly_id ON elderly_devices(elderly_id);
CREATE INDEX IF NOT EXISTS idx_elderly_devices_fcm_token ON elderly_devices(fcm_token);
CREATE INDEX IF NOT EXISTS idx_calls_elderly_id ON calls(elderly_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);
CREATE INDEX IF NOT EXISTS idx_calls_scheduled_for ON calls(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_messages_call_id ON messages(call_id);
CREATE INDEX IF NOT EXISTS idx_call_analysis_call_id ON call_analysis(call_id);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_elderly_id ON elderly_pairing_codes(elderly_id);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_code_hash ON elderly_pairing_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_expires_at ON elderly_pairing_codes(expires_at);

-- 테스트 데이터 (개발 환경용)
INSERT INTO users (email, password_hash, full_name, role) VALUES
('test@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5EeVHTZLqQnqm', 'Test User', 'caregiver')
ON CONFLICT (email) DO NOTHING;
