import Foundation

extension String {

    var isValidEmail: Bool {
        Validators.isValidEmail(self)
    }

    var isValidPhone: Bool {
        Validators.isValidPhone(self)
    }

    var trimmed: String {
        trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var isBlank: Bool {
        trimmed.isEmpty
    }

    func localized(comment: String = "") -> String {
        NSLocalizedString(self, comment: comment)
    }

    var asURL: URL? {
        URL(string: self)
    }

    func masked(visibleCount: Int = 4) -> String {
        if self.count <= visibleCount {
            return self
        }
        let visiblePart = String(self.prefix(visibleCount))
        let maskedPart = String(repeating: "*", count: self.count - visibleCount)
        return visiblePart + maskedPart
    }

    var formattedPhoneNumber: String {
        let digits = self.filter { $0.isNumber }
        if digits.count == 11 {
            let start = digits.prefix(3)
            let middle = digits.dropFirst(3).prefix(4)
            let end = digits.suffix(4)
            return "\(start)-\(middle)-\(end)"
        } else if digits.count == 10 {
            let start = digits.prefix(3)
            let middle = digits.dropFirst(3).prefix(3)
            let end = digits.suffix(4)
            return "\(start)-\(middle)-\(end)"
        }
        return self
    }
}
