import SwiftUI

struct LoginView: View {
    @ObservedObject var viewModel: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @Binding var showRegister: Bool

    var body: some View {
        VStack(spacing: 24) {
            // 로고 및 타이틀
            VStack(spacing: 8) {
                Image(systemName: "heart.circle.fill")
                    .resizable()
                    .frame(width: 80, height: 80)
                    .foregroundColor(.blue)

                Text("소미")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("어르신 상담 앱")
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }
            .padding(.bottom, 40)

            // 입력 필드
            VStack(spacing: 16) {
                TextField("이메일", text: $email)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.none)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)

                SecureField("비밀번호", text: $password)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .textContentType(.password)
            }

            // 에러 메시지
            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            }

            // 로그인 버튼
            Button(action: {
                viewModel.login(email: email, password: password)
            }) {
                if viewModel.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text("로그인")
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(10)
            .disabled(viewModel.isLoading || email.isEmpty || password.isEmpty)

            // 회원가입 링크
            Button(action: {
                showRegister = true
            }) {
                Text("계정이 없으신가요? ")
                    .foregroundColor(.gray) +
                Text("회원가입")
                    .foregroundColor(.blue)
                    .fontWeight(.semibold)
            }
        }
        .padding(24)
    }
}
