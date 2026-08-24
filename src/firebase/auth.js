import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { app } from './app';

/**
 * Firebase Authentication Instance
 */
export const auth = app ? getAuth(app) : null;

/**
 * Sign in with email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export const signInWithEmail = async (email, password) => {
  if (!auth) throw new Error('Auth not initialized');
  return signInWithEmailAndPassword(auth, email, password);
};

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export const signOut = async () => {
  if (!auth) throw new Error('Auth not initialized');
  return firebaseSignOut(auth);
};

/**
 * Listen to auth state changes
 * @param {function} callback - Called with the user object or null
 * @returns {function} Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
  if (!auth) {
    console.warn('[Firebase Auth] Auth not initialized. Cannot listen to state changes.');
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

/**
 * Get the currently authenticated user
 * @returns {import('firebase/auth').User|null}
 */
export const getCurrentUser = () => {
  if (!auth) return null;
  return auth.currentUser;
};
