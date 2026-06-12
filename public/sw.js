// Nefertiti Service Worker
// Bildirim yönetimi ve autoPlay yönlendirmesi

const CACHE_NAME = 'nefertiti-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Bildirime tıklanınca
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const clickUrl = event.notification.data?.url || '/?autoPlay=true';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Açık bir pencere varsa onu kullan
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(clickUrl).then(() => client.focus());
        }
      }
      // Yoksa yeni pencere aç
      if (clients.openWindow) {
        return clients.openWindow(clickUrl);
      }
    })
  );
});

// Push bildirimi alma (ileride backend eklenecekse)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Nefertiti';
  const options = {
    body: data.body || 'Kadim mesaj seni bekliyor. Dinlemek ister misin?',
    icon: data.icon || '/154.png',
    badge: '/logo.png',
    tag: 'nefertiti-daily',
    requireInteraction: true,
    silent: false,
    data: {
      url: data.url || '/?autoPlay=true'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Sayfadan gelen mesajları dinle (bildirim gönderme komutu)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, url } = event.data;
    
    self.registration.showNotification(title || 'Nefertiti', {
      body: body || 'Kadim mesaj seni bekliyor. Dinlemek ister misin?',
      icon: '/154.png',
      badge: '/logo.png',
      tag: 'nefertiti-daily',
      requireInteraction: true,
      silent: false,
      data: {
        url: url || '/?autoPlay=true'
      }
    });
  }
});
