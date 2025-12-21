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

-- calls 테이블
CREATE TABLE IF NOT EXISTS calls (
    id SERIAL PRIMARY KEY,
    elderly_id INTEGER NOT NULL REFERENCES elderly(id) ON DELETE CASCADE,
    call_type VARCHAR(50) DEFAULT 'voice',
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    duration INTEGER,
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
    risk_level VARCHAR(20) DEFAULT 'low',
    sentiment_score FLOAT DEFAULT 0.0,
    summary TEXT,
    recommendations JSONB,
    analyzed_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_elderly_caregiver_id ON elderly(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_elderly_id ON calls(elderly_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_call_id ON messages(call_id);
CREATE INDEX IF NOT EXISTS idx_call_analysis_call_id ON call_analysis(call_id);

-- 테스트 데이터 (개발 환경용)
INSERT INTO users (email, password_hash, full_name, role) VALUES
('test@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5EeVHTZLqQnqm', 'Test User', 'caregiver')
ON CONFLICT (email) DO NOTHING;
