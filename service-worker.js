const CACHE = "lorhil-ac-online-v27";
const ASSETS = [
  "./","index.html","style.css","app.js","config.js","manifest.webmanifest",
  "assets/icon-192.png","assets/icon-512.png","assets/logo.png","assets/signature.png","assets/stamp.png"
];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  if(url.hostname.includes("supabase.co")) return;

  // Selalu cek versi terbaru untuk file aplikasi agar perubahan GitHub tidak tertahan cache lama.
  const networkFirstFiles=["/","/index.html","/app.js","/style.css","/config.js","/service-worker.js"];
  const useNetworkFirst=event.request.mode==="navigate" || networkFirstFiles.some(path=>url.pathname.endsWith(path));

  if(useNetworkFirst){
    event.respondWith(
      fetch(event.request,{cache:"no-store"}).then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match("./")))
    );
    return;
  }

  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
  })));
});


self.addEventListener("message",event=>{
  if(event.data?.type==="SKIP_WAITING") self.skipWaiting();
});
