import Foundation
import Combine

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var inputText = ""
    @Published var isLoading = false
    @Published var isConnected = false
    @Published var errorMessage: String?

    private let webSocketService = WebSocketService.shared
    private let apiService = APIService.shared
    private var cancellables = Set<AnyCancellable>()
    private var currentCallId: Int?

    init() {
        setupConnectionObserver()
    }

    private func setupConnectionObserver() {
        webSocketService.connectionStatusPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] connected in
                self?.isConnected = connected
            }
            .store(in: &cancellables)
    }

    func startCall(for elderlyId: Int) {
        isLoading = true
        errorMessage = nil

        let request = CallStartRequest(elderly_id: elderlyId, call_type: "voice")

        apiService.startCall(request)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                switch completion {
                case .failure(let error):
                    self?.errorMessage = error.description
                case .finished:
                    break
                }
            } receiveValue: { [weak self] response in
                self?.currentCallId = response.id
                self?.connectWebSocket(callId: response.id)
            }
            .store(in: &cancellables)
    }

    private func connectWebSocket(callId: Int) {
        guard let token = apiService.accessToken else {
            errorMessage = "인증 토큰이 없습니다"
            return
        }

        webSocketService.connect(
            callId: callId,
            token: token,
            onMessage: { [weak self] message in
                self?.messages.append(message)
            },
            onError: { [weak self] error in
                self?.errorMessage = (error as? APIError)?.description ?? "연결 오류"
                self?.isConnected = false
            }
        )
    }

    func sendMessage() {
        guard !inputText.trimmingCharacters(in: .whitespaces).isEmpty else {
            return
        }

        let userMessage = ChatMessage(
            id: Int.random(in: 1...999999),
            call_id: currentCallId ?? 0,
            role: "user",
            content: inputText,
            created_at: ISO8601DateFormatter().string(from: Date())
        )
        messages.append(userMessage)

        webSocketService.sendMessage(inputText)
        inputText = ""
    }

    func endCall() {
        guard let callId = currentCallId else { return }

        webSocketService.disconnect()

        apiService.endCall(callId)
            .receive(on: DispatchQueue.main)
            .sink { _ in } receiveValue: { [weak self] _ in
                self?.currentCallId = nil
                self?.isConnected = false
            }
            .store(in: &cancellables)
    }

    func clearMessages() {
        messages.removeAll()
    }
}
