const CACHE = "lorhil-ac-online-v83";
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
  "assets/dashboard-icons/clock.svg",
  "assets/technician-icons/house.svg",
  "assets/technician-icons/clipboard-list.svg",
  "assets/technician-icons/rotate-ccw-clock.svg",
  "assets/technician-icons/user-round.svg",
  "assets/technician-icons/log-out.svg",
  "assets/technician-icons/refresh-cw.svg",
  "assets/technician-icons/calendar-days.svg",
  "assets/technician-icons/car-front.svg",
  "assets/technician-icons/wrench.svg",
  "assets/technician-icons/circle-check-big.svg",
  "assets/technician-icons/calendar-clock.svg",
  "assets/technician-icons/file-text.svg",
  "assets/technician-icons/map-pin.svg",
  "assets/technician-icons/navigation.svg",
  "assets/technician-icons/play.svg",
  "assets/technician-icons/shield-check.svg",
  "assets/technician-icons/whatsapp.svg",
  "assets/technician/teknisi.png",
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
