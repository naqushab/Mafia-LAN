import SwiftUI
import Network

struct ContentView: View {
    @State private var isSearching = false
    @State private var discoveredHosts: [String] = []

    var body: some View {
        ZStack {
            Color(red: 7/255, green: 8/255, blue: 12/255)
                .ignoresSafeArea()

            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Text("MAFIA LAN")
                        .font(.system(size: 28, weight: .bold, design: .serif))
                        .foregroundColor(.white)
                    
                    Text("Zero-Config Bonjour Discovery Engine")
                        .font(.system(size: 13, weight: .medium, design: .monospaced))
                        .foregroundColor(Color(red: 16/255, green: 185/255, blue: 129/255))
                }
                .padding(.top, 40)

                Spacer()

                VStack(spacing: 12) {
                    Image(systemName: "wifi.circle.fill")
                        .resizable()
                        .frame(width: 64, height: 64)
                        .foregroundColor(Color(red: 16/255, green: 185/255, blue: 129/255))

                    Text("Network.framework NWBrowser Active")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)

                    Text("Listening for _mafia-lan._tcp Bonjour packets")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                }
                .padding(24)
                .background(Color(red: 15/255, green: 23/255, blue: 42/255).opacity(0.8))
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                )

                Spacer()

                Text("Build Target: iOS 17.0+ • Swift 6")
                    .font(.caption)
                    .foregroundColor(.gray)
                    .padding(.bottom, 20)
            }
            .padding()
        }
    }
}
