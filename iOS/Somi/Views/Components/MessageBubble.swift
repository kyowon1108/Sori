import SwiftUI

struct MessageBubble: View {
    let message: ChatMessage

    private var isUser: Bool {
        message.role == "user"
    }

    var body: some View {
        HStack {
            if isUser { Spacer(minLength: 60) }

            VStack(alignment: isUser ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(isUser ? Color.blue : Color(.systemGray5))
                    .foregroundColor(isUser ? .white : .primary)
                    .cornerRadius(18)

                Text(formatTime(message.created_at))
                    .font(.caption2)
                    .foregroundColor(.gray)
            }

            if !isUser { Spacer(minLength: 60) }
        }
    }

    private func formatTime(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: dateString) {
            let timeFormatter = DateFormatter()
            timeFormatter.dateFormat = "HH:mm"
            return timeFormatter.string(from: date)
        }
        return ""
    }
}

#Preview {
    VStack(spacing: 12) {
        MessageBubble(message: ChatMessage(
            id: 1,
            call_id: 1,
            role: "user",
            content: "안녕하세요, 오늘 기분이 어떠세요?",
            created_at: ISO8601DateFormatter().string(from: Date())
        ))

        MessageBubble(message: ChatMessage(
            id: 2,
            call_id: 1,
            role: "assistant",
            content: "네, 안녕하세요! 오늘은 기분이 좋아요. 날씨도 좋고 손주들이 찾아온다고 해서 기대되네요.",
            created_at: ISO8601DateFormatter().string(from: Date())
        ))
    }
    .padding()
}
