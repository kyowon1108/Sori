import Foundation

struct ChatMessage: Codable, Identifiable {
    let id: Int
    let call_id: Int
    let role: String  // "user", "assistant"
    let content: String
    let created_at: String
}

/// WebSocket message types from backend
/// Supports both v1 and v2 (OpenAI Agent) endpoints
struct WSMessage: Codable {
    let type: String
    var content: String? = nil
    var role: String? = nil
    var is_streaming: Bool? = nil
    var auto_ended: Bool? = nil           // 서버에서 AI가 종료 의도 감지 시 true
    var call_end_detected: Bool? = nil    // stream_end에서 종료 의도 감지 여부
    var response_id: String? = nil        // v2: streaming response identifier
    var message_id: String? = nil         // v2: message identifier for ack
    var call_id: Int? = nil               // v2: call identifier
    var status: String? = nil             // v2: call status (for "ended" messages)
    var tool_calls: [ToolCallInfo]? = nil // v2: tool execution info
}

/// Tool call information from OpenAI Agent
struct ToolCallInfo: Codable {
    let id: String?
    let name: String?
    let input: [String: AnyCodable]?
}

/// Helper for encoding/decoding Any values in Codable
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let string = try? container.decode(String.self) {
            value = string
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else {
            value = NSNull()
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let string as String:
            try container.encode(string)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let bool as Bool:
            try container.encode(bool)
        default:
            try container.encodeNil()
        }
    }
}
