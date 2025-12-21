import SwiftUI

struct MainContainerView: View {
    @ObservedObject var authViewModel: AuthViewModel
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView(authViewModel: authViewModel)
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("홈")
                }
                .tag(0)

            NavigationView {
                ElderlyListView()
            }
            .navigationViewStyle(StackNavigationViewStyle())
            .tabItem {
                Image(systemName: "person.2.fill")
                Text("어르신")
            }
            .tag(1)

            NavigationView {
                CallHistoryListView()
            }
            .navigationViewStyle(StackNavigationViewStyle())
            .tabItem {
                Image(systemName: "phone.fill")
                Text("통화")
            }
            .tag(2)

            NavigationView {
                SettingsView(authViewModel: authViewModel)
            }
            .navigationViewStyle(StackNavigationViewStyle())
            .tabItem {
                Image(systemName: "gearshape.fill")
                Text("설정")
            }
            .tag(3)
        }
    }
}

struct CallHistoryListView: View {
    @StateObject private var viewModel = CallViewModel()

    var body: some View {
        List {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
            } else if viewModel.calls.isEmpty {
                Text("통화 기록이 없습니다")
                    .foregroundColor(.gray)
                    .frame(maxWidth: .infinity)
            } else {
                ForEach(viewModel.calls) { call in
                    CallHistoryRow(call: call, viewModel: viewModel)
                }
            }
        }
        .listStyle(PlainListStyle())
        .navigationTitle("통화 기록")
        .onAppear {
            viewModel.fetchCalls()
        }
        .refreshable {
            viewModel.fetchCalls()
        }
    }
}

struct SettingsView: View {
    @ObservedObject var authViewModel: AuthViewModel
    @State private var pushEnabled = true

    var body: some View {
        Form {
            Section(header: Text("계정")) {
                if let user = authViewModel.user {
                    HStack {
                        Text("이름")
                        Spacer()
                        Text(user.full_name)
                            .foregroundColor(.gray)
                    }

                    HStack {
                        Text("이메일")
                        Spacer()
                        Text(user.email)
                            .foregroundColor(.gray)
                    }
                }
            }

            Section(header: Text("알림")) {
                Toggle("푸시 알림", isOn: $pushEnabled)
            }

            Section(header: Text("앱 정보")) {
                HStack {
                    Text("버전")
                    Spacer()
                    Text(AppConstants.appVersion)
                        .foregroundColor(.gray)
                }
            }

            Section {
                Button(action: {
                    authViewModel.logout()
                }) {
                    Text("로그아웃")
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity)
                }
            }
        }
        .navigationTitle("설정")
    }
}
