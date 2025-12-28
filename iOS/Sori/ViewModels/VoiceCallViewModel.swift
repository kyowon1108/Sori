import Foundation
import Combine
import AVFoundation

/// Call state for voice call UI
enum VoiceCallState: Equatable {
    case connecting
    case listening
    case speaking
    case processing
    case ended
    case error(String)

    var displayText: String {
        switch self {
        case .connecting:
            return "연결 중..."
        case .listening:
            return "듣는 중"
        case .speaking:
            return "말하는 중"
        case .processing:
            return "처리 중..."
        case .ended:
            return "통화 종료"
        case .error(let message):
            return message
        }
    }
}

/// Represents a message in the voice call transcript
struct VoiceMessage: Identifiable, Equatable {
    let id: UUID
    let role: MessageRole
    var content: String
    let timestamp: Date
    var isStreaming: Bool

    enum MessageRole: String {
        case user
        case assistant
    }

    init(role: MessageRole, content: String, isStreaming: Bool = false) {
        self.id = UUID()
        self.role = role
        self.content = content
        self.timestamp = Date()
        self.isStreaming = isStreaming
    }
}

/// ViewModel for VoiceCallView
@MainActor
final class VoiceCallViewModel: ObservableObject {

    // MARK: - Published Properties

    @Published private(set) var callState: VoiceCallState = .connecting
    @Published private(set) var isConnected = false
    @Published private(set) var isMuted = false
    @Published private(set) var messages: [VoiceMessage] = []
    @Published private(set) var callDuration: TimeInterval = 0
    @Published private(set) var partialTranscript = ""

    @Published var permissionsMissing = false
    @Published var microphonePermissionGranted = false
    @Published var speechPermissionGranted = false

    // MARK: - Private Properties

    private let webSocketService = WebSocketService.shared
    private let ttsService = TTSService.shared
    private let speechService = SpeechService.shared
    private let pairingService = PairingService.shared

    private var cancellables = Set<AnyCancellable>()
    private var callId: Int?
    private var callStartTime: Date?
    private var durationTimer: Timer?

    // Streaming state
    private var currentStreamingMessageId: UUID?
    private var streamedContent = ""

    // Auto-listen after TTS finishes
    private var shouldAutoListen = true

    // MARK: - Initialization

    init() {
        setupObservers()
        checkPermissions()
    }

    deinit {
        durationTimer?.invalidate()
    }

    // MARK: - Setup

    private func setupObservers() {
        // WebSocket connection status
        webSocketService.connectionStatusPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] connected in
                self?.isConnected = connected
                if connected {
                    self?.handleConnected()
                }
            }
            .store(in: &cancellables)

        // WebSocket errors
        webSocketService.errorPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] error in
                self?.handleError(error)
            }
            .store(in: &cancellables)

        // Call ended notification (auto-ended by AI)
        NotificationCenter.default.addObserver(
            forName: Notification.Name("callEnded"),
            object: nil,
            queue: .main
        ) { [weak self] notification in
            let autoEnded = notification.userInfo?["auto_ended"] as? Bool ?? false
            print("[VoiceCall] Received callEnded notification, auto_ended: \(autoEnded)")

            Task { @MainActor in
                guard let self = self else { return }
                if autoEnded {
                    // AI detected end intent, gracefully end call
                    self.stopListening()
                    self.ttsService.stop()
                    self.durationTimer?.invalidate()
                    self.durationTimer = nil
                    self.callState = .ended

                    // Disconnect after brief delay
                    try? await Task.sleep(nanoseconds: 500_000_000)
                    self.webSocketService.disconnect()
                }
            }
        }
    }

    private func checkPermissions() {
        Task {
            microphonePermissionGranted = speechService.microphonePermission == .granted
            speechPermissionGranted = speechService.authorizationStatus == .authorized
            permissionsMissing = !speechService.hasAllPermissions
        }
    }

    // MARK: - Public Methods

    /// Start a voice call with the given call ID
    func startCall(callId: Int) {
        self.callId = callId
        callState = .connecting

        guard let token = pairingService.getDeviceToken() else {
            callState = .error("인증 정보가 없습니다")
            return
        }

        print("[VoiceCall] Starting call \(callId)")

        webSocketService.connect(
            callId: callId,
            token: token,
            onMessage: { [weak self] message in
                Task { @MainActor in
                    self?.handleIncomingMessage(message)
                }
            },
            onError: { [weak self] error in
                Task { @MainActor in
                    self?.handleError(error)
                }
            }
        )
    }

    /// End the current call
    func endCall() {
        print("[VoiceCall] Ending call")

        // Stop all audio
        stopListening()
        ttsService.stop()

        // Stop timer
        durationTimer?.invalidate()
        durationTimer = nil

        callState = .ended

        // Send end_call message to server, then disconnect
        webSocketService.sendEndCall { [weak self] in
            // Disconnect after end_call message is sent
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                self?.webSocketService.disconnect()
                print("[VoiceCall] Disconnected after end_call")
            }
        }
    }

    /// Toggle mute state
    func toggleMute() {
        isMuted.toggle()

        if isMuted {
            stopListening()
        } else if callState == .listening || !ttsService.isSpeaking {
            startListening()
        }
    }

    /// Request required permissions
    func requestPermissions() {
        speechService.requestAllPermissions { [weak self] micGranted, speechGranted in
            self?.microphonePermissionGranted = micGranted
            self?.speechPermissionGranted = speechGranted
            self?.permissionsMissing = !(micGranted && speechGranted)

            if micGranted && speechGranted {
                // Permissions granted, can start listening
                self?.startListeningIfReady()
            }
        }
    }

    #if DEBUG
    /// Simulate user input (for testing on simulator)
    func simulateUserInput(_ text: String) {
        guard !text.isEmpty else { return }

        // Add user message
        let userMessage = VoiceMessage(role: .user, content: text)
        messages.append(userMessage)

        // Send to server
        sendUserMessage(text)

        // Update state
        callState = .processing
    }
    #endif

    // MARK: - WebSocket Handling

    private func handleConnected() {
        print("[VoiceCall] Connected to WebSocket")

        // Start call timer
        callStartTime = Date()
        startDurationTimer()

        // Initial greeting will come from server as first assistant message
        callState = .listening
        startListeningIfReady()
    }

    private func handleIncomingMessage(_ message: ChatMessage) {
        let messageType = detectMessageType(message)

        switch messageType {
        case .history:
            // History messages - don't speak, just display
            if message.role == "assistant" || message.role == "user" {
                let voiceMessage = VoiceMessage(
                    role: message.role == "assistant" ? .assistant : .user,
                    content: message.content
                )
                messages.append(voiceMessage)
            }

        case .streamChunk:
            handleStreamChunk(message)

        case .streamEnd, .fullMessage:
            handleFullMessage(message)

        case .other:
            break
        }
    }

    private func handleStreamChunk(_ message: ChatMessage) {
        guard message.role == "assistant" else { return }

        // Stop listening while receiving response
        stopListening()
        callState = .speaking

        if currentStreamingMessageId == nil {
            // Start new streaming message
            let newMessage = VoiceMessage(role: .assistant, content: message.content, isStreaming: true)
            currentStreamingMessageId = newMessage.id
            streamedContent = message.content
            messages.append(newMessage)
        } else {
            // Append to existing streaming message
            streamedContent += message.content
            if let index = messages.firstIndex(where: { $0.id == currentStreamingMessageId }) {
                messages[index].content = streamedContent
            }
        }
    }

    private func handleFullMessage(_ message: ChatMessage) {
        if message.role == "assistant" {
            // Finalize streaming message
            if let streamingId = currentStreamingMessageId,
               let index = messages.firstIndex(where: { $0.id == streamingId }) {
                messages[index].content = message.content
                messages[index].isStreaming = false
            } else if currentStreamingMessageId == nil {
                // Direct full message (not from streaming)
                let voiceMessage = VoiceMessage(role: .assistant, content: message.content)
                messages.append(voiceMessage)
            }

            // Reset streaming state
            currentStreamingMessageId = nil
            streamedContent = ""

            // Speak the message
            speakAssistantMessage(message.content)

        } else if message.role == "user" {
            // Echo of user message
            let exists = messages.contains { $0.role == .user && $0.content == message.content }
            if !exists {
                let voiceMessage = VoiceMessage(role: .user, content: message.content)
                messages.append(voiceMessage)
            }
        }
    }

    private func handleError(_ error: Error) {
        print("[VoiceCall] Error: \(error.localizedDescription)")
        callState = .error("연결 오류가 발생했습니다")
    }

    // MARK: - Message Type Detection

    private enum MessageType {
        case history
        case streamChunk
        case streamEnd
        case fullMessage
        case other
    }

    /// Message type tracking from WebSocket service
    /// Uses internal flag set by WebSocketService's handleWSMessage
    private var lastMessageWasStreamChunk = false
    private var lastMessageWasHistory = false

    private func detectMessageType(_ message: ChatMessage) -> MessageType {
        // V2 endpoint sends clear message types via WSMessage.type
        // The ChatMessage we receive has been converted, so we need to
        // track the type through the WebSocket handling flow

        // For streaming: small chunks followed by stream_end
        // stream_chunk messages are typically small pieces
        if message.content.count < 50 && message.role == "assistant" {
            // Could be a stream chunk
            if currentStreamingMessageId != nil || lastMessageWasStreamChunk {
                return .streamChunk
            }
        }

        // History messages don't need TTS
        if lastMessageWasHistory {
            lastMessageWasHistory = false
            return .history
        }

        return .fullMessage
    }

    // MARK: - TTS

    private func speakAssistantMessage(_ text: String) {
        callState = .speaking

        ttsService.speak(text) { [weak self] in
            Task { @MainActor in
                guard let self = self, self.shouldAutoListen else { return }
                // After TTS finishes, start listening again
                self.startListeningIfReady()
            }
        }
    }

    // MARK: - STT

    private func startListeningIfReady() {
        guard !isMuted else { return }
        guard speechService.hasAllPermissions else {
            permissionsMissing = true
            return
        }
        guard isConnected else { return }
        guard !ttsService.isSpeaking else { return }

        startListening()
    }

    private func startListening() {
        guard !isMuted else { return }

        callState = .listening
        partialTranscript = ""

        speechService.startListening(
            onPartial: { [weak self] partial in
                Task { @MainActor in
                    self?.partialTranscript = partial
                }
            },
            onFinal: { [weak self] final in
                Task { @MainActor in
                    self?.handleUserSpeech(final)
                }
            },
            onError: { [weak self] error in
                Task { @MainActor in
                    print("[VoiceCall] STT error: \(error.localizedDescription)")
                    // Don't show error, just restart listening
                    if self?.isConnected == true && self?.isMuted == false {
                        self?.startListening()
                    }
                }
            }
        )
    }

    private func stopListening() {
        speechService.stopListening()
        partialTranscript = ""
    }

    private func handleUserSpeech(_ text: String) {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            // Empty speech, restart listening
            startListeningIfReady()
            return
        }

        print("[VoiceCall] User said: \(text)")

        // Add user message to transcript
        let userMessage = VoiceMessage(role: .user, content: text)
        messages.append(userMessage)

        // Send to server
        sendUserMessage(text)

        callState = .processing
        partialTranscript = ""
    }

    // MARK: - WebSocket Sending

    private func sendUserMessage(_ text: String) {
        webSocketService.sendMessage(text)
    }

    private func sendEndCallMessage() {
        webSocketService.sendEndCall {
            print("[VoiceCall] end_call message sent to server")
        }
    }

    // MARK: - Duration Timer

    private func startDurationTimer() {
        durationTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            Task { @MainActor [weak self] in
                guard let self = self, let startTime = self.callStartTime else { return }
                self.callDuration = Date().timeIntervalSince(startTime)
            }
        }
    }

    // MARK: - Formatting

    var formattedDuration: String {
        let minutes = Int(callDuration) / 60
        let seconds = Int(callDuration) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}
