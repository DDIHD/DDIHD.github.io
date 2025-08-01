importScripts(
    "https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js",
  );
  
  workbox.precaching.precacheAndRoute([
    { url: 'quaderspiel.html', revision: '1' }, 
    { url: 'dice.png', revision: '1' },
    { url: 'chart.js', revision: '1' }, 

  ]);
  
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst(),
  );
  
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'script',
    new workbox.strategies.CacheFirst(),
  );
  