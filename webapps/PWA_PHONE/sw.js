const CACHE_NAME = 'agegender-pwa-mobile-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './tf.min.js',
  './ml.js',
  './dataset_samples.png',
  './icon-512.png',
  './images/',
  './images/1.png',
  './images/2.png',
  './images/3.png',
  './images/4.png',
  './models/age_gender_model-weights_manifest.json',
  './models/age_gender_model-shard1',
  './models/ssd_mobilenetv1_model-weights_manifest.json',
  './models/ssd_mobilenetv1_model-shard1',
  './models/ssd_mobilenetv1_model-shard2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
