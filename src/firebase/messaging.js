import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './app';
import { vapidKey } from './config';

/**
 * Firebase Cloud Messaging (FCM) Instance
 * Note: FCM might not be supported in all browsers or non-HTTPS local environments.
 */

export const messaging = (function initMessaging() {
  if (!app) return null;
  
  try {
    // Basic check for browser support (requires service worker support)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      return getMessaging(app);
    }
  } catch (error) {
    console.warn('[Firebase Messaging] FCM not supported in this environment.', error);
  }
  return null;
})();

/**
 * Request notification permission and get the FCM token
 * @returns {Promise<string|null>} The FCM token, or null if denied/failed
 */
export const requestNotificationPermission = async () => {
  if (!messaging) {
    console.warn('[Firebase Messaging] Messaging not initialized.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey });
      console.log('[Firebase Messaging] FCM Token received.');
      // In a real app, you would send this token to your backend/Firestore
      return token;
    } else {
      console.warn('[Firebase Messaging] Notification permission denied.');
      return null;
    }
  } catch (error) {
    console.error('[Firebase Messaging] Error requesting notification permission:', error);
    return null;
  }
};

/**
 * Listen for foreground messages
 * @param {function} callback - Called when a message is received
 * @returns {function} Unsubscribe function
 */
export const onMessageListener = (callback) => {
  if (!messaging) return () => {};
  
  return onMessage(messaging, (payload) => {
    console.log('[Firebase Messaging] Foreground message received:', payload);
    callback(payload);
  });
};
