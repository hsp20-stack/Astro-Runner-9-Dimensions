// sw.js - Service Worker Ultra-Rápido y Actualizable (Astro Runner 2026)
const CACHE_NAME = 'astro-runner-v2026-v19';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css?v=2026v19',
    './game.js?v=2026v19',
    './levels.js?v=2026v19',
    './audio.js?v=2026v19',
    './manifest.json',
    './icon.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((k) => {
                    if (k !== CACHE_NAME) {
                        return caches.delete(k);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Network-First para archivos de código para que las actualizaciones se apliquen al instante
self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request)
            .then((res) => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
                return res;
            })
            .catch(() => caches.match(e.request))
    );
});
