import SwiftUI

struct ContentView: View {
    @StateObject private var authViewModel = AuthViewModel()

    var body: some View {
        Group {
            if authViewModel.isAuthenticated {
                MainContainerView(authViewModel: authViewModel)
            } else {
                AuthContainerView()
            }
        }
        .environmentObject(authViewModel)
    }
}

#Preview {
    ContentView()
}
