import { Capacitor, registerPlugin } from "@capacitor/core";

export type BiometricLockState = {
  available: boolean;
  enabled: boolean;
  biometryType: "face" | "fingerprint" | "biometric" | null;
};

type NativeBiometricLockPlugin = {
  getState(): Promise<BiometricLockState>;
  setEnabled(options: { enabled: boolean; reason: string }): Promise<BiometricLockState>;
  authenticate(options: { reason: string }): Promise<void>;
};

export const NativeBiometricLock = registerPlugin<NativeBiometricLockPlugin>("NativeBiometricLock");

export function supportsNativeBiometricLock() {
  return Capacitor.isNativePlatform() && (Capacitor.getPlatform() === "ios" || Capacitor.getPlatform() === "android");
}
