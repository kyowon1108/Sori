import Foundation
import Combine
import UIKit

final class PairingService {
    static let shared = PairingService()

    private let keychainService = KeychainService.shared
    private var cancellables = Set<AnyCancellable>()

    private init() {}

    // MARK: - Pairing Status

    func isDevicePaired() -> Bool {
        return keychainService.retrieve(forKey: KeychainKeys.deviceAccessToken) != nil
    }

    func getDeviceToken() -> String? {
        return keychainService.retrieve(forKey: KeychainKeys.deviceAccessToken)
    }

    func getElderlyId() -> Int? {
        guard let idString = keychainService.retrieve(forKey: KeychainKeys.elderlyId) else {
            return nil
        }
        return Int(idString)
    }

    func getDeviceId() -> Int? {
        guard let idString = keychainService.retrieve(forKey: KeychainKeys.deviceId) else {
            return nil
        }
        return Int(idString)
    }

    func clearPairing() {
        _ = keychainService.delete(forKey: KeychainKeys.deviceAccessToken)
        _ = keychainService.delete(forKey: KeychainKeys.elderlyId)
        _ = keychainService.delete(forKey: KeychainKeys.deviceId)
    }

    // MARK: - Claim Pairing Code

    func claimPairingCode(
        code: String,
        fcmToken: String,
        completion: @escaping (Result<PairingClaimResponse, APIError>) -> Void
    ) {
        let request = PairingClaimRequest(
            code: code,
            fcm_token: fcmToken,
            platform: "ios",
            device_name: UIDevice.current.name,
            os_version: UIDevice.current.systemVersion
        )

        guard let url = URL(string: "\(APIConstants.baseURL)/api/pairing/claim") else {
            completion(.failure(.invalidURL))
            return
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try? JSONEncoder().encode(request)
        urlRequest.timeoutInterval = APIConstants.apiTimeout

        URLSession.shared.dataTaskPublisher(for: urlRequest)
            .map(\.data)
            .decode(type: APIResponse<PairingClaimResponse>.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink { result in
                switch result {
                case .failure(let error):
                    completion(.failure(.apiError(error.localizedDescription)))
                case .finished:
                    break
                }
            } receiveValue: { [weak self] response in
                if response.status == "success", let data = response.data {
                    // Save pairing data to Keychain
                    _ = self?.keychainService.save(data.device_access_token, forKey: KeychainKeys.deviceAccessToken)
                    _ = self?.keychainService.save(String(data.elderly_id), forKey: KeychainKeys.elderlyId)
                    _ = self?.keychainService.save(String(data.device_id), forKey: KeychainKeys.deviceId)
                    completion(.success(data))
                } else {
                    completion(.failure(.apiError(response.message)))
                }
            }
            .store(in: &cancellables)
    }

    // MARK: - Combine Publisher Version

    func claimPairingCodePublisher(
        code: String,
        fcmToken: String
    ) -> AnyPublisher<PairingClaimResponse, APIError> {
        let request = PairingClaimRequest(
            code: code,
            fcm_token: fcmToken,
            platform: "ios",
            device_name: UIDevice.current.name,
            os_version: UIDevice.current.systemVersion
        )

        guard let url = URL(string: "\(APIConstants.baseURL)/api/pairing/claim") else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try? JSONEncoder().encode(request)
        urlRequest.timeoutInterval = APIConstants.apiTimeout

        return URLSession.shared.dataTaskPublisher(for: urlRequest)
            .map(\.data)
            .decode(type: APIResponse<PairingClaimResponse>.self, decoder: JSONDecoder())
            .tryMap { [weak self] response in
                if response.status == "success", let data = response.data {
                    // Save pairing data to Keychain
                    _ = self?.keychainService.save(data.device_access_token, forKey: KeychainKeys.deviceAccessToken)
                    _ = self?.keychainService.save(String(data.elderly_id), forKey: KeychainKeys.elderlyId)
                    _ = self?.keychainService.save(String(data.device_id), forKey: KeychainKeys.deviceId)
                    return data
                } else {
                    throw APIError.apiError(response.message)
                }
            }
            .mapError { error -> APIError in
                if let apiError = error as? APIError {
                    return apiError
                }
                return .apiError(error.localizedDescription)
            }
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }
}
