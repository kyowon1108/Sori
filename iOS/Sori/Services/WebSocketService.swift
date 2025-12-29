import Foundation
import Combine

final class WebSocketService: NSObject, URLSessionWebSocketDelegate {
    static let shared = WebSocketService()

    // MARK: - Publishers

    var messagePublisher = PassthroughSubject<ChatMessage, Never>()
    var connectionStatusPublisher = PassthroughSubject<Bool, Never>()
    var errorPublisher = PassthroughSubject<Error, Never>()

    // MARK: - Private Properties

    private var webSocket: URLSessionWebSocketTask?
    private var currentCallId: Int?
    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 3
    private var currentToken: String?

    // Connection state
    private(set) var isConnected = false

    override private init() {
        super.init()
    }

    // MARK: - Connection Methods

    func connect(
        callId: Int,
        token: String,
        onMessage: @escaping (ChatMessage) -> Void,
        onError: @escaping (Error) -> Void
    ) {
        // Disconnect existing connection
        if webSocket != nil {
            disconnect()
        }

        currentCallId = callId
        currentToken = token
        reconnectAttempts = 0

        establishConnection(callId: callId, token: token, onMessage: onMessage, onError: onError)
    }

    private func establishConnection(
        callId: Int,
        token: String,
        onMessage: @escaping (ChatMessage) -> Void,
        onError: @escaping (Error) -> Void
    ) {
        // Use v2 endpoint for OpenAI-based agent
        let urlString = "\(APIConstants.wsBaseURL)/ws/v2/\(callId)?token=\(token)"
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

        print("[WebSocket] Connecting to call \(callId)...")

        // Start receiving messages
        receiveMessages(onMessage: onMessage, onError: onError)

        // NOTE: Client ping timer removed per protocol design.
        // Server sends ping every HEARTBEAT_INTERVAL and iOS responds with pong.
        // This avoids redundant traffic and protocol confusion.
    }

    // MARK: - Message Receiving

    private func receiveMessages(
        onMessage: @escaping (ChatMessage) -> Void,
        onError: @escaping (Error) -> Void
    ) {
        webSocket?.receive { [weak self] result in
            guard let self = self else { return }

            switch result {
            case .success(let message):
                self.handleReceivedMessage(message, onMessage: onMessage, onError: onError)

            case .failure(let error):
                self.handleConnectionError(error, onError: onError)
            }
        }
    }

    private func handleReceivedMessage(
        _ message: URLSessionWebSocketTask.Message,
        onMessage: @escaping (ChatMessage) -> Void,
        onError: @escaping (Error) -> Void
    ) {
        switch message {
        case .string(let text):
            processTextMessage(text, onMessage: onMessage)

        case .data(let data):
            processDataMessage(data, onMessage: onMessage)

        @unknown default:
            break
        }

        // Continue receiving
        receiveMessages(onMessage: onMessage, onError: onError)
    }

    private func processTextMessage(_ text: String, onMessage: @escaping (ChatMessage) -> Void) {
        guard let data = text.data(using: .utf8) else { return }

        // Try to decode as WSMessage
        if let wsMessage = try? JSONDecoder().decode(WSMessage.self, from: data) {
            handleWSMessage(wsMessage, onMessage: onMessage)
            return
        }

        // Try to decode as ping message
        if let pingMessage = try? JSONDecoder().decode(PingMessage.self, from: data) {
            handlePingMessage(pingMessage)
            return
        }
    }

    private func processDataMessage(_ data: Data, onMessage: @escaping (ChatMessage) -> Void) {
        if let wsMessage = try? JSONDecoder().decode(WSMessage.self, from: data) {
            handleWSMessage(wsMessage, onMessage: onMessage)
        }
    }

    private func handleWSMessage(_ wsMessage: WSMessage, onMessage: @escaping (ChatMessage) -> Void) {
        // Handle different message types
        switch wsMessage.type {
        case "ping":
            sendPong()
            return

        case "pong":
            // Server acknowledged our ping
            return

        case "ack":
            // Server acknowledged our message (v2 endpoint)
            if let messageId = wsMessage.message_id {
                print("[WebSocket] Server acked message: \(messageId)")
            }
            return

        case "stream_chunk":
            // UI update only - don't send to TTS
            if let chatMessage = convertWSMessageToChatMessage(wsMessage) {
                DispatchQueue.main.async {
                    onMessage(chatMessage)
                    self.messagePublisher.send(chatMessage)
                }
            }

        case "history":
            // Historical message (v2: sent on connect)
            if let chatMessage = convertWSMessageToChatMessage(wsMessage) {
                DispatchQueue.main.async {
                    onMessage(chatMessage)
                    self.messagePublisher.send(chatMessage)
                }
            }

        case "stream_end", "message", "assistant":
            // Full message - can be sent to TTS
            if let chatMessage = convertWSMessageToChatMessage(wsMessage) {
                DispatchQueue.main.async {
                    onMessage(chatMessage)
                    self.messagePublisher.send(chatMessage)
                }
            }

        case "ended":
            // Call ended (possibly auto-ended by AI)
            print("[WebSocket] Call ended, auto_ended: \(wsMessage.auto_ended ?? false)")
            DispatchQueue.main.async {
                // Notify that call has ended
                NotificationCenter.default.post(
                    name: Notification.Name("callEnded"),
                    object: nil,
                    userInfo: ["auto_ended": wsMessage.auto_ended ?? false]
                )
            }

        case "error":
            print("[WebSocket] Server error: \(wsMessage.content ?? "unknown")")

        default:
            // Handle other message types
            if let chatMessage = convertWSMessageToChatMessage(wsMessage) {
                DispatchQueue.main.async {
                    onMessage(chatMessage)
                    self.messagePublisher.send(chatMessage)
                }
            }
        }
    }

    private func handlePingMessage(_ pingMessage: PingMessage) {
        if pingMessage.type == "ping" {
            sendPong()
        }
    }

    private func handleConnectionError(_ error: Error, onError: @escaping (Error) -> Void) {
        print("[WebSocket] Connection error: \(error.localizedDescription)")

        isConnected = false

        DispatchQueue.main.async {
            self.connectionStatusPublisher.send(false)
            self.errorPublisher.send(error)
        }

        // Check if we should try to reconnect
        if shouldReconnect(error: error) {
            attemptReconnect(onError: onError)
        } else {
            DispatchQueue.main.async {
                onError(error)
            }
        }
    }

    // MARK: - Pong Response

    /// Respond to server ping with pong
    private func sendPong() {
        let pongMessage = ["type": "pong"]
        if let data = try? JSONEncoder().encode(pongMessage),
           let jsonString = String(data: data, encoding: .utf8) {
            webSocket?.send(.string(jsonString)) { error in
                if let error = error {
                    print("[WebSocket] Pong failed: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Reconnection

    private func shouldReconnect(error: Error) -> Bool {
        // Don't reconnect for authentication errors
        if let urlError = error as? URLError {
            switch urlError.code {
            case .userAuthenticationRequired, .userCancelledAuthentication:
                return false
            default:
                break
            }
        }

        return reconnectAttempts < maxReconnectAttempts
    }

    private func attemptReconnect(onError: @escaping (Error) -> Void) {
        reconnectAttempts += 1
        let delay = Double(reconnectAttempts) * 2.0

        print("[WebSocket] Attempting reconnect \(reconnectAttempts)/\(maxReconnectAttempts) in \(delay)s...")

        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            guard let self = self,
                  let callId = self.currentCallId,
                  let token = self.currentToken else {
                return
            }

            self.establishConnection(
                callId: callId,
                token: token,
                onMessage: { message in
                    self.messagePublisher.send(message)
                },
                onError: onError
            )
        }
    }

    // MARK: - Message Conversion

    private func convertWSMessageToChatMessage(_ wsMessage: WSMessage) -> ChatMessage? {
        guard let content = wsMessage.content, let role = wsMessage.role else {
            return nil
        }
        return ChatMessage(
            id: Int.random(in: 1...999999),
            call_id: currentCallId ?? 0,
            role: role,
            content: content,
            created_at: ISO8601DateFormatter().string(from: Date()),
            messageType: wsMessage.type
        )
    }

    // MARK: - Sending Messages

    func sendMessage(_ text: String) {
        // Generate unique message_id for deduplication
        let messageId = UUID().uuidString

        let message: [String: Any] = [
            "type": "message",
            "content": text,
            "message_id": messageId
        ]

        if let data = try? JSONSerialization.data(withJSONObject: message),
           let jsonString = String(data: data, encoding: .utf8) {
            webSocket?.send(.string(jsonString)) { error in
                if let error = error {
                    print("[WebSocket] Send failed: \(error.localizedDescription)")
                } else {
                    print("[WebSocket] Message sent: \(messageId)")
                }
            }
        }
    }

    /// Send end_call message to notify server that call is ending
    func sendEndCall(completion: (() -> Void)? = nil) {
        let message = WSMessage(
            type: "end_call",
            content: nil,
            role: nil,
            is_streaming: nil
        )

        if let data = try? JSONEncoder().encode(message),
           let jsonString = String(data: data, encoding: .utf8) {
            webSocket?.send(.string(jsonString)) { error in
                if let error = error {
                    print("[WebSocket] end_call send failed: \(error.localizedDescription)")
                } else {
                    print("[WebSocket] end_call sent successfully")
                }
                completion?()
            }
        } else {
            completion?()
        }
    }

    // MARK: - Disconnect

    func disconnect() {
        webSocket?.cancel(with: .goingAway, reason: nil)
        webSocket = nil
        currentCallId = nil
        currentToken = nil
        isConnected = false
        reconnectAttempts = 0

        DispatchQueue.main.async {
            self.connectionStatusPublisher.send(false)
        }

        print("[WebSocket] Disconnected")
    }

    // MARK: - URLSessionWebSocketDelegate

    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didOpenWithProtocol protocol: String?
    ) {
        print("[WebSocket] Connected successfully")
        isConnected = true
        reconnectAttempts = 0

        DispatchQueue.main.async {
            self.connectionStatusPublisher.send(true)
        }
    }

    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didCloseWith closeCode: URLSessionWebSocketTask.CloseCode,
        reason: Data?
    ) {
        print("[WebSocket] Closed with code: \(closeCode.rawValue)")
        isConnected = false

        DispatchQueue.main.async {
            self.connectionStatusPublisher.send(false)
        }

        // Handle unauthorized close (token rejected)
        if closeCode == .policyViolation {
            // Token was rejected, notify app
            NotificationCenter.default.post(name: NotificationNames.tokenInvalid, object: nil)
        }
    }
}

// MARK: - Ping Message Model

private struct PingMessage: Codable {
    let type: String
}
