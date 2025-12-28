import Foundation

struct APIResponse<T: Codable>: Codable {
    let status: String
    let code: Int
    let message: String
    let data: T?
    let errors: [String: [String]]?
}

// 제네릭 디코딩을 위한 헬퍼
struct EmptyResponse: Codable {}
