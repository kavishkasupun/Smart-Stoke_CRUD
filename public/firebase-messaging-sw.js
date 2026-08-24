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
      icon: '/favicon.svg'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.log('Failed to initialize Firebase in service worker (expected if config is missing).');
}
