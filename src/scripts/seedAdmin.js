/**
 * This is a temporary script to seed your first SUPER_ADMIN user.
 * 
 * Instructions:
 * 1. Make sure your Firebase project is set up and Email/Password auth is enabled.
 * 2. In your browser, temporarily import and run this script from somewhere 
 *    like App.jsx or Login.jsx to create the admin account, then remove the import.
 * 
 * Example usage in Login.jsx (just for one run):
 * import { seedAdminUser } from '../scripts/seedAdmin';
 * // ... inside a useEffect or a temporary button click:
 * // seedAdminUser('your-email@example.com', 'your-secure-password');
 */

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { USER_ROLES } from '../config/constants';

export const seedAdminUser = async (email, password) => {
  try {
    console.log('Seeding admin user...');
    
    // 1. Create the user in Firebase Auth
    let user;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;
      console.log('Successfully created new user in Firebase Auth.');
    } catch (authError) {
      if (authError.code === 'auth/email-already-in-use') {
        console.log('User already exists in Auth. Logging in to seed Firestore profile...');
        // Need to import signInWithEmailAndPassword at the top
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      } else {
        throw authError; // Re-throw if it's a different error
      }
    }
    
    // 2. Create the user profile in Firestore
    const userProfile = {
      uid: user.uid,
      name: 'Super Admin',
      email: user.email,
      role: USER_ROLES.SUPER_ADMIN,
      branch: 'all',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, 'users', user.uid), userProfile);
    
    console.log('Successfully seeded SUPER_ADMIN profile in Firestore for:', user.email);
    
    return true;
  } catch (error) {
    console.error('Failed to seed admin user:', error);
    // If we get invalid-credential here, it means the account exists but the password they
    // provided to seedAdminUser is wrong.
    if (error.code === 'auth/invalid-credential') {
      alert('Seed failed: Account exists but the password you provided to the seed script is incorrect.');
    } else {
      alert(`Seed failed: ${error.message}`);
    }
    return false;
  }
};
