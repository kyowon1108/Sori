import Foundation

struct User: Codable, Identifiable {
    let id: Int
    let email: String
    let full_name: String
    let role: String
    let fcm_token: String?
    let device_type: String?
    let push_enabled: Bool

    enum CodingKeys: String, CodingKey {
        case id, email, full_name, role, fcm_token, device_type, push_enabled
    }
}

struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct RegisterRequest: Codable {
    let email: String
    let password: String
    let full_name: String
}

struct AuthResponse: Codable {
    let access_token: String
    let refresh_token: String
    let user: User
}

struct TokenRefreshRequest: Codable {
    let refresh_token: String
}

struct FCMTokenRequest: Codable {
    let fcm_token: String
    let device_type: String
}
