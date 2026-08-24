import { app } from './app';
import { auth } from './auth';
import { db } from './firestore';
import { storage } from './storage';
import { messaging } from './messaging';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Diagnostic utility to test Firebase connections.
 * This is meant for development/debugging, not production workflows.
 * 
 * @returns {Promise<object>} Status report
 */
export const testFirebaseConnection = async () => {
  const status = {
    success: false,
    services: {
      app: !!app,
      auth: !!auth,
      firestore: !!db,
      storage: !!storage,
      messaging: !!messaging,
    },
    error: null
  };

  if (!app) {
    status.error = 'Firebase app is not initialized. Check your .env configuration.';
    return status;
  }

  // Attempt a simple Firestore read to verify connection and config
  if (db) {
    try {
      // Trying to read a non-existent document is a valid test of connection
      // If rules block it, that still means we connected to Firestore
      const testRef = doc(db, '_meta', 'connection_test');
      await getDoc(testRef);
      status.success = true;
    } catch (error) {
      console.warn('[Firebase Test] Firestore read test resulted in an error (this might just be missing security rules):', error.message);
      // We still consider it a "success" if the error is permission-denied
      // because it means the connection to the project was successful.
      if (error.code === 'permission-denied') {
        status.success = true;
        status.error = 'Connected, but permission denied (expected if rules are strict).';
      } else {
        status.error = error.message;
      }
    }
  }

  return status;
};
