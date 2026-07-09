import UIKit
import AVFoundation
import WebKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    private func configureAudioSessionForSpeech() {
        let session = AVAudioSession.sharedInstance()
        do {
            // Keep spoken playback audible even when the hardware mute switch is on.
            try session.setCategory(.playback, mode: .spokenAudio, options: [.mixWithOthers])
            try session.setActive(true)
        } catch {
            print("Failed to configure audio session for speech playback: \(error)")
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
        bridge?.registerPluginType(ManagedAudioPlugin.self)
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

          console.error("[\(label)] installed");
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
    private let defaultPublicAppOrigin = "https://aletheia.mirrortalkpodcast.com"
    private let publicAppOriginKey = "ALETHEIA_PUBLIC_APP_ORIGIN"

    @objc override public func load() {
        configureAudioSessionForSpeech()
    }

    private func configureAudioSessionForSpeech() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .spokenAudio, options: [.mixWithOthers])
            try session.setActive(true)
        } catch {
            print("Failed to configure audio session for speech playback: \(error)")
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
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "text": text,
            "voice": voice,
            "language": language,
            "speed": speed,
        ])

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
