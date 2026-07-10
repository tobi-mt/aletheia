import { Capacitor, registerPlugin } from "@capacitor/core";

type AppleCredential = { identityToken: string; authorizationCode: string; nonce: string; name?: string };
type WebAuthResult = { url: string };

interface NativeAuthPlugin {
  signInWithApple(): Promise<AppleCredential>;
  authenticateWeb(options: { url: string; callbackScheme: string }): Promise<WebAuthResult>;
}

export const NativeAuth = registerPlugin<NativeAuthPlugin>("NativeAuth");

export function supportsNativeAppleSignIn() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}
