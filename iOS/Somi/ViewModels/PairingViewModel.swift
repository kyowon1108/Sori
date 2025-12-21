import Foundation
import Combine

@MainActor
final class PairingViewModel: ObservableObject {
    @Published var code: String = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var isPaired = false
    @Published var elderlyId: Int?

    private let pairingService = PairingService.shared
    private let firebaseService = FirebaseService.shared
    private var cancellables = Set<AnyCancellable>()

    init() {
        checkPairingStatus()
    }

    func checkPairingStatus() {
        isPaired = pairingService.isDevicePaired()
        elderlyId = pairingService.getElderlyId()
    }

    func submitCode() {
        // Validate code format
        guard code.count == 6, code.allSatisfy({ $0.isNumber }) else {
            errorMessage = "6자리 숫자 코드를 입력해주세요"
            return
        }

        isLoading = true
        errorMessage = nil

        // Get FCM token first
        firebaseService.getFCMToken { [weak self] fcmToken in
            guard let self = self else { return }

            // Use a placeholder token if FCM is not available yet
            let token = fcmToken ?? "placeholder_token_\(UUID().uuidString)"

            Task { @MainActor in
                self.performClaim(with: token)
            }
        }
    }

    private func performClaim(with fcmToken: String) {
        pairingService.claimPairingCodePublisher(code: code, fcmToken: fcmToken)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] response in
                self?.isPaired = true
                self?.elderlyId = response.elderly_id
                self?.code = ""
            }
            .store(in: &cancellables)
    }

    private func handleError(_ error: APIError) {
        switch error {
        case .apiError(let message):
            if message.contains("만료") {
                errorMessage = "코드가 만료되었습니다. 보호자에게 새 코드를 요청하세요."
            } else if message.contains("잘못된") {
                errorMessage = "잘못된 코드입니다. 다시 확인해주세요."
            } else if message.contains("너무 많은") {
                errorMessage = "너무 많은 시도입니다. 잠시 후 다시 시도하세요."
            } else {
                errorMessage = message
            }
        default:
            errorMessage = "연결에 실패했습니다. 다시 시도해주세요."
        }
    }

    func unpair() {
        pairingService.clearPairing()
        isPaired = false
        elderlyId = nil
    }

    func clearError() {
        errorMessage = nil
    }
}
