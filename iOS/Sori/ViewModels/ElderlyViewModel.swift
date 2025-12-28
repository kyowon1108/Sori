import Foundation
import Combine

@MainActor
final class ElderlyViewModel: ObservableObject {
    @Published var elderlyList: [Elderly] = []
    @Published var currentElderly: Elderly?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiService = APIService.shared
    private var cancellables = Set<AnyCancellable>()

    func fetchList() {
        isLoading = true
        errorMessage = nil

        apiService.getElderlyList()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                switch completion {
                case .failure(let error):
                    self?.errorMessage = error.description
                case .finished:
                    break
                }
            } receiveValue: { [weak self] list in
                self?.elderlyList = list
            }
            .store(in: &cancellables)
    }

    func fetchElderly(_ id: Int) {
        isLoading = true
        errorMessage = nil

        apiService.getElderly(id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                switch completion {
                case .failure(let error):
                    self?.errorMessage = error.description
                case .finished:
                    break
                }
            } receiveValue: { [weak self] elderly in
                self?.currentElderly = elderly
            }
            .store(in: &cancellables)
    }

    func createElderly(_ request: ElderlyCreateRequest) {
        isLoading = true
        errorMessage = nil

        apiService.createElderly(request)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                switch completion {
                case .failure(let error):
                    self?.errorMessage = error.description
                case .finished:
                    self?.fetchList()  // 목록 새로고침
                }
            } receiveValue: { _ in }
            .store(in: &cancellables)
    }

    func updateElderly(_ id: Int, _ request: ElderlyCreateRequest) {
        isLoading = true
        errorMessage = nil

        apiService.updateElderly(id, request)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                switch completion {
                case .failure(let error):
                    self?.errorMessage = error.description
                case .finished:
                    self?.fetchList()  // 목록 새로고침
                }
            } receiveValue: { _ in }
            .store(in: &cancellables)
    }

    func deleteElderly(_ id: Int) {
        isLoading = true
        errorMessage = nil

        apiService.deleteElderly(id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                switch completion {
                case .failure(let error):
                    self?.errorMessage = error.description
                case .finished:
                    self?.fetchList()  // 목록 새로고침
                }
            } receiveValue: { _ in }
            .store(in: &cancellables)
    }
}
