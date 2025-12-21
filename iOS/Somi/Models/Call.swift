import Foundation

struct Call: Codable, Identifiable {
    let id: Int
    let elderly_id: Int
    let call_type: String
    let started_at: String
    let ended_at: String?
    let duration: Int?
    let status: String
    let is_successful: Bool
    let created_at: String
    let messages: [ChatMessage]?
    let analysis: CallAnalysis?
}

struct CallAnalysis: Codable {
    let id: Int
    let call_id: Int
    let risk_level: String
    let sentiment_score: Float
    let summary: String?
    let recommendations: [String]?
    let analyzed_at: String
}

struct CallStartRequest: Codable {
    let elderly_id: Int
    let call_type: String
}

struct CallStartResponse: Codable {
    let id: Int
    let elderly_id: Int
    let call_type: String
    let started_at: String
    let status: String
    let ws_url: String
}
