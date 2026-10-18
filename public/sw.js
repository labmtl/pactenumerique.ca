/**
 * Service Worker pour pactenumerique.ca
 * Gère les notifications Web Push d'atteinte de la masse critique
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'Pacte Numérique Canada',
    body: 'Masse critique atteinte pour votre cercle ! Rendez-vous sur les réseaux souverains.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: '/#masse-critique' }
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    vibrate: [200, 100, 200],
    data: data.data || { url: '/' },
    actions: [
      { action: 'open', title: 'Ouvrir le Pacte' }
    ]
  };

  const notifyPromise = self.registration.showNotification(data.title, options);

  // Diffusion aux onglets ouverts pour mise à jour immédiate de l'interface
  const broadcastPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    for (const client of windowClients) {
      client.postMessage({
        type: 'PUSH_NOTIFICATION_RECEIVED',
        title: data.title,
        body: data.body,
        data: data.data
      });
    }
  });

  event.waitUntil(Promise.all([notifyPromise, broadcastPromise]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/#souverainete-active';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ((client.url.includes('pactenumerique.ca') || client.url.includes('localhost') || client.url.includes('127.0.0.1')) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
