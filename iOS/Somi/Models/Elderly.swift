import Foundation

struct CallSchedule: Codable {
    let enabled: Bool
    let times: [String]
}

struct Elderly: Codable, Identifiable {
    let id: Int
    let caregiver_id: Int
    let name: String
    let age: Int?
    let phone: String?
    let call_schedule: CallSchedule
    let health_condition: String?
    let medications: [Medication]?
    let emergency_contact: String?
    let risk_level: String
    let notes: String?
    let created_at: String
    let updated_at: String
}

struct Medication: Codable {
    let name: String
    let dosage: String
    let frequency: String
}

struct ElderlyCreateRequest: Codable {
    let name: String
    let age: Int?
    let phone: String?
    let call_schedule: CallSchedule?
    let health_condition: String?
    let medications: [Medication]?
    let emergency_contact: String?
    let notes: String?
}
