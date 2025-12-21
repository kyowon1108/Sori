# 🔵 SESSION 3: iOS APP (SwiftUI) - 구현 Prompt

**목표:** SwiftUI + Combine을 사용한 iOS 어르신용 상담 앱 구현  
**기한:** 2025-01-31  
**역할:** iOS 개발자  
**의존:** Session 1 (Backend API) - 모든 엔드포인트를 호출  
**최소 버전:** iOS 14.0+  

---

## 📋 최우선 준수 규칙

### 🚫 MUST DO / MUST NOT
1. **API 호출 정확성** (Backend와 일치)
   - URLSession으로 REST API 호출
   - 엔드포인트, HTTP 메서드, 요청/응답 필드명 100% 일치
   - Codable 구조체로 JSON 인코딩/디코딩

2. **토큰 관리** (Keychain 사용)
   - accessToken, refreshToken을 Keychain에 저장
   - 메모리에만 저장하면 앱 재시작 시 사라짐
   - refresh 토큰으로 자동 갱신

3. **WebSocket 연결** (URLSessionWebSocketTask)
   - /ws/{call_id}로 연결
   - Authorization 헤더에 토큰 포함
   - 메시지 포맷: {type, role, content}
   - 연결 해제 시 UI 업데이트

4. **UI 업데이트** (SwiftUI @State/@StateObject)
   - ViewModel에서 @Published 변수 사용
   - MainThread에서만 UI 업데이트 (@MainActor)
   - View는 ViewModel 바인딩으로 데이터 표시

5. **Firebase FCM** (푸시 알림)
   - 앱 시작 시 FCM 토큰 얻기
   - Backend에 FCM 토큰 저장 (POST /api/auth/update-fcm-token)
   - 푸시 알림 수신 시 앱에 표시

---

## 🛠️ 개발 순서 (Phase별)

### **Phase 1: Xcode 프로젝트 설정 (1-2일)**

#### 1.1 프로젝트 생성
```
File → New → Project
→ iOS → App
→ Product Name: Somi
→ Interface: SwiftUI
→ Language: Swift
```

#### 1.2 폴더 구조
```
Somi/
├── SomiApp.swift
├── AppDelegate.swift
├── Models/
│   ├── Auth.swift
│   ├── Elderly.swift
│   ├── Call.swift
│   ├── ChatMessage.swift
│   └── Responses.swift
├── ViewModels/
│   ├── AuthViewModel.swift
│   ├── ElderlyViewModel.swift
│   ├── ChatViewModel.swift
│   └── CallViewModel.swift
├── Views/
│   ├── Auth/
│   │   ├── LoginView.swift
│   │   ├── RegisterView.swift
│   │   └── AuthContainerView.swift
│   ├── Main/
│   │   ├── DashboardView.swift
│   │   ├── ElderlyListView.swift
│   │   ├── ElderlyDetailView.swift
│   │   ├── CallView.swift
│   │   ├── ChatView.swift
│   │   └── MainContainerView.swift
│   ├── Components/
│   │   ├── ElderlyCard.swift
│   │   ├── MessageBubble.swift
│   │   ├── LoadingView.swift
│   │   └── ErrorAlert.swift
│   └── ContentView.swift
├── Services/
│   ├── APIService.swift
│   ├── WebSocketService.swift
│   ├── KeychainService.swift
│   └── FirebaseService.swift
├── Utils/
│   ├── Constants.swift
│   ├── Validators.swift
│   └── Extensions/
│       ├── URLComponents+Extensions.swift
│       ├── String+Extensions.swift
│       └── Date+Extensions.swift
└── Info.plist / Assets
```

#### 1.3 CocoaPods 또는 SPM으로 Firebase 추가
```bash
# CocoaPods (권장)
cd Somi
pod init
# Podfile 수정: pod 'Firebase/Messaging'
pod install
```

또는 Xcode에서:
```
File → Add Packages
→ https://github.com/firebase/firebase-ios-sdk.git
→ Version: 10.0.0
```

#### 1.4 Constants.swift
```swift
import Foundation

struct APIConstants {
    static let baseURL = "http://localhost:8000"
    static let wsBaseURL = "ws://localhost:8000"
    static let apiTimeout = 30.0
    static let environment = "development"
}

struct ValidationRules {
    static let minPasswordLength = 8
    static let maxNameLength = 255
}

struct AppConstants {
    static let appName = "Somi"
    static let appVersion = "1.0.0"
}
```

---

### **Phase 2: 모델 정의 (1-2일)**

#### 2.1 Models/Auth.swift
```swift
import Foundation

struct User: Codable, Identifiable {
    let id: Int
    let email: String
    let full_name: String
    let role: String
    let fcm_token: String?
    let device_type: String?
    let push_enabled: Bool
    
    enum CodingKeys: String, CodingKey {
        case id, email, full_name, role, fcm_token, device_type, push_enabled
    }
}

struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct RegisterRequest: Codable {
    let email: String
    let password: String
    let full_name: String
}

struct AuthResponse: Codable {
    let access_token: String
    let refresh_token: String
    let user: User
}

struct TokenRefreshRequest: Codable {
    let refresh_token: String
}

struct FCMTokenRequest: Codable {
    let fcm_token: String
    let device_type: String
}
```

#### 2.2 Models/Elderly.swift
```swift
import Foundation

struct CallSchedule: Codable {
    let enabled: Bool
    let times: [String]
}

struct Elderly: Codable, Identifiable {
    let id: Int
    let caregiver_id: Int
    let name: String
    let age: Int?
    let phone: String?
    let call_schedule: CallSchedule
    let health_condition: String?
    let medications: [Medication]?
    let emergency_contact: String?
    let risk_level: String
    let notes: String?
    let created_at: String
    let updated_at: String
}

struct Medication: Codable {
    let name: String
    let dosage: String
    let frequency: String
}

struct ElderlyCreateRequest: Codable {
    let name: String
    let age: Int?
    let phone: String?
    let call_schedule: CallSchedule?
    let health_condition: String?
    let medications: [Medication]?
    let emergency_contact: String?
    let notes: String?
}
```

#### 2.3 Models/Call.swift & ChatMessage.swift
```swift
import Foundation

struct Call: Codable, Identifiable {
    let id: Int
    let elderly_id: Int
    let call_type: String
    let started_at: String
    let ended_at: String?
    let duration: Int?
    let status: String
    let is_successful: Bool
    let created_at: String
    let messages: [ChatMessage]?
    let analysis: CallAnalysis?
}

struct ChatMessage: Codable, Identifiable {
    let id: Int
    let call_id: Int
    let role: String  // "user", "assistant"
    let content: String
    let created_at: String
}

struct CallAnalysis: Codable {
    let id: Int
    let call_id: Int
    let risk_level: String
    let sentiment_score: Float
    let summary: String?
    let recommendations: [String]?
    let analyzed_at: String
}

struct CallStartRequest: Codable {
    let elderly_id: Int
    let call_type: String
}

struct CallStartResponse: Codable {
    let id: Int
    let elderly_id: Int
    let call_type: String
    let started_at: String
    let status: String
    let ws_url: String
}

// WebSocket 메시지
struct WSMessage: Codable {
    let type: String
    let content: String?
    let role: String?
    let is_streaming: Bool?
}
```

#### 2.4 Models/Responses.swift
```swift
import Foundation

struct APIResponse<T: Codable>: Codable {
    let status: String
    let code: Int
    let message: String
    let data: T?
    let errors: [String: [String]]?
}

// 제네릭 디코딩을 위한 헬퍼
struct EmptyResponse: Codable {}
```

---

### **Phase 3: Services (2-3일)**

#### 3.1 Services/KeychainService.swift
```swift
import Foundation

final class KeychainService {
    static let shared = KeychainService()
    
    private let service = "com.sori.app"
    
    func save(_ value: String, forKey key: String) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        return SecItemAdd(query as CFDictionary, nil) == errSecSuccess
    }
    
    func retrieve(forKey key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]
        
        var result: AnyObject?
        if SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
           let data = result as? Data,
           let value = String(data: data, encoding: .utf8) {
            return value
        }
        return nil
    }
    
    func delete(forKey key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        return SecItemDelete(query as CFDictionary) == errSecSuccess
    }
}
```

#### 3.2 Services/APIService.swift
```swift
import Foundation
import Combine

final class APIService {
    static let shared = APIService()
    
    private var cancellables = Set<AnyCancellable>()
    private var accessToken: String?
    private var refreshToken: String?
    private let keychainService = KeychainService.shared
    
    init() {
        loadTokens()
    }
    
    // MARK: - Token Management
    private func loadTokens() {
        accessToken = keychainService.retrieve(forKey: "accessToken")
        refreshToken = keychainService.retrieve(forKey: "refreshToken")
    }
    
    func setTokens(_ access: String, _ refresh: String) {
        accessToken = access
        refreshToken = refresh
        keychainService.save(access, forKey: "accessToken")
        keychainService.save(refresh, forKey: "refreshToken")
    }
    
    func clearTokens() {
        accessToken = nil
        refreshToken = nil
        keychainService.delete(forKey: "accessToken")
        keychainService.delete(forKey: "refreshToken")
    }
    
    // MARK: - Generic Request
    private func request<T: Codable>(
        method: String,
        endpoint: String,
        body: Encodable? = nil,
        retry: Bool = true
    ) -> AnyPublisher<T, APIError> {
        guard let url = URL(string: APIConstants.baseURL + endpoint) else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = APIConstants.apiTimeout
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // 토큰 추가
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        // 요청 본문
        if let body = body {
            request.httpBody = try? JSONEncoder().encode(body)
        }
        
        return URLSession.shared
            .dataTaskPublisher(for: request)
            .tryMap { data, response in
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw APIError.invalidResponse
                }
                
                // 401 응답 처리 (토큰 만료)
                if httpResponse.statusCode == 401 && retry {
                    throw APIError.unauthorized
                }
                
                return data
            }
            .decode(type: APIResponse<T>.self, decoder: JSONDecoder())
            .tryMap { response in
                if response.status == "success", let data = response.data {
                    return data
                } else {
                    throw APIError.apiError(response.message)
                }
            }
            .catch { error -> AnyPublisher<T, APIError> in
                if let apiError = error as? APIError, apiError == .unauthorized, retry {
                    return self.refreshTokenAndRetry(method: method, endpoint: endpoint, body: body)
                }
                return Fail(error: error as? APIError ?? .unknown).eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    private func refreshTokenAndRetry<T: Codable>(
        method: String,
        endpoint: String,
        body: Encodable?
    ) -> AnyPublisher<T, APIError> {
        guard let refresh = refreshToken else {
            return Fail(error: APIError.unauthorized).eraseToAnyPublisher()
        }
        
        return requestRefreshToken(refresh)
            .flatMap { [weak self] response -> AnyPublisher<T, APIError> in
                guard let self = self else {
                    return Fail(error: APIError.unknown).eraseToAnyPublisher()
                }
                self.setTokens(response.access_token, response.refresh_token)
                return self.request(method: method, endpoint: endpoint, body: body, retry: false)
            }
            .eraseToAnyPublisher()
    }
    
    private func requestRefreshToken(_ refreshToken: String) -> AnyPublisher<AuthResponse, APIError> {
        let request = TokenRefreshRequest(refresh_token: refreshToken)
        return self.request(method: "POST", endpoint: "/api/auth/refresh", body: request, retry: false)
    }
    
    // MARK: - Auth Endpoints
    func register(_ req: RegisterRequest) -> AnyPublisher<User, APIError> {
        request(method: "POST", endpoint: "/api/auth/register", body: req)
    }
    
    func login(_ req: LoginRequest) -> AnyPublisher<AuthResponse, APIError> {
        request(method: "POST", endpoint: "/api/auth/login", body: req)
    }
    
    func getCurrentUser() -> AnyPublisher<User, APIError> {
        request(method: "GET", endpoint: "/api/auth/me")
    }
    
    func updateFCMToken(_ req: FCMTokenRequest) -> AnyPublisher<EmptyResponse, APIError> {
        request(method: "POST", endpoint: "/api/auth/update-fcm-token", body: req)
    }
    
    // MARK: - Elderly Endpoints
    func getElderlyList(skip: Int = 0, limit: Int = 10) -> AnyPublisher<[Elderly], APIError> {
        let query = "?skip=\(skip)&limit=\(limit)"
        return request(method: "GET", endpoint: "/api/elderly\(query)")
    }
    
    func getElderly(_ id: Int) -> AnyPublisher<Elderly, APIError> {
        request(method: "GET", endpoint: "/api/elderly/\(id)")
    }
    
    func createElderly(_ req: ElderlyCreateRequest) -> AnyPublisher<Elderly, APIError> {
        request(method: "POST", endpoint: "/api/elderly", body: req)
    }
    
    func updateElderly(_ id: Int, _ req: ElderlyCreateRequest) -> AnyPublisher<Elderly, APIError> {
        request(method: "PUT", endpoint: "/api/elderly/\(id)", body: req)
    }
    
    func deleteElderly(_ id: Int) -> AnyPublisher<EmptyResponse, APIError> {
        request(method: "DELETE", endpoint: "/api/elderly/\(id)")
    }
    
    // MARK: - Call Endpoints
    func getCallsList(elderlyId: Int? = nil, skip: Int = 0, limit: Int = 10) -> AnyPublisher<[Call], APIError> {
        var query = "?skip=\(skip)&limit=\(limit)"
        if let elderlyId = elderlyId {
            query += "&elderly_id=\(elderlyId)"
        }
        return request(method: "GET", endpoint: "/api/calls\(query)")
    }
    
    func getCall(_ id: Int) -> AnyPublisher<Call, APIError> {
        request(method: "GET", endpoint: "/api/calls/\(id)")
    }
    
    func startCall(_ req: CallStartRequest) -> AnyPublisher<CallStartResponse, APIError> {
        request(method: "POST", endpoint: "/api/calls/start", body: req)
    }
    
    func endCall(_ id: Int) -> AnyPublisher<Call, APIError> {
        request(method: "POST", endpoint: "/api/calls/\(id)/end")
    }
}

// MARK: - Error Handling
enum APIError: Error, Equatable {
    case invalidURL
    case invalidResponse
    case unauthorized
    case apiError(String)
    case decodingError
    case unknown
}
```

#### 3.3 Services/WebSocketService.swift
```swift
import Foundation
import Combine

final class WebSocketService: NSObject, URLSessionWebSocketDelegate {
    static let shared = WebSocketService()
    
    var messagePublisher = PassthroughSubject<ChatMessage, Never>()
    var connectionStatusPublisher = PassthroughSubject<Bool, Never>()
    
    private var webSocket: URLSessionWebSocket?
    private var receiveTask: URLSessionWebSocketTask?
    
    override private init() {
        super.init()
    }
    
    func connect(
        callId: Int,
        token: String,
        onMessage: @escaping (ChatMessage) -> Void,
        onError: @escaping (Error) -> Void
    ) {
        let urlString = "\(APIConstants.wsBaseURL)/ws/\(callId)?token=\(token)"
        guard let url = URL(string: urlString) else {
            onError(APIError.invalidURL)
            return
        }
        
        var request = URLRequest(url: url)
        request.timeoutInterval = APIConstants.apiTimeout
        
        let session = URLSession(
            configuration: .default,
            delegate: self,
            delegateQueue: OperationQueue()
        )
        
        webSocket = session.webSocketTask(with: request)
        webSocket?.resume()
        
        connectionStatusPublisher.send(true)
        receiveMessages(onMessage: onMessage, onError: onError)
    }
    
    private func receiveMessages(
        onMessage: @escaping (ChatMessage) -> Void,
        onError: @escaping (Error) -> Void
    ) {
        receiveTask = webSocket?.receive { [weak self] result in
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    if let data = text.data(using: .utf8),
                       let wsMessage = try? JSONDecoder().decode(WSMessage.self, from: data),
                       let chatMessage = self?.convertWSMessageToChatMessage(wsMessage) {
                        DispatchQueue.main.async {
                            onMessage(chatMessage)
                            self?.messagePublisher.send(chatMessage)
                        }
                    }
                case .data(let data):
                    if let wsMessage = try? JSONDecoder().decode(WSMessage.self, from: data),
                       let chatMessage = self?.convertWSMessageToChatMessage(wsMessage) {
                        DispatchQueue.main.async {
                            onMessage(chatMessage)
                            self?.messagePublisher.send(chatMessage)
                        }
                    }
                @unknown default:
                    break
                }
                // 다음 메시지 대기
                self?.receiveMessages(onMessage: onMessage, onError: onError)
                
            case .failure(let error):
                DispatchQueue.main.async {
                    self?.connectionStatusPublisher.send(false)
                    onError(error)
                }
            }
        }
    }
    
    private func convertWSMessageToChatMessage(_ wsMessage: WSMessage) -> ChatMessage? {
        guard let content = wsMessage.content, let role = wsMessage.role else {
            return nil
        }
        return ChatMessage(
            id: Int.random(in: 1...999999),
            call_id: 0,  // 실제로는 callId를 전달받아야 함
            role: role,
            content: content,
            created_at: ISO8601DateFormatter().string(from: Date())
        )
    }
    
    func sendMessage(_ text: String) {
        let message = WSMessage(
            type: "message",
            content: text,
            role: nil,
            is_streaming: nil
        )
        
        if let data = try? JSONEncoder().encode(message),
           let jsonString = String(data: data, encoding: .utf8) {
            webSocket?.send(.string(jsonString)) { _ in }
        }
    }
    
    func disconnect() {
        webSocket?.cancel(with: .goingAway, reason: nil)
        webSocket = nil
        connectionStatusPublisher.send(false)
    }
}
```

#### 3.4 Services/FirebaseService.swift
```swift
import Foundation
import Combine

final class FirebaseService: NSObject {
    static let shared = FirebaseService()
    
    override private init() {
        super.init()
        // Firebase 초기화는 AppDelegate에서
    }
    
    func registerForNotifications() {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
    
    func getFCMToken(completion: @escaping (String?) -> Void) {
        // Firebase Messaging.messaging().token으로 구현
        // 여기서는 placeholder
        completion(nil)
    }
}
```

---

### **Phase 4: ViewModels (2-3일)**

#### 4.1 ViewModels/AuthViewModel.swift
```swift
import Foundation
import Combine

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var user: User?
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiService = APIService.shared
    private let keychainService = KeychainService.shared
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        loadStoredUser()
    }
    
    func register(email: String, password: String, fullName: String) {
        isLoading = true
        errorMessage = nil
        
        let request = RegisterRequest(
            email: email,
            password: password,
            full_name: fullName
        )
        
        apiService.register(request)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                switch completion {
                case .failure(let error):
                    self?.errorMessage = error.description
                case .finished:
                    break
                }
            } receiveValue: { [weak self] user in
                // 회원가입 성공
                self?.errorMessage = nil
            }
            .store(in: &cancellables)
    }
    
    func login(email: String, password: String) {
        isLoading = true
        errorMessage = nil
        
        let request = LoginRequest(email: email, password: password)
        
        apiService.login(request)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                switch completion {
                case .failure(let error):
                    self?.errorMessage = error.description
                case .finished:
                    break
                }
            } receiveValue: { [weak self] response in
                self?.apiService.setTokens(response.access_token, response.refresh_token)
                self?.user = response.user
                self?.isAuthenticated = true
                self?.keychainService.save(
                    try! JSONEncoder().encode(response.user).base64EncodedString(),
                    forKey: "user"
                )
            }
            .store(in: &cancellables)
    }
    
    func logout() {
        apiService.clearTokens()
        keychainService.delete(forKey: "user")
        user = nil
        isAuthenticated = false
    }
    
    func updateFCMToken(_ token: String) {
        let request = FCMTokenRequest(fcm_token: token, device_type: "ios")
        
        apiService.updateFCMToken(request)
            .receive(on: DispatchQueue.main)
            .sink { _ in } receiveValue: { _ in
                // FCM 토큰 업데이트 완료
            }
            .store(in: &cancellables)
    }
    
    private func loadStoredUser() {
        if let userString = keychainService.retrieve(forKey: "user"),
           let data = Data(base64Encoded: userString),
           let user = try? JSONDecoder().decode(User.self, from: data) {
            self.user = user
            self.isAuthenticated = true
        }
    }
}

extension APIError {
    var description: String {
        switch self {
        case .invalidURL:
            return "잘못된 URL입니다"
        case .invalidResponse:
            return "서버 응답이 올바르지 않습니다"
        case .unauthorized:
            return "인증에 실패했습니다"
        case .apiError(let message):
            return message
        case .decodingError:
            return "데이터 해석 오류"
        case .unknown:
            return "알 수 없는 오류가 발생했습니다"
        }
    }
}
```

#### 4.2 ViewModels/ElderlyViewModel.swift
```swift
import Foundation
import Combine

@MainActor
final class ElderlyViewModel: ObservableObject {
    @Published var elderlyList: [Elderly] = []
    @Published var currentElderly: Elderly?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiService = APIService.shared
    private var cancellables = Set<AnyCancellable>()
    
    func fetchList() {
        isLoading = true
        errorMessage = nil
        
        apiService.getElderlyList()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                switch completion {
                case .failure(let error):
                    self?.errorMessage = error.description
                case .finished:
                    break
                }
            } receiveValue: { [weak self] list in
                self?.elderlyList = list
            }
            .store(in: &cancellables)
    }
    
    func fetchElderly(_ id: Int) {
        isLoading = true
        errorMessage = nil
        
        apiService.getElderly(id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                switch completion {
                case .failure(let error):
                    self?.errorMessage = error.description
                case .finished:
                    break
                }
            } receiveValue: { [weak self] elderly in
                self?.currentElderly = elderly
            }
            .store(in: &cancellables)
    }
    
    func createElderly(_ request: ElderlyCreateRequest) {
        isLoading = true
        errorMessage = nil
        
        apiService.createElderly(request)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                switch completion {
                case .failure(let error):
                    self?.errorMessage = error.description
                case .finished:
                    self?.fetchList()  // 목록 새로고침
                }
            } receiveValue: { _ in }
            .store(in: &cancellables)
    }
    
    func deleteElderly(_ id: Int) {
        isLoading = true
        errorMessage = nil
        
        apiService.deleteElderly(id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                switch completion {
                case .failure(let error):
                    self?.errorMessage = error.description
                case .finished:
                    self?.fetchList()  // 목록 새로고침
                }
            } receiveValue: { _ in }
            .store(in: &cancellables)
    }
}
```

#### 4.3 ViewModels/ChatViewModel.swift & CallViewModel.swift
[다음 파일에서 계속...]

```swift
@MainActor
final class ChatViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var inputText = ""
    @Published var isLoading = false
    @Published var isConnected = false
    @Published var errorMessage: String?
    
    private let webSocketService = WebSocketService.shared
    private let apiService = APIService.shared
    private var cancellables = Set<AnyCancellable>()
    private var currentCallId: Int?
    
    func startCall(for elderlyId: Int) {
        isLoading = true
        errorMessage = nil
        
        let request = CallStartRequest(elderly_id: elderlyId, call_type: "voice")
        
        apiService.startCall(request)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                switch completion {
                case .failure(let error):
                    self?.errorMessage = error.description
                case .finished:
                    break
                }
            } receiveValue: { [weak self] response in
                self?.currentCallId = response.id
                self?.connectWebSocket(callId: response.id, token: self?.apiService.accessToken ?? "")
            }
            .store(in: &cancellables)
    }
    
    private func connectWebSocket(callId: Int, token: String) {
        webSocketService.connect(
            callId: callId,
            token: token,
            onMessage: { [weak self] message in
                self?.messages.append(message)
            },
            onError: { [weak self] error in
                self?.errorMessage = (error as? APIError)?.description ?? "연결 오류"
            }
        )
    }
    
    func sendMessage() {
        guard !inputText.trimmingCharacters(in: .whitespaces).isEmpty else {
            return
        }
        
        webSocketService.sendMessage(inputText)
        inputText = ""
    }
    
    func endCall() {
        guard let callId = currentCallId else { return }
        
        webSocketService.disconnect()
        apiService.endCall(callId)
            .receive(on: DispatchQueue.main)
            .sink { _ in } receiveValue: { _ in }
            .store(in: &cancellables)
    }
}
```

---

### **Phase 5-8: Views 구현**

각 View는 다음 패턴을 따릅니다:

```swift
import SwiftUI

struct ViewName: View {
    @StateObject var viewModel = ViewModel()
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.isLoading {
                    ProgressView()
                } else {
                    // 주요 콘텐츠
                }
                
                if let error = viewModel.errorMessage {
                    ErrorAlert(message: error)
                }
            }
            .navigationTitle("제목")
        }
    }
}
```

---

## 🧪 테스트 기준

### iOS 테스트 체크리스트
- [ ] 로그인/회원가입 플로우
- [ ] 어르신 목록 조회 및 상세 조회
- [ ] Keychain에 토큰 저장/로드
- [ ] WebSocket 메시지 송수신
- [ ] FCM 토큰 업데이트
- [ ] 네트워크 에러 처리
- [ ] 오프라인 상태 처리

---

## 🚀 배포

```bash
# Xcode에서 빌드
Product → Build For → Running

# 시뮬레이터 실행
Product → Run

# 아이폰 기기에 배포
Product → Run (디바이스 선택)

# TestFlight 베타 배포
Archive → Upload to App Store Connect
```

---

**🎯 완성 기준:**
- ✅ 모든 화면 구현 및 테스트 완료
- ✅ Backend API와 완벽하게 통합
- ✅ Keychain으로 토큰 안전하게 저장
- ✅ WebSocket 실시간 메시지 송수신
- ✅ FCM 푸시 알림 수신
- ✅ 오프라인 상태 처리
- ✅ 에러 처리 및 사용자 경험

**다음 단계:** DevOps에서 전체 시스템을 Docker로 배포합니다!