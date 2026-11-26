import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tobi.aletheia.app",
  appName: "Aletheia",
  webDir: "capacitor-web",
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    PushNotifications: {
      // Background pushes are presented by APNs/FCM. In the foreground the app
      // renders its own compact, actionable notice instead of leaving a second
      // persistent OS banner/list entry over the active task.
      presentationOptions: [],
    },
    SystemBars: {
      insetsHandling: "css",
      style: "DARK",
      hidden: false,
      animation: "NONE",
    },
  },
};

export default config;
