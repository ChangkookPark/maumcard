const CACHE_NAME = "maumcard-v64-14-final";
const STATIC_ASSETS = [
  "/manifest.webmanifest?v=6414",
  "/icon-192.png?v=6414",
  "/icon-512.png?v=6414",
  "/apple-touch-icon.png?v=6414",
  "/favicon.ico?v=6414",
  "/kakao-share.png?v=6414"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {})));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate" || req.destination === "document" || /\/(index|card|view)\.html$/.test(url.pathname) || url.pathname === "/") {
    event.respondWith(fetch(req, { cache: "no-store" }).catch(() => caches.match("/index.html")));
    return;
  }

  if (url.pathname === "/service-worker.js" || url.pathname === "/manifest.webmanifest" || url.pathname.startsWith("/.netlify/functions/")) {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }

  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(resp => {
    if(resp && resp.ok){ const clone = resp.clone(); caches.open(CACHE_NAME).then(cache => cache.put(req, clone)).catch(()=>{}); }
    return resp;
  })));
});
