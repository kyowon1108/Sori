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
    let auto_ended: Bool?           // 서버에서 AI가 종료 의도 감지 시 true
    let call_end_detected: Bool?    // stream_end에서 종료 의도 감지 여부
}
