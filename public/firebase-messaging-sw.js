/**
 * FCM Service Worker
 * 
 * Required to receive background push notifications.
 * Service workers do not have access to Vite's import.meta.env,
 * so the config must be injected or hardcoded here during build.
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// TODO: Replace with actual config values before deploying FCM
// In a real production setup, you would use a bundler (like Workbox or a custom Vite script)
// to inject these values into the service worker during the build process.
const firebaseConfig = {
  apiKey: "AIzaSyAjtVJPnstnEltj-FMnQ4Vr5QFpBKej81Q",
  authDomain: "smartstokecrud.firebaseapp.com",
  projectId: "smartstokecrud",
  storageBucket: "smartstokecrud.firebasestorage.app",
  messagingSenderId: "1000598195771",
  appId: "1:872583856275:web:f3ff39a8c783e74cbfbe9e"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Background message handler
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    // Customize notification here
    const notificationTitle = payload.notification?.title || 'Background Message';
    const notificationOptions = {
      body: payload.notification?.body || 'New update available.',
      icon: '/favicon.svg',
      data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });

  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    // Customize URL based on notification data
    let url = '/notifications';
    if (event.notification.data?.type === 'LOW_STOCK' || event.notification.data?.type === 'OUT_OF_STOCK') {
      url = '/stock-overview';
    } else if (event.notification.data?.type === 'TRANSFER') {
      url = '/stock-transfers';
    }

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        // Check if there is already a window/tab open with the target URL
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          // If so, just focus it.
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, then open the target URL in a new window/tab.
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  });
} catch (err) {
  console.log('Failed to initialize Firebase in service worker (expected if config is missing).', err);
}
