import UIKit
import UserNotifications
// import Firebase
// import FirebaseMessaging

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Firebase 초기화
        // FirebaseApp.configure()

        // 푸시 알림 설정
        configureNotifications(application)

        return true
    }

    private func configureNotifications(_ application: UIApplication) {
        UNUserNotificationCenter.current().delegate = self

        let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
        UNUserNotificationCenter.current().requestAuthorization(
            options: authOptions,
            completionHandler: { granted, _ in
                if granted {
                    DispatchQueue.main.async {
                        application.registerForRemoteNotifications()
                    }
                }
            }
        )

        // Firebase Messaging 델리게이트 설정
        // Messaging.messaging().delegate = self
    }

    // MARK: - Remote Notifications

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        // Firebase에 APNs 토큰 전달
        // Messaging.messaging().apnsToken = deviceToken
        print("APNs token registered: \(deviceToken.map { String(format: "%02.2hhx", $0) }.joined())")
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("Failed to register for remote notifications: \(error.localizedDescription)")
    }

    // MARK: - UNUserNotificationCenterDelegate

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // 앱이 포그라운드일 때 알림 표시
        completionHandler([.banner, .badge, .sound])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        // 알림 탭 시 처리
        let userInfo = response.notification.request.content.userInfo
        handleNotification(userInfo)
        completionHandler()
    }

    private func handleNotification(_ userInfo: [AnyHashable: Any]) {
        // 알림 데이터 처리
        if let callId = userInfo["call_id"] as? Int {
            // 통화 화면으로 이동
            print("Navigate to call: \(callId)")
        }

        if let elderlyId = userInfo["elderly_id"] as? Int {
            // 어르신 상세 화면으로 이동
            print("Navigate to elderly: \(elderlyId)")
        }
    }
}

// MARK: - MessagingDelegate
// Firebase SDK 추가 후 주석 해제
/*
extension AppDelegate: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        print("FCM Token: \(token)")

        // 서버에 FCM 토큰 저장
        let request = FCMTokenRequest(fcm_token: token, device_type: "ios")
        APIService.shared.updateFCMToken(request)
            .sink { _ in } receiveValue: { _ in
                print("FCM token updated successfully")
            }
            .store(in: &cancellables)
    }
}
*/
