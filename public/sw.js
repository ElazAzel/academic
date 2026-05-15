const CACHE_NAME = "ai-academy-v3";
const STATIC_CACHE = "ai-academy-static-v3";
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
          const networkResponse = await fetch(request);
          if (networkResponse.ok && networkResponse.type === "basic") {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const offlineResponse = await caches.match(OFFLINE_URL);
          if (offlineResponse) return offlineResponse;
          return new Response("Вы офлайн. Пожалуйста, проверьте подключение к интернету.", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
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
  const data = event.data?.json() ?? {
    title: "AI Strategic Academy",
    body: "Новое уведомление",
  };

  const options = {
    body: data.body,
    icon: "/icon.svg",
    badge: "/icon.svg",
    vibrate: [100, 50, 100],
    data: { url: data.url ?? "/" },
    actions: [
      { action: "open", title: "Открыть" },
      { action: "close", title: "Закрыть" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") return;

  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ── Message from client ─────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "CHECK_VERSION") {
    checkBuildVersion();
  }
});
