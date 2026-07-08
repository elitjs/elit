import Foundation
import SwiftUI

struct ElitGeneratedScreen: View {
    @Environment(\.openURL) private var openURL

    @State private var toggleValue0 = true

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Elit Native Mobile Example")
            Text("This screen is generated from the same Elit syntax during elit mobile sync.")
            Toggle("", isOn: $toggleValue0)
                .labelsHidden()
            Button(action: {
                if let destination = URL(string: "https://github.com/elitjs/elit") {
                    openURL(destination)
                }
            }) {
                Text("Open project page")
            }
            Button(action: {
                // TODO: wire elit event(s): press
            }) {
                Text("Native placeholder button")
            }
        }
            .padding(24)
    }
}
