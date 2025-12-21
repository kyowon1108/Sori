import SwiftUI
import Combine

struct ContentView: View {
    @StateObject private var pairingViewModel = PairingViewModel()
    @State private var pendingCallId: Int?
    @State private var showTokenExpiredAlert = false

    var body: some View {
        Group {
            if pairingViewModel.isPaired {
                ElderlyHomeView(pendingCallId: $pendingCallId)
            } else {
                PairingView()
            }
        }
        .environmentObject(pairingViewModel)
        .onReceive(NotificationCenter.default.publisher(for: NotificationNames.navigateToCall)) { notification in
            handleNavigateToCall(notification)
        }
        .onReceive(NotificationCenter.default.publisher(for: NotificationNames.tokenInvalid)) { _ in
            handleTokenInvalid()
        }
        .alert("인증 만료", isPresented: $showTokenExpiredAlert) {
            Button("확인") {
                pairingViewModel.unpair()
            }
        } message: {
            Text("인증이 만료되었습니다.\n다시 연결해주세요.")
        }
        .onAppear {
            // Recheck pairing status on app appear
            pairingViewModel.checkPairingStatus()
        }
    }

    private func handleNavigateToCall(_ notification: NotificationCenter.Publisher.Output) {
        guard pairingViewModel.isPaired else { return }

        if let callId = notification.userInfo?["call_id"] as? Int {
            pendingCallId = callId
        }
    }

    private func handleTokenInvalid() {
        if pairingViewModel.isPaired {
            showTokenExpiredAlert = true
        }
    }
}

#Preview {
    ContentView()
}
