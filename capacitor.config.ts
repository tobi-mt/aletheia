import type { CapacitorConfig } from "@capacitor/cli";

const appUrl = (
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === "production" ? process.env.NEXTAUTH_URL || process.env.AUTH_URL || "" : "") ||
  ""
).trim();

const config: CapacitorConfig = {
  appId: "com.aletheia.app",
  appName: "Aletheia",
  webDir: "capacitor-web",
  plugins: {
    SystemBars: {
      insetsHandling: "css",
      style: "DARK",
      hidden: false,
      animation: "NONE",
    },
  },
  server: appUrl
    ? {
        url: appUrl,
        cleartext: false,
      }
    : undefined,
};

export default config;
