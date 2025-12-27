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
    var content: String? = nil
    var role: String? = nil
    var is_streaming: Bool? = nil
    var auto_ended: Bool? = nil           // 서버에서 AI가 종료 의도 감지 시 true
    var call_end_detected: Bool? = nil    // stream_end에서 종료 의도 감지 여부
}
