// XA Project PhotoLog service worker: Web Push notifications, plus a
// light runtime cache for previously-viewed photo thumbnails/images
// (Cache API doesn't key on query-string tokens changing across page
// reloads, so this mainly helps within a session -- combined with the
// 24h in-memory signed-URL cache in src/lib/projectPhotoLog.js, repeat
// views of the same photo reuse the same cached response instead of
// re-downloading).

const IMAGE_CACHE = "photolog-images-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "XA Project PhotoLog", body: event.data.text() };
  }
  const title = payload.title || "XA Project PhotoLog";
  const options = {
    body: payload.body || "New photo update",
    icon: "/android-chrome-192x192.png",
    badge: "/favicon-48x48.png",
    data: { url: payload.url || "/feed" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/feed";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client) client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  if (event.request.method !== "GET" || !url.includes("/storage/v1/object/sign/project-photos/")) return;

  event.respondWith(
    caches.open(IMAGE_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    })
  );
});
