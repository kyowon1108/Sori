import Foundation

struct ChatMessage: Codable, Identifiable {
    let id: Int
    let call_id: Int
    let role: String  // "user", "assistant"
    let content: String
    let created_at: String
}

// WebSocket 메시지
struct WSMessage: Codable {
    let type: String
    let content: String?
    let role: String?
    let is_streaming: Bool?
}
