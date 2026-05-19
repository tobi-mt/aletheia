import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aletheia.app",
  appName: "Aletheia",
  webDir: "out",
  server: {
    url: process.env.NEXT_PUBLIC_APP_URL,
    cleartext: false,
  },
};

export default config;
