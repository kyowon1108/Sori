import SwiftUI

struct PairingView: View {
    @EnvironmentObject var viewModel: PairingViewModel
    @FocusState private var focusedField: Int?

    // Individual digit states for better control
    @State private var digits: [String] = Array(repeating: "", count: 6)

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 32) {
                    Spacer(minLength: 40)

                    // App logo and title
                    headerSection

                    // Code input
                    codeInputSection

                    // Error section
                    if viewModel.errorMessage != nil {
                        errorSection
                    }

                    // Loading indicator
                    if viewModel.isLoading {
                        loadingSection
                    }

                    // Action buttons
                    if !viewModel.isLoading {
                        actionButtonsSection
                    }

                    Spacer(minLength: 40)
                }
                .padding(.horizontal, 24)
            }

            // Instructions at bottom
            instructionsSection
        }
        .onAppear {
            focusedField = 0
        }
        .onChange(of: viewModel.code) {
            syncDigitsFromCode()
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: 20) {
            Image(systemName: "link.circle.fill")
                .font(.system(size: 100))
                .foregroundColor(.accentColor)
                .accessibilityHidden(true)

            Text("기기 연결")
                .font(.system(size: 36, weight: .bold))
                .accessibilityAddTraits(.isHeader)

            Text("보호자에게 받은\n6자리 코드를 입력하세요")
                .font(.title2)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
        }
    }

    // MARK: - Code Input Section

    private var codeInputSection: some View {
        VStack(spacing: 20) {
            // Code digit boxes
            HStack(spacing: 12) {
                ForEach(0..<6, id: \.self) { index in
                    CodeDigitBox(
                        digit: digits[index],
                        isFocused: focusedField == index,
                        onTap: {
                            focusedField = index
                        }
                    )
                }
            }
            .padding(.horizontal, 8)

            // Hidden text field for keyboard input
            HiddenTextField(
                text: Binding(
                    get: { viewModel.code },
                    set: { newValue in
                        handleCodeInput(newValue)
                    }
                ),
                focusedField: _focusedField
            )
        }
        .onTapGesture {
            // Find first empty field or last field
            let firstEmpty = digits.firstIndex(where: { $0.isEmpty }) ?? 5
            focusedField = firstEmpty
        }
        .disabled(viewModel.isLoading)
    }

    // MARK: - Error Section

    private var errorSection: some View {
        VStack(spacing: 16) {
            // Error icon
            Image(systemName: viewModel.requiresNewCode ? "exclamationmark.triangle.fill" : "xmark.circle.fill")
                .font(.system(size: 32))
                .foregroundColor(viewModel.requiresNewCode ? .orange : .red)

            // Error message
            Text(viewModel.errorMessage ?? "")
                .font(.title3)
                .foregroundColor(.primary)
                .multilineTextAlignment(.center)
                .lineSpacing(4)

            // Additional guidance for new code required
            if viewModel.requiresNewCode {
                Text("보호자에게 새 코드를 요청하세요")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding(.top, 4)
            }
        }
        .padding(.vertical, 20)
        .padding(.horizontal, 24)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(viewModel.requiresNewCode ? Color.orange.opacity(0.1) : Color.red.opacity(0.1))
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("오류: \(viewModel.errorMessage ?? "")")
    }

    // MARK: - Loading Section

    private var loadingSection: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)

            Text("연결 중...")
                .font(.title3)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 24)
    }

    // MARK: - Action Buttons Section

    private var actionButtonsSection: some View {
        VStack(spacing: 16) {
            // Retry button
            if viewModel.showRetryButton && viewModel.code.count == 6 {
                Button(action: {
                    viewModel.retry()
                }) {
                    HStack {
                        Image(systemName: "arrow.clockwise")
                        Text("다시 시도")
                    }
                    .font(.title3.weight(.semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(Color.accentColor)
                    .cornerRadius(16)
                }
                .accessibilityLabel("다시 시도하기")
            }

            // Clear button (when there's input or error)
            if !viewModel.code.isEmpty || viewModel.errorMessage != nil {
                Button(action: {
                    clearInput()
                }) {
                    HStack {
                        Image(systemName: "xmark.circle")
                        Text("지우기")
                    }
                    .font(.body.weight(.medium))
                    .foregroundColor(.secondary)
                }
                .accessibilityLabel("입력 지우기")
            }
        }
    }

    // MARK: - Instructions Section

    private var instructionsSection: some View {
        VStack(spacing: 8) {
            Divider()

            VStack(spacing: 6) {
                Text("보호자가 SORI 웹사이트에서")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Text("페어링 코드를 생성할 수 있습니다")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.caption)
                    Text("코드는 10분 후 만료됩니다")
                        .font(.caption)
                }
                .foregroundColor(.secondary)
                .padding(.top, 4)
            }
            .padding(.vertical, 16)
            .padding(.horizontal, 24)
        }
        .background(Color(.systemBackground))
    }

    // MARK: - Helper Methods

    private func handleCodeInput(_ newValue: String) {
        // Filter to digits only
        let filtered = newValue.filter { $0.isNumber }

        // Limit to 6 digits
        let limited = String(filtered.prefix(6))

        // Update viewModel
        viewModel.code = limited

        // Sync digits array
        syncDigitsFromCode()

        // Clear error when typing
        if viewModel.errorMessage != nil {
            viewModel.clearError()
        }

        // Auto-submit when 6 digits entered
        if limited.count == 6 {
            // Small delay for UX
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                viewModel.submitCode()
            }
        }

        // Update focus
        focusedField = min(limited.count, 5)
    }

    private func syncDigitsFromCode() {
        let code = viewModel.code
        for i in 0..<6 {
            if i < code.count {
                let index = code.index(code.startIndex, offsetBy: i)
                digits[i] = String(code[index])
            } else {
                digits[i] = ""
            }
        }
    }

    private func clearInput() {
        viewModel.clearCode()
        digits = Array(repeating: "", count: 6)
        focusedField = 0
    }
}

// MARK: - Code Digit Box

struct CodeDigitBox: View {
    let digit: String
    let isFocused: Bool
    let onTap: () -> Void

    var body: some View {
        ZStack {
            // Background
            RoundedRectangle(cornerRadius: 14)
                .fill(Color(.systemGray6))
                .frame(width: 52, height: 64)

            // Border
            RoundedRectangle(cornerRadius: 14)
                .stroke(isFocused ? Color.accentColor : Color.clear, lineWidth: 3)
                .frame(width: 52, height: 64)

            // Digit or cursor
            if digit.isEmpty {
                if isFocused {
                    // Blinking cursor
                    Rectangle()
                        .fill(Color.accentColor)
                        .frame(width: 2, height: 28)
                        .opacity(isFocused ? 1 : 0)
                        .animation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true), value: isFocused)
                }
            } else {
                Text(digit)
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
            }
        }
        .onTapGesture(perform: onTap)
        .accessibilityElement()
        .accessibilityLabel(digit.isEmpty ? "빈 칸" : "숫자 \(digit)")
        .accessibilityHint("탭하여 이 칸에 입력")
    }
}

// MARK: - Hidden Text Field

struct HiddenTextField: View {
    @Binding var text: String
    @FocusState var focusedField: Int?

    var body: some View {
        TextField("", text: $text)
            .keyboardType(.numberPad)
            .textContentType(.oneTimeCode)
            .focused($focusedField, equals: 0)
            .frame(width: 1, height: 1)
            .opacity(0.01)
            .allowsHitTesting(false)
    }
}

// MARK: - Preview

#Preview {
    PairingView()
        .environmentObject(PairingViewModel())
}
