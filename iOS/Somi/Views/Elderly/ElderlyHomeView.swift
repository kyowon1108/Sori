import SwiftUI

struct ElderlyHomeView: View {
    @EnvironmentObject var viewModel: PairingViewModel
    @State private var showUnpairAlert = false
    @State private var showCallView = false
    @State private var currentCallId: Int?

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
                Text("기기 연결을 해제하시겠습니까? 다시 연결하려면 보호자에게 새 코드를 요청해야 합니다.")
            }
            .fullScreenCover(isPresented: $showCallView) {
                if let callId = currentCallId {
                    ElderlyCallView(callId: callId, isPresented: $showCallView)
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: Notification.Name("incomingCall"))) { notification in
                if let callId = notification.userInfo?["call_id"] as? Int {
                    currentCallId = callId
                    showCallView = true
                }
            }
        }
    }

    private var welcomeSection: some View {
        VStack(spacing: 16) {
            Image(systemName: "heart.fill")
                .font(.system(size: 80))
                .foregroundColor(.accentColor)

            Text("안녕하세요")
                .font(.largeTitle)
                .fontWeight(.bold)

            Text("SORI가 함께합니다")
                .font(.title2)
                .foregroundColor(.secondary)
        }
    }

    private var statusSection: some View {
        VStack(spacing: 20) {
            // Connection status
            HStack(spacing: 12) {
                Circle()
                    .fill(Color.green)
                    .frame(width: 12, height: 12)

                Text("연결됨")
                    .font(.title3)
                    .foregroundColor(.secondary)
            }

            // Waiting message
            VStack(spacing: 8) {
                Image(systemName: "phone.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.secondary)

                Text("전화 대기 중...")
                    .font(.title2)
                    .foregroundColor(.secondary)

                Text("보호자가 전화를 걸면 알려드릴게요")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding(.top, 20)
        }
        .padding(24)
        .background(Color(.systemGray6))
        .cornerRadius(16)
    }

    private var unpairButton: some View {
        Button(action: {
            showUnpairAlert = true
        }) {
            Text("연결 해제")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.bottom, 16)
    }
}

// MARK: - Elderly Call View

struct ElderlyCallView: View {
    let callId: Int
    @Binding var isPresented: Bool

    @StateObject private var chatViewModel = ChatViewModel()

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
                        chatViewModel.endCall()
                        isPresented = false
                    }
                    .foregroundColor(.red)
                }
            }
            .onAppear {
                chatViewModel.startCallWithDeviceToken(callId: callId)
            }
            .onDisappear {
                chatViewModel.endCall()
            }
        }
    }

    private var connectionStatusBar: some View {
        HStack {
            Circle()
                .fill(chatViewModel.isConnected ? Color.green : Color.red)
                .frame(width: 8, height: 8)

            Text(chatViewModel.isConnected ? "연결됨" : "연결 중...")
                .font(.caption)
                .foregroundColor(.gray)

            Spacer()

            if chatViewModel.isLoading {
                ProgressView()
                    .scaleEffect(0.8)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color(.systemGray6))
    }

    private var chatMessagesView: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(chatViewModel.messages) { message in
                        MessageBubble(message: message)
                            .id(message.id)
                    }
                }
                .padding()
            }
            .onChange(of: chatViewModel.messages.count) {
                if let lastMessage = chatViewModel.messages.last {
                    withAnimation {
                        proxy.scrollTo(lastMessage.id, anchor: .bottom)
                    }
                }
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

                Button(action: {
                    chatViewModel.sendMessage()
                }) {
                    Image(systemName: "paperplane.fill")
                        .foregroundColor(.white)
                        .frame(width: 44, height: 44)
                        .background(chatViewModel.inputText.isEmpty ? Color.gray : Color.blue)
                        .cornerRadius(22)
                }
                .disabled(chatViewModel.inputText.isEmpty || !chatViewModel.isConnected)
            }
            .padding()
        }
        .background(Color(.systemBackground))
    }
}

#Preview {
    ElderlyHomeView()
        .environmentObject(PairingViewModel())
}
