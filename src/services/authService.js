import { signInWithEmail, signOut, getCurrentUser } from '../firebase/auth';
import { getDocument } from '../firebase/firestore';
import { logAudit } from './auditService';

/**
 * Log in a user with email and password, and fetch their profile.
 * 
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<object>} The user profile document from Firestore
 */
export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmail(email, password);
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
