import { traceStartup } from "@/lib/startup-trace";

const DEFAULT_PUBLIC_APP_ORIGIN = "https://aletheia.mirrortalkpodcast.com";

export const NATIVE_WEB_BUNDLE = process.env.NEXT_PUBLIC_NATIVE_WEB_BUNDLE === "1";

function normalizeOrigin(value: string | undefined | null) {
  if (!value) {
    return DEFAULT_PUBLIC_APP_ORIGIN;
  }

  try {
    return new URL(value).origin;
  } catch {
    try {
      return new URL(value, DEFAULT_PUBLIC_APP_ORIGIN).origin;
    } catch {
      return DEFAULT_PUBLIC_APP_ORIGIN;
    }
  }
}

export const PUBLIC_APP_ORIGIN = normalizeOrigin(
  process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || DEFAULT_PUBLIC_APP_ORIGIN
);

export function getPublicAppOrigin() {
  return PUBLIC_APP_ORIGIN;
}

function rewriteNativeApiRequest(input: RequestInfo | URL) {
  if (typeof window === "undefined") {
    return null;
  }

  const resolveUrl = (value: string) => {
    try {
      return new URL(value, window.location.href);
    } catch {
      return null;
    }
  };

  const requestUrl = input instanceof Request ? input.url : input instanceof URL ? input.href : input;
  const parsed = resolveUrl(requestUrl);
  if (!parsed || !parsed.pathname.startsWith("/api/")) {
    return null;
  }

  return `${PUBLIC_APP_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
}

let nativeFetchProxyInstalled = false;

export function installNativeWebFetchProxy() {
  if (!NATIVE_WEB_BUNDLE || nativeFetchProxyInstalled || typeof window === "undefined") {
    return;
  }

  traceStartup("native-web:fetch-proxy-install");

  const originalFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const rewritten = rewriteNativeApiRequest(input);
    if (!rewritten) {
      return originalFetch(input, init);
    }

    const requestUrl = input instanceof Request ? input.url : input instanceof URL ? input.href : String(input);
    try {
      const parsed = new URL(requestUrl, window.location.href);
      if (parsed.pathname.startsWith("/api/auth/")) {
        traceStartup("native-web:fetch-rewrite", {
          pathname: parsed.pathname,
          requestOrigin: parsed.origin,
          publicAppOrigin: PUBLIC_APP_ORIGIN,
          rewrittenUrl: rewritten,
          sameOrigin: parsed.origin === PUBLIC_APP_ORIGIN,
        });
      }
    } catch {
      // Ignore malformed diagnostics-only URLs.
    }

    const rewrittenInit = {
      ...(init ?? {}),
      credentials: "include" as RequestCredentials,
    };

    if (input instanceof Request) {
      return originalFetch(new Request(rewritten, input), rewrittenInit);
    }

    return originalFetch(rewritten, rewrittenInit);
  }) as typeof window.fetch;

  nativeFetchProxyInstalled = true;
}
