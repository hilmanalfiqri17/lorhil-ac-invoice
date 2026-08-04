const CACHE = "lorhil-ac-online-v10";
const ASSETS = [
  "./","index.html","style.css","app.js","config.js","manifest.webmanifest",
  "assets/icon-192.png","assets/icon-512.png","assets/logo.png","assets/signature.png","assets/stamp.png"
];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  if(url.hostname.includes("supabase.co")) return;
  if(event.request.mode==="navigate"){
    event.respondWith(fetch(event.request).catch(()=>caches.match("./")));
    return;
  }
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(resp=>{
    const copy=resp.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return resp;
  })));
});
