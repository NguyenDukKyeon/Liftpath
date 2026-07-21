let restTimeout = null;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
        body: "Bắt đầu hiệp tiếp theo.",
        icon: "icon-192.png",
        tag: "liftpath-rest",
        renotify: false,
        data: { url: self.registration.scope },
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

