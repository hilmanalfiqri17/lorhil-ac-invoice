const CACHE = "lorhil-ac-online-v21";
const PATCH_SCRIPT = "stamp-layout-fix.js?v=21";

const ASSETS = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "stamp-layout-fix.js",
  "config.js",
  "manifest.webmanifest",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/logo.png",
  "assets/signature.png",
  "assets/stamp.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith("lorhil-ac-online-") && key !== CACHE)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function injectPatchScript(html) {
  if (html.includes("stamp-layout-fix.js")) return html;

  const scriptTag = `<script src="${PATCH_SCRIPT}"></script>`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${scriptTag}\n</body>`);
  }

  return `${html}\n${scriptTag}`;
}

async function patchHtmlResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");

  return new Response(injectPatchScript(html), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function networkFirst(request, patchNavigation = false) {
  try {
    const networkResponse = await fetch(request, { cache: "no-store" });
    const responseToUse = patchNavigation
      ? await patchHtmlResponse(networkResponse)
      : networkResponse;

    const copy = responseToUse.clone();
    const cache = await caches.open(CACHE);
    await cache.put(request, copy);

    return responseToUse;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return patchNavigation ? patchHtmlResponse(cached) : cached;
    }

    const fallback = await caches.match("./");
    if (fallback) {
      return patchNavigation ? patchHtmlResponse(fallback) : fallback;
    }

    throw error;
  }
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.hostname.includes("supabase.co")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, true));
    return;
  }

  const networkFirstFiles = [
    "/index.html",
    "/app.js",
    "/stamp-layout-fix.js",
    "/style.css",
    "/config.js",
    "/service-worker.js"
  ];

  if (networkFirstFiles.some(path => url.pathname.endsWith(path))) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(hit =>
      hit ||
      fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
    )
  );
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
