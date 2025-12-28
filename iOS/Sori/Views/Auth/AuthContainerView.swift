import SwiftUI

struct AuthContainerView: View {
    @StateObject private var viewModel = AuthViewModel()
    @State private var showRegister = false

    var body: some View {
        NavigationView {
            ScrollView {
                if showRegister {
                    RegisterView(viewModel: viewModel, showRegister: $showRegister)
                } else {
                    LoginView(viewModel: viewModel, showRegister: $showRegister)
                }
            }
            .navigationBarHidden(true)
        }
        .navigationViewStyle(StackNavigationViewStyle())
    }
}

#Preview {
    AuthContainerView()
}
