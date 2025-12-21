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

    private override init() {
        super.init()
    }

    // MARK: - Firebase Configuration

    func configure() {
        // Uncomment when Firebase SDK is added:
        // FirebaseApp.configure()
        // Messaging.messaging().delegate = self
    }

    // MARK: - Notification Registration

    func registerForNotifications() {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    func getFCMToken(completion: @escaping (String?) -> Void) {
        // If we have a cached token, return it
        if let token = fcmToken {
            completion(token)
            return
        }

        // Uncomment when Firebase SDK is added:
        // Messaging.messaging().token { [weak self] token, error in
        //     if let error = error {
        //         print("Error fetching FCM token: \(error)")
        //         completion(nil)
        //     } else if let token = token {
        //         self?.fcmToken = token
        //         completion(token)
        //     }
        // }

        // For now, return nil (Firebase not configured)
        completion(nil)
    }

    func requestNotificationPermission(completion: @escaping (Bool) -> Void) {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            DispatchQueue.main.async {
                if granted {
                    self.registerForNotifications()
                }
                completion(granted)
            }
        }
    }

    // MARK: - Handle APNS Token

    func setAPNSToken(_ deviceToken: Data) {
        // Uncomment when Firebase SDK is added:
        // Messaging.messaging().apnsToken = deviceToken

        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("APNS Token: \(token)")
    }

    // MARK: - Handle Incoming Notification

    func handleNotification(userInfo: [AnyHashable: Any]) {
        // Check for scheduled call notification
        if let callIdString = userInfo["call_id"] as? String,
           let callId = Int(callIdString) {
            // Post notification to trigger call view
            NotificationCenter.default.post(
                name: Notification.Name("incomingCall"),
                object: nil,
                userInfo: ["call_id": callId]
            )
        }
    }
}

// MARK: - MessagingDelegate
// Uncomment when Firebase SDK is added:

// extension FirebaseService: MessagingDelegate {
//     func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
//         print("FCM Token: \(fcmToken ?? "nil")")
//         self.fcmToken = fcmToken
//
//         // If paired, update token on server
//         if PairingService.shared.isDevicePaired() {
//             // TODO: Call API to update FCM token
//         }
//     }
// }
