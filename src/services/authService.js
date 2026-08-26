import { signInWithEmail, signOut, getCurrentUser } from '../firebase/auth';
import { getDocument } from '../firebase/firestore';
import { logAudit } from './auditService';
import { requestNotificationPermission } from '../firebase/messaging';
import { unregisterDeviceToken } from './notificationService';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Log in a user with email/name and password, and fetch their profile.
 * 
 * @param {string} identifier (email or name)
 * @param {string} password 
 * @returns {Promise<object>} The user profile document from Firestore
 */
export const login = async (identifier, password) => {
  try {
    let loginEmail = identifier;

    // If identifier doesn't have an '@', assume it's a name and lookup the email
    if (!identifier.includes('@')) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('name', '==', identifier));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('User not found with this name.');
      }
      
      loginEmail = querySnapshot.docs[0].data().email;
    }

    const userCredential = await signInWithEmail(loginEmail, password);
    const user = userCredential.user;
    
    // Fetch their profile from Firestore
    const profile = await getUserProfile(user.uid);
    
    if (!profile) {
      // If they don't have a profile in our DB, we shouldn't let them in
      await signOut();
      throw new Error('User profile not found in database. Contact administrator.');
    }
    
    if (!profile.active) {
      await signOut();
      throw new Error('Your account has been deactivated.');
    }
    // Log Audit
    await logAudit({
      userId: user.uid,
      userName: profile.name,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.uid
    });
    
    return { authUser: user, profile };
  } catch (error) {
    console.error('[AuthService] Login error:', error);
    throw error;
  }
};

/**
 * Log out the current user.
 */
export const logout = async () => {
  try {
    const user = getCurrentUser();
    if (user) {
      // Unregister FCM Token
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const token = await requestNotificationPermission();
        if (token) {
          await unregisterDeviceToken(user.uid, token);
        }
      }
    }
    await signOut();
  } catch (error) {
    console.error('[AuthService] Logout error:', error);
    throw error;
  }
};

/**
 * Fetch a user's profile from Firestore
 * 
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<object|null>} The user's profile data
 */
export const getUserProfile = async (uid) => {
  try {
    const profile = await getDocument('users', uid);
    return profile;
  } catch (error) {
    console.error('[AuthService] Error fetching user profile:', error);
    return null;
  }
};
