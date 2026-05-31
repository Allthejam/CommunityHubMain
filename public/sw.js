'use strict';

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.error('Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    const title = data.title || 'New Notification';
    const options = {
      body: data.body,
      icon: data.icon || 'https://i.postimg.cc/HnhWpVyt/HubLogo192x192.png',
      badge: data.badge || 'https://i.postimg.cc/HnhWpVyt/HubLogo192x192.png',
      data: {
        url: data.url || '/',
      },
      tag: data.tag || 'default-tag'
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (e) {
    console.error('Error parsing push data:', e);
  }
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
