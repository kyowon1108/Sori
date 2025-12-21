import SwiftUI
import Combine

struct ElderlyHomeView: View {
    @EnvironmentObject var viewModel: PairingViewModel
    @Binding var pendingCallId: Int?

    @State private var showUnpairAlert = false
    @State private var showCallView = false
    @State private var currentCallId: Int?
    @State private var connectionStatus: ConnectionStatus = .connected

    enum ConnectionStatus {
        case connected
        case connecting
        case disconnected
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 40) {
                Spacer()

                // Welcome message
                welcomeSection

                // Status indicator
                statusSection

                Spacer()

                // Unpair button (hidden in corner)
                unpairButton
            }
            .padding()
            .navigationTitle("SORI")
            .navigationBarTitleDisplayMode(.inline)
            .alert("연결 해제", isPresented: $showUnpairAlert) {
                Button("취소", role: .cancel) {}
                Button("해제", role: .destructive) {
                    viewModel.unpair()
                }
            } message: {
                Text("기기 연결을 해제하시겠습니까?\n다시 연결하려면 보호자에게 새 코드를 요청해야 합니다.")
            }
            .fullScreenCover(isPresented: $showCallView) {
                if let callId = currentCallId {
                    ElderlyCallView(callId: callId, isPresented: $showCallView)
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: NotificationNames.incomingCall)) { notification in
                handleIncomingCall(notification)
            }
            .onChange(of: pendingCallId) {
                if let callId = pendingCallId {
                    pendingCallId = nil
                    navigateToCall(callId)
                }
            }
            .onAppear {
                // Check for pending call when view appears
                if let callId = pendingCallId {
                    pendingCallId = nil
                    navigateToCall(callId)
                }
            }
        }
        .navigationViewStyle(StackNavigationViewStyle())
    }

    // MARK: - Welcome Section

    private var welcomeSection: some View {
        VStack(spacing: 20) {
            Image(systemName: "heart.fill")
                .font(.system(size: 100))
                .foregroundColor(.accentColor)
                .accessibilityHidden(true)

            Text("안녕하세요")
                .font(.system(size: 40, weight: .bold))
                .accessibilityAddTraits(.isHeader)

            Text("SORI가 함께합니다")
                .font(.title)
                .foregroundColor(.secondary)
        }
    }

    // MARK: - Status Section

    private var statusSection: some View {
        VStack(spacing: 24) {
            // Connection status
            HStack(spacing: 12) {
                Circle()
                    .fill(statusColor)
                    .frame(width: 14, height: 14)

                Text(statusText)
                    .font(.title2)
                    .foregroundColor(.secondary)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("연결 상태: \(statusText)")

            // Waiting message
            VStack(spacing: 12) {
                Image(systemName: "phone.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.secondary)
                    .accessibilityHidden(true)

                Text("전화 대기 중...")
                    .font(.title)
                    .foregroundColor(.secondary)

                Text("보호자가 전화를 걸면 알려드릴게요")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, 20)
        }
        .padding(32)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color(.systemGray6))
        )
    }

    private var statusColor: Color {
        switch connectionStatus {
        case .connected:
            return .green
        case .connecting:
            return .orange
        case .disconnected:
            return .red
        }
    }

    private var statusText: String {
        switch connectionStatus {
        case .connected:
            return "연결됨"
        case .connecting:
            return "연결 중..."
        case .disconnected:
            return "연결 끊김"
        }
    }

    // MARK: - Unpair Button

    private var unpairButton: some View {
        Button(action: {
            showUnpairAlert = true
        }) {
            Text("연결 해제")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(.bottom, 20)
        .accessibilityLabel("기기 연결 해제")
        .accessibilityHint("탭하면 기기 연결을 해제합니다")
    }

    // MARK: - Navigation

    private func handleIncomingCall(_ notification: NotificationCenter.Publisher.Output) {
        if let callId = notification.userInfo?["call_id"] as? Int {
            navigateToCall(callId)
        }
    }

    private func navigateToCall(_ callId: Int) {
        currentCallId = callId
        showCallView = true
    }
}

// MARK: - Elderly Call View

struct ElderlyCallView: View {
    let callId: Int
    @Binding var isPresented: Bool

    @StateObject private var chatViewModel = ChatViewModel()
    @State private var showEndCallAlert = false

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Connection status
                connectionStatusBar

                // Chat messages
                chatMessagesView

                // Input area
                messageInputView
            }
            .navigationTitle("상담")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("종료") {
                        showEndCallAlert = true
                    }
                    .foregroundColor(.red)
                    .font(.headline)
                }
            }
            .alert("상담 종료", isPresented: $showEndCallAlert) {
                Button("취소", role: .cancel) {}
                Button("종료", role: .destructive) {
                    endCall()
                }
            } message: {
                Text("상담을 종료하시겠습니까?")
            }
            .onAppear {
                chatViewModel.startCallWithDeviceToken(callId: callId)
            }
            .onDisappear {
                chatViewModel.endCall()
            }
        }
        .navigationViewStyle(StackNavigationViewStyle())
    }

    private var connectionStatusBar: some View {
        HStack {
            Circle()
                .fill(chatViewModel.isConnected ? Color.green : Color.orange)
                .frame(width: 10, height: 10)

            Text(chatViewModel.isConnected ? "연결됨" : "연결 중...")
                .font(.subheadline)
                .foregroundColor(.gray)

            Spacer()

            if chatViewModel.isLoading {
                ProgressView()
                    .scaleEffect(0.8)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
        .background(Color(.systemGray6))
    }

    private var chatMessagesView: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 16) {
                    ForEach(chatViewModel.messages) { message in
                        MessageBubble(message: message)
                            .id(message.id)
                    }
                }
                .padding()
            }
            .onChange(of: chatViewModel.messages.count) {
                scrollToBottom(proxy: proxy)
            }
        }
    }

    private func scrollToBottom(proxy: ScrollViewProxy) {
        if let lastMessage = chatViewModel.messages.last {
            withAnimation(.easeOut(duration: 0.3)) {
                proxy.scrollTo(lastMessage.id, anchor: .bottom)
            }
        }
    }

    private var messageInputView: some View {
        VStack(spacing: 0) {
            Divider()

            HStack(spacing: 12) {
                TextField("메시지 입력...", text: $chatViewModel.inputText)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .disabled(!chatViewModel.isConnected)
                    .font(.body)

                Button(action: {
                    chatViewModel.sendMessage()
                }) {
                    Image(systemName: "paperplane.fill")
                        .font(.title2)
                        .foregroundColor(.white)
                        .frame(width: 50, height: 50)
                        .background(canSend ? Color.blue : Color.gray)
                        .cornerRadius(25)
                }
                .disabled(!canSend)
                .accessibilityLabel("메시지 보내기")
            }
            .padding()
        }
        .background(Color(.systemBackground))
    }

    private var canSend: Bool {
        !chatViewModel.inputText.trimmingCharacters(in: .whitespaces).isEmpty && chatViewModel.isConnected
    }

    private func endCall() {
        chatViewModel.endCall()
        isPresented = false
    }
}

// MARK: - Preview

#Preview {
    ElderlyHomeView(pendingCallId: .constant(nil))
        .environmentObject(PairingViewModel())
}
