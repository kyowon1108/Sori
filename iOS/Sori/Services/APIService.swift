import Foundation
import Combine

final class APIService {
    static let shared = APIService()

    private var cancellables = Set<AnyCancellable>()
    private(set) var accessToken: String?
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
        _ = keychainService.save(access, forKey: "accessToken")
        _ = keychainService.save(refresh, forKey: "refreshToken")
    }

    func clearTokens() {
        accessToken = nil
        refreshToken = nil
        _ = keychainService.delete(forKey: "accessToken")
        _ = keychainService.delete(forKey: "refreshToken")
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
