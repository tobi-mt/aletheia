import { BUILD_ID } from "@/lib/build-version";

export const dynamic = "force-dynamic";
const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "").trim().replace(/\/$/, "");

const swScript = String.raw`
const buildId = "__BUILD_ID__";
const appBaseUrl = __APP_BASE_URL__;
const CACHE_NAME = "aletheia-" + buildId;
const MANIFEST_URL = "/manifest.webmanifest?v=" + encodeURIComponent(buildId);
const APP_SHELL = [
  "/",
  MANIFEST_URL,
  "/brand/aletheia-app-icon-192.png",
  "/brand/aletheia-app-icon-512.png",
];
const SHELL_ASSET_PATTERN = /(?:src|href)=["']([^"'#]+)["']/g;
const OFFLINE_HTML = [
  "<!doctype html>",
  '<html lang="en">',
  "  <head>",
  '    <meta charset="utf-8" />',
  '    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
  '    <meta name="theme-color" content="#0e1514" />',
  "    <title>Aletheia</title>",
  "    <style>",
  "      :root {",
  "        color-scheme: dark;",
  "        --bg: #0e1514;",
  "        --panel: rgba(18, 28, 25, 0.92);",
  "        --border: rgba(208, 173, 85, 0.22);",
  "        --text: #f8f5e8;",
  "        --muted: #c7d4cd;",
  "        --accent: #d0ad55;",
  "      }",
  "      * { box-sizing: border-box; }",
  "      html, body { height: 100%; }",
  "      body {",
  "        margin: 0;",
  '        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
  "        background:",
  "          radial-gradient(circle at 50% 18%, rgba(208, 173, 85, 0.12), transparent 26%),",
  "          radial-gradient(circle at 50% 82%, rgba(109, 143, 130, 0.12), transparent 24%),",
  "          linear-gradient(180deg, #08110f 0%, #0b1513 54%, #0e1514 100%);",
  "        color: var(--text);",
  "        display: grid;",
  "        place-items: center;",
  "        padding: 24px;",
  "      }",
  "      main {",
  "        width: min(100%, 360px);",
  "        border: 1px solid var(--border);",
  "        border-radius: 28px;",
  "        background: var(--panel);",
  "        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34);",
  "        padding: 28px 24px 24px;",
  "        text-align: center;",
  "        backdrop-filter: blur(16px);",
  "        -webkit-backdrop-filter: blur(16px);",
  "      }",
  "      .mark {",
  "        width: 72px;",
  "        height: 72px;",
  "        margin: 0 auto 18px;",
  "        border-radius: 22px;",
  "        background: linear-gradient(160deg, rgba(208, 173, 85, 0.2), rgba(140, 181, 166, 0.18));",
  "        display: grid;",
  "        place-items: center;",
  "        color: var(--accent);",
  "        font-size: 1.7rem;",
  "        font-weight: 800;",
  "        letter-spacing: 0.08em;",
  "      }",
  "      h1 {",
  "        margin: 0;",
  "        font-size: 1.4rem;",
  "        line-height: 1.15;",
  "        letter-spacing: -0.03em;",
  "      }",
  "      p {",
  "        margin: 12px 0 0;",
  "        color: var(--muted);",
  "        font-size: 0.98rem;",
  "        line-height: 1.55;",
  "      }",
  "      .status {",
  "        margin-top: 18px;",
  "        min-height: 1.4em;",
  "        color: #dce4de;",
  "        font-weight: 600;",
  "      }",
  "      button {",
  "        margin-top: 18px;",
  "        width: 100%;",
  "        border: 0;",
  "        border-radius: 999px;",
  "        padding: 14px 18px;",
  "        background: #f8f5e8;",
  "        color: #111814;",
  "        font-weight: 700;",
  "        font-size: 0.98rem;",
  "      }",
  "      button:disabled {",
  "        opacity: 0.72;",
  "      }",
  "    </style>",
  "  </head>",
  "  <body>",
  "    <main>",
  '      <div class="mark">A</div>',
  "      <h1>Aletheia is starting</h1>",
  "      <p>We are checking the app connection. If the app does not open, make sure this device has internet access and try again.</p>",
  '      <div class="status" data-status>Checking for the app URL…</div>',
  '      <button type="button" data-retry>Retry</button>',
  "    </main>",
  "    <script>",
  '      const statusEl = document.querySelector("[data-status]");',
  '      const retryButton = document.querySelector("[data-retry]");',
  '      const configPaths = ["./capacitor.config.json", "../capacitor.config.json", "/capacitor.config.json"];',
  "",
  "      async function resolveConfiguredAppUrl() {",
  "        for (const path of configPaths) {",
  "          try {",
  '            const response = await fetch(path, { cache: "no-store" });',
  "            if (!response.ok) {",
  "              continue;",
  "            }",
  "",
  "            const config = await response.json();",
  "            const appUrl = config?.server?.url?.trim();",
  "            if (appUrl) {",
  "              return appUrl;",
  "            }",
  "          } catch {",
  "            // Continue trying the other known config locations.",
  "          }",
  "        }",
  '        return "";',
  "      }",
  "",
  "      async function bootstrap() {",
  "        retryButton.disabled = true;",
  '        statusEl.textContent = navigator.onLine ? "Opening Aletheia…" : "No connection detected yet.";',
  "",
  "        const appUrl = await resolveConfiguredAppUrl();",
  "        if (appUrl) {",
  "          window.location.replace(appUrl);",
  "          return;",
  "        }",
  "",
  '        statusEl.textContent = "Aletheia needs a live connection to open. Try again when the network is available.";',
  "        retryButton.disabled = false;",
  "      }",
  "",
  "      retryButton.addEventListener(\"click\", bootstrap);",
  "      window.addEventListener(\"online\", bootstrap);",
  "      void bootstrap();",
  "    </script>",
  "  </body>",
  "</html>",
].join("\\n");

function offlineResponse() {
  return new Response(OFFLINE_HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const baseAssets = new Set(APP_SHELL);

  try {
    const rootResponse = await fetch("/");
    if (rootResponse.ok) {
      const html = await rootResponse.clone().text();
      await cache.put("/", rootResponse);

      for (const match of html.matchAll(SHELL_ASSET_PATTERN)) {
        const assetUrl = match[1];
        if (
          assetUrl.startsWith("/_next/") ||
          assetUrl.startsWith("/brand/") ||
          assetUrl.startsWith("/favicon.ico") ||
          assetUrl.startsWith("/manifest.webmanifest")
        ) {
          baseAssets.add(assetUrl);
        }
      }
    }
  } catch {
    // Fall through to the minimal shell below.
  }

  await Promise.all(
    [...baseAssets].filter((assetUrl) => assetUrl !== "/").map(async (assetUrl) => {
      try {
        const response = await fetch(assetUrl);
        if (response.ok) {
          await cache.put(assetUrl, response);
        }
      } catch {
        // Best-effort caching only.
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/").then((cached) => cached ?? offlineResponse()))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request))
  );
});

self.addEventListener("push", (event) => {
  const fallback = {
    title: "Aletheia",
    body: "",
    url: "/?source=notification&focus=today",
  };
  let data = fallback;
  try {
    data = event.data ? event.data.json() : fallback;
  } catch {
    data = fallback;
  }
  const title = data.title || fallback.title;
  const options = {
    body: data.body || fallback.body,
    icon: "/brand/aletheia-app-icon-192.png",
    badge: "/brand/aletheia-app-icon-192.png",
    tag: data.tag || "aletheia-daily-wisdom",
    renotify: false,
    requireInteraction: false,
    data: {
      url: data.url || "/",
      scripture: data.scripture,
      decisionId: data.decisionId || null,
      reminderKind: data.reminderKind || null,
      notificationKind: data.notificationKind || null,
      wisdomTheme: data.wisdomTheme || null,
      notificationId: data.notificationId || null,
      sharedDecisionId: data.sharedDecisionId || null,
      contactId: data.contactId || null,
      circleId: data.circleId || null,
      challengeId: data.challengeId || null,
      nudgeId: data.nudgeId || null,
      senderUserId: data.senderUserId || null,
      recipientUserId: data.recipientUserId || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  const resolveTargetUrl = (rawUrl) => {
    const preferredBase = appBaseUrl || self.location.origin || "/";
    let preferredOrigin = null;
    try {
      preferredOrigin = new URL(preferredBase).origin;
    } catch {
      preferredOrigin = null;
    }

    try {
      const directUrl = new URL(rawUrl || "/", self.location.origin);
      if ((directUrl.protocol === "http:" || directUrl.protocol === "https:") && (!preferredOrigin || directUrl.origin === preferredOrigin)) {
        return directUrl.href;
      }
    } catch {
      // Fall back to the configured app base when the service worker origin is unusable.
    }

    try {
      return new URL(rawUrl || "/", preferredBase).href;
    } catch {
      return new URL("/", preferredBase).href;
    }
  };

  const targetUrl = resolveTargetUrl(url);

  event.waitUntil(
    Promise.allSettled([
      fetch("/api/notifications/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationKind: event.notification.data?.notificationKind || null,
          notificationId: event.notification.data?.notificationId || event.notification.data?.sharedDecisionId || event.notification.data?.nudgeId || null,
          senderUserId: event.notification.data?.senderUserId || null,
          recipientUserId: event.notification.data?.recipientUserId || null,
          sharedDecisionId: event.notification.data?.sharedDecisionId || null,
          contactId: event.notification.data?.contactId || null,
          circleId: event.notification.data?.circleId || null,
          challengeId: event.notification.data?.challengeId || null,
        }),
      }),
      fetch("/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "notification_clicked",
          path: url,
          source: "web_push",
          metadata: {
            tag: event.notification.tag || null,
            scripture: event.notification.data?.scripture || null,
            decisionId: event.notification.data?.decisionId || null,
            reminderKind: event.notification.data?.reminderKind || null,
            notificationKind: event.notification.data?.notificationKind || null,
            wisdomTheme: event.notification.data?.wisdomTheme || null,
          },
        }),
      }),
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
        for (const client of clients) {
          if (!("focus" in client)) {
            continue;
          }
          try {
            if ("navigate" in client) {
              await client.navigate(targetUrl);
            }
            await client.focus();
            return;
          } catch {
            // Continue trying other clients before opening a new window.
          }
        }

        await self.clients.openWindow(targetUrl);
      }),
    ])
  );
});
`;

export async function GET() {
  return new Response(
    swScript
      .replaceAll("__BUILD_ID__", BUILD_ID)
      .replaceAll("__APP_BASE_URL__", JSON.stringify(APP_BASE_URL)),
    {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    }
  );
}
