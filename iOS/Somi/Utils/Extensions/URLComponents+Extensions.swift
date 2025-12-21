import Foundation

extension URLComponents {

    mutating func setQueryItems(with parameters: [String: String]) {
        queryItems = parameters.map { URLQueryItem(name: $0.key, value: $0.value) }
    }

    mutating func appendQueryItem(name: String, value: String?) {
        var items = queryItems ?? []
        items.append(URLQueryItem(name: name, value: value))
        queryItems = items
    }
}

extension URL {

    func appendingQueryParameters(_ parameters: [String: String]) -> URL? {
        guard var components = URLComponents(url: self, resolvingAgainstBaseURL: true) else {
            return nil
        }
        components.setQueryItems(with: parameters)
        return components.url
    }
}
