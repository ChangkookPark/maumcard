const CACHE_NAME = "maumcard-v64-5-audited-detail-blank-fixed";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/card.html",
  "/view.html",
  "/manifest.webmanifest?v=64",
  "/icon-192-v64.png?v=64",
  "/icon-512-v64.png?v=64",
  "/apple-touch-icon-v64.png?v=64",
  "/favicon.ico?v=64"
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

function isDocumentRequest(req, url){
  return req.mode === "navigate" || req.destination === "document" || /\/(index|card|view)\.html$/.test(url.pathname) || url.pathname === "/";
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
      fetch(req, { cache: "no-store" }).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone)).catch(() => {});
        return resp;
      }).catch(() => caches.match(req).then(cached => cached || caches.match("/index.html")))
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
