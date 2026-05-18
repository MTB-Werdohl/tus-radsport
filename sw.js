self.addEventListener('install', () => {
  console.log('Service Worker installiert');
});

self.addEventListener('push', event => {

  const data = event.data
  ? event.data.json()
  : {
      title: 'Neue Mitteilung',
      body: '',
      url: '/'
    };

  event.waitUntil(

    self.registration.showNotification(
      data.title,
      {
        body: data.body,
        icon: '/assets/images/icon-192.png',
        badge: '/assets/images/icon-192.png',
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

    clients.openWindow(
      event.notification.data.url
    )

  );

});