import Foundation
import UIKit
import UserNotifications

final class FirebaseService: NSObject {
    static let shared = FirebaseService()

    private override init() {
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
        // Firebase SDK 연동 후 아래 코드로 교체:
        // Messaging.messaging().token { token, error in
        //     if let error = error {
        //         print("Error fetching FCM token: \(error)")
        //         completion(nil)
        //     } else if let token = token {
        //         completion(token)
        //     }
        // }
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
}
