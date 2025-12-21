import Foundation
import Security

final class KeychainService {
    static let shared = KeychainService()

    private let service = "com.sori.app"

    private init() {}

    // MARK: - Basic Operations

    func save(_ value: String, forKey key: String) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]

        SecItemDelete(query as CFDictionary)
        return SecItemAdd(query as CFDictionary, nil) == errSecSuccess
    }

    func retrieve(forKey key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        if SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
           let data = result as? Data,
           let value = String(data: data, encoding: .utf8) {
            return value
        }
        return nil
    }

    func delete(forKey key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        return SecItemDelete(query as CFDictionary) == errSecSuccess
    }

    // MARK: - Integer Storage

    func saveInt(_ value: Int, forKey key: String) -> Bool {
        return save(String(value), forKey: key)
    }

    func retrieveInt(forKey key: String) -> Int? {
        guard let str = retrieve(forKey: key) else { return nil }
        return Int(str)
    }

    // MARK: - Date Storage (for token expiry)

    func saveDate(_ date: Date, forKey key: String) -> Bool {
        let timestamp = date.timeIntervalSince1970
        return save(String(timestamp), forKey: key)
    }

    func retrieveDate(forKey key: String) -> Date? {
        guard let str = retrieve(forKey: key),
              let timestamp = Double(str) else { return nil }
        return Date(timeIntervalSince1970: timestamp)
    }

    // MARK: - Pairing Data Management

    /// Save all pairing data at once
    func savePairingData(token: String, elderlyId: Int, deviceId: Int, expiresIn: Int) -> Bool {
        let expiresAt = Date().addingTimeInterval(TimeInterval(expiresIn))

        let tokenSaved = save(token, forKey: KeychainKeys.deviceAccessToken)
        let elderlySaved = saveInt(elderlyId, forKey: KeychainKeys.elderlyId)
        let deviceSaved = saveInt(deviceId, forKey: KeychainKeys.deviceId)
        let expirySaved = saveDate(expiresAt, forKey: KeychainKeys.tokenExpiresAt)

        return tokenSaved && elderlySaved && deviceSaved && expirySaved
    }

    /// Clear all pairing data
    func clearPairingData() {
        _ = delete(forKey: KeychainKeys.deviceAccessToken)
        _ = delete(forKey: KeychainKeys.elderlyId)
        _ = delete(forKey: KeychainKeys.deviceId)
        _ = delete(forKey: KeychainKeys.tokenExpiresAt)
    }

    /// Check if token is expired
    func isTokenExpired() -> Bool {
        guard let expiresAt = retrieveDate(forKey: KeychainKeys.tokenExpiresAt) else {
            return true
        }
        // Add 1 hour buffer for safety
        return Date().addingTimeInterval(3600) > expiresAt
    }

    /// Check if device is paired and token is valid
    func hasValidPairingToken() -> Bool {
        guard retrieve(forKey: KeychainKeys.deviceAccessToken) != nil else {
            return false
        }
        return !isTokenExpired()
    }

    // MARK: - FCM Token

    func saveFCMToken(_ token: String) -> Bool {
        return save(token, forKey: KeychainKeys.fcmToken)
    }

    func getFCMToken() -> String? {
        return retrieve(forKey: KeychainKeys.fcmToken)
    }

    // MARK: - Debug (without sensitive data)

    func debugPairingStatus() -> String {
        let hasToken = retrieve(forKey: KeychainKeys.deviceAccessToken) != nil
        let elderlyId = retrieveInt(forKey: KeychainKeys.elderlyId)
        let deviceId = retrieveInt(forKey: KeychainKeys.deviceId)
        let expiresAt = retrieveDate(forKey: KeychainKeys.tokenExpiresAt)
        let isExpired = isTokenExpired()

        return """
        Pairing Status:
        - Has Token: \(hasToken)
        - Elderly ID: \(elderlyId ?? -1)
        - Device ID: \(deviceId ?? -1)
        - Expires At: \(expiresAt?.description ?? "nil")
        - Is Expired: \(isExpired)
        """
    }
}
