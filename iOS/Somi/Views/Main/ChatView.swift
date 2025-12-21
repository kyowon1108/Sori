import SwiftUI

struct ChatView: View {
    @StateObject private var viewModel = ChatViewModel()
    let elderlyId: Int

    var body: some View {
        VStack(spacing: 0) {
            // 연결 상태
            if !viewModel.isConnected {
                HStack {
                    ProgressView()
                        .scaleEffect(0.8)
                    Text("연결 중...")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                .padding(8)
                .frame(maxWidth: .infinity)
                .background(Color.yellow.opacity(0.2))
            }

            // 메시지 목록
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(viewModel.messages) { message in
                            MessageBubble(message: message)
                                .id(message.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: viewModel.messages.count) {
                    scrollToBottom(proxy: proxy)
                }
            }

            // 에러 메시지
            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .padding(.horizontal)
            }

            // 입력 영역
            inputArea
        }
        .navigationTitle("상담")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: {
                    viewModel.endCall()
                }) {
                    Text("종료")
                        .foregroundColor(.red)
                }
            }
        }
        .onAppear {
            viewModel.startCall(for: elderlyId)
        }
        .onDisappear {
            viewModel.endCall()
        }
    }

    private var inputArea: some View {
        VStack(spacing: 0) {
            Divider()

            HStack(spacing: 12) {
                TextField("메시지를 입력하세요", text: $viewModel.inputText)
                    .textFieldStyle(RoundedBorderTextFieldStyle())

                Button(action: {
                    viewModel.sendMessage()
                }) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title)
                        .foregroundColor(viewModel.inputText.isEmpty ? .gray : .blue)
                }
                .disabled(viewModel.inputText.isEmpty)
            }
            .padding()
        }
        .background(Color(.systemBackground))
    }

    private func scrollToBottom(proxy: ScrollViewProxy) {
        if let lastMessage = viewModel.messages.last {
            withAnimation(.easeOut(duration: 0.3)) {
                proxy.scrollTo(lastMessage.id, anchor: .bottom)
            }
        }
    }
}
