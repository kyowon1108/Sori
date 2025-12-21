import Foundation
import Combine

@MainActor
final class CallViewModel: ObservableObject {
    @Published var calls: [Call] = []
    @Published var currentCall: Call?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiService = APIService.shared
    private var cancellables = Set<AnyCancellable>()

    func fetchCalls(elderlyId: Int? = nil) {
        isLoading = true
        errorMessage = nil

        apiService.getCallsList(elderlyId: elderlyId)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                switch completion {
                case .failure(let error):
                    self?.errorMessage = error.description
                case .finished:
                    break
                }
            } receiveValue: { [weak self] calls in
                self?.calls = calls
            }
            .store(in: &cancellables)
    }

    func fetchCall(_ id: Int) {
        isLoading = true
        errorMessage = nil

        apiService.getCall(id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                switch completion {
                case .failure(let error):
                    self?.errorMessage = error.description
                case .finished:
                    break
                }
            } receiveValue: { [weak self] call in
                self?.currentCall = call
            }
            .store(in: &cancellables)
    }

    func getCallDurationText(_ call: Call) -> String {
        guard let duration = call.duration else {
            return "진행 중"
        }
        let minutes = duration / 60
        let seconds = duration % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    func getCallStatusText(_ call: Call) -> String {
        switch call.status {
        case "ongoing":
            return "진행 중"
        case "completed":
            return "완료"
        case "failed":
            return "실패"
        default:
            return call.status
        }
    }

    func getRiskLevelColor(_ level: String) -> String {
        switch level.lowercased() {
        case "high":
            return "red"
        case "medium":
            return "orange"
        case "low":
            return "green"
        default:
            return "gray"
        }
    }
}
