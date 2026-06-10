const CACHE_NAME = "aletheia-v25";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
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
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  const targetUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    Promise.allSettled([
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
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      return self.clients.openWindow(targetUrl);
      }),
    ])
  );
});
