import Foundation

// MARK: - Pairing Request/Response Models

struct PairingClaimRequest: Codable {
    let code: String
    let fcm_token: String
    let platform: String
    let device_name: String?
    let os_version: String?
}

struct PairingClaimResponse: Codable {
    let elderly_id: Int
    let device_id: Int
    let device_access_token: String
    let expires_in: Int
}
