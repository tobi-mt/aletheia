import type { CapacitorConfig } from "@capacitor/cli";

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
};

export default config;
