import Foundation
import Combine

final class WebSocketService: NSObject, URLSessionWebSocketDelegate {
    static let shared = WebSocketService()

    var messagePublisher = PassthroughSubject<ChatMessage, Never>()
    var connectionStatusPublisher = PassthroughSubject<Bool, Never>()

    private var webSocket: URLSessionWebSocketTask?
    private var currentCallId: Int?

    override private init() {
        super.init()
    }

    func connect(
        callId: Int,
        token: String,
        onMessage: @escaping (ChatMessage) -> Void,
        onError: @escaping (Error) -> Void
    ) {
        currentCallId = callId
        let urlString = "\(APIConstants.wsBaseURL)/ws/\(callId)?token=\(token)"
        guard let url = URL(string: urlString) else {
            onError(APIError.invalidURL)
            return
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = APIConstants.apiTimeout

        let session = URLSession(
            configuration: .default,
            delegate: self,
            delegateQueue: OperationQueue()
        )

        webSocket = session.webSocketTask(with: request)
        webSocket?.resume()

        connectionStatusPublisher.send(true)
        receiveMessages(onMessage: onMessage, onError: onError)
    }

    private func receiveMessages(
        onMessage: @escaping (ChatMessage) -> Void,
        onError: @escaping (Error) -> Void
    ) {
        webSocket?.receive { [weak self] result in
            guard let self = self else { return }

            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    if let data = text.data(using: .utf8),
                       let wsMessage = try? JSONDecoder().decode(WSMessage.self, from: data),
                       let chatMessage = self.convertWSMessageToChatMessage(wsMessage) {
                        DispatchQueue.main.async {
                            onMessage(chatMessage)
                            self.messagePublisher.send(chatMessage)
                        }
                    }
                    // IMPORTANT: 다음 메시지 계속 수신
                    self.receiveMessages(onMessage: onMessage, onError: onError)

                case .data(let data):
                    if let wsMessage = try? JSONDecoder().decode(WSMessage.self, from: data),
                       let chatMessage = self.convertWSMessageToChatMessage(wsMessage) {
                        DispatchQueue.main.async {
                            onMessage(chatMessage)
                            self.messagePublisher.send(chatMessage)
                        }
                    }
                    // IMPORTANT: 다음 메시지 계속 수신
                    self.receiveMessages(onMessage: onMessage, onError: onError)

                @unknown default:
                    // IMPORTANT: 계속 수신
                    self.receiveMessages(onMessage: onMessage, onError: onError)
                }

            case .failure(let error):
                DispatchQueue.main.async {
                    self.connectionStatusPublisher.send(false)
                    onError(error)
                }
            }
        }
    }

    private func convertWSMessageToChatMessage(_ wsMessage: WSMessage) -> ChatMessage? {
        guard let content = wsMessage.content, let role = wsMessage.role else {
            return nil
        }
        return ChatMessage(
            id: Int.random(in: 1...999999),
            call_id: currentCallId ?? 0,
            role: role,
            content: content,
            created_at: ISO8601DateFormatter().string(from: Date())
        )
    }

    func sendMessage(_ text: String) {
        let message = WSMessage(
            type: "message",
            content: text,
            role: nil,
            is_streaming: nil
        )

        if let data = try? JSONEncoder().encode(message),
           let jsonString = String(data: data, encoding: .utf8) {
            webSocket?.send(.string(jsonString)) { _ in }
        }
    }

    func disconnect() {
        webSocket?.cancel(with: .goingAway, reason: nil)
        webSocket = nil
        currentCallId = nil
        connectionStatusPublisher.send(false)
    }

    // MARK: - URLSessionWebSocketDelegate
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
        connectionStatusPublisher.send(true)
    }

    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?) {
        connectionStatusPublisher.send(false)
    }
}
