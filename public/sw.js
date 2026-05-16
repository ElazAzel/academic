const CACHE_NAME = "ai-academy-v4";
const STATIC_CACHE = "ai-academy-static-v4";
const OFFLINE_URL = "/offline";
const BUILD_VERSION_URL = "/api/v1/build-version";
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

const STATIC_ASSETS = [
  "/icon.svg",
  "/manifest.json",
  "/favicon.ico",
];

let currentBuildVersion = 0;

// ── Install ──────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(STATIC_ASSETS);
      try {
        const offlineResponse = await fetch(OFFLINE_URL);
        if (offlineResponse.ok) {
          await cache.put(OFFLINE_URL, offlineResponse);
        }
      } catch {
        // Offline page not available yet, skip
      }
    })()
  );
  self.skipWaiting();
});

// ── Check build version periodically ─────────────────────────────────
async function checkBuildVersion() {
  try {
    const response = await fetch(BUILD_VERSION_URL, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    const serverVersion = data.version ?? 0;

    if (currentBuildVersion === 0) {
      currentBuildVersion = serverVersion;
      return;
    }

    if (serverVersion > currentBuildVersion) {
      console.log("[SW] Build version changed:", currentBuildVersion, "→", serverVersion);
      currentBuildVersion = serverVersion;

      // Invalidate all caches
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));

      // Notify all clients to reload
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({ type: "BUILD_UPDATED", version: serverVersion });
      });
    }
  } catch {
    // Silently fail — will retry on next interval
  }
}

// Check version on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
      // Start version check
      checkBuildVersion();
      setInterval(checkBuildVersion, VERSION_CHECK_INTERVAL);
    })()
  );
});

function offlineDocumentResponse() {
  return new Response(
    `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Нет подключения — AI Strategic Academy</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; }
      main { max-width: 420px; padding: 32px; text-align: center; }
      h1 { margin: 0 0 12px; font-size: 24px; }
      p { margin: 0 0 24px; color: #475569; line-height: 1.6; }
      button { border: 0; border-radius: 8px; background: #0f172a; color: white; padding: 10px 16px; font: inherit; cursor: pointer; }
    </style>
  </head>
  <body>
    <main>
      <h1>Нет подключения</h1>
      <p>Не удалось загрузить страницу. Проверьте соединение и попробуйте снова.</p>
      <button onclick="location.reload()">Повторить</button>
    </main>
  </body>
</html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

async function getOfflinePage() {
  const cachedOffline = await caches.match(OFFLINE_URL);
  return cachedOffline ?? offlineDocumentResponse();
}

// ── Fetch: Network-first with offline fallback ─────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  // For navigation requests: network-first, fallback to cache, then offline page
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          return getOfflinePage();
        }
      })()
    );
    return;
  }

  // For static assets: cache-first
  if (
    request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|webp|avif)$/) ||
    request.url.includes("/_next/static")
  ) {
    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok && networkResponse.type === "basic") {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return new Response("", { status: 408, statusText: "Request Timeout" });
        }
      })()
    );
    return;
  }

  // For API requests: network-only, no cache
  if (request.url.includes("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: "Вы офлайн. Невозможно выполнить запрос." }),
          {
            status: 503,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      })
    );
    return;
  }

  // Default: network-first
  event.respondWith(
    (async () => {
      try {
        return await fetch(request);
      } catch {
        const cachedResponse = await caches.match(request);
        return cachedResponse ?? new Response("Offline", { status: 503 });
      }
    })()
  );
});

// ── Push notifications ──────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data?.json();
  } catch {
    data = null;
  }

  if (!data) {
    data = {
      title: "AI Strategic Academy",
      body: event.data?.text() ?? "Новое уведомление",
    };
  }

  const title = data.title || "AI Strategic Academy";
  const options = {
    body: data.body || "Новое уведомление",
    icon: "/icon.svg",
    badge: "/icon.svg",
    vibrate: [100, 50, 100],
    tag: data.tag || "default",
    renotify: true,
    data: { url: data.url ?? "/" },
    actions: [
      { action: "open", title: "Открыть" },
      { action: "close", title: "Закрыть" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") return;

  // Resolve URL — handle both relative and absolute
  const notificationUrl = event.notification.data?.url ?? "/";
  const urlToOpen = new URL(notificationUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Try to focus an existing window with the same origin
      for (const client of windowClients) {
        try {
          const clientOrigin = new URL(client.url).origin;
          if (clientOrigin === self.location.origin && "focus" in client) {
            // Navigate existing window to the target URL
            client.postMessage({ type: "NAVIGATE", url: notificationUrl });
            return client.focus();
          }
        } catch {
          // Invalid URL, skip
        }
      }
      // No existing window — open a new one
      return clients.openWindow(urlToOpen);
    })
  );
});

// ── Message from client ─────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "CHECK_VERSION") {
    checkBuildVersion();
  }
});
