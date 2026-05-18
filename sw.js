self.addEventListener('install', () => {
  console.log('Service Worker installiert');
});

self.addEventListener('push', event => {

  let data = {

    title: 'MTB Werdohl',

    body: 'Neue Mitteilung',

    url: '/'

  };

  try {

    if (event.data) {
      data = event.data.json();
    }

  } catch(error) {

    console.error(error);

  }

  event.waitUntil(

    self.registration.showNotification(
      data.title,
      {

        body: data.body,

        icon: '/assets/images/icon-192.png',

        badge: '/assets/images/icon-192.png',

        vibrate: [200, 100, 200],

        requireInteraction: true,

        data: {
          url: data.url
        }

      }
    )

  );

});

self.addEventListener('notificationclick', event => {

  event.notification.close();

  event.waitUntil(

    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then(clientList => {

      for (const client of clientList) {

        if ('focus' in client) {
          return client.focus();
        }

      }

      if (clients.openWindow) {
        return clients.openWindow(
          event.notification.data.url
        );
      }

    })

  );

});