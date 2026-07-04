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

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
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
        .catch(() => caches.match("/"))
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
    body: "A wisdom prompt is ready. Open Aletheia when you have a quiet moment.",
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
