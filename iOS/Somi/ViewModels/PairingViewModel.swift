import Foundation
import Combine
import UIKit

@MainActor
final class PairingViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var code: String = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var isPaired = false
    @Published var elderlyId: Int?
    @Published var showRetryButton = false
    @Published var requiresNewCode = false
    @Published var showPermissionAlert = false

    // MARK: - Private Properties

    private let pairingService = PairingService.shared
    private let firebaseService = FirebaseService.shared
    private var cancellables = Set<AnyCancellable>()
    private var fcmRetryCount = 0
    private let maxFCMRetries = 2

    // MARK: - Initialization

    init() {
        checkPairingStatus()
        setupTokenInvalidObserver()
    }

    // MARK: - Setup

    private func setupTokenInvalidObserver() {
        NotificationCenter.default.publisher(for: NotificationNames.tokenInvalid)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.handleTokenInvalid()
            }
            .store(in: &cancellables)
    }

    // MARK: - Public Methods

    func checkPairingStatus() {
        isPaired = pairingService.isDevicePaired()
        elderlyId = pairingService.getElderlyId()

        if isPaired {
            print("[PairingVM] Device is paired with elderly ID: \(elderlyId ?? -1)")
        }
    }

    func submitCode() {
        // Validate code format
        guard code.count == ValidationRules.pairingCodeLength,
              code.allSatisfy({ $0.isNumber }) else {
            errorMessage = PairingErrorMessages.invalidCode
            showRetryButton = true
            return
        }

        isLoading = true
        errorMessage = nil
        showRetryButton = false
        requiresNewCode = false

        // Request notification permission first if needed
        requestNotificationPermissionIfNeeded { [weak self] in
            self?.getFCMTokenAndSubmit()
        }
    }

    func retry() {
        clearError()
        if code.count == ValidationRules.pairingCodeLength {
            submitCode()
        }
    }

    func clearCode() {
        code = ""
        clearError()
    }

    func clearError() {
        errorMessage = nil
        showRetryButton = false
        requiresNewCode = false
    }

    func unpair() {
        pairingService.clearPairing()
        isPaired = false
        elderlyId = nil
        code = ""
        clearError()
    }

    func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }

    // MARK: - Private Methods

    private func requestNotificationPermissionIfNeeded(completion: @escaping () -> Void) {
        firebaseService.requestNotificationPermission { _ in
            // Proceed regardless of permission result
            // Server will store the device but may not be able to send push
            completion()
        }
    }

    private func getFCMTokenAndSubmit() {
        firebaseService.getFCMToken { [weak self] fcmToken in
            guard let self = self else { return }

            Task { @MainActor in
                if let token = fcmToken, !token.isEmpty {
                    self.performClaim(with: token)
                } else {
                    // FCM token not available - retry or show error
                    self.handleFCMTokenMissing()
                }
            }
        }
    }

    private func handleFCMTokenMissing() {
        fcmRetryCount += 1

        if fcmRetryCount <= maxFCMRetries {
            // Auto-retry after delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
                self?.getFCMTokenAndSubmit()
            }
        } else {
            // Max retries reached
            isLoading = false
            fcmRetryCount = 0

            #if DEBUG
            // Use placeholder token for development ONLY
            print("[PairingVM] DEBUG: Using placeholder FCM token")
            let placeholderToken = "dev_placeholder_\(UUID().uuidString.prefix(8))"
            performClaim(with: placeholderToken)
            #else
            // Production: FCM token is required - show error and prompt user
            errorMessage = PairingErrorMessages.fcmTokenMissing
            showRetryButton = true
            showPermissionAlert = true
            #endif
        }
    }

    private func performClaim(with fcmToken: String) {
        fcmRetryCount = 0

        pairingService.claimPairingCode(code: code, fcmToken: fcmToken) { [weak self] result in
            guard let self = self else { return }

            Task { @MainActor in
                self.isLoading = false

                switch result {
                case .success(let response):
                    self.handleSuccess(response)

                case .failure(let error):
                    self.handleError(error)
                }
            }
        }
    }

    private func handleSuccess(_ response: PairingClaimResponse) {
        isPaired = true
        elderlyId = response.elderly_id
        code = ""
        errorMessage = nil
        showRetryButton = false
        requiresNewCode = false

        print("[PairingVM] Pairing successful - elderly ID: \(response.elderly_id)")
    }

    private func handleError(_ error: PairingError) {
        errorMessage = error.localizedMessage
        requiresNewCode = error.requiresNewCode
        showRetryButton = !error.requiresNewCode

        // Clear code for security-sensitive errors
        if case .maxAttempts = error {
            code = ""
        }

        print("[PairingVM] Pairing error: \(error)")
    }

    private func handleTokenInvalid() {
        isPaired = false
        elderlyId = nil
        code = ""
        errorMessage = "인증이 만료되었습니다.\n다시 연결해주세요."
        showRetryButton = false
        requiresNewCode = true
    }
}
