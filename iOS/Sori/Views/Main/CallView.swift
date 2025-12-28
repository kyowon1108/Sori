import SwiftUI

struct CallView: View {
    let elderly: Elderly
    @Binding var isPresented: Bool

    @StateObject private var chatViewModel = ChatViewModel()
    @State private var showEndCallAlert = false

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // 상태 바
                connectionStatusBar

                // 채팅 메시지
                chatMessagesView

                // 입력 영역
                messageInputView
            }
            .navigationTitle(elderly.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("종료") {
                        showEndCallAlert = true
                    }
                    .foregroundColor(.red)
                }
            }
            .alert("통화 종료", isPresented: $showEndCallAlert) {
                Button("취소", role: .cancel) {}
                Button("종료", role: .destructive) {
                    endCall()
                }
            } message: {
                Text("통화를 종료하시겠습니까?")
            }
            .onAppear {
                chatViewModel.startCall(for: elderly.id)
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

    private func endCall() {
        chatViewModel.endCall()
        isPresented = false
    }
}
