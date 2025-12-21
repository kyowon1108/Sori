import Foundation
import UIKit
import UserNotifications

// NOTE: To enable Firebase integration:
// 1. Add Firebase SDK via Swift Package Manager:
//    - File > Add Packages > https://github.com/firebase/firebase-ios-sdk
//    - Select FirebaseMessaging
// 2. Download GoogleService-Info.plist from Firebase Console
// 3. Add it to the Xcode project
// 4. Uncomment the Firebase imports and code below

// import FirebaseCore
// import FirebaseMessaging

final class FirebaseService: NSObject {
    static let shared = FirebaseService()

    private var fcmToken: String?
    private var pendingTokenCallbacks: [(String?) -> Void] = []
    private var isWaitingForToken = false
    private let keychainService = KeychainService.shared

    // Maximum retries for FCM token
    private let maxTokenRetries = 3
    private var tokenRetryCount = 0

    private override init() {
        super.init()
        // Load cached FCM token
        fcmToken = keychainService.getFCMToken()
    }

    // MARK: - Firebase Configuration

    func configure() {
        // Uncomment when Firebase SDK is added:
        // FirebaseApp.configure()
        // Messaging.messaging().delegate = self

        print("[Firebase] Configuration complete")
    }

    // MARK: - Notification Registration

    func registerForNotifications() {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    func requestNotificationPermission(completion: @escaping (Bool) -> Void) {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .badge, .sound]) { [weak self] granted, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("[Firebase] Notification permission error: \(error.localizedDescription)")
                }

                if granted {
                    self?.registerForNotifications()
                    print("[Firebase] Notification permission granted")
                } else {
                    print("[Firebase] Notification permission denied")
                }

                completion(granted)
            }
        }
    }

    // MARK: - FCM Token Management

    /// Get FCM token with callback
    func getFCMToken(completion: @escaping (String?) -> Void) {
        // If we have a cached token, return it immediately
        if let token = fcmToken, !token.isEmpty {
            completion(token)
            return
        }

        // Add to pending callbacks
        pendingTokenCallbacks.append(completion)

        // If already waiting, don't start another fetch
        if isWaitingForToken {
            return
        }

        isWaitingForToken = true
        fetchFCMToken()
    }

    /// Get FCM token with async/await
    func getFCMTokenAsync() async -> String? {
        return await withCheckedContinuation { continuation in
            getFCMToken { token in
                continuation.resume(returning: token)
            }
        }
    }

    /// Fetch FCM token with retry logic
    private func fetchFCMToken() {
        // Uncomment when Firebase SDK is added:
        // Messaging.messaging().token { [weak self] token, error in
        //     guard let self = self else { return }
        //
        //     if let error = error {
        //         print("[Firebase] Error fetching FCM token: \(error.localizedDescription)")
        //         self.handleTokenFetchFailure()
        //         return
        //     }
        //
        //     if let token = token {
        //         self.handleTokenReceived(token)
        //     } else {
        //         self.handleTokenFetchFailure()
        //     }
        // }

        #if DEBUG
        // For development without Firebase SDK:
        // Generate a placeholder token for testing
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            let placeholderToken = "dev_fcm_token_\(UUID().uuidString.prefix(8))"
            print("[Firebase] DEBUG: Using placeholder FCM token")
            self?.handleTokenReceived(placeholderToken)
        }
        #else
        // Production: Firebase SDK must be configured
        // If we get here without Firebase, fail gracefully
        handleTokenFetchFailure()
        #endif
    }

    private func handleTokenReceived(_ token: String) {
        fcmToken = token
        tokenRetryCount = 0
        isWaitingForToken = false

        // Save to keychain
        _ = keychainService.saveFCMToken(token)

        // Notify all pending callbacks
        let callbacks = pendingTokenCallbacks
        pendingTokenCallbacks.removeAll()
        callbacks.forEach { $0(token) }

        // Post notification
        NotificationCenter.default.post(
            name: NotificationNames.fcmTokenReceived,
            object: nil,
            userInfo: ["token": token]
        )

        print("[Firebase] FCM token received")
    }

    private func handleTokenFetchFailure() {
        tokenRetryCount += 1

        if tokenRetryCount < maxTokenRetries {
            // Retry after delay
            DispatchQueue.main.asyncAfter(deadline: .now() + Double(tokenRetryCount) * 2.0) { [weak self] in
                self?.fetchFCMToken()
            }
        } else {
            // Max retries reached
            isWaitingForToken = false
            tokenRetryCount = 0

            let callbacks = pendingTokenCallbacks
            pendingTokenCallbacks.removeAll()
            callbacks.forEach { $0(nil) }

            print("[Firebase] Failed to fetch FCM token after \(maxTokenRetries) retries")
        }
    }

    /// Check if FCM token is available
    var hasFCMToken: Bool {
        return fcmToken != nil && !fcmToken!.isEmpty
    }

    /// Force refresh FCM token
    func refreshFCMToken() {
        fcmToken = nil
        _ = keychainService.delete(forKey: KeychainKeys.fcmToken)
        fetchFCMToken()
    }

    // MARK: - Handle APNS Token

    func setAPNSToken(_ deviceToken: Data) {
        // Uncomment when Firebase SDK is added:
        // Messaging.messaging().apnsToken = deviceToken

        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("[Firebase] APNS Token: \(token.prefix(20))...")
    }

    // MARK: - Handle Incoming Notification

    func handleNotification(userInfo: [AnyHashable: Any]) {
        print("[Firebase] Handling notification: \(userInfo.keys)")

        // Parse notification type
        let notificationType = userInfo["type"] as? String ?? ""

        // Parse call_id (FCM data is always String)
        var callId: Int?
        if let callIdString = userInfo["call_id"] as? String {
            callId = Int(callIdString)
        } else if let callIdInt = userInfo["call_id"] as? Int {
            callId = callIdInt
        }

        // Parse elderly_id
        var elderlyId: Int?
        if let elderlyIdString = userInfo["elderly_id"] as? String {
            elderlyId = Int(elderlyIdString)
        } else if let elderlyIdInt = userInfo["elderly_id"] as? Int {
            elderlyId = elderlyIdInt
        }

        // Handle based on notification type
        // All call-related notifications use navigateToCall for consistent routing
        switch notificationType {
        case "scheduled_call", "incoming_call":
            if let callId = callId {
                postNavigateToCall(callId: callId, elderlyId: elderlyId)
            }

        case "missed_call":
            // Missed call - log but don't auto-navigate (user tapped notification)
            print("[Firebase] Missed call notification - elderly_id: \(elderlyId ?? -1)")
            // Elderly app doesn't need special handling for missed calls

        case "high_risk":
            // High risk alert - log for elderly app (caregiver web handles this)
            print("[Firebase] High risk notification - elderly_id: \(elderlyId ?? -1)")

        default:
            // Generic call notification - attempt navigation if call_id present
            if let callId = callId {
                postNavigateToCall(callId: callId, elderlyId: elderlyId)
            }
        }
    }

    private func postNavigateToCall(callId: Int, elderlyId: Int?) {
        var userInfo: [String: Any] = ["call_id": callId]
        if let elderlyId = elderlyId {
            userInfo["elderly_id"] = elderlyId
        }

        // Use single canonical notification for call navigation
        NotificationCenter.default.post(
            name: NotificationNames.navigateToCall,
            object: nil,
            userInfo: userInfo
        )
    }
}

// MARK: - MessagingDelegate
// Uncomment when Firebase SDK is added:

/*
extension FirebaseService: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else {
            print("[Firebase] FCM token is nil")
            return
        }

        print("[Firebase] FCM Token refreshed")
        handleTokenReceived(token)

        // If device is paired, update FCM token on server
        if PairingService.shared.isDevicePaired() {
            updateFCMTokenOnServer(token)
        }
    }

    private func updateFCMTokenOnServer(_ token: String) {
        // TODO: Implement API call to update FCM token
        // POST /api/device/update-fcm-token
        // Body: { "fcm_token": token }
        // Auth: device_access_token
    }
}
*/
