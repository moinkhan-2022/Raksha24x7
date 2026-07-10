const VERSION = 'v12b-2026-07-09';
const CACHE_PREFIX = 'raksha24x7';
const SHELL_CACHE = `${CACHE_PREFIX}-shell-${VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}-static-${VERSION}`;
const IMAGE_CACHE = `${CACHE_PREFIX}-images-${VERSION}`;
const OFFLINE_URL = '/offline.html';

const APP_SHELL = [
  '/',
  OFFLINE_URL,
  '/manifest.webmanifest'
];

const STATIC_ASSETS = [
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/raksha-icon.svg'
];

const isSameOrigin = (requestUrl) => requestUrl.origin === self.location.origin;
const isApiRequest = (url) => url.pathname.startsWith('/api');
const isImageRequest = (request) => request.destination === 'image';
const isStaticRequest = (request) => ['style', 'script', 'font', 'worker', 'manifest'].includes(request.destination);

async function addAllSafe(cacheName, assets) {
  const cache = await caches.open(cacheName);
  await Promise.allSettled(assets.map((asset) => cache.add(asset)));
}

async function cacheFirst(request, cacheName, fallbackUrl) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response?.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone()).catch(() => undefined);
    }
    return response;
  } catch {
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw new Error('Offline and no cached response available.');
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response?.ok) cache.put(request, response.clone()).catch(() => undefined);
      return response;
    })
    .catch(() => undefined);

  return cached || networkPromise || caches.match(OFFLINE_URL);
}

async function networkOnlyApi(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(JSON.stringify({
      success: false,
      offline: true,
      message: 'Internet connection required.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(Promise.all([
    addAllSafe(SHELL_CACHE, APP_SHELL),
    addAllSafe(STATIC_CACHE, STATIC_ASSETS)
  ]));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(`${CACHE_PREFIX}-`) && ![SHELL_CACHE, STATIC_CACHE, IMAGE_CACHE].includes(key))
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((client) => client.postMessage({ type: 'RAKSHA_SW_ACTIVATED', version: VERSION })))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'RAKSHA_SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'RAKSHA_REFRESH_CACHES') {
    event.waitUntil(Promise.all([
      addAllSafe(SHELL_CACHE, APP_SHELL),
      addAllSafe(STATIC_CACHE, STATIC_ASSETS)
    ]));
  }
  if (event.data?.type === 'RAKSHA_SHOW_LOCAL_NOTIFICATION') {
    const payload = event.data.payload || {};
    event.waitUntil(self.registration.showNotification(payload.title || 'Raksha24x7', {
      body: payload.message || payload.body || '',
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-96x96.png',
      tag: payload.tag || payload.id || `local-${Date.now()}`,
      requireInteraction: Boolean(payload.requireInteraction || payload.priority === 'critical'),
      actions: (payload.actions || [{ action: 'open-app', title: 'Open App' }, { action: 'dismiss', title: 'Dismiss' }]).slice(0, 2),
      data: { actionPath: payload.actionPath || '/dashboard', priority: payload.priority || 'normal', notificationId: payload.id }
    }));
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'raksha-background-refresh') {
    event.waitUntil(Promise.allSettled([
      addAllSafe(SHELL_CACHE, APP_SHELL),
      addAllSafe(STATIC_CACHE, STATIC_ASSETS)
    ]));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const actionPath = event.notification?.data?.actionPath || '/dashboard';
  let targetPath = actionPath;

  if (event.action === 'open-sos') targetPath = '/dashboard?sos=true';
  if (event.action === 'call-emergency') targetPath = '/emergency-numbers';
  if (event.action === 'open-nearby') targetPath = '/nearby-services';
  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((client) => 'focus' in client);
        if (existing) {
          existing.navigate(targetPath);
          return existing.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow(targetPath);
        return undefined;
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => clients.forEach((client) => client.postMessage({
        type: 'RAKSHA_NOTIFICATION_CLOSED',
        notificationId: event.notification?.data?.notificationId || event.notification?.tag
      })))
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Raksha24x7', message: event.data?.text?.() || 'New safety notification.' };
  }

  const title = payload.notification?.title || payload.title || payload.data?.title || 'Raksha24x7';
  const body = payload.notification?.body || payload.message || payload.data?.message || 'New safety notification.';
  const actionPath = payload.data?.actionPath || payload.actionPath || '/dashboard';
  const priority = payload.data?.priority || payload.priority || 'normal';
  const actions = payload.actions || [
    { action: 'open-app', title: 'Open App' },
    { action: 'dismiss', title: 'Dismiss' }
  ];

  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: payload.data?.notificationId || payload.notificationId || `raksha-${Date.now()}`,
    requireInteraction: priority === 'critical',
    actions: actions.slice(0, 2),
    data: { actionPath, priority }
  }));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;

  if (isApiRequest(url)) {
    event.respondWith(networkOnlyApi(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(cacheFirst('/', SHELL_CACHE, OFFLINE_URL));
    return;
  }

  if (isImageRequest(request)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  if (isStaticRequest(request) || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});
