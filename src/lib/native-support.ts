import { Capacitor, registerPlugin } from "@capacitor/core";

export type NativeSupportProduct = {
  id: string;
  displayName: string;
  description: string;
  displayPrice: string;
};

type NativeSupportPlugin = {
  products(): Promise<{ products: NativeSupportProduct[] }>;
  purchase(options: { productId: string }): Promise<{ status: "purchased" | "pending" | "cancelled"; transactionId?: string }>;
};

export const NativeSupport = registerPlugin<NativeSupportPlugin>("NativeSupport");

export function supportsNativeSupport() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("NativeSupport");
}
