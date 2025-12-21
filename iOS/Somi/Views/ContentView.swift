import SwiftUI

struct ContentView: View {
    @StateObject private var pairingViewModel = PairingViewModel()

    var body: some View {
        Group {
            if pairingViewModel.isPaired {
                ElderlyHomeView()
            } else {
                PairingView()
            }
        }
        .environmentObject(pairingViewModel)
    }
}

#Preview {
    ContentView()
}
