import UIKit
import AVFoundation
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

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
    private let startupChromeColor = UIColor(red: 0.047, green: 0.071, blue: 0.059, alpha: 1)

    override func viewDidLoad() {
        super.viewDidLoad()
        configureEdgeToEdgeChrome()
    }

    override func capacitorDidLoad() {
        bridge?.registerPluginType(ManagedAudioPlugin.self)
        configureEdgeToEdgeChrome()
    }

    private func configureEdgeToEdgeChrome() {
        view.backgroundColor = startupChromeColor
        webView?.isOpaque = false
        webView?.backgroundColor = .clear
        webView?.scrollView.backgroundColor = .clear
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.scrollView.contentInset = .zero
        webView?.scrollView.scrollIndicatorInsets = .zero
        statusBarStyle = .lightContent
        setNeedsStatusBarAppearanceUpdate()
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

    private func serverSpeechURL() -> URL? {
        guard let baseURL = bridge?.config.serverURL else {
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

            if let error {
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
                try self.configureAudioSessionForSpeech()
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
