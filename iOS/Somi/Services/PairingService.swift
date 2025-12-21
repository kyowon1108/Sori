import Foundation
import Combine
import UIKit

/// Error types specific to pairing operations
enum PairingError: Error, Equatable {
    case codeExpired
    case invalidCode
    case maxAttempts
    case rateLimited
    case networkError
    case serverError(String)
    case fcmTokenMissing
    case unauthorized
    case unknown

    var localizedMessage: String {
        switch self {
        case .codeExpired:
            return PairingErrorMessages.codeExpired
        case .invalidCode:
            return PairingErrorMessages.invalidCode
        case .maxAttempts:
            return PairingErrorMessages.maxAttempts
        case .rateLimited:
            return PairingErrorMessages.rateLimited
        case .networkError:
            return PairingErrorMessages.networkError
        case .serverError(let message):
            return message.isEmpty ? PairingErrorMessages.serverError : message
        case .fcmTokenMissing:
            return PairingErrorMessages.fcmTokenMissing
        case .unauthorized:
            return "인증이 만료되었습니다.\n다시 연결해주세요."
        case .unknown:
            return PairingErrorMessages.unknownError
        }
    }

    var requiresNewCode: Bool {
        switch self {
        case .codeExpired, .maxAttempts:
            return true
        default:
            return false
        }
    }
}

final class PairingService {
    static let shared = PairingService()

    private let keychainService = KeychainService.shared
    private var cancellables = Set<AnyCancellable>()

    private init() {}

    // MARK: - Pairing Status

    func isDevicePaired() -> Bool {
        return keychainService.hasValidPairingToken()
    }

    func getDeviceToken() -> String? {
        guard !keychainService.isTokenExpired() else {
            // Token expired, clear and return nil
            clearPairing()
            return nil
        }
        return keychainService.retrieve(forKey: KeychainKeys.deviceAccessToken)
    }

    func getElderlyId() -> Int? {
        return keychainService.retrieveInt(forKey: KeychainKeys.elderlyId)
    }

    func getDeviceId() -> Int? {
        return keychainService.retrieveInt(forKey: KeychainKeys.deviceId)
    }

    func clearPairing() {
        keychainService.clearPairingData()
        // Notify app that token is invalid
        NotificationCenter.default.post(name: NotificationNames.tokenInvalid, object: nil)
    }

    // MARK: - Token Validation

    func validateToken() -> Bool {
        guard let token = keychainService.retrieve(forKey: KeychainKeys.deviceAccessToken) else {
            return false
        }
        guard !keychainService.isTokenExpired() else {
            clearPairing()
            return false
        }
        return !token.isEmpty
    }

    // MARK: - Claim Pairing Code (Callback version)

    func claimPairingCode(
        code: String,
        fcmToken: String,
        completion: @escaping (Result<PairingClaimResponse, PairingError>) -> Void
    ) {
        // Validate FCM token
        guard !fcmToken.isEmpty else {
            completion(.failure(.fcmTokenMissing))
            return
        }

        let request = PairingClaimRequest(
            code: code,
            fcm_token: fcmToken,
            platform: "ios",
            device_name: UIDevice.current.name,
            os_version: UIDevice.current.systemVersion
        )

        guard let url = URL(string: "\(APIConstants.baseURL)/api/pairing/claim") else {
            completion(.failure(.networkError))
            return
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try? JSONEncoder().encode(request)
        urlRequest.timeoutInterval = APIConstants.apiTimeout

        // Log request (masking sensitive data)
        print("[Pairing] Claiming code: \(maskCode(code))")

        URLSession.shared.dataTaskPublisher(for: urlRequest)
            .tryMap { data, response -> Data in
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw PairingError.networkError
                }

                // Handle HTTP status codes
                switch httpResponse.statusCode {
                case 200...299:
                    return data
                case 401, 403:
                    throw PairingError.unauthorized
                case 429:
                    throw PairingError.rateLimited
                case 400...499:
                    // Parse error message from response
                    if let errorResponse = try? JSONDecoder().decode(APIResponse<EmptyData>.self, from: data) {
                        throw self.parseErrorMessage(errorResponse.message)
                    }
                    throw PairingError.invalidCode
                case 500...599:
                    throw PairingError.serverError("")
                default:
                    throw PairingError.unknown
                }
            }
            .decode(type: APIResponse<PairingClaimResponse>.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink { result in
                switch result {
                case .failure(let error):
                    if let pairingError = error as? PairingError {
                        completion(.failure(pairingError))
                    } else if error is DecodingError {
                        completion(.failure(.serverError("")))
                    } else if (error as NSError).domain == NSURLErrorDomain {
                        completion(.failure(.networkError))
                    } else {
                        completion(.failure(.unknown))
                    }
                case .finished:
                    break
                }
            } receiveValue: { [weak self] response in
                if response.status == "success", let data = response.data {
                    // Save pairing data to Keychain
                    let saved = self?.keychainService.savePairingData(
                        token: data.device_access_token,
                        elderlyId: data.elderly_id,
                        deviceId: data.device_id,
                        expiresIn: data.expires_in
                    )

                    if saved == true {
                        print("[Pairing] Successfully paired with elderly ID: \(data.elderly_id)")
                        completion(.success(data))
                    } else {
                        completion(.failure(.unknown))
                    }
                } else {
                    let error = self?.parseErrorMessage(response.message) ?? .unknown
                    completion(.failure(error))
                }
            }
            .store(in: &cancellables)
    }

    // MARK: - Claim Pairing Code (Combine Publisher)

    func claimPairingCodePublisher(
        code: String,
        fcmToken: String
    ) -> AnyPublisher<PairingClaimResponse, PairingError> {
        // Validate FCM token
        guard !fcmToken.isEmpty else {
            return Fail(error: PairingError.fcmTokenMissing).eraseToAnyPublisher()
        }

        let request = PairingClaimRequest(
            code: code,
            fcm_token: fcmToken,
            platform: "ios",
            device_name: UIDevice.current.name,
            os_version: UIDevice.current.systemVersion
        )

        guard let url = URL(string: "\(APIConstants.baseURL)/api/pairing/claim") else {
            return Fail(error: PairingError.networkError).eraseToAnyPublisher()
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try? JSONEncoder().encode(request)
        urlRequest.timeoutInterval = APIConstants.apiTimeout

        print("[Pairing] Claiming code: \(maskCode(code))")

        return URLSession.shared.dataTaskPublisher(for: urlRequest)
            .tryMap { [weak self] data, response -> Data in
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw PairingError.networkError
                }

                switch httpResponse.statusCode {
                case 200...299:
                    return data
                case 401, 403:
                    throw PairingError.unauthorized
                case 429:
                    throw PairingError.rateLimited
                case 400...499:
                    if let errorResponse = try? JSONDecoder().decode(APIResponse<EmptyData>.self, from: data) {
                        throw self?.parseErrorMessage(errorResponse.message) ?? PairingError.invalidCode
                    }
                    throw PairingError.invalidCode
                case 500...599:
                    throw PairingError.serverError("")
                default:
                    throw PairingError.unknown
                }
            }
            .decode(type: APIResponse<PairingClaimResponse>.self, decoder: JSONDecoder())
            .tryMap { [weak self] response in
                if response.status == "success", let data = response.data {
                    let saved = self?.keychainService.savePairingData(
                        token: data.device_access_token,
                        elderlyId: data.elderly_id,
                        deviceId: data.device_id,
                        expiresIn: data.expires_in
                    )

                    if saved == true {
                        print("[Pairing] Successfully paired with elderly ID: \(data.elderly_id)")
                        return data
                    } else {
                        throw PairingError.unknown
                    }
                } else {
                    throw self?.parseErrorMessage(response.message) ?? PairingError.unknown
                }
            }
            .mapError { error -> PairingError in
                if let pairingError = error as? PairingError {
                    return pairingError
                } else if error is DecodingError {
                    return .serverError("")
                } else if (error as NSError).domain == NSURLErrorDomain {
                    return .networkError
                }
                return .unknown
            }
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }

    // MARK: - Error Parsing

    private func parseErrorMessage(_ message: String) -> PairingError {
        let lowercased = message.lowercased()

        if lowercased.contains("만료") || lowercased.contains("expired") {
            return .codeExpired
        } else if lowercased.contains("잘못된") || lowercased.contains("invalid") {
            return .invalidCode
        } else if lowercased.contains("시도") || lowercased.contains("attempt") || lowercased.contains("초과") {
            return .maxAttempts
        } else if lowercased.contains("너무 많은") || lowercased.contains("rate") || lowercased.contains("limit") {
            return .rateLimited
        } else if !message.isEmpty {
            return .serverError(message)
        }
        return .unknown
    }

    // MARK: - Utility

    private func maskCode(_ code: String) -> String {
        guard code.count >= 4 else { return "***" }
        let prefix = String(code.prefix(2))
        let suffix = String(code.suffix(2))
        return "\(prefix)**\(suffix)"
    }
}

// MARK: - Empty Data for error responses

private struct EmptyData: Codable {}
