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

test("Sign in with Apple capability and callback scheme are configured", async () => {
  const entitlements = await read("ios/App/App/App.entitlements");
  const info = await read("ios/App/App/Info.plist");
  assert.match(entitlements, /com\.apple\.developer\.applesignin/);
  assert.match(info, /com\.aletheia\.app/);
});
