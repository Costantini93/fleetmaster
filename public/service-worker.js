const CACHE_NAME = 'robi-fleet-v1.0.0';
const urlsToCache = [
  '/',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Installazione Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installazione...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching delle risorse');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[Service Worker] Errore durante il caching:', error);
      })
  );
  
  // Forza l'attivazione immediata
  self.skipWaiting();
});

// Attivazione Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Attivazione...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Rimozione cache obsoleta:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Prendi il controllo di tutti i client immediatamente
  return self.clients.claim();
});

// ==================== PUSH NOTIFICATIONS ====================

// Gestione notifiche push
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push ricevuto:', event);
  
  let data = {
    title: 'ROBI Fleet',
    body: 'Nuova notifica',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'notification',
    data: { url: '/' }
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.error('[Service Worker] Errore parsing push data:', e);
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    requireInteraction: data.priority === 'alta' || data.priority === 'critica',
    vibrate: data.priority === 'critica' ? [200, 100, 200] : [100],
    actions: [
      { action: 'open', title: 'Apri' },
      { action: 'close', title: 'Chiudi' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click su notifica
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Click notifica:', event);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Cerca una finestra già aperta
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        // Apri una nuova finestra
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Intercetta le richieste
self.addEventListener('fetch', (event) => {
  // Ignora richieste non-GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignora richieste API (sempre fetch dalla rete)
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Strategia: Network First, fallback su Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clona la risposta
        const responseToCache = response.clone();
        
        // Aggiorna la cache
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });
        
        return response;
      })
      .catch(() => {
        // Se la rete fallisce, prova dalla cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            
            // Se non è in cache, mostra pagina offline
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Gestione messaggi
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Gestione notifiche push (per future implementazioni)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nuova notifica ROBI Fleet',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    tag: 'robi-notification'
  };

  event.waitUntil(
    self.registration.showNotification('ROBI Fleet', options)
  );
});

// Gestione click su notifiche
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});
