import UIKit
import AVFoundation
import WebKit
import Capacitor
import AuthenticationServices
import CryptoKit
import StoreKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    private let audioSessionQueue = DispatchQueue(label: "com.aletheia.app.audio-session", qos: .userInitiated)

    private func configureAudioSessionForSpeech() {
        audioSessionQueue.async {
            let session = AVAudioSession.sharedInstance()
            do {
                // Keep spoken playback audible even when the hardware mute switch is on.
                try session.setCategory(.playback, mode: .spokenAudio, options: [.mixWithOthers])
                try session.setActive(true)
            } catch {
                print("Failed to configure audio session for speech playback: \(error)")
            }
        }
    }

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        configureAudioSessionForSpeech()
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        configureAudioSessionForSpeech()
        application.applicationIconBadgeNumber = 0
    }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
        configuration.delegateClass = SceneDelegate.self
        return configuration
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

@objc(ManagedAudioBridgeViewController)
class ManagedAudioBridgeViewController: CAPBridgeViewController {
    static let startupChromeColor = UIColor(red: 0.933, green: 0.949, blue: 0.937, alpha: 1)
    private let startupTraceHandler = StartupTraceScriptMessageHandler()
    private let startupTraceHandlerName = "aletheiaStartupTrace"

    override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        installStartupDiagnostics(on: configuration.userContentController, label: "startup:native-webview-hook")
        configuration.userContentController.removeScriptMessageHandler(forName: startupTraceHandlerName)
        configuration.userContentController.add(startupTraceHandler, name: startupTraceHandlerName)
        return super.webView(with: frame, configuration: configuration)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        configureEdgeToEdgeChrome()
    }

    override func capacitorDidLoad() {
        // Capacitor 8 enables automatic plugin discovery, which makes
        // registerPluginType(_:) a no-op for app-local plugins. Explicit
        // instances ensure these custom bridges are exported to JavaScript.
        bridge?.registerPluginInstance(ManagedAudioPlugin())
        bridge?.registerPluginInstance(NativeAuthPlugin())
        bridge?.registerPluginInstance(NativeSupportPlugin())
        configureEdgeToEdgeChrome()
    }

    private func configureEdgeToEdgeChrome() {
        view.backgroundColor = Self.startupChromeColor
        webView?.isOpaque = false
        webView?.backgroundColor = .clear
        webView?.scrollView.backgroundColor = .clear
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.scrollView.contentInset = .zero
        webView?.scrollView.scrollIndicatorInsets = .zero
        statusBarStyle = .darkContent
        setNeedsStatusBarAppearanceUpdate()
    }

    private func installStartupDiagnostics(on userContentController: WKUserContentController?, label: String = "startup:native-ios-hook") {
        guard let userContentController else { return }

        let script = """
        (function () {
          if (window.__aletheiaNativeStartupDiagnosticsInstalled) {
            return;
          }
          window.__aletheiaNativeStartupDiagnosticsInstalled = true;

          var post = function (phase, payload) {
            try {
              var handlers = window.webkit && window.webkit.messageHandlers;
              if (handlers && handlers.aletheiaStartupTrace) {
                handlers.aletheiaStartupTrace.postMessage({
                  phase: phase,
                  payload: payload || null,
                });
              }
            } catch (error) {
            }
          };

          var summarize = function (value) {
            if (!value) return null;
            if (typeof value === "string") return value;
            if (value instanceof Error) return value.stack || value.message || String(value);
            if (typeof value === "object") {
              try {
                return JSON.stringify(value);
              } catch (error) {
                return String(value);
              }
            }
            return String(value);
          };

          console.info("[\(label)] installed");
          post("[\(label)] installed");

          window.addEventListener("error", function (event) {
            try {
              var payload = {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: summarize(event.error),
              };
              post("[startup:native-ios-error]", payload);
              console.error("[startup:native-ios-error]", {
                message: payload.message,
                filename: payload.filename,
                lineno: payload.lineno,
                colno: payload.colno,
                error: payload.error,
              });
            } catch (error) {
              console.error("[startup:native-ios-error:logging-failed]", summarize(error));
            }
          });

          window.addEventListener("unhandledrejection", function (event) {
            try {
              var payload = {
                reason: summarize(event.reason),
              };
              post("[startup:native-ios-unhandledrejection]", payload);
              console.error("[startup:native-ios-unhandledrejection]", {
                reason: payload.reason,
              });
            } catch (error) {
              console.error("[startup:native-ios-unhandledrejection:logging-failed]", summarize(error));
            }
          });
        })();
        """

        userContentController.addUserScript(
        WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        )
    }
}

@objc(NativeSupportPlugin)
public class NativeSupportPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeSupportPlugin"
    public let jsName = "NativeSupport"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise)
    ]

    private let productIds = [
        "aletheia.support.small",
        "aletheia.support.meaningful",
        "aletheia.support.generous"
    ]

    @objc func products(_ call: CAPPluginCall) {
        Task {
            do {
                let products = try await Product.products(for: productIds)
                let order = Dictionary(uniqueKeysWithValues: productIds.enumerated().map { ($0.element, $0.offset) })
                let payload = products.sorted { (order[$0.id] ?? 99) < (order[$1.id] ?? 99) }.map { product in
                    [
                        "id": product.id,
                        "displayName": product.displayName,
                        "description": product.description,
                        "displayPrice": product.displayPrice
                    ]
                }
                call.resolve(["products": payload])
            } catch {
                call.reject("Support options are temporarily unavailable", nil, error)
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId"), productIds.contains(productId) else {
            call.reject("Unknown support option")
            return
        }

        Task {
            do {
                guard let product = try await Product.products(for: [productId]).first else {
                    call.reject("Support option is unavailable")
                    return
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        await transaction.finish()
                        call.resolve(["status": "purchased", "transactionId": String(transaction.id)])
                    case .unverified:
                        call.reject("The App Store could not verify this purchase")
                    }
                case .pending:
                    call.resolve(["status": "pending"])
                case .userCancelled:
                    call.resolve(["status": "cancelled"])
                @unknown default:
                    call.reject("Unknown App Store purchase result")
                }
            } catch {
                call.reject("The purchase could not be completed", nil, error)
            }
        }
    }
}

@objc(NativeAuthPlugin)
public class NativeAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "NativeAuthPlugin"
    public let jsName = "NativeAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signInWithApple", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticateWeb", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "postAuthenticatedJson", returnType: CAPPluginReturnPromise)
    ]

    private var pendingAppleCall: CAPPluginCall?
    private var pendingAppleNonce: String?
    private var appleAuthorizationController: ASAuthorizationController?
    private var webAuthenticationSession: ASWebAuthenticationSession?

    @objc func signInWithApple(_ call: CAPPluginCall) {
        print("[native-auth] Sign in with Apple requested")
        guard pendingAppleCall == nil else {
            call.reject("Another Apple sign-in is already in progress.")
            return
        }

        let rawNonce = UUID().uuidString + UUID().uuidString
        let nonceHash = SHA256.hash(data: Data(rawNonce.utf8)).map { String(format: "%02x", $0) }.joined()
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = nonceHash
        pendingAppleCall = call
        pendingAppleNonce = rawNonce

        DispatchQueue.main.async { [weak self] in
            guard let self else {
                call.reject("Apple sign-in could not be started.")
                return
            }
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            self.appleAuthorizationController = controller
            controller.performRequests()
        }
    }

    @objc func authenticateWeb(_ call: CAPPluginCall) {
        guard let rawUrl = call.getString("url"), let url = URL(string: rawUrl) else {
            call.reject("A valid authentication URL is required.")
            return
        }
        let callbackScheme = call.getString("callbackScheme") ?? "com.aletheia.app"
        let session = ASWebAuthenticationSession(url: url, callbackURLScheme: callbackScheme) { [weak self] callbackUrl, error in
            self?.webAuthenticationSession = nil
            if let authError = error as? ASWebAuthenticationSessionError, authError.code == .canceledLogin {
                call.reject("AUTH_CANCELLED", "AUTH_CANCELLED", error)
                return
            }
            if let error {
                call.reject("Authentication could not be completed.", nil, error)
                return
            }
            guard let callbackUrl else {
                call.reject("Authentication returned without a callback URL.")
                return
            }
            call.resolve(["url": callbackUrl.absoluteString])
        }
        session.presentationContextProvider = self
        session.prefersEphemeralWebBrowserSession = false
        webAuthenticationSession = session
        if !session.start() {
            webAuthenticationSession = nil
            call.reject("Authentication session could not be started.")
        }
    }

    @objc func postAuthenticatedJson(_ call: CAPPluginCall) {
        guard let rawUrl = call.getString("url"), let url = URL(string: rawUrl), url.scheme == "https" else {
            call.reject("A secure authentication URL is required.")
            return
        }
        let body = call.getObject("body") ?? [:]
        guard JSONSerialization.isValidJSONObject(body),
              let bodyData = try? JSONSerialization.data(withJSONObject: body) else {
            call.reject("Authentication request data is invalid.")
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = bodyData
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            if let error {
                call.reject("Authentication request failed.", nil, error)
                return
            }
            guard let httpResponse = response as? HTTPURLResponse else {
                call.reject("Authentication server returned no response.")
                return
            }

            let responseBody = data.flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any] ?? [:]
            let headerFields = httpResponse.allHeaderFields.reduce(into: [String: String]()) { fields, entry in
                guard let key = entry.key as? String else { return }
                fields[key] = String(describing: entry.value)
            }
            let cookies = HTTPCookie.cookies(withResponseHeaderFields: headerFields, for: url)
            guard httpResponse.statusCode >= 200 && httpResponse.statusCode < 300, !cookies.isEmpty else {
                call.resolve(["status": httpResponse.statusCode, "body": responseBody, "cookiesInstalled": false])
                return
            }

            DispatchQueue.main.async {
                guard let cookieStore = self?.bridge?.webView?.configuration.websiteDataStore.httpCookieStore else {
                    call.reject("The app session cookie store is unavailable.")
                    return
                }
                let group = DispatchGroup()
                for cookie in cookies {
                    group.enter()
                    cookieStore.setCookie(cookie) { group.leave() }
                }
                group.notify(queue: .main) {
                    print("[native-auth] Installed \(cookies.count) authentication cookie(s) in WKWebView")
                    call.resolve(["status": httpResponse.statusCode, "body": responseBody, "cookiesInstalled": true])
                }
            }
        }.resume()
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return activePresentationWindow()
    }

    @objc(presentationAnchorForWebAuthenticationSession:)
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return activePresentationWindow()
    }

    private func activePresentationWindow() -> ASPresentationAnchor {
        if let bridgeWindow = bridge?.viewController?.view.window {
            return bridgeWindow
        }
        if let sceneWindow = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap({ $0.windows })
            .first(where: { $0.isKeyWindow }) {
            return sceneWindow
        }
        print("[native-auth] No active presentation window was found")
        return ASPresentationAnchor(frame: UIScreen.main.bounds)
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        print("[native-auth] Sign in with Apple authorization completed")
        appleAuthorizationController = nil
        guard let call = pendingAppleCall,
              let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let identityToken = String(data: tokenData, encoding: .utf8),
              let authorizationCodeData = credential.authorizationCode,
              let authorizationCode = String(data: authorizationCodeData, encoding: .utf8),
              let rawNonce = pendingAppleNonce else {
            pendingAppleCall?.reject("Apple did not return a usable identity credential.")
            pendingAppleCall = nil
            pendingAppleNonce = nil
            return
        }

        let formatter = PersonNameComponentsFormatter()
        let name = credential.fullName.map { formatter.string(from: $0) } ?? ""
        call.resolve([
            "identityToken": identityToken,
            "authorizationCode": authorizationCode,
            "nonce": rawNonce,
            "name": name,
        ])
        pendingAppleCall = nil
        pendingAppleNonce = nil
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let nsError = error as NSError
        print("[native-auth] Sign in with Apple failed domain=\(nsError.domain) code=\(nsError.code) description=\(nsError.localizedDescription)")
        appleAuthorizationController = nil
        guard let call = pendingAppleCall else { return }
        if let authError = error as? ASAuthorizationError, authError.code == .canceled {
            call.reject("AUTH_CANCELLED", "AUTH_CANCELLED", error)
        } else {
            call.reject("Apple sign-in could not be completed.", nil, error)
        }
        pendingAppleCall = nil
        pendingAppleNonce = nil
    }
}

@objc(StartupTraceScriptMessageHandler)
final class StartupTraceScriptMessageHandler: NSObject, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "aletheiaStartupTrace" else {
            return
        }

        if let body = message.body as? [String: Any] {
            print("[startup:native-js-message] \(body)")
            return
        }

        print("[startup:native-js-message] \(message.body)")
    }
}

@objc(ManagedAudioPlugin)
public class ManagedAudioPlugin: CAPPlugin, CAPBridgedPlugin, AVAudioPlayerDelegate {
    public let identifier = "ManagedAudioPlugin"
    public let jsName = "ManagedAudio"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]

    private var player: AVAudioPlayer?
    private var progressTimer: Timer?
    private var playbackToken = UUID()
    private let audioSessionQueue = DispatchQueue(label: "com.aletheia.app.managed-audio-session", qos: .userInitiated)
    private let defaultPublicAppOrigin = "https://aletheia.mirrortalkpodcast.com"
    private let publicAppOriginKey = "ALETHEIA_PUBLIC_APP_ORIGIN"

    @objc override public func load() {
        configureAudioSessionForSpeech()
    }

    private func configureAudioSessionForSpeech() {
        audioSessionQueue.async {
            let session = AVAudioSession.sharedInstance()
            do {
                try session.setCategory(.playback, mode: .spokenAudio, options: [.mixWithOthers])
                try session.setActive(true)
            } catch {
                print("Failed to configure audio session for speech playback: \(error)")
            }
        }
    }

    private func emitState(_ state: String) {
        notifyListeners("state", data: ["state": state])
    }

    private func emitProgress() {
        guard let player, player.duration > 0 else {
            return
        }
        let progress = Int((player.currentTime / player.duration) * 100)
        notifyListeners("progress", data: ["progress": max(0, min(100, progress))])
    }

    private func startProgressTimer() {
        stopProgressTimer()
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in
            self?.emitProgress()
        }
        RunLoop.main.add(progressTimer!, forMode: .common)
    }

    private func stopProgressTimer() {
        progressTimer?.invalidate()
        progressTimer = nil
    }

    private func resetPlayer(keepToken: Bool = false) {
        stopProgressTimer()
        player?.stop()
        player = nil
        if !keepToken {
            playbackToken = UUID()
        }
    }

    private func publicAppOrigin() -> URL? {
        if let serverURL = bridge?.config.serverURL,
           let scheme = serverURL.scheme?.lowercased(),
           scheme == "http" || scheme == "https" {
            return serverURL
        }

        if let configuredOrigin = Bundle.main.object(forInfoDictionaryKey: publicAppOriginKey) as? String,
           let originURL = URL(string: configuredOrigin),
           let scheme = originURL.scheme?.lowercased(),
           scheme == "http" || scheme == "https" {
            return originURL
        }

        return URL(string: defaultPublicAppOrigin)
    }

    private func serverSpeechURL() -> URL? {
        guard let baseURL = publicAppOrigin() else {
            return nil
        }
        return baseURL.appendingPathComponent("api").appendingPathComponent("audio").appendingPathComponent("speech")
    }

    @objc func speak(_ call: CAPPluginCall) {
        guard let text = call.getString("text")?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            call.reject("Text is required")
            return
        }

        guard let url = serverSpeechURL() else {
            call.reject("Audio playback is unavailable")
            return
        }

        let voice = call.getString("voice") ?? "alloy"
        let language = call.getString("language") ?? "en"
        let speed = call.getDouble("speed") ?? 1.0
        let cacheScope = call.getString("cacheScope")
        let thirdPartyAiConsent = call.getBool("thirdPartyAiConsent") ?? false
        let token = UUID()
        playbackToken = token
        resetPlayer(keepToken: true)
        emitState("loading")
        call.resolve()

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 45
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("audio/mpeg", forHTTPHeaderField: "Accept")
        var requestPayload: [String: Any] = [
            "text": text,
            "voice": voice,
            "language": language,
            "speed": speed,
            "thirdPartyAiConsent": thirdPartyAiConsent,
        ]
        if cacheScope == "scripture" {
            requestPayload["cacheScope"] = "scripture"
        }
        request.httpBody = try? JSONSerialization.data(withJSONObject: requestPayload)

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self else { return }
            guard self.playbackToken == token else {
                return
            }

            if error != nil {
                DispatchQueue.main.async {
                    self.emitState("error")
                }
                return
            }

            guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode), let data else {
                DispatchQueue.main.async {
                    self.emitState("error")
                }
                return
            }

            do {
                self.configureAudioSessionForSpeech()
                let player = try AVAudioPlayer(data: data)
                player.enableRate = true
                player.rate = Float(max(0.25, min(4.0, speed)))
                player.volume = 1.0
                player.delegate = self
                player.prepareToPlay()

                DispatchQueue.main.async {
                    guard self.playbackToken == token else {
                        return
                    }
                    self.player = player
                    self.startProgressTimer()
                    self.emitState("playing")
                    if !player.play() {
                        self.resetPlayer(keepToken: true)
                        self.emitState("error")
                    }
                }
            } catch {
                DispatchQueue.main.async {
                    self.emitState("error")
                }
            }
        }.resume()
    }

    @objc func pause(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let player = self.player, player.isPlaying else {
                call.resolve()
                return
            }
            player.pause()
            self.stopProgressTimer()
            self.emitState("paused")
            call.resolve()
        }
    }

    @objc func resume(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let player = self.player, !player.isPlaying else {
                call.resolve()
                return
            }
            self.configureAudioSessionForSpeech()
            if player.play() {
                self.startProgressTimer()
                self.emitState("playing")
                call.resolve()
            } else {
                self.emitState("error")
                call.reject("Unable to resume audio playback")
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.resetPlayer()
            self.emitState("stopped")
            call.resolve()
        }
    }

    public func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        DispatchQueue.main.async {
            self.resetPlayer(keepToken: false)
            self.emitState(flag ? "ended" : "error")
        }
    }
}
