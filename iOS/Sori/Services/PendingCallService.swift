import Foundation
import Combine

// MARK: - Pending Call Response Model

struct PendingCallResponse: Codable, Equatable {
    let call_id: Int
    let status: String
    let scheduled_at: String?
}

// MARK: - Pending Call Checker (DEBUG only)

#if DEBUG
/// Service that polls for pending scheduled calls in DEBUG mode.
/// This is a development tool to test auto-call without FCM.
@MainActor
final class PendingCallChecker: ObservableObject {

    // MARK: - Published Properties

    @Published private(set) var pendingCall: PendingCallResponse?
    @Published private(set) var isPolling = false
    @Published private(set) var lastError: String?

    // MARK: - Private Properties

    private var pollTimer: Timer?
    private let pollingInterval: TimeInterval = 10.0  // Poll every 10 seconds
    private let pairingService = PairingService.shared
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    init() {}

    // MARK: - Polling Control

    /// Start polling for pending calls
    func startPolling() {
        guard !isPolling else { return }
        guard pairingService.isDevicePaired() else {
            print("[PendingCallChecker] Device not paired, skipping polling")
            return
        }

        isPolling = true
        print("[PendingCallChecker] Starting polling every \(pollingInterval)s")

        // Immediate first check
        checkForPendingCall()

        // Schedule periodic checks
        pollTimer = Timer.scheduledTimer(withTimeInterval: pollingInterval, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.checkForPendingCall()
            }
        }
    }

    /// Stop polling
    func stopPolling() {
        pollTimer?.invalidate()
        pollTimer = nil
        isPolling = false
        print("[PendingCallChecker] Stopped polling")
    }

    /// Clear the current pending call (after navigating to it)
    func clearPendingCall() {
        pendingCall = nil
    }

    // MARK: - API Call

    private func checkForPendingCall() {
        guard let token = pairingService.getDeviceToken() else {
            lastError = "No device token"
            return
        }

        guard let url = URL(string: "\(APIConstants.baseURL)/api/device/pending-call") else {
            lastError = "Invalid URL"
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 10.0

        URLSession.shared.dataTaskPublisher(for: request)
            .tryMap { data, response -> Data in
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw URLError(.badServerResponse)
                }

                // 401/403 means token invalid
                if httpResponse.statusCode == 401 || httpResponse.statusCode == 403 {
                    NotificationCenter.default.post(name: NotificationNames.tokenInvalid, object: nil)
                    throw URLError(.userAuthenticationRequired)
                }

                // 404 means no pending call - this is normal
                if httpResponse.statusCode == 404 {
                    return "null".data(using: .utf8)!
                }

                guard 200..<300 ~= httpResponse.statusCode else {
                    throw URLError(.badServerResponse)
                }

                return data
            }
            .decode(type: APIResponse<PendingCallResponse?>.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                switch completion {
                case .failure(let error):
                    // Don't log expected "no pending call" scenarios
                    if (error as? URLError)?.code != .userAuthenticationRequired {
                        print("[PendingCallChecker] Error: \(error.localizedDescription)")
                    }
                    self?.lastError = error.localizedDescription
                case .finished:
                    self?.lastError = nil
                }
            } receiveValue: { [weak self] response in
                // Flatten double-optional: APIResponse<PendingCallResponse?>.data is PendingCallResponse??
                if let callData = response.data.flatMap({ $0 }) {
                    print("[PendingCallChecker] Found pending call: \(callData.call_id)")
                    self?.pendingCall = callData
                } else {
                    // No pending call
                    self?.pendingCall = nil
                }
            }
            .store(in: &cancellables)
    }
}
#endif

// MARK: - Device API Service Extension

extension APIService {
    /// Check for pending scheduled call (for elderly device)
    /// Uses device_access_token authentication
    func getPendingCall(deviceToken: String) -> AnyPublisher<PendingCallResponse?, APIError> {
        guard let url = URL(string: "\(APIConstants.baseURL)/api/device/pending-call") else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(deviceToken)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 10.0

        return URLSession.shared.dataTaskPublisher(for: request)
            .tryMap { data, response -> Data in
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw APIError.invalidResponse
                }

                if httpResponse.statusCode == 401 || httpResponse.statusCode == 403 {
                    throw APIError.unauthorized
                }

                if httpResponse.statusCode == 404 {
                    // No pending call - return empty
                    return "null".data(using: .utf8)!
                }

                guard 200..<300 ~= httpResponse.statusCode else {
                    throw APIError.invalidResponse
                }

                return data
            }
            .decode(type: APIResponse<PendingCallResponse?>.self, decoder: JSONDecoder())
            .map { response in
                return response.data ?? nil
            }
            .mapError { error in
                if let apiError = error as? APIError {
                    return apiError
                }
                return APIError.unknown
            }
            .eraseToAnyPublisher()
    }
}
