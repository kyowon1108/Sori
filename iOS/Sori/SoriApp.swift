import SwiftUI
// import Firebase  // Firebase SDK 추가 후 주석 해제

@main
struct SoriApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
