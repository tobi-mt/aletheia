import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("signed-in account controls expose permanent account deletion without opening privacy settings", async () => {
  const client = await read("src/components/aletheia-app.tsx");
  const accountPanelStart = client.indexOf("function AccountPanel(");
  const accountControlsStart = client.indexOf("function AccountStatusCard(");
  const accountControlsEnd = client.indexOf("function AvatarStudioCard(", accountControlsStart);
  const accountPanel = client.slice(accountPanelStart, accountControlsStart);
  const accountControls = client.slice(accountControlsStart, accountControlsEnd);

  assert.ok(accountPanelStart >= 0 && accountControlsStart > accountPanelStart);
  assert.ok(accountControlsEnd > accountControlsStart);
  assert.match(accountPanel, /title=\{user \? ts\('labels\.accountControls'\)[\s\S]*?defaultOpen[\s\S]*?<AccountStatusCard/);
  assert.match(accountControls, /onRequestDeleteAccount/);
  assert.match(accountControls, /ts\('labels\.deleteAccount'\)/);
  assert.match(accountControls, /disabled=\{deleteAccountBusy \|\| authStatus === "signing-out"\}/);
});

test("account deletion remains permanent, confirmed, and clears the server session", async () => {
  const route = await read("src/app/api/account/delete/route.ts");

  assert.match(route, /getCurrentUser\(\)/);
  assert.match(route, /trim\(\)\.toUpperCase\(\) !== "DELETE"/);
  assert.match(route, /DELETE FROM users WHERE id = \?/);
  assert.match(route, /clearSession\(\)/);
  assert.doesNotMatch(route, /deactivat|disable account/i);
});

test("account deletion confirmation receives focus on touch devices", async () => {
  const client = await read("src/components/aletheia-app.tsx");
  const modalStart = client.indexOf("function DeleteAccountModal(");
  const modalEnd = client.indexOf("function AiConsentModal(", modalStart);
  const modal = client.slice(modalStart, modalEnd);

  assert.ok(modalStart >= 0 && modalEnd > modalStart);
  assert.match(modal, /confirmationInputRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(modal, /ref=\{confirmationInputRef\}/);
  assert.match(modal, /autoFocus/);
  assert.match(modal, /window\.visualViewport/);
  assert.match(modal, /height: visualViewportFrame\?\.height/);
  assert.match(modal, /scrollIntoView\(\{ block: "center", behavior: "smooth" \}\)/);
  assert.doesNotMatch(modal, /autoFocus=\{shouldAutoFocusOnThisDevice\(\)\}/);
});

test("successful deletion shows a translated farewell before the welcome gate", async () => {
  const client = await read("src/components/aletheia-app.tsx");
  const deleteFlow = client.slice(client.indexOf("async function deleteAccount"), client.indexOf("async function reportIssue"));

  assert.match(deleteFlow, /setShowWelcomeGate\(false\)/);
  assert.match(deleteFlow, /setShowAccountDeletedFarewell\(true\)/);
  assert.match(client, /title=\{ts\("status\.accountDeletedFarewellTitle"\)\}/);
  assert.match(client, /body=\{ts\("status\.accountDeletedFarewellBody"\)\}/);
  assert.match(client, /tone="complete"/);
  assert.match(client, /setShowAccountDeletedFarewell\(false\)[\s\S]*?setShowWelcomeGate\(true\)/);
});

test("startup and completion transitions share one uncarded splash system", async () => {
  const client = await read("src/components/aletheia-app.tsx");
  const splashStart = client.indexOf("function StartupSplash(");
  const splashEnd = client.indexOf("function Screen(", splashStart);
  const splash = client.slice(splashStart, splashEnd);

  assert.match(splash, /tone\?: "loading" \| "complete"/);
  assert.match(splash, /rounded-full border/);
  assert.doesNotMatch(splash, /max-w-sm rounded-3xl border/);
  assert.doesNotMatch(splash, /animate=\{\{ rotate: 360 \}\}/);
});

test("Apple authorization is revoked before the user record is deleted", async () => {
  const route = await read("src/app/api/account/delete/route.ts");
  const revokeIndex = route.indexOf("await revokeAppleCredentialForUser(user.id)");
  const deleteIndex = route.indexOf('await run("DELETE FROM users WHERE id = ?", user.id)');

  assert.ok(revokeIndex >= 0);
  assert.ok(deleteIndex > revokeIndex);
});

test("native iOS uses StoreKit support instead of external mission payment methods", async () => {
  const client = await read("src/components/aletheia-app.tsx");
  const swift = await read("ios/App/App/AppDelegate.swift");
  const supportChoiceStart = client.indexOf('Capacitor.getPlatform() === "ios"');
  const nativeSupportIndex = client.indexOf("<NativeSupportCard", supportChoiceStart);
  const externalSupportIndex = client.indexOf("<SupportMissionCard", supportChoiceStart);

  assert.ok(supportChoiceStart >= 0);
  assert.ok(nativeSupportIndex > supportChoiceStart && externalSupportIndex > nativeSupportIndex);
  assert.match(swift, /import StoreKit/);
  assert.match(swift, /try await product\.purchase\(\)/);
  assert.match(swift, /await transaction\.finish\(\)/);
});

test("third-party AI consent is a Privacy control and withdrawal persists without duplicate notices", async () => {
  const client = await read("src/components/aletheia-app.tsx");
  const personalizationStart = client.indexOf('accountSection === "personalization"');
  const privacyStart = client.indexOf('accountSection === "privacy"');
  const shareStart = client.indexOf('accountSection === "share"');
  const personalization = client.slice(personalizationStart, privacyStart);
  const privacy = client.slice(privacyStart, shareStart);

  assert.ok(personalizationStart >= 0 && privacyStart > personalizationStart && shareStart > privacyStart);
  assert.doesNotMatch(personalization, /aiConsent\.settingTitle/);
  assert.match(privacy, /aiConsent\.settingTitle/);
  assert.match(privacy, /thirdPartyAiConsent: checked/);
  assert.match(client, /patch\.thirdPartyAiConsent === false/);
  assert.match(client, /localStorage\.setItem\("aletheia_third_party_ai_declined", "yes"\)/);
  assert.match(client, /!aiConsentDeclined && consentOverride === undefined/);
  assert.match(client, /updatePreferences\(\{ thirdPartyAiConsent: true \}, \{ silent: true \}\)/);
});

test("the iOS target bundles a valid no-tracking privacy manifest", async () => {
  const manifest = await read("ios/App/App/PrivacyInfo.xcprivacy");
  const project = await read("ios/App/App.xcodeproj/project.pbxproj");

  assert.match(manifest, /<key>NSPrivacyTracking<\/key>\s*<false\/>/);
  assert.match(manifest, /NSPrivacyCollectedDataTypeEmailAddress/);
  assert.match(manifest, /NSPrivacyCollectedDataTypeOtherUserContent/);
  assert.match(manifest, /NSPrivacyCollectedDataTypeAudioData/);
  assert.match(manifest, /NSPrivacyCollectedDataTypeProductInteraction/);
  assert.match(project, /PrivacyInfo\.xcprivacy in Resources/);
  assert.match(project, /CURRENT_PROJECT_VERSION = 10008;/);
});

test("optional iOS voice input has clear privacy purpose strings", async () => {
  const info = await read("ios/App/App/Info.plist");

  assert.match(info, /<key>NSMicrophoneUsageDescription<\/key>/);
  assert.match(info, /<key>NSSpeechRecognitionUsageDescription<\/key>/);
});
