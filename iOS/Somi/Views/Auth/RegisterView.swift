import SwiftUI

struct RegisterView: View {
    @ObservedObject var viewModel: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var fullName = ""
    @Binding var showRegister: Bool

    private var isFormValid: Bool {
        !email.isEmpty &&
        !password.isEmpty &&
        !fullName.isEmpty &&
        password == confirmPassword &&
        password.count >= ValidationRules.minPasswordLength
    }

    var body: some View {
        VStack(spacing: 24) {
            // 헤더
            VStack(spacing: 8) {
                Text("회원가입")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("새 계정을 만들어 주세요")
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }
            .padding(.bottom, 20)

            // 입력 필드
            VStack(spacing: 16) {
                TextField("이름", text: $fullName)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .textContentType(.name)

                TextField("이메일", text: $email)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.none)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)

                SecureField("비밀번호 (8자 이상)", text: $password)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .textContentType(.newPassword)

                SecureField("비밀번호 확인", text: $confirmPassword)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .textContentType(.newPassword)

                if !confirmPassword.isEmpty && password != confirmPassword {
                    Text("비밀번호가 일치하지 않습니다")
                        .font(.caption)
                        .foregroundColor(.red)
                }
            }

            // 에러 메시지
            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            }

            // 회원가입 버튼
            Button(action: {
                viewModel.register(email: email, password: password, fullName: fullName)
            }) {
                if viewModel.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text("회원가입")
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(isFormValid ? Color.blue : Color.gray)
            .foregroundColor(.white)
            .cornerRadius(10)
            .disabled(!isFormValid || viewModel.isLoading)

            // 로그인 링크
            Button(action: {
                showRegister = false
            }) {
                Text("이미 계정이 있으신가요? ")
                    .foregroundColor(.gray) +
                Text("로그인")
                    .foregroundColor(.blue)
                    .fontWeight(.semibold)
            }
        }
        .padding(24)
    }
}
