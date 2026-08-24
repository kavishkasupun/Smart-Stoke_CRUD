/**
 * Firebase Client Configuration
 * Pulls environment variables injected by Vite.
 *
 * This configuration is safe for the frontend. It identifies the Firebase
 * project but does not grant administrative access.
 */

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// FCM VAPID Key for web push notifications
export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Validate that the required configuration is present.
 * This helps catch missing .env files early during development.
 */
export function validateFirebaseConfig() {
  const missingKeys = [];
  
  if (!firebaseConfig.apiKey) missingKeys.push('VITE_FIREBASE_API_KEY');
  if (!firebaseConfig.projectId) missingKeys.push('VITE_FIREBASE_PROJECT_ID');
  if (!firebaseConfig.appId) missingKeys.push('VITE_FIREBASE_APP_ID');

  if (missingKeys.length > 0) {
    console.error(
      `[Firebase] Missing required configuration keys:\n${missingKeys.join('\n')}\n` +
      `Ensure you have created a .env file based on .env.example`
    );
    return false;
  }
  
  return true;
}

// Freeze config to prevent accidental modifications at runtime
Object.freeze(firebaseConfig);
