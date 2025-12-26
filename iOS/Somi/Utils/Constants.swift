import Foundation

struct APIConstants {
    // EC2 deployment URL
    static let baseURL = "http://52.79.227.179"
    static let wsBaseURL = "ws://52.79.227.179"
    static let apiTimeout = 30.0
    static let environment = "production"
}

struct ValidationRules {
    static let minPasswordLength = 8
    static let maxNameLength = 255
    static let phonePattern = "^[0-9]{10,11}$"
    static let emailPattern = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
    static let pairingCodeLength = 6
}

struct AppConstants {
    static let appName = "SORI"
    static let appVersion = "1.0.0"
    static let bundleId = "com.sori.app"
}

struct KeychainKeys {
    static let accessToken = "accessToken"
    static let refreshToken = "refreshToken"
    static let user = "user"
    // Elderly device pairing
    static let deviceAccessToken = "deviceAccessToken"
    static let elderlyId = "elderlyId"
    static let deviceId = "deviceId"
    static let tokenExpiresAt = "tokenExpiresAt"
    // FCM Token
    static let fcmToken = "fcmToken"
}

struct NotificationNames {
    static let userDidLogin = Notification.Name("userDidLogin")
    static let userDidLogout = Notification.Name("userDidLogout")
    static let tokenDidRefresh = Notification.Name("tokenDidRefresh")
    /// Canonical notification for navigating to a call screen.
    /// Use this for all call navigation (scheduled, incoming, tapped notification).
    static let navigateToCall = Notification.Name("navigateToCall")
    /// Posted when device token is invalidated (401/403 from WebSocket or API).
    static let tokenInvalid = Notification.Name("tokenInvalid")
    /// Posted when FCM token is received/refreshed.
    static let fcmTokenReceived = Notification.Name("fcmTokenReceived")
}

struct PairingErrorMessages {
    static let codeExpired = "코드가 만료되었습니다.\n보호자에게 새 코드를 요청하세요."
    static let invalidCode = "잘못된 코드입니다.\n6자리 숫자를 다시 확인해주세요."
    static let maxAttempts = "시도 횟수를 초과했습니다.\n보호자에게 새 코드를 요청하세요."
    static let rateLimited = "너무 많은 요청입니다.\n잠시 후 다시 시도하세요."
    static let networkError = "인터넷 연결을 확인해주세요."
    static let serverError = "서버 오류가 발생했습니다.\n잠시 후 다시 시도하세요."
    static let fcmTokenMissing = "알림 권한이 필요합니다.\n설정에서 알림을 허용해주세요."
    static let unknownError = "연결에 실패했습니다.\n다시 시도해주세요."
}
