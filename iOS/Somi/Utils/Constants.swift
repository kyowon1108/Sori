import Foundation

struct APIConstants {
    static let baseURL = "http://localhost:8000"
    static let wsBaseURL = "ws://localhost:8000"
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
    static let appName = "Somi"
    static let appVersion = "1.0.0"
    static let bundleId = "com.sori.app"
}

struct KeychainKeys {
    static let accessToken = "accessToken"
    static let refreshToken = "refreshToken"
    static let user = "user"
}

struct NotificationNames {
    static let userDidLogin = Notification.Name("userDidLogin")
    static let userDidLogout = Notification.Name("userDidLogout")
    static let tokenDidRefresh = Notification.Name("tokenDidRefresh")
}
