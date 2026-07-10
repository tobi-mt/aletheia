import { Capacitor, registerPlugin } from "@capacitor/core";

type AppleCredential = { identityToken: string; authorizationCode: string; nonce: string; name?: string };
type WebAuthResult = { url: string };
type AuthenticatedPostResult = { status: number; body: Record<string, unknown>; cookiesInstalled: boolean };

interface NativeAuthPlugin {
  signInWithApple(): Promise<AppleCredential>;
  authenticateWeb(options: { url: string; callbackScheme: string }): Promise<WebAuthResult>;
  postAuthenticatedJson(options: { url: string; body: Record<string, unknown> }): Promise<AuthenticatedPostResult>;
}

export const NativeAuth = registerPlugin<NativeAuthPlugin>("NativeAuth");

export function supportsNativeAppleSignIn() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("NativeAuth");
}
