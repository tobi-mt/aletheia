// swift-tools-version: 5.9
import PackageDescription

// Managed by Capacitor CLI commands, with the Haptics package pinned to a
// remote Swift Package so archive builds do not depend on local node_modules.
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.4.0"),
        .package(url: "https://github.com/ionic-team/capacitor-haptics.git", exact: "8.0.2")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorHaptics", package: "capacitor-haptics")
            ]
        )
    ]
)
