import SwiftUI

struct ElderlyListView: View {
    @StateObject private var viewModel = ElderlyViewModel()
    @State private var showAddSheet = false

    var body: some View {
        ZStack {
            if viewModel.isLoading && viewModel.elderlyList.isEmpty {
                ProgressView("불러오는 중...")
            } else if viewModel.elderlyList.isEmpty {
                emptyView
            } else {
                listView
            }
        }
        .navigationTitle("어르신 목록")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: {
                    showAddSheet = true
                }) {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showAddSheet) {
            AddElderlyView(viewModel: viewModel, isPresented: $showAddSheet)
        }
        .onAppear {
            viewModel.fetchList()
        }
        .alert("오류", isPresented: .constant(viewModel.errorMessage != nil)) {
            Button("확인") {
                viewModel.errorMessage = nil
            }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
    }

    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.2.slash")
                .font(.system(size: 60))
                .foregroundColor(.gray)

            Text("등록된 어르신이 없습니다")
                .font(.headline)
                .foregroundColor(.gray)

            Button(action: {
                showAddSheet = true
            }) {
                Label("어르신 등록", systemImage: "plus.circle.fill")
            }
            .buttonStyle(.borderedProminent)
        }
    }

    private var listView: some View {
        List {
            ForEach(viewModel.elderlyList) { elderly in
                NavigationLink(destination: ElderlyDetailView(elderlyId: elderly.id)) {
                    ElderlyCard(elderly: elderly)
                }
            }
            .onDelete(perform: deleteElderly)
        }
        .listStyle(PlainListStyle())
        .refreshable {
            viewModel.fetchList()
        }
    }

    private func deleteElderly(at offsets: IndexSet) {
        for index in offsets {
            let elderly = viewModel.elderlyList[index]
            viewModel.deleteElderly(elderly.id)
        }
    }
}

struct AddElderlyView: View {
    @ObservedObject var viewModel: ElderlyViewModel
    @Binding var isPresented: Bool

    @State private var name = ""
    @State private var age = ""
    @State private var phone = ""
    @State private var emergencyContact = ""
    @State private var healthCondition = ""
    @State private var notes = ""

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("기본 정보")) {
                    TextField("이름 *", text: $name)

                    TextField("나이", text: $age)
                        .keyboardType(.numberPad)

                    TextField("전화번호", text: $phone)
                        .keyboardType(.phonePad)
                }

                Section(header: Text("추가 정보")) {
                    TextField("비상 연락처", text: $emergencyContact)
                        .keyboardType(.phonePad)

                    TextField("건강 상태", text: $healthCondition)

                    TextEditor(text: $notes)
                        .frame(height: 100)
                }
            }
            .navigationTitle("어르신 등록")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("취소") {
                        isPresented = false
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("저장") {
                        saveElderly()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
    }

    private func saveElderly() {
        let request = ElderlyCreateRequest(
            name: name,
            age: Int(age),
            phone: phone.isEmpty ? nil : phone,
            call_schedule: CallSchedule(enabled: true, times: ["09:00", "18:00"]),
            health_condition: healthCondition.isEmpty ? nil : healthCondition,
            medications: nil,
            emergency_contact: emergencyContact.isEmpty ? nil : emergencyContact,
            notes: notes.isEmpty ? nil : notes
        )

        viewModel.createElderly(request)
        isPresented = false
    }
}
