import SwiftUI

struct ErrorAlert: View {
    let message: String
    var onDismiss: (() -> Void)?

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.largeTitle)
                .foregroundColor(.red)

            Text("오류 발생")
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)

            if let onDismiss = onDismiss {
                Button("확인") {
                    onDismiss()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding(24)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 4)
    }
}

struct ErrorBanner: View {
    let message: String
    var onDismiss: (() -> Void)?

    var body: some View {
        HStack {
            Image(systemName: "exclamationmark.circle.fill")
                .foregroundColor(.white)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.white)

            Spacer()

            if let onDismiss = onDismiss {
                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .foregroundColor(.white)
                }
            }
        }
        .padding()
        .background(Color.red)
        .cornerRadius(8)
    }
}

#Preview {
    VStack(spacing: 20) {
        ErrorAlert(message: "네트워크 연결을 확인해주세요", onDismiss: {})

        ErrorBanner(message: "인증에 실패했습니다", onDismiss: {})
    }
    .padding()
}
