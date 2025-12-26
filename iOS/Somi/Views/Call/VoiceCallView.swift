import SwiftUI

/// Full-screen voice call view with TTS/STT
struct VoiceCallView: View {
    let callId: Int
    @Binding var isPresented: Bool

    @StateObject private var viewModel = VoiceCallViewModel()
    @State private var showEndCallConfirmation = false
    @State private var showPermissionSheet = false

    #if DEBUG
    @State private var simulatedInput = ""
    @State private var showSimulatorInput = false
    #endif

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [Color.blue.opacity(0.8), Color.blue.opacity(0.4)]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                headerSection

                // Main content
                if viewModel.permissionsMissing {
                    permissionRequestView
                } else {
                    callContentView
                }

                // Controls
                controlsSection
            }
        }
        .onAppear {
            // Request permissions first, then start call
            if viewModel.permissionsMissing {
                viewModel.requestPermissions()
            }
            viewModel.startCall(callId: callId)
        }
        .onDisappear {
            viewModel.endCall()
        }
        .alert("통화 종료", isPresented: $showEndCallConfirmation) {
            Button("취소", role: .cancel) {}
            Button("종료", role: .destructive) {
                endCall()
            }
        } message: {
            Text("통화를 종료하시겠습니까?")
        }
        .onChange(of: viewModel.callState) { _, newState in
            if newState == .ended {
                // Auto-dismiss after short delay (reduced from 1.5s to 0.5s)
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    isPresented = false
                }
            }
        }
        #if DEBUG
        .sheet(isPresented: $showSimulatorInput) {
            simulatorInputSheet
        }
        #endif
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: 8) {
            // Title
            Text("자동 통화 중")
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundColor(.white)

            // Status indicator
            HStack(spacing: 8) {
                statusIndicator
                Text(viewModel.callState.displayText)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.9))
            }

            // Duration
            Text(viewModel.formattedDuration)
                .font(.system(size: 48, weight: .light, design: .monospaced))
                .foregroundColor(.white)
                .padding(.top, 8)
        }
        .padding(.top, 60)
        .padding(.bottom, 24)
    }

    private var statusIndicator: some View {
        Circle()
            .fill(statusColor)
            .frame(width: 12, height: 12)
            .overlay(
                Circle()
                    .stroke(Color.white.opacity(0.3), lineWidth: 2)
            )
            .modifier(PulseAnimation(isAnimating: shouldPulse))
    }

    private var statusColor: Color {
        switch viewModel.callState {
        case .connecting:
            return .orange
        case .listening:
            return .green
        case .speaking:
            return .blue
        case .processing:
            return .yellow
        case .ended:
            return .gray
        case .error:
            return .red
        }
    }

    private var shouldPulse: Bool {
        switch viewModel.callState {
        case .listening, .speaking:
            return true
        default:
            return false
        }
    }

    // MARK: - Call Content

    private var callContentView: some View {
        VStack(spacing: 16) {
            // Transcript area
            transcriptScrollView

            // Partial transcript (what user is currently saying)
            if !viewModel.partialTranscript.isEmpty {
                partialTranscriptView
            }
        }
        .padding(.horizontal)
    }

    private var transcriptScrollView: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(viewModel.messages) { message in
                        MessageRow(message: message)
                            .id(message.id)
                    }
                }
                .padding(.vertical, 16)
            }
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(0.15))
            )
            .onChange(of: viewModel.messages.count) { _, _ in
                if let lastMessage = viewModel.messages.last {
                    withAnimation {
                        proxy.scrollTo(lastMessage.id, anchor: .bottom)
                    }
                }
            }
        }
        .frame(maxHeight: .infinity)
    }

    private var partialTranscriptView: some View {
        HStack {
            Image(systemName: "waveform")
                .foregroundColor(.white.opacity(0.7))

            Text(viewModel.partialTranscript)
                .font(.body)
                .foregroundColor(.white.opacity(0.9))
                .lineLimit(2)

            Spacer()
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.1))
        )
    }

    // MARK: - Permission Request

    private var permissionRequestView: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "mic.slash.fill")
                .font(.system(size: 60))
                .foregroundColor(.white.opacity(0.8))

            VStack(spacing: 12) {
                Text("권한이 필요합니다")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)

                Text("음성 통화를 위해 마이크와\n음성 인식 권한이 필요합니다.")
                    .font(.body)
                    .foregroundColor(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
            }

            VStack(spacing: 12) {
                permissionStatusRow(
                    title: "마이크",
                    granted: viewModel.microphonePermissionGranted
                )
                permissionStatusRow(
                    title: "음성 인식",
                    granted: viewModel.speechPermissionGranted
                )
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white.opacity(0.1))
            )

            VStack(spacing: 12) {
                Button(action: {
                    viewModel.requestPermissions()
                }) {
                    Text("권한 요청하기")
                        .font(.headline)
                        .foregroundColor(.blue)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.white)
                        .cornerRadius(12)
                }

                Button(action: {
                    openSettings()
                }) {
                    Text("설정에서 허용하기")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.8))
                }
            }
            .padding(.horizontal, 32)

            Spacer()
        }
        .padding()
    }

    private func permissionStatusRow(title: String, granted: Bool) -> some View {
        HStack {
            Text(title)
                .foregroundColor(.white)

            Spacer()

            Image(systemName: granted ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundColor(granted ? .green : .red)
        }
    }

    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }

    // MARK: - Controls Section

    private var controlsSection: some View {
        VStack(spacing: 24) {
            #if DEBUG
            // Simulator input button
            if ProcessInfo.processInfo.environment["SIMULATOR_DEVICE_NAME"] != nil {
                Button(action: { showSimulatorInput = true }) {
                    Label("텍스트 입력 (시뮬레이터)", systemImage: "keyboard")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))
                }
            }
            #endif

            HStack(spacing: 48) {
                // Mute button
                ControlButton(
                    systemImage: viewModel.isMuted ? "mic.slash.fill" : "mic.fill",
                    label: viewModel.isMuted ? "음소거 해제" : "음소거",
                    isActive: viewModel.isMuted,
                    action: { viewModel.toggleMute() }
                )

                // End call button
                EndCallButton(action: { showEndCallConfirmation = true })
            }
        }
        .padding(.vertical, 32)
        .padding(.bottom, 16)
    }

    // MARK: - Simulator Input Sheet

    #if DEBUG
    private var simulatorInputSheet: some View {
        NavigationView {
            VStack(spacing: 16) {
                Text("시뮬레이터에서는 음성 인식이 작동하지 않습니다.\n텍스트로 직접 입력하세요.")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding()

                TextField("메시지 입력...", text: $simulatedInput)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .padding(.horizontal)

                Button("전송") {
                    if !simulatedInput.isEmpty {
                        viewModel.simulateUserInput(simulatedInput)
                        simulatedInput = ""
                        showSimulatorInput = false
                    }
                }
                .disabled(simulatedInput.isEmpty)
                .buttonStyle(.borderedProminent)

                Spacer()
            }
            .navigationTitle("텍스트 입력")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("닫기") {
                        showSimulatorInput = false
                    }
                }
            }
        }
    }
    #endif

    // MARK: - Actions

    private func endCall() {
        viewModel.endCall()
        isPresented = false
    }
}

// MARK: - Message Row

private struct MessageRow: View {
    let message: VoiceMessage

    var body: some View {
        HStack {
            if message.role == .user {
                Spacer()
            }

            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 4) {
                Text(message.role == .user ? "나" : "SORI")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.6))

                Text(message.content)
                    .font(.body)
                    .foregroundColor(message.role == .user ? .white : .black)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(message.role == .user
                                  ? Color.white.opacity(0.3)
                                  : Color.white)
                    )
                    .opacity(message.isStreaming ? 0.8 : 1.0)
            }

            if message.role == .assistant {
                Spacer()
            }
        }
        .padding(.horizontal)
    }
}

// MARK: - Control Button

private struct ControlButton: View {
    let systemImage: String
    let label: String
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: systemImage)
                    .font(.system(size: 24))
                    .foregroundColor(isActive ? .red : .white)
                    .frame(width: 60, height: 60)
                    .background(
                        Circle()
                            .fill(isActive ? Color.white : Color.white.opacity(0.2))
                    )

                Text(label)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.8))
            }
        }
        .accessibilityLabel(label)
    }
}

// MARK: - End Call Button

private struct EndCallButton: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: "phone.down.fill")
                    .font(.system(size: 28))
                    .foregroundColor(.white)
                    .frame(width: 70, height: 70)
                    .background(
                        Circle()
                            .fill(Color.red)
                    )

                Text("종료")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.8))
            }
        }
        .accessibilityLabel("통화 종료")
    }
}

// MARK: - Pulse Animation Modifier

private struct PulseAnimation: ViewModifier {
    let isAnimating: Bool
    @State private var isPulsing = false

    func body(content: Content) -> some View {
        content
            .scaleEffect(isPulsing ? 1.2 : 1.0)
            .animation(
                isAnimating
                    ? Animation.easeInOut(duration: 0.8).repeatForever(autoreverses: true)
                    : .default,
                value: isPulsing
            )
            .onAppear {
                isPulsing = isAnimating
            }
            .onChange(of: isAnimating) { _, newValue in
                isPulsing = newValue
            }
    }
}

// MARK: - Preview

#Preview {
    VoiceCallView(callId: 1, isPresented: .constant(true))
}
