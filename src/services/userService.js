import { collection, doc, setDoc, getDoc, getDocs, updateDoc, query, orderBy } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { db } from '../firebase';
import { firebaseConfig } from '../firebase/config';
import { COLLECTIONS } from '../config/collections';
import { logAudit } from './auditService';

// Initialize a secondary Firebase app strictly for creating users
// This prevents the current Admin user from being logged out when a new user is created.
const secondaryApp = initializeApp(firebaseConfig, 'SecondaryUserCreationApp');
const secondaryAuth = getAuth(secondaryApp);

/**
 * Fetch all users
 */
export const getUsers = async () => {
  try {
    const usersRef = collection(db, COLLECTIONS.USERS);
    // Note: If you have a large number of users, you might want to paginate this.
    // For now, we fetch all.
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('[UserService] Error fetching users:', error);
    throw error;
  }
};

/**
 * Fetch a single user by ID
 */
export const getUserById = async (userId) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (error) {
    console.error('[UserService] Error fetching user:', error);
    throw error;
  }
};

/**
 * Create a new user (Authentication + Profile Document)
 * 
 * @param {object} userData 
 * @param {object} adminProfile - Profile of the admin making the request
 */
export const createUser = async (userData, adminProfile) => {
  try {
    // 1. Create the user in Firebase Auth using the secondary app
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth, 
      userData.email, 
      userData.password
    );
    
    const newUserId = userCredential.user.uid;
    
    // Sign out the secondary app immediately so we don't hold a dangling session
    await signOut(secondaryAuth);

    // 2. Create the user profile in Firestore
    const userProfileData = {
      email: userData.email,
      name: userData.name,
      role: userData.role,
      branchId: userData.branchId || null,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const userRef = doc(db, COLLECTIONS.USERS, newUserId);
    await setDoc(userRef, userProfileData);

    // 3. Log Audit
    await logAudit({
      userId: adminProfile.id,
      userName: adminProfile.name,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: newUserId,
      branchId: userData.branchId || null,
      afterData: userProfileData,
    });

    return { id: newUserId, ...userProfileData };
  } catch (error) {
    console.error('[UserService] Error creating user:', error);
    throw error;
  }
};

/**
 * Update user details (Role, Branch, Name)
 */
export const updateUser = async (userId, updates, adminProfile) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    
    // Get before data for audit
    const beforeSnap = await getDoc(userRef);
    const beforeData = beforeSnap.exists() ? beforeSnap.data() : null;

    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(userRef, updateData);

    // Get after data for audit
    const afterSnap = await getDoc(userRef);
    const afterData = afterSnap.exists() ? afterSnap.data() : null;

    // Log Audit
    let action = 'UPDATE_USER';
    if (updates.role && beforeData?.role !== updates.role) action = 'CHANGE_USER_ROLE';
    if (updates.active !== undefined && beforeData?.active !== updates.active) {
      action = updates.active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER';
    }

    await logAudit({
      userId: adminProfile.id,
      userName: adminProfile.name,
      action,
      entityType: 'User',
      entityId: userId,
      beforeData,
      afterData,
    });

    return { id: userId, ...afterData };
  } catch (error) {
    console.error('[UserService] Error updating user:', error);
    throw error;
  }
};

/**
 * Send password reset email
 */
export const resetUserPassword = async (email, adminProfile) => {
  try {
    // Send password reset email using the primary auth instance
    const auth = getAuth();
    await sendPasswordResetEmail(auth, email);
    
    // Log Audit
    await logAudit({
      userId: adminProfile.id,
      userName: adminProfile.name,
      action: 'RESET_USER_PASSWORD',
      entityType: 'User',
      entityId: email, // Using email as entityId for traceability here
    });
    
    return true;
  } catch (error) {
    console.error('[UserService] Error resetting password:', error);
    throw error;
  }
};
