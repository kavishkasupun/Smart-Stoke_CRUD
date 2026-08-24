import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig, validateFirebaseConfig } from './config';

/**
 * Firebase App Initialization
 * Singleton pattern ensures we only initialize the app once.
 */

let app;

try {
  // Check if config is valid before initializing
  if (validateFirebaseConfig()) {
    // Initialize exactly once
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    console.log('[Firebase] App initialized successfully.');
  } else {
    console.warn('[Firebase] App initialization skipped due to missing config.');
  }
} catch (error) {
  console.error('[Firebase] Failed to initialize app:', error);
}

export { app };
