const CACHE_NAME = "homepro-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/dashboard.html",
  "/assets/css/dashboard.css",
  "/assets/css/dashboard-dark.css",
  "/assets/js/dashboard.js",
  "/assets/js/api.js",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png"
];

// Install SW and cache files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate SW and clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Fetch cached files first
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
