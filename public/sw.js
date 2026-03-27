'use strict';

self.addEventListener('push', function (event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon || 'https://i.postimg.cc/HnhWpVyt/HubLogo192x192.png',
    badge: data.badge || 'https://i.postimg.cc/HnhWpVyt/HubLogo192x192.png',
    data: {
      url: data.url || '/'
    }
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        client.focus();
        return client.navigate(urlToOpen);
      }
      return clients.openWindow(urlToOpen);
    })
  );
});
