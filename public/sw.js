'use strict';

const CACHE_NAME = 'community-hub-v2';
const OFFLINE_URL = '/offline';

const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.webmanifest',
  '/showcase',
  '/showcase/leader-value',
  '/images/about/hero.jpg',
  '/images/about/emergency.jpg',
  '/images/about/highstreet.jpg',
  '/images/about/regional.jpg',
  '/images/about/security.jpg',
  '/images/about/geofencing.jpg',
  'https://i.postimg.cc/HnhWpVyt/HubLogo192x192.png',
  'https://i.postimg.cc/ydfsPkvz/Hublogo512x512.png'
];

// Install: Pre-cache essential offline shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Add assets individually so one failure does not break the entire service worker installation
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Pre-cache item failed:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate with Offline Fallback
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Don't intercept non-GET requests or Firebase internal API endpoints
  if (
    request.method !== 'GET' ||
    request.url.includes('firestore.googleapis.com') ||
    request.url.includes('identitytoolkit.googleapis.com') ||
    request.url.includes('securetoken.googleapis.com') ||
    request.url.includes('firebaseinstallations.googleapis.com') ||
    request.url.includes('/api/') ||
    request.url.startsWith('chrome-extension://')
  ) {
    return;
  }

  // HTML Page Navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cache successful page visits for offline re-use
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Check if we have this page in cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fall back to offline showcase page
          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) {
            return offlinePage;
          }
          return new Response(
            `<!DOCTYPE html><html><head><title>Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;padding:2rem;text-align:center;background:#09090b;color:#f4f4f5"><h1>Offline Mode Active</h1><p>You are currently offline. Community Hub cached showcase is available.</p><a href="/offline" style="color:#38bdf8">Open Offline Showcase</a></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Static Assets (JS, CSS, Images, Fonts)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache (stale-while-revalidate)
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && request.url.startsWith('http')) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // If image fails, return null
          return new Response('', { status: 408, statusText: 'Request Timed Out (Offline)' });
        });
    })
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Community Hub Announcement',
        body: event.data.text(),
      };
    }
  }

  const title = data.title || 'Community Hub Notification';
  const options = {
    body: data.body || 'You have a new community announcement.',
    icon: data.icon || 'https://i.postimg.cc/HnhWpVyt/HubLogo192x192.png',
    badge: data.badge || 'https://i.postimg.cc/HnhWpVyt/HubLogo192x192.png',
    data: {
      url: data.url || '/home',
    },
    tag: data.tag || 'announcement-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  }).then((clientList) => {
    let client = null;
    for (let i = 0; i < clientList.length; i++) {
      if (clientList[i].url === urlToOpen) {
        client = clientList[i];
        break;
      }
    }

    if (client) {
      return client.focus();
    } else {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});
