#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const APP_ID = "com.tobi.aletheia.app";

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

function requireMatch(contents, pattern, message, failures) {
  if (!pattern.test(contents)) failures.push(message);
}

const failures = [];
const [app, css, plist, appDelegate, sceneDelegate, androidBuild, androidStrings, androidAudioService, androidAudioPlugin, manifest, nativeConfig] = await Promise.all([
  read("src/components/aletheia-app.tsx"),
  read("src/app/globals.css"),
  read("ios/App/App/Info.plist"),
  read("ios/App/App/AppDelegate.swift"),
  read("ios/App/App/SceneDelegate.swift"),
  read("android/app/build.gradle"),
  read("android/app/src/main/res/values/strings.xml"),
  read("android/app/src/main/java/com/tobi/aletheia/app/AudioPlaybackService.java"),
  read("android/app/src/main/java/com/tobi/aletheia/app/ManagedAudioPlugin.java"),
  read("src/app/manifest.ts"),
  read("capacitor.config.ts"),
]);

for (const privacyKey of [
  "NSCameraUsageDescription",
  "NSPhotoLibraryUsageDescription",
  "NSMicrophoneUsageDescription",
  "NSSpeechRecognitionUsageDescription",
  "NSFaceIDUsageDescription",
]) {
  requireMatch(plist, new RegExp(`<key>${privacyKey}</key>\\s*<string>[^<]+</string>`), `iOS privacy description is missing: ${privacyKey}`, failures);
}

requireMatch(app, /capture="environment"/, "Gratitude Lens no longer requests the rear camera", failures);
const nativeSafeServiceWorkerGuards = app.match(/if \(!NATIVE_WEB_BUNDLE && "serviceWorker" in navigator\)/g) ?? [];
if (nativeSafeServiceWorkerGuards.length < 2) {
  failures.push("Native builds can enter a PWA service-worker registration or cleanup path");
}
requireMatch(nativeConfig, new RegExp(`appId:\\s*"${APP_ID.replaceAll(".", "\\.")}"`), "Capacitor appId drifted", failures);
requireMatch(androidBuild, new RegExp(`namespace\\s*=\\s*"${APP_ID.replaceAll(".", "\\.")}"`), "Android namespace drifted", failures);
requireMatch(androidBuild, new RegExp(`applicationId\\s+"${APP_ID.replaceAll(".", "\\.")}"`), "Android applicationId drifted", failures);
requireMatch(androidStrings, new RegExp(`<string name="custom_url_scheme">${APP_ID.replaceAll(".", "\\.")}</string>`), "Android callback scheme drifted", failures);
requireMatch(plist, new RegExp(`<string>${APP_ID.replaceAll(".", "\\.")}</string>`), "iOS callback scheme drifted", failures);
requireMatch(plist, /<key>UIApplicationSceneManifest<\/key>[\s\S]*<key>UISceneDelegateClassName<\/key>\s*<string>\$\(PRODUCT_MODULE_NAME\)\.SceneDelegate<\/string>/, "iOS scene configuration is missing", failures);
for (const orientation of ["UIInterfaceOrientationPortrait", "UIInterfaceOrientationLandscapeLeft", "UIInterfaceOrientationLandscapeRight"]) {
  requireMatch(plist, new RegExp(`<string>${orientation}</string>`), `iPhone orientation support is missing: ${orientation}`, failures);
}
requireMatch(sceneDelegate, /UIWindow\(windowScene:\s*windowScene\)/, "The iOS window is not created from its scene", failures);
requireMatch(sceneDelegate, /func sceneDidBecomeActive\(_ scene: UIScene\)/, "Scene activation is not handled by SceneDelegate", failures);
requireMatch(sceneDelegate, /for urlContext in connectionOptions\.urlContexts/, "Cold-start custom URLs are not forwarded from the scene", failures);
requireMatch(sceneDelegate, /for userActivity in connectionOptions\.userActivities/, "Cold-start universal links are not forwarded from the scene", failures);
requireMatch(sceneDelegate, /openURLContexts URLContexts/, "Runtime custom URLs are not forwarded from the scene", failures);
requireMatch(sceneDelegate, /continue userActivity: NSUserActivity/, "Runtime universal links are not forwarded from the scene", failures);
requireMatch(sceneDelegate, /ApplicationDelegateProxy\.shared\.application/, "Scene links are not forwarded to Capacitor", failures);
if (/UIScreen\.main|mainScreen/.test(`${appDelegate}\n${sceneDelegate}`)) {
  failures.push("The iOS shell still assumes a single main screen");
}
if (/UIApplication\.shared\.connectedScenes/.test(appDelegate)) {
  failures.push("Native authentication still walks global scenes instead of retaining its local presentation window");
}
requireMatch(manifest, /orientation:\s*"any"/, "The installed web app is still locked to one orientation", failures);
requireMatch(css, /--aletheia-safe-area-left:[^;]*env\(safe-area-inset-left/, "The web shell does not expose the left safe-area inset", failures);
requireMatch(css, /--aletheia-safe-area-right:[^;]*env\(safe-area-inset-right/, "The web shell does not expose the right safe-area inset", failures);
requireMatch(css, /\.app-main-content[\s\S]*padding-left:\s*max\(var\(--aletheia-safe-area-left\)[\s\S]*padding-right:\s*max\(var\(--aletheia-safe-area-right\)/, "Primary content does not handle asymmetric safe areas", failures);
requireMatch(app, /const usesWideNavigation = viewportWidth >= 768/, "Navigation does not adapt from the available viewport width", failures);
if (/isFoldClass|deviceFamily|orientationchange/.test(app)) {
  failures.push("The web shell still uses device- or orientation-specific layout assumptions");
}
requireMatch(androidAudioService, /Build\.VERSION\.SDK_INT < Build\.VERSION_CODES\.O/, "Android audio notification channels are not guarded for API 24–25", failures);
requireMatch(androidAudioService, /Build\.VERSION\.SDK_INT >= Build\.VERSION_CODES\.O\s*\? new Notification\.Builder\(this, CHANNEL_ID\)\s*:\s*new Notification\.Builder\(this\)/, "Android audio notifications use an API-26-only builder on API 24–25", failures);
requireMatch(androidAudioPlugin, /Build\.VERSION\.SDK_INT >= Build\.VERSION_CODES\.O[\s\S]*startForegroundService\(intent\)[\s\S]*startService\(intent\)/, "Android audio startup does not fall back below API 26", failures);

const iconPaths = [...manifest.matchAll(/src:\s*"([^"]+)"/g)].map((match) => match[1]);
if (!iconPaths.length) failures.push("PWA manifest has no icons");
await Promise.all(iconPaths.map(async (iconPath) => {
  try {
    await access(path.join(root, "public", iconPath.replace(/^\//, "")));
  } catch {
    failures.push(`PWA manifest icon is missing: ${iconPath}`);
  }
}));

if (failures.length) {
  console.error("Platform contract regression failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Platform contract regression passed for iOS, Android, and PWA.");
