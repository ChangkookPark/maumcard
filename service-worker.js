const CACHE_NAME = "maumcard-v64.9-fast-start-cache";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/card.html",
  "/view.html",
  "/manifest.webmanifest?v=649",
  "/icon-192-v64.png?v=649",
  "/icon-512-v64.png?v=649",
  "/apple-touch-icon-v64.png?v=649",
  "/favicon.ico?v=649"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function isDocumentRequest(req, url){
  return req.mode === "navigate" || req.destination === "document" || /\/(index|card|view)\.html$/.test(url.pathname) || url.pathname === "/";
}

function updateCacheInBackground(req){
  fetch(req, { cache: "no-cache" }).then(resp => {
    if (!resp || !resp.ok) return;
    const clone = resp.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(req, clone)).catch(() => {});
  }).catch(() => {});
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === "/service-worker.js" || url.pathname.startsWith("/.netlify/functions/")) {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }

  if (isDocumentRequest(req, url)) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) {
          updateCacheInBackground(req);
          return cached;
        }
        return fetch(req, { cache: "no-cache" }).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone)).catch(() => {});
          return resp;
        }).catch(() => caches.match("/index.html"));
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, clone)).catch(() => {});
      return resp;
    }))
  );
});
