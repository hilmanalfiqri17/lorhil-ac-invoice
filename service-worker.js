const CACHE='ac-service-management-demo-v2-pdf';
const ASSETS=['./','index.html','style.css','demo.js','manifest.webmanifest','assets/logo.png','assets/icon-192.png','assets/icon-512.png','assets/technician/teknisi.png','assets/icons/calendar.png','assets/icons/clock.png','assets/icons/worker.png','assets/icons/check.png','assets/icons/location.png','assets/icons/whatsapp.png','assets/icons/aircon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./'))))});
