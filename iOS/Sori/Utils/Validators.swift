import Foundation

struct Validators {

    static func isValidEmail(_ email: String) -> Bool {
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", ValidationRules.emailPattern)
        return emailPredicate.evaluate(with: email)
    }

    static func isValidPassword(_ password: String) -> Bool {
        return password.count >= ValidationRules.minPasswordLength
    }

    static func isValidPhone(_ phone: String) -> Bool {
        let phonePredicate = NSPredicate(format: "SELF MATCHES %@", ValidationRules.phonePattern)
        return phonePredicate.evaluate(with: phone)
    }

    static func isValidName(_ name: String) -> Bool {
        return !name.isEmpty && name.count <= ValidationRules.maxNameLength
    }

    static func validateLoginForm(email: String, password: String) -> String? {
        if email.isEmpty {
            return "이메일을 입력해주세요"
        }
        if !isValidEmail(email) {
            return "올바른 이메일 형식이 아닙니다"
        }
        if password.isEmpty {
            return "비밀번호를 입력해주세요"
        }
        if !isValidPassword(password) {
            return "비밀번호는 \(ValidationRules.minPasswordLength)자 이상이어야 합니다"
        }
        return nil
    }

    static func validateRegisterForm(
        email: String,
        password: String,
        confirmPassword: String,
        fullName: String
    ) -> String? {
        if fullName.isEmpty {
            return "이름을 입력해주세요"
        }
        if !isValidName(fullName) {
            return "이름이 너무 깁니다"
        }
        if let loginError = validateLoginForm(email: email, password: password) {
            return loginError
        }
        if password != confirmPassword {
            return "비밀번호가 일치하지 않습니다"
        }
        return nil
    }
}
