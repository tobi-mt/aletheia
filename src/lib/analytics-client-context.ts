export type AnalyticsRuntime = "ios_app" | "android_app" | "pwa" | "web" | "unknown";

export type AnalyticsClientContext = {
  runtime: AnalyticsRuntime;
  deviceClass: "mobile" | "tablet" | "desktop" | "unknown";
  osFamily: "ios" | "android" | "windows" | "macos" | "linux" | "other";
  browserFamily: "native_webview" | "safari" | "chrome" | "edge" | "firefox" | "other";
};

const RUNTIMES = new Set<AnalyticsRuntime>(["ios_app", "android_app", "pwa", "web", "unknown"]);

export function normalizeAnalyticsRuntime(value: unknown): AnalyticsRuntime {
  return typeof value === "string" && RUNTIMES.has(value as AnalyticsRuntime)
    ? (value as AnalyticsRuntime)
    : "unknown";
}

export function classifyAnalyticsClient(userAgent: string | null | undefined, runtimeValue?: unknown): AnalyticsClientContext {
  const ua = (userAgent ?? "").toLowerCase();
  const runtime = normalizeAnalyticsRuntime(runtimeValue);
  const isTablet = /ipad|tablet|kindle|silk/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua));
  const isMobile = !isTablet && /iphone|ipod|android|mobile/.test(ua);
  const osFamily = /iphone|ipad|ipod/.test(ua)
    ? "ios"
    : /android/.test(ua)
      ? "android"
      : /windows/.test(ua)
        ? "windows"
        : /mac os|macintosh/.test(ua)
          ? "macos"
          : /linux|x11/.test(ua)
            ? "linux"
            : "other";
  const browserFamily = runtime === "ios_app" || runtime === "android_app"
    ? "native_webview"
    : /edg\//.test(ua)
      ? "edge"
      : /firefox|fxios/.test(ua)
        ? "firefox"
        : /chrome|crios/.test(ua)
          ? "chrome"
          : /safari/.test(ua)
            ? "safari"
            : "other";

  return {
    runtime,
    deviceClass: isTablet ? "tablet" : isMobile ? "mobile" : ua ? "desktop" : "unknown",
    osFamily,
    browserFamily,
  };
}
