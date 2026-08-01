const CACHE_NAME = "liftpath-shell-v8";
const scopeUrl = new URL("./", self.registration.scope).href;
const appIconUrl = new URL("app-icon.svg?v=4", self.registration.scope).href;
const shellAssets = [scopeUrl, new URL("manifest.webmanifest", self.registration.scope).href, appIconUrl];
let restTimeout = null;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(shellAssets)).catch(() => undefined).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("liftpath-") && key !== CACHE_NAME).map((key) => caches.delete(key)))),
  ]));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) void caches.open(CACHE_NAME).then((cache) => cache.put(scopeUrl, response.clone()));
      return response;
    }).catch(async () => (await caches.match(scopeUrl)) || Response.error()));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok && response.type === "basic") void caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
    return response;
  }).catch(() => Response.error())));
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "cancel-rest") {
    if (restTimeout !== null) clearTimeout(restTimeout);
    restTimeout = null;
    return;
  }
  if (data.type === "schedule-rest" && Number.isFinite(data.endsAt)) {
    if (restTimeout !== null) clearTimeout(restTimeout);
    restTimeout = setTimeout(() => {
      void self.registration.showNotification("LiftPath · Hết giờ nghỉ", {
        body: "Bắt đầu hiệp tiếp theo.", icon: appIconUrl, tag: "liftpath-rest", data: { url: self.registration.scope },
      }).catch(() => {});
      restTimeout = null;
    }, Math.max(0, data.endsAt - Date.now()));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || self.registration.scope;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => "focus" in client);
    return existing ? existing.focus() : self.clients.openWindow(target);
  }));
});
