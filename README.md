# SORI (소리) - AI 기반 독거노인 돌봄 서비스

독거노인을 위한 AI 음성 상담 및 보호자 모니터링 플랫폼입니다.

## 주요 기능

### 어르신용 iOS 앱
- **6자리 페어링 코드** - 보호자가 생성한 코드로 간편 연결
- **AI 음성 통화** - TTS/STT 기반 자연스러운 한국어 음성 대화
- **자동 예약 통화** - 설정된 시간에 자동으로 안부 전화
- **푸시 알림** - FCM 기반 통화 알림

### 보호자용 웹 대시보드
- **어르신 관리** - 프로필, 건강정보, 복용약물 관리
- **통화 스케줄 설정** - 요일/시간별 자동 통화 예약
- **통화 내역 조회** - 대화 기록 및 AI 분석 결과 확인
- **위험도 모니터링** - AI가 분석한 감정/건강 상태 알림
- **실시간 알림** - 고위험 감지 시 즉시 알림

### AI 분석
- **실시간 대화** - OpenAI GPT-4o-mini 기반 공감 대화 (Claude 3.5 Sonnet 폴백)
- **위험도 평가** - 0-100점 위험 점수 자동 산출
- **대화 요약** - 주요 내용 및 우려사항 자동 정리
- **통화 종료 감지** - AI가 자연스러운 대화 종료 의도 파악

## 기술 스택

### Backend
| 기술 | 버전 | 설명 |
|------|------|------|
| FastAPI | 0.104.1 | Python 비동기 웹 프레임워크 |
| PostgreSQL | 15 | 관계형 데이터베이스 |
| Redis | 7 | Celery 브로커 및 캐시 |
| Celery | 5.3.4 | 비동기 작업 처리 (스케줄링, 푸시 알림) |
| SQLAlchemy | 2.0.23 | ORM |
| OpenAI API | - | AI 대화 및 분석 (GPT-4o-mini) |
| Anthropic API | - | AI 폴백 (Claude 3.5 Sonnet) |
| Firebase Admin | 6.2.0 | FCM 푸시 알림 |

### Frontend (Web Dashboard)
| 기술 | 버전 | 설명 |
|------|------|------|
| Next.js | 16.1.0 | React 기반 풀스택 프레임워크 |
| React | 19.2.3 | UI 라이브러리 |
| TypeScript | 5 | 타입 안전성 |
| Tailwind CSS | 4 | 유틸리티 기반 스타일링 |
| Zustand | 5.0.9 | 상태 관리 |
| Axios | 1.13.2 | HTTP 클라이언트 |

### iOS App
| 기술 | 설명 |
|------|------|
| SwiftUI | 선언적 UI 프레임워크 (iOS 15+) |
| AVFoundation | TTS (Text-to-Speech) - 한국어 Yuna 음성 |
| Speech Framework | STT (Speech-to-Text) |
| URLSession | WebSocket 통신 |
| Keychain | 보안 토큰 저장 |

### Infrastructure
| 기술 | 설명 |
|------|------|
| Docker Compose | 컨테이너 오케스트레이션 |
| Nginx | 리버스 프록시 |
| Flower | Celery 모니터링 |
| AWS EC2 | 프로덕션 호스팅 |

## 프로젝트 구조

```
HUSS/
├── backend/                 # FastAPI 백엔드
│   ├── app/
│   │   ├── core/           # 설정, 보안, 예외처리
│   │   ├── models/         # SQLAlchemy 모델
│   │   ├── routes/         # API 엔드포인트
│   │   ├── schemas/        # Pydantic 스키마
│   │   ├── services/       # 비즈니스 로직
│   │   └── tasks/          # Celery 태스크
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/               # Next.js 프론트엔드
│   ├── app/               # App Router 페이지
│   ├── src/
│   │   ├── components/    # React 컴포넌트
│   │   ├── hooks/         # 커스텀 훅
│   │   ├── services/      # API 서비스
│   │   ├── store/         # Zustand 스토어
│   │   └── types/         # TypeScript 타입
│   ├── Dockerfile
│   └── package.json
│
├── ios/                    # iOS 앱 (SwiftUI)
│   └── Somi/
│       ├── Models/        # 데이터 모델
│       ├── Views/         # SwiftUI 뷰
│       ├── ViewModels/    # MVVM 뷰모델
│       ├── Services/      # 네트워크, TTS, STT 서비스
│       └── Utils/         # 유틸리티
│
├── contracts/              # API 계약 명세
│   ├── openapi.snapshot.json
│   └── ws.messages.md
│
├── docs/                   # 문서
│
├── docker-compose.yml      # 개발 환경 설정
├── docker-compose.prod.yml # 프로덕션 설정
├── init-db.sql            # 데이터베이스 초기화
└── nginx.conf             # Nginx 설정
```

## 시작하기

### 사전 요구사항
- Docker & Docker Compose
- Node.js 20+ (프론트엔드 로컬 개발 시)
- Python 3.11+ (백엔드 로컬 개발 시)
- Xcode 15+ (iOS 앱 개발 시)

### 환경 변수 설정

`.env` 파일을 프로젝트 루트에 생성:

```env
# Database
DB_USER=sori_user
DB_PASSWORD=sori_password
DB_NAME=sori_db

# Backend
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
PAIRING_CODE_PEPPER=32-char-random-string

# AI API (둘 중 하나 필수)
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=sk-ant-...

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Token Expiration
ACCESS_TOKEN_EXPIRE_HOURS=24
REFRESH_TOKEN_EXPIRE_DAYS=7
DEVICE_TOKEN_EXPIRE_DAYS=90

# Pairing Code
PAIRING_CODE_TTL_MINUTES=10
PAIRING_CODE_MAX_ATTEMPTS=5

# Environment
ENVIRONMENT=development
LOG_LEVEL=INFO
```

### Docker로 실행

```bash
# 전체 서비스 시작
docker-compose up -d --build

# 로그 확인
docker-compose logs -f backend

# 서비스 중지
docker-compose down
```

### 접속 URL

| 서비스 | 개발 URL | 프로덕션 URL |
|--------|----------|--------------|
| 프론트엔드 | http://localhost:3000 | http://52.79.227.179 |
| 백엔드 API | http://localhost:8000 | http://52.79.227.179:8000 |
| API 문서 | http://localhost:8000/docs | http://52.79.227.179:8000/docs |
| Flower | http://localhost:5555 | - |

## API 엔드포인트

### 인증
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/refresh` | 토큰 갱신 |
| GET | `/api/auth/me` | 현재 사용자 정보 |

### 어르신 관리
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/elderly` | 목록 조회 |
| POST | `/api/elderly` | 등록 |
| GET | `/api/elderly/{id}` | 상세 조회 |
| PUT | `/api/elderly/{id}` | 수정 |
| DELETE | `/api/elderly/{id}` | 삭제 |

### 페어링 (iOS 앱 연결)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/elderly/{id}/pairing-code` | 페어링 코드 생성 (보호자) |
| POST | `/api/pairing/claim` | 코드로 디바이스 등록 (어르신) |
| GET | `/api/elderly/{id}/pairing-status` | 페어링 상태 조회 |

### 통화
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/calls` | 통화 목록 |
| GET | `/api/calls/{id}` | 통화 상세 (완료된 통화만) |
| POST | `/api/calls` | 통화 시작 |
| PUT | `/api/calls/{id}/end` | 통화 종료 |

### WebSocket
```
WS /ws/{call_id}?token=... - 실시간 채팅
```

## iOS 앱 설정

### Xcode 프로젝트 열기
```bash
open ios/Somi.xcodeproj
```

### 서버 URL 설정
`ios/Somi/Utils/Constants.swift`:
```swift
struct API {
    static let baseURL = "http://localhost:8000"  // 시뮬레이터
    // static let baseURL = "http://YOUR_IP:8000"  // 실제 디바이스
}
```

### 필요한 권한 (Info.plist)
- `NSMicrophoneUsageDescription` - 마이크 사용
- `NSSpeechRecognitionUsageDescription` - 음성 인식

## 자동 예약 통화 시스템

### 작동 방식
1. **Celery Beat** - 매분 스케줄 체크 (`check_schedules`)
2. **매칭 시** - `scheduled` 상태의 Call 생성
3. **푸시 알림** - iOS 앱으로 FCM 전송
4. **미응답 시** - 5분 후 `missed` 처리

### 스케줄 형식 (JSONB)
```json
{
  "enabled": true,
  "times": ["09:00", "14:00", "19:00"],
  "days": [0, 1, 2, 3, 4, 5, 6]
}
```

## 위험도 평가 기준

| 점수 | 수준 | 설명 |
|------|------|------|
| 0-30 | 양호 | 정상적인 대화 |
| 31-50 | 주의 | 관심 필요 |
| 51-70 | 경고 | 모니터링 강화 |
| 71-90 | 고위험 | 즉시 확인 필요 |
| 91-100 | 위험 | 긴급 조치 필요 |

## 개발 현황

### 완료
- [x] 사용자 인증 (JWT, 리프레시 토큰)
- [x] 어르신 CRUD
- [x] 통화 스케줄 관리 (JSONB)
- [x] 실시간 WebSocket 채팅
- [x] AI 대화 (OpenAI/Claude)
- [x] 대화 분석 및 위험도 평가
- [x] 6자리 페어링 코드 시스템 (해시, TTL)
- [x] iOS 음성 통화 (TTS/STT)
- [x] 자동 예약 통화 (Celery Beat)
- [x] 통화 내역 및 메시지 조회
- [x] Firebase FCM 푸시 알림
- [x] 디바이스 토큰 관리
- [x] AI 통화 종료 감지
- [x] 진행 중 통화 접근 제어

### 진행 중
- [ ] 통화 녹음 기능
- [ ] 보호자 앱 개발

### 예정
- [ ] 다국어 지원
- [ ] 음성 감정 분석
- [ ] 가족 그룹 기능
- [ ] 건강 지표 추적

## 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 보호자 | `test@sori.com` | `Test1234` |

## 라이선스

This project is for educational purposes (HUSS University Project).
