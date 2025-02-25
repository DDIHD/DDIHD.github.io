const CACHE_NAME = 'objekterkennung-v1';
const urlsToCache = [
  '.',
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'tf.min.js',
  'coco-ssd.min.js',
  'object.svg',
  'camera.svg',
  'model/model.json',
  'model/group1-shard1of5',
  'model/group1-shard2of5',
  'model/group1-shard3of5',
  'model/group1-shard4of5',
  'model/group1-shard5of5',
  // Add any model weight files/shards that need to be cached
];

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log('Cache opened');
      // Cache all resources in parallel
      await Promise.all(
        urlsToCache.map(url => 
          cache.add(url).catch(err => 
            console.error('Error caching', url, err)
          )
        )
      );
      // Force service worker to activate immediately
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      try {
        // Try to get from cache first
        const cachedResponse = await cache.match(event.request);
        
        // If online, fetch new version in background and update cache
        const updateCache = async () => {
          try {
            const response = await fetch(event.request);
            if (response && response.ok) {
              await cache.put(event.request, response.clone());
            }
            return response;
          } catch (error) {
            console.error('Error fetching and caching:', error);
            return null;
          }
        };

        if (navigator.onLine) {
          event.waitUntil(updateCache());
        }

        // Return cached response if available, otherwise try network
        return cachedResponse || await updateCache() || new Response('Network error', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' }
        });

      } catch (error) {
        console.error('Fetch handler error:', error);
        return new Response('Network error', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Take control of all pages immediately
      await clients.claim();
      
      // Remove old caches
      const cacheWhitelist = [CACHE_NAME];
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (!cacheWhitelist.includes(key)) {
            return caches.delete(key);
          }
        })
      );
    })()
  );
}); 