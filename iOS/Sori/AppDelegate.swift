import UIKit
import UserNotifications
// import Firebase
// import FirebaseMessaging

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    // Store pending notification for deferred handling
    private var pendingNotification: [AnyHashable: Any]?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Firebase 초기화
        // FirebaseApp.configure()
        FirebaseService.shared.configure()

        // 푸시 알림 설정
        configureNotifications(application)

        // Check if app was launched from notification
        if let notificationInfo = launchOptions?[.remoteNotification] as? [AnyHashable: Any] {
            // Store for later processing after app is ready
            pendingNotification = notificationInfo
        }

        return true
    }

    private func configureNotifications(_ application: UIApplication) {
        UNUserNotificationCenter.current().delegate = self

        let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
        UNUserNotificationCenter.current().requestAuthorization(
            options: authOptions,
            completionHandler: { granted, error in
                if let error = error {
                    print("[AppDelegate] Notification authorization error: \(error.localizedDescription)")
                }

                if granted {
                    DispatchQueue.main.async {
                        application.registerForRemoteNotifications()
                    }
                    print("[AppDelegate] Notification permission granted")
                } else {
                    print("[AppDelegate] Notification permission denied")
                }
            }
        )

        // Firebase Messaging 델리게이트 설정
        // Messaging.messaging().delegate = self
    }

    // MARK: - Application Lifecycle

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Clear badge count
        UNUserNotificationCenter.current().setBadgeCount(0)

        // Process pending notification if any
        if let notification = pendingNotification {
            pendingNotification = nil
            // Delay slightly to ensure app is ready
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                self.handleNotification(notification)
            }
        }
    }

    // MARK: - Remote Notifications

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        // Firebase에 APNs 토큰 전달
        FirebaseService.shared.setAPNSToken(deviceToken)
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("[AppDelegate] Failed to register for remote notifications: \(error.localizedDescription)")
    }

    // Handle silent push notifications (background)
    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        print("[AppDelegate] Received remote notification in background")
        handleNotification(userInfo)
        completionHandler(.newData)
    }

    // MARK: - UNUserNotificationCenterDelegate

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // 앱이 포그라운드일 때 알림 표시
        let userInfo = notification.request.content.userInfo
        print("[AppDelegate] Notification received in foreground: \(userInfo.keys)")

        // Check if it's a call notification - might want to auto-navigate
        if let typeString = userInfo["type"] as? String,
           typeString == "scheduled_call" || typeString == "incoming_call" {
            // For urgent call notifications, navigate immediately
            handleNotification(userInfo)
            // Still show banner for awareness
            completionHandler([.banner, .sound])
        } else {
            // Show notification normally
            completionHandler([.banner, .badge, .sound])
        }
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        // 알림 탭 시 처리
        let userInfo = response.notification.request.content.userInfo
        print("[AppDelegate] User tapped notification: \(userInfo.keys)")

        handleNotification(userInfo)
        completionHandler()
    }

    // MARK: - Notification Handling

    private func handleNotification(_ userInfo: [AnyHashable: Any]) {
        // Check if device is paired
        guard PairingService.shared.isDevicePaired() else {
            print("[AppDelegate] Device not paired, ignoring notification")
            return
        }

        // Validate elderly_id if present
        if let elderlyIdString = userInfo["elderly_id"] as? String,
           let notificationElderlyId = Int(elderlyIdString),
           let deviceElderlyId = PairingService.shared.getElderlyId() {
            if notificationElderlyId != deviceElderlyId {
                print("[AppDelegate] Notification elderly_id mismatch, ignoring")
                return
            }
        }

        // Delegate to FirebaseService for detailed handling
        FirebaseService.shared.handleNotification(userInfo: userInfo)
    }
}

// MARK: - MessagingDelegate
// Firebase SDK 추가 후 주석 해제
/*
extension AppDelegate: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        print("[AppDelegate] FCM Token: \(token.prefix(20))...")

        // Notify FirebaseService
        NotificationCenter.default.post(
            name: NotificationNames.fcmTokenReceived,
            object: nil,
            userInfo: ["token": token]
        )

        // Update token on server if paired
        if PairingService.shared.isDevicePaired() {
            updateFCMTokenOnServer(token)
        }
    }

    private func updateFCMTokenOnServer(_ token: String) {
        // TODO: Implement API call to update FCM token on server
        // This should call POST /api/device/fcm-token with device_access_token auth
    }
}
*/
