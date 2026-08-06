const PDF_DOWNLOADS = new Map();
const PDF_WAITERS = new Map();

function resolvePdfWaiter(id,entry){
  const waiter=PDF_WAITERS.get(id);
  if(waiter){
    PDF_WAITERS.delete(id);
    waiter(entry);
  }
}

function waitForPdf(id,timeoutMs=5000){
  const existing=PDF_DOWNLOADS.get(id);
  if(existing) return Promise.resolve(existing);

  return new Promise(resolve=>{
    const timer=setTimeout(()=>{
      PDF_WAITERS.delete(id);
      resolve(null);
    },timeoutMs);

    PDF_WAITERS.set(id,entry=>{
      clearTimeout(timer);
      resolve(entry);
    });
  });
}

function safeAttachmentFilename(name){
  return String(name||"nota-lorhil-ac.pdf")
    .replace(/[\\\r\n\"]+/g,"-")
    .trim() || "nota-lorhil-ac.pdf";
}

const CACHE = "lorhil-ac-online-v37";
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
  "assets/stamp.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(
      [...CORE_ASSETS, ...OPTIONAL_ASSETS].map(asset =>
        fetch(asset, { cache: "reload" })
          .then(response => {
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

  if(url.pathname.includes("/__lorhil_download__/")){
    event.respondWith((async()=>{
      const marker="/__lorhil_download__/";
      const rest=url.pathname.slice(url.pathname.indexOf(marker)+marker.length);
      const id=decodeURIComponent(rest.split("/")[0]||"");
      const entry=await waitForPdf(id);

      if(!entry){
        return new Response("File PDF tidak tersedia.",{status:404,headers:{"Content-Type":"text/plain; charset=utf-8"}});
      }

      const filename=safeAttachmentFilename(entry.filename);
      const encoded=encodeURIComponent(filename);
      setTimeout(()=>PDF_DOWNLOADS.delete(id),120000);

      return new Response(entry.bytes,{
        status:200,
        headers:{
          "Content-Type":"application/pdf",
          "Content-Disposition":`attachment; filename="${filename}"; filename*=UTF-8''${encoded}`,
          "Content-Length":String(entry.bytes.byteLength),
          "Cache-Control":"no-store, no-cache, must-revalidate",
          "Pragma":"no-cache"
        }
      });
    })());
    return;
  }

  if(url.hostname.includes("supabase.co")) return;

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
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      }
      return response;
    }))
  );
});

self.addEventListener("message", event => {
  const data=event.data||{};

  if(data.type === "SKIP_WAITING"){
    self.skipWaiting();
    return;
  }

  if(data.type === "REGISTER_PDF_DOWNLOAD"){
    const id=String(data.id||"");
    const bytes=data.bytes;
    if(!id || !(bytes instanceof ArrayBuffer)) return;

    const entry={
      bytes,
      filename:safeAttachmentFilename(data.filename),
      createdAt:Date.now()
    };
    PDF_DOWNLOADS.set(id,entry);
    resolvePdfWaiter(id,entry);

    setTimeout(()=>PDF_DOWNLOADS.delete(id),180000);
    if(event.ports?.[0]) event.ports[0].postMessage({ok:true});
  }
});
