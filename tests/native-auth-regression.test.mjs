import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("iOS authentication stays in system in-app authorization surfaces", async () => {
  const swift = await read("ios/App/App/AppDelegate.swift");
  assert.match(swift, /ASAuthorizationAppleIDProvider/);
  assert.match(swift, /ASWebAuthenticationSession/);
  assert.match(swift, /prefersEphemeralWebBrowserSession = false/);
});

test("Google native auth uses a single-use server handoff", async () => {
  const client = await read("src/components/aletheia-app.tsx");
  const server = await read("src/lib/auth.ts");
  assert.match(client, /NativeAuth\.authenticateWeb/);
  assert.match(client, /api\/auth\/native\/complete/);
  assert.match(server, /consumed_at IS NULL AND expires_at > \?/);
  assert.match(server, /SET consumed_at = \?/);
});

test("Apple identity verification covers signature, audience, expiry, email, and nonce", async () => {
  const verifier = await read("src/lib/apple-identity.ts");
  for (const requirement of ["RSA-SHA256", "audiences.includes", "claims.exp", "email_verified", "claims.nonce"]) {
    assert.match(verifier, new RegExp(requirement.replace(".", "\\.")));
  }
});

test("Apple authorization is retained securely and revoked before account deletion", async () => {
  const native = await read("ios/App/App/AppDelegate.swift");
  const oauth = await read("src/lib/apple-oauth.ts");
  const deletion = await read("src/app/api/account/delete/route.ts");
  assert.match(native, /credential\.authorizationCode/);
  assert.match(oauth, /grant_type: "authorization_code"/);
  assert.match(oauth, /aes-256-gcm/);
  assert.match(oauth, /auth\/revoke/);
  assert.ok(deletion.indexOf("revokeAppleCredentialForUser") < deletion.indexOf('DELETE FROM users'));
  assert.match(deletion, /account deletion was not started/);
});

test("every rendered Google sign-in option has an Apple peer on iOS", async () => {
  const client = await read("src/components/aletheia-app.tsx");
  const googleButtons = [...client.matchAll(/ts\(["']auth\.continueWithGoogle["']\)/g)].length;
  const appleButtons = [...client.matchAll(/ts\(["']auth\.continueWithApple["']\)/g)].length;
  assert.equal(appleButtons, googleButtons);
});

test("OAuth buttons show progress only for the provider being used", async () => {
  const client = await read("src/components/aletheia-app.tsx");

  assert.match(client, /type AuthProvider = "email" \| "google" \| "apple" \| null/);
  assert.match(client, /setAuthProvider\("google"\)/);
  assert.match(client, /setAuthProvider\("apple"\)/);
  assert.doesNotMatch(
    client,
    /authStatus === ["']signing-in["'] \? ts\(["']auth\.opening(?:Apple|Google)["']\)/
  );
  assert.match(client, /authProvider === "apple" \? ts\("auth\.openingApple"\)/);
  assert.match(client, /authProvider === "google" \? ts\(['"]auth\.openingGoogle['"]\)/);
});

test("Sign in with Apple capability and callback scheme are configured", async () => {
  const entitlements = await read("ios/App/App/App.entitlements");
  const info = await read("ios/App/App/Info.plist");
  assert.match(entitlements, /com\.apple\.developer\.applesignin/);
  assert.match(info, /com\.aletheia\.app/);
});

test("app-local native auth is explicitly registered with Capacitor 8", async () => {
  const swift = await read("ios/App/App/AppDelegate.swift");
  const client = await read("src/lib/native-auth.ts");
  assert.match(swift, /registerPluginInstance\(NativeAuthPlugin\(\)\)/);
  assert.doesNotMatch(swift, /registerPluginType\(NativeAuthPlugin\.self\)/);
  assert.match(client, /isPluginAvailable\("NativeAuth"\)/);
});

test("native biometric lock uses system biometrics and protects sensitive account actions", async () => {
  const swift = await read("ios/App/App/AppDelegate.swift");
  const android = await read("android/app/src/main/java/com/aletheia/app/NativeBiometricLockPlugin.java");
  const activity = await read("android/app/src/main/java/com/aletheia/app/MainActivity.java");
  const info = await read("ios/App/App/Info.plist");
  const client = await read("src/components/aletheia-app.tsx");
  const bridge = await read("src/lib/native-biometric-lock.ts");

  assert.match(swift, /LAContext/);
  assert.match(swift, /deviceOwnerAuthenticationWithBiometrics/);
  assert.match(swift, /registerPluginInstance\(NativeBiometricLockPlugin\(\)\)/);
  assert.match(info, /NSFaceIDUsageDescription/);
  assert.match(android, /BiometricPrompt/);
  assert.match(android, /BIOMETRIC_WEAK/);
  assert.match(activity, /registerPlugin\(NativeBiometricLockPlugin\.class\)/);
  assert.match(bridge, /registerPlugin<NativeBiometricLockPlugin>\("NativeBiometricLock"\)/);
  assert.match(client, /NativeBiometricLock\.authenticate/);
  assert.match(client, /authenticateBiometricLock\(ts\("biometric\.exportReason"\)\)/);
  assert.match(client, /authenticateBiometricLock\(ts\("biometric\.deleteReason"\)\)/);
  assert.match(client, /App\.addListener\("appStateChange"/);
  assert.match(client, /biometricAppWasBackgroundedRef/);
  assert.match(client, /if \(biometricLockRequestRef\.current\) return/);
  assert.match(client, /else if \(biometricAppWasBackgroundedRef\.current\)/);
});

test("native authentication installs secure session cookies before reload", async () => {
  const swift = await read("ios/App/App/AppDelegate.swift");
  const client = await read("src/components/aletheia-app.tsx");
  assert.match(swift, /postAuthenticatedJson/);
  assert.match(swift, /cookieStore\.setCookie/);
  assert.match(client, /NativeAuth\.postAuthenticatedJson/);
  assert.match(client, /cookiesInstalled/);
  assert.match(client, /apple_new/);
});

test("native API requests use the iOS HTTP cookie jar and new social users enter onboarding", async () => {
  const config = await read("capacitor.config.ts");
  const client = await read("src/components/aletheia-app.tsx");
  assert.match(config, /CapacitorHttp:\s*\{\s*enabled:\s*true/);
  assert.match(client, /isNewSocialAccount/);
  assert.match(client, /setOnboardingPath\(isNewSocialAccount \? "account" : null\)/);
  assert.match(client, /setShowOnboarding\(isNewSocialAccount\)/);
});

test("signed-in native account UX supports identity editing, push, and one onboarding step rail", async () => {
  const client = await read("src/components/aletheia-app.tsx");
  const profileRoute = await read("src/app/api/auth/profile/route.ts");
  const entitlements = await read("ios/App/App/App.entitlements");
  assert.match(profileRoute, /hasNameField/);
  assert.match(profileRoute, /UPDATE users SET avatar_url.*name = CASE/s);
  assert.match(client, /onUpdateProfileName/);
  assert.match(client, /profileDisplayName/);
  assert.match(client, /AvatarStudioCard[\s\S]*onUpdateProfileName/);
  assert.match(client, /fetch\("\/api\/notifications\/native", \{ cache: "no-store" \}\)/);
  assert.match(client, /nativeServerSetupRequiredBody/);
  assert.match(client, /invalid_input: "notifications\.apiInvalidInput"/);
  assert.match(client, /!Capacitor\.isNativePlatform\(\) \? <InstallGuideCard/);
  assert.equal([...client.matchAll(/aria-label=\{ts\('labels\.onboardingSetupNav'\)\}/g)].length, 1);
  assert.match(entitlements, /aps-environment/);
  assert.match(client, /nativeRegistrationFailedBody/);
});

test("native push registration remains safe on production databases without full bootstrap", async () => {
  const db = await read("src/lib/db.ts");
  const route = await read("src/app/api/notifications/native/route.ts");
  assert.match(db, /CREATE TABLE IF NOT EXISTS native_push_devices/);
  assert.match(db, /native_push_devices_token_unique_idx/);
  assert.match(route, /getCurrentUser\(\)/);
  assert.match(route, /Native push device registration failed/);
  assert.match(route, /apiError\(500, "save_failed"/);
});

test("APNs provider tokens use the JOSE ES256 signature representation", async () => {
  const nativePush = await read("src/lib/native-push.ts");
  assert.match(nativePush, /dsaEncoding:\s*"ieee-p1363"/);
});

test("APNs transport handles HTTP2 session resets and timeouts", async () => {
  const nativePush = await read("src/lib/native-push.ts");
  assert.match(nativePush, /client\.on\("error"/);
  assert.match(nativePush, /APNs push timed out after 15 seconds/);
  assert.match(nativePush, /if \(settled\)/);
});

test("native notification badges cannot survive an iOS reinstall or device re-registration", async () => {
  const nativePush = await read("src/lib/native-push.ts");
  const nativeRoute = await read("src/app/api/notifications/native/route.ts");
  const client = await read("src/components/aletheia-app.tsx");
  const appDelegate = await read("ios/App/App/AppDelegate.swift");
  assert.match(nativePush, /enabled = TRUE,\s+badge_count = 0,/);
  assert.match(nativePush, /badge:\s*0/);
  assert.doesNotMatch(nativePush, /badge:\s*Math\.min\(99/);
  assert.match(nativePush, /SET badge_count = 0/);
  assert.match(nativeRoute, /export async function PATCH/);
  assert.match(nativeRoute, /cleared: false, reason: "not_signed_in"/);
  assert.match(client, /removeAllDeliveredNotifications/);
  assert.match(client, /App\.addListener\("appStateChange"/);
  assert.match(appDelegate, /didFinishLaunchingWithOptions[\s\S]*?clearNotificationBadge\(\)/);
  assert.match(appDelegate, /removeAllDeliveredNotifications\(\)/);
  assert.match(appDelegate, /setBadgeCount\(0\)/);
});

test("session checks stay on the splash instead of flashing the welcome gate", async () => {
  const client = await read("src/components/aletheia-app.tsx");
  assert.match(client, /if \(authStatus === "checking"\) \{[\s\S]*?<StartupSplash/);
  assert.doesNotMatch(client, /authStatus === "checking" && isReturningFromSocialAuth/);
});

test("successful authentication cannot reveal logged-out surfaces during workspace hydration", async () => {
  const client = await read("src/components/aletheia-app.tsx");
  assert.match(client, /open=\{showWelcomeGate && !user && authStatus !== "signed-in"\}/);
  assert.match(client, /open=\{welcomeAuthOpen && !user && authStatus !== "signed-in"\}/);

  const emailAuth = client.slice(client.indexOf("async function handleAuth"), client.indexOf("async function handleLogout"));
  assert.ok(emailAuth.indexOf("setShowWelcomeGate(false)") < emailAuth.indexOf('setAuthStatus("signed-in")'));
  assert.match(emailAuth, /await loadSignedInWorkspace\(data\.user\)/);

  const sessionRestore = client.slice(client.indexOf("if (data.user) {"), client.indexOf("} else {", client.indexOf("if (data.user) {")));
  assert.ok(sessionRestore.indexOf("setShowWelcomeGate(false)") < sessionRestore.indexOf('setAuthStatus("signed-in")'));
});

test("authenticated users remain on a translated preparation splash until hydration completes", async () => {
  const client = await read("src/components/aletheia-app.tsx");
  const sessionRestore = client.slice(
    client.indexOf("if (data.user) {"),
    client.indexOf("} else {", client.indexOf("if (data.user) {"))
  );
  const emailAuth = client.slice(client.indexOf("async function handleAuth"), client.indexOf("async function logout"));

  assert.match(client, /const \[authPreparationUser, setAuthPreparationUser\] = useState<User \| null>\(null\)/);
  assert.match(client, /ts\("status\.preparingAccountTitle"\)\.replace\("\{name\}", preparationName\)/);
  assert.match(client, /ts\("status\.preparingAccountBody"\)/);
  assert.ok(sessionRestore.indexOf("setAuthPreparationUser(data.user)") < sessionRestore.indexOf("await loadSignedInWorkspace(data.user)"));
  assert.ok(sessionRestore.indexOf("await loadSignedInWorkspace(data.user)") < sessionRestore.indexOf('setAuthStatus("signed-in")'));
  assert.ok(emailAuth.indexOf("setAuthPreparationUser(data.user)") < emailAuth.indexOf("await loadSignedInWorkspace(data.user)"));
  assert.ok(emailAuth.indexOf("await loadSignedInWorkspace(data.user)") < emailAuth.indexOf('setAuthStatus("signed-in")'));
});

test("native Google return marks the reload as an in-progress auth completion", async () => {
  const client = await read("src/components/aletheia-app.tsx");
  const googleAuth = client.slice(client.indexOf("async function handleGoogleSignIn"), client.indexOf("async function handleAppleSignIn"));
  assert.match(googleAuth, /returnUrl\.searchParams\.set\("auth", "google_success"\)/);
  assert.match(googleAuth, /window\.location\.replace\(returnUrl\.toString\(\)\)/);
  assert.doesNotMatch(googleAuth, /window\.location\.reload\(\)/);
});

test("native uses ManagedAudio before browser speech and verifies push configuration per platform", async () => {
  const client = await read("src/components/aletheia-app.tsx");
  const nativePush = await read("src/lib/native-push.ts");
  const route = await read("src/app/api/notifications/native/route.ts");
  const nativeAudioIndex = client.indexOf("if (Capacitor.isNativePlatform() && preferences.thirdPartyAiConsent) {", client.indexOf("async function speakText"));
  const browserSpeechIndex = client.indexOf('"speechSynthesis" in window', client.indexOf("async function speakText"));
  assert.ok(nativeAudioIndex >= 0 && nativeAudioIndex < browserSpeechIndex);
  assert.match(client, /await ManagedAudio\.speak/);
  assert.match(client, /thirdPartyAiConsent: preferences\.thirdPartyAiConsent/);
  assert.match(nativePush, /isNativePushPlatformConfigured/);
  assert.match(nativePush, /apnsConfigured/);
  assert.match(route, /isNativePushPlatformConfigured\(platform\)/);
});
