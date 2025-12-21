# SORI (소리) - AI 기반 독거노인 돌봄 서비스

독거노인을 위한 AI 음성 상담 및 보호자 모니터링 플랫폼입니다.

## 주요 기능

### 어르신용 iOS 앱
- **6자리 페어링 코드** - 보호자가 생성한 코드로 간편 연결
- **AI 음성 통화** - TTS/STT 기반 자연스러운 음성 대화
- **자동 예약 통화** - 설정된 시간에 자동으로 안부 전화
- **푸시 알림** - FCM 기반 통화 알림 (Firebase 설정 필요)

### 보호자용 웹 대시보드
- **어르신 관리** - 프로필, 건강정보, 복용약물 관리
- **통화 스케줄 설정** - 요일/시간별 자동 통화 예약
- **통화 내역 조회** - 대화 기록 및 AI 분석 결과 확인
- **위험도 모니터링** - AI가 분석한 감정/건강 상태 알림

### AI 분석
- **실시간 대화** - OpenAI GPT-4o-mini (또는 Claude) 기반 공감 대화
- **위험도 평가** - 0-100점 위험 점수 자동 산출
- **대화 요약** - 주요 내용 및 우려사항 자동 정리
- **보호자 알림** - 고위험 감지 시 즉시 알림

## 기술 스택

### Backend
- **FastAPI** - Python 비동기 웹 프레임워크
- **PostgreSQL** - 관계형 데이터베이스
- **Redis** - Celery 브로커 및 캐시
- **Celery** - 비동기 작업 처리 (스케줄링, 푸시 알림)
- **WebSocket** - 실시간 채팅 통신
- **OpenAI API** - AI 대화 및 분석

### Frontend (Web)
- **Next.js 16** - React 기반 풀스택 프레임워크
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 유틸리티 기반 스타일링
- **Zustand** - 상태 관리

### iOS App
- **SwiftUI** - 선언적 UI 프레임워크
- **AVFoundation** - TTS (Text-to-Speech)
- **Speech Framework** - STT (Speech-to-Text)
- **URLSessionWebSocketTask** - WebSocket 통신

### Infrastructure
- **Docker Compose** - 컨테이너 오케스트레이션
- **Nginx** - 리버스 프록시
- **Flower** - Celery 모니터링

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
│   ├── src/
│   │   ├── app/           # 페이지 라우트
│   │   ├── components/    # React 컴포넌트
│   │   ├── hooks/         # 커스텀 훅
│   │   ├── services/      # API 서비스
│   │   ├── store/         # Zustand 스토어
│   │   └── types/         # TypeScript 타입
│   ├── Dockerfile
│   └── package.json
│
├── iOS/                    # iOS 앱 (SwiftUI)
│   └── Somi/
│       ├── Models/        # 데이터 모델
│       ├── Views/         # SwiftUI 뷰
│       ├── ViewModels/    # MVVM 뷰모델
│       ├── Services/      # 네트워크, TTS, STT 서비스
│       └── Utils/         # 유틸리티
│
├── docker-compose.yml      # 개발 환경 설정
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

# AI API (둘 중 하나 필수)
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=sk-ant-...

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Environment
ENVIRONMENT=development
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

| 서비스 | URL |
|--------|-----|
| 프론트엔드 | http://localhost:3000 |
| 백엔드 API | http://localhost:8000 |
| API 문서 | http://localhost:8000/docs |
| Flower (Celery 모니터링) | http://localhost:5555 |

## API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/refresh` - 토큰 갱신

### 어르신 관리
- `GET /api/elderly` - 목록 조회
- `POST /api/elderly` - 등록
- `GET /api/elderly/{id}` - 상세 조회
- `PUT /api/elderly/{id}` - 수정
- `DELETE /api/elderly/{id}` - 삭제

### 페어링 (iOS 앱 연결)
- `POST /api/elderly/{id}/pairing-code` - 페어링 코드 생성
- `POST /api/pairing/claim` - 코드로 디바이스 등록 (공개)
- `GET /api/elderly/{id}/pairing-status` - 페어링 상태 조회

### 통화
- `GET /api/calls` - 통화 목록
- `GET /api/calls/{id}` - 통화 상세 (메시지 포함)
- `POST /api/calls` - 통화 시작
- `PUT /api/calls/{id}/end` - 통화 종료

### WebSocket
- `WS /ws/{call_id}?token=...` - 실시간 채팅

## iOS 앱 설정

### Xcode 프로젝트 열기
```bash
open iOS/Somi.xcodeproj
```

### 서버 URL 설정
`iOS/Somi/Utils/Constants.swift`:
```swift
struct API {
    static let baseURL = "http://localhost:8000"  // 시뮬레이터
    // static let baseURL = "http://YOUR_IP:8000"  // 실제 디바이스
}
```

### 필요한 권한 (Info.plist)
- `NSMicrophoneUsageDescription` - 음성 인식
- `NSSpeechRecognitionUsageDescription` - 음성 인식

## 자동 예약 통화 시스템

### 작동 방식
1. **Celery Beat** - 매분 스케줄 체크 (`check_schedules`)
2. **매칭 시** - `scheduled` 상태의 Call 생성
3. **푸시 알림** - iOS 앱으로 FCM 전송
4. **미응답 시** - 5분 후 `missed` 처리

### Firebase 설정 (선택)
푸시 알림을 사용하려면:
1. [Firebase Console](https://console.firebase.google.com)에서 프로젝트 생성
2. iOS 앱 등록 (Bundle ID: `com.sori.app`)
3. 서비스 계정 키 다운로드 → `firebase-credentials.json`
4. Docker 재시작

> Firebase 없이도 iOS 앱의 DEBUG 폴링으로 테스트 가능

## 개발 현황

### 완료
- [x] 사용자 인증 (JWT)
- [x] 어르신 CRUD
- [x] 통화 스케줄 관리
- [x] 실시간 WebSocket 채팅
- [x] AI 대화 (OpenAI/Claude)
- [x] 대화 분석 및 위험도 평가
- [x] 6자리 페어링 코드 시스템
- [x] iOS 음성 통화 (TTS/STT)
- [x] 자동 예약 통화 (Celery Beat)
- [x] 통화 내역 및 메시지 조회

### 진행 중
- [ ] Firebase FCM 푸시 알림 연동
- [ ] 보호자 앱 푸시 알림
- [ ] 통화 녹음 기능

### 예정
- [ ] 다국어 지원
- [ ] 음성 감정 분석
- [ ] 가족 그룹 기능

## 라이선스

This project is for educational purposes (HUSS University Project).
