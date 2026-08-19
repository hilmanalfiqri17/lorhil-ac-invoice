const CACHE = "lorhil-ac-online-v88-logo-fix-1";
const CORE_ASSETS = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "invoice-engine.js",
  "config.js"
];
const OPTIONAL_ASSETS = [
  "manifest.webmanifest",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/logo.png",
  "assets/signature.png",
  "assets/stamp.png",
  "assets/technician/teknisi.png",
  "assets/icons/activity.svg",
  "assets/logo-lorhil.png",
  "assets/icons/backup.svg",
  "assets/icons/calendar-clock.svg",
  "assets/icons/calendar-days.svg",
  "assets/icons/calendar.svg",
  "assets/icons/car-front.svg",
  "assets/icons/check.svg",
  "assets/icons/chevron-down.svg",
  "assets/icons/chevron-right.svg",
  "assets/icons/circle-check-big.svg",
  "assets/icons/circle-plus.svg",
  "assets/icons/clipboard-list.svg",
  "assets/icons/clock.svg",
  "assets/icons/close.svg",
  "assets/icons/customer-unit.svg",
  "assets/icons/customer.svg",
  "assets/icons/dashboard.svg",
  "assets/icons/database.svg",
  "assets/icons/delete.svg",
  "assets/icons/download.svg",
  "assets/icons/edit.svg",
  "assets/icons/email.svg",
  "assets/icons/error.svg",
  "assets/icons/eye-off.svg",
  "assets/icons/eye.svg",
  "assets/icons/file-text.svg",
  "assets/icons/filter.svg",
  "assets/icons/house.svg",
  "assets/icons/information.svg",
  "assets/icons/invoice-add.svg",
  "assets/icons/invoice-history.svg",
  "assets/icons/layout-dashboard.svg",
  "assets/icons/location.svg",
  "assets/icons/log-out.svg",
  "assets/icons/logout.svg",
  "assets/icons/map-pin.svg",
  "assets/icons/menu.svg",
  "assets/icons/minus.svg",
  "assets/icons/monitoring.svg",
  "assets/icons/more.svg",
  "assets/icons/navigation.svg",
  "assets/icons/notification.svg",
  "assets/icons/payment.svg",
  "assets/icons/phone.svg",
  "assets/icons/play.svg",
  "assets/icons/plus.svg",
  "assets/icons/print.svg",
  "assets/icons/refresh-cw.svg",
  "assets/icons/refresh.svg",
  "assets/icons/restore.svg",
  "assets/icons/rotate-ccw-clock.svg",
  "assets/icons/route.svg",
  "assets/icons/save.svg",
  "assets/icons/search.svg",
  "assets/icons/security.svg",
  "assets/icons/send.svg",
  "assets/icons/settings.svg",
  "assets/icons/shield-check.svg",
  "assets/icons/sort.svg",
  "assets/icons/technician.svg",
  "assets/icons/upload.svg",
  "assets/icons/user-round.svg",
  "assets/icons/user.svg",
  "assets/icons/users.svg",
  "assets/icons/wallet-cards.svg",
  "assets/icons/warning.svg",
  "assets/icons/whatsapp.svg",
  "assets/icons/wrench.svg"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(
      [...CORE_ASSETS, ...OPTIONAL_ASSETS].map(asset =>
        fetch(asset, { cache: "reload" }).then(response => {
          if(!response.ok) throw new Error(`Gagal memuat ${asset}`);
          return cache.put(asset, response);
        })
      )
    );
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if(url.hostname.includes("supabase.co")) return;
  // V82: peta live memakai tile online. Jangan simpan tile peta di cache PWA agar cache HP tidak membengkak.
  if(url.hostname.endsWith("tile.openstreetmap.org") || url.hostname === "unpkg.com") return;

  const networkFirst =
    event.request.mode === "navigate" ||
    ["/index.html", "/app.js", "/invoice-engine.js", "/style.css", "/config.js", "/service-worker.js"]
      .some(path => url.pathname.endsWith(path));

  if(networkFirst){
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(response => {
          if(response.ok){
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(event.request)) || caches.match("./"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if(response.ok){
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});

self.addEventListener("message", event => {
  if(event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
