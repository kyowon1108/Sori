import SwiftUI

struct PairingView: View {
    @EnvironmentObject var viewModel: PairingViewModel
    @FocusState private var isCodeFieldFocused: Bool

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // App logo and title
            headerSection

            // Code input
            codeInputSection

            // Error message
            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.subheadline)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }

            // Loading indicator
            if viewModel.isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle())
                    .scaleEffect(1.5)
            }

            Spacer()

            // Instructions
            instructionsSection
        }
        .padding()
        .onAppear {
            isCodeFieldFocused = true
        }
    }

    private var headerSection: some View {
        VStack(spacing: 16) {
            Image(systemName: "link.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(.accentColor)

            Text("기기 연결")
                .font(.largeTitle)
                .fontWeight(.bold)

            Text("보호자에게 받은 6자리 코드를 입력하세요")
                .font(.title3)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private var codeInputSection: some View {
        VStack(spacing: 16) {
            // Code digit boxes
            HStack(spacing: 12) {
                ForEach(0..<6, id: \.self) { index in
                    CodeDigitView(
                        digit: getDigit(at: index),
                        isFocused: viewModel.code.count == index && isCodeFieldFocused
                    )
                }
            }

            // Hidden text field for keyboard input
            TextField("", text: $viewModel.code)
                .keyboardType(.numberPad)
                .focused($isCodeFieldFocused)
                .frame(width: 1, height: 1)
                .opacity(0.01)
                .onChange(of: viewModel.code) {
                    handleCodeChange()
                }
        }
        .onTapGesture {
            isCodeFieldFocused = true
        }
    }

    private var instructionsSection: some View {
        VStack(spacing: 8) {
            Text("보호자가 SORI 웹사이트에서")
                .font(.subheadline)
                .foregroundColor(.secondary)

            Text("페어링 코드를 생성할 수 있습니다")
                .font(.subheadline)
                .foregroundColor(.secondary)

            Text("코드는 10분 후 만료됩니다")
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.top, 4)
        }
        .padding(.bottom, 32)
    }

    private func getDigit(at index: Int) -> String {
        guard index < viewModel.code.count else { return "" }
        let codeIndex = viewModel.code.index(viewModel.code.startIndex, offsetBy: index)
        return String(viewModel.code[codeIndex])
    }

    private func handleCodeChange() {
        // Limit to 6 digits
        if viewModel.code.count > 6 {
            viewModel.code = String(viewModel.code.prefix(6))
        }
        // Filter non-numeric characters
        viewModel.code = viewModel.code.filter { $0.isNumber }

        // Clear error when user types
        viewModel.clearError()

        // Auto-submit when 6 digits entered
        if viewModel.code.count == 6 {
            viewModel.submitCode()
        }
    }
}

struct CodeDigitView: View {
    let digit: String
    let isFocused: Bool

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray6))
                .frame(width: 48, height: 56)

            RoundedRectangle(cornerRadius: 12)
                .stroke(isFocused ? Color.accentColor : Color.clear, lineWidth: 2)
                .frame(width: 48, height: 56)

            Text(digit)
                .font(.title)
                .fontWeight(.semibold)
        }
    }
}

#Preview {
    PairingView()
        .environmentObject(PairingViewModel())
}
