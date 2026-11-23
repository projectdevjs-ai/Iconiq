/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));
registerRoute(({ url }) => url.origin.includes('fonts.g'), new StaleWhileRevalidate({ cacheName: 'fonts' }));
registerRoute(({ url }) => url.pathname.startsWith('/cards/'), new CacheFirst({ cacheName: 'cards', plugins: [new ExpirationPlugin({ maxEntries: 600 })] }));

// Notifications push
self.addEventListener('push', (e) => {
  const d = e.data?.json() ?? { title: 'ICONIQ', body: '' };
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body, icon: '/icons/icon-192.png', badge: '/icons/badge.png', data: { url: d.url ?? '/' },
    tag: d.tag, vibrate: [60, 40, 120],
  } as NotificationOptions));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data?.url as string) ?? '/';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const c = all[0] as WindowClient | undefined;
    if (c) { await c.focus(); c.navigate(url); } else await self.clients.openWindow(url);
  })());
});
