import type { CapacitorConfig } from "@capacitor/cli";

const appUrl = (
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  ""
).trim();

const config: CapacitorConfig = {
  appId: "com.aletheia.app",
  appName: "Aletheia",
  webDir: "capacitor-web",
  server: appUrl
    ? {
        url: appUrl,
        cleartext: false,
      }
    : undefined,
};

export default config;
