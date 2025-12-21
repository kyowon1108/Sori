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
            } receiveValue: { [weak self] _ in
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
                self?.saveUserToKeychain(response.user)
            }
            .store(in: &cancellables)
    }

    func logout() {
        apiService.clearTokens()
        _ = keychainService.delete(forKey: "user")
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

    private func saveUserToKeychain(_ user: User) {
        if let data = try? JSONEncoder().encode(user) {
            _ = keychainService.save(data.base64EncodedString(), forKey: "user")
        }
    }
}
