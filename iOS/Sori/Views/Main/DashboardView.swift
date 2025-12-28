import SwiftUI

struct DashboardView: View {
    @StateObject private var elderlyViewModel = ElderlyViewModel()
    @StateObject private var callViewModel = CallViewModel()
    @ObservedObject var authViewModel: AuthViewModel

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // 환영 메시지
                    welcomeSection

                    // 빠른 통계
                    statsSection

                    // 최근 어르신 목록
                    recentElderlySection

                    // 최근 통화 기록
                    recentCallsSection
                }
                .padding()
            }
            .navigationTitle("대시보드")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        authViewModel.logout()
                    }) {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .onAppear {
                elderlyViewModel.fetchList()
                callViewModel.fetchCalls()
            }
        }
        .navigationViewStyle(StackNavigationViewStyle())
    }

    private var welcomeSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("안녕하세요,")
                .font(.title2)
                .foregroundColor(.gray)

            Text(authViewModel.user?.full_name ?? "사용자")
                .font(.title)
                .fontWeight(.bold)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.blue.opacity(0.1))
        .cornerRadius(12)
    }

    private var statsSection: some View {
        HStack(spacing: 16) {
            StatCard(
                title: "어르신",
                value: "\(elderlyViewModel.elderlyList.count)",
                icon: "person.2.fill",
                color: .blue
            )

            StatCard(
                title: "통화",
                value: "\(callViewModel.calls.count)",
                icon: "phone.fill",
                color: .green
            )
        }
    }

    private var recentElderlySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("어르신 목록")
                    .font(.headline)

                Spacer()

                NavigationLink(destination: ElderlyListView()) {
                    Text("전체 보기")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                }
            }

            if elderlyViewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
            } else if elderlyViewModel.elderlyList.isEmpty {
                Text("등록된 어르신이 없습니다")
                    .foregroundColor(.gray)
                    .frame(maxWidth: .infinity)
                    .padding()
            } else {
                ForEach(elderlyViewModel.elderlyList.prefix(3)) { elderly in
                    NavigationLink(destination: ElderlyDetailView(elderlyId: elderly.id)) {
                        ElderlyCard(elderly: elderly)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
        }
    }

    private var recentCallsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("최근 통화")
                .font(.headline)

            if callViewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
            } else if callViewModel.calls.isEmpty {
                Text("통화 기록이 없습니다")
                    .foregroundColor(.gray)
                    .frame(maxWidth: .infinity)
                    .padding()
            } else {
                ForEach(callViewModel.calls.prefix(5)) { call in
                    CallRowView(call: call, viewModel: callViewModel)
                }
            }
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            Text(value)
                .font(.title)
                .fontWeight(.bold)

            Text(title)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

struct CallRowView: View {
    let call: Call
    let viewModel: CallViewModel

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("통화 #\(call.id)")
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(viewModel.getCallStatusText(call))
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Spacer()

            Text(viewModel.getCallDurationText(call))
                .font(.subheadline)
                .foregroundColor(.gray)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
}
