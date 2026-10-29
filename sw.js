var CACHE_NAME = 'pranayama-v23';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './three.module.min.js',
  './docs/voice/voice_data.js',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

/* Build a 206 Partial Content response from a cached full 200 response when
   HTML5 <audio> sends a Range header (required by WebKit/Safari for media). */
function buildRangeResponse(rangeHeader, fullResponse) {
  return fullResponse.arrayBuffer().then(function(ab) {
    var total = ab.byteLength;
    var m = /^bytes=(\d+)-(\d+)?$/i.exec(rangeHeader || '');
    if (!m) {
      return new Response(ab, {
        status: 200,
        statusText: 'OK',
        headers: fullResponse.headers
      });
    }
    var start = parseInt(m[1], 10);
    var end = m[2] ? parseInt(m[2], 10) : total - 1;
    if (isNaN(start) || start >= total) start = 0;
    if (isNaN(end) || end >= total) end = total - 1;
    var sliced = ab.slice(start, end + 1);
    var headers = new Headers(fullResponse.headers);
    headers.set('Content-Range', 'bytes ' + start + '-' + end + '/' + total);
    headers.set('Content-Length', String(sliced.byteLength));
    headers.set('Accept-Ranges', 'bytes');
    return new Response(sliced, {
      status: 206,
      statusText: 'Partial Content',
      headers: headers
    });
  });
}

self.addEventListener('fetch', function(event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  /* Stale-While-Revalidate for navigation & HTML: instant load + background update */
  if (req.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(req).then(function(cachedResponse) {
          var fetchPromise = fetch(req).then(function(networkResponse) {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(req, networkResponse.clone());
            }
            return networkResponse;
          }).catch(function() {
            return cachedResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  /* Range-aware caching for background music & nature soundscape MP3 assets */
  if (url.pathname.includes('/music/') || url.pathname.endsWith('.mp3')) {
    var rangeHeader = req.headers.get('range');
    var cacheKeyUrl = url.origin + url.pathname;
    event.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(cacheKeyUrl).then(function(cached) {
          if (cached) {
            return rangeHeader ? buildRangeResponse(rangeHeader, cached) : cached;
          }
          /* Fetch full asset (without Range header) so Cache API can store status 200 */
          return fetch(cacheKeyUrl).then(function(networkResponse) {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(cacheKeyUrl, networkResponse.clone());
              if (rangeHeader) {
                return buildRangeResponse(rangeHeader, networkResponse);
              }
            }
            return networkResponse;
          }).catch(function() {
            return fetch(req);
          });
        });
      })
    );
    return;
  }

  /* Cache-First with network fallback for versioned static assets */
  event.respondWith(
    caches.match(req).then(function(cached) {
      return cached || fetch(req).then(function(networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          var clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(req, clone);
          });
        }
        return networkResponse;
      });
    })
  );
});
