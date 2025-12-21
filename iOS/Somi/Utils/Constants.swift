import Foundation

struct APIConstants {
    // Use local network IP for device testing (change to localhost for simulator)
    static let baseURL = "http://192.168.0.42:8000"
    static let wsBaseURL = "ws://192.168.0.42:8000"
    static let apiTimeout = 30.0
    static let environment = "development"
}

struct ValidationRules {
    static let minPasswordLength = 8
    static let maxNameLength = 255
    static let phonePattern = "^[0-9]{10,11}$"
    static let emailPattern = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
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
}

struct NotificationNames {
    static let userDidLogin = Notification.Name("userDidLogin")
    static let userDidLogout = Notification.Name("userDidLogout")
    static let tokenDidRefresh = Notification.Name("tokenDidRefresh")
}
