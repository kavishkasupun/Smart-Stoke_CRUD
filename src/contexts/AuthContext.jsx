import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChange } from '../firebase/auth';
import { getUserProfile } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase Auth state changes
    const unsubscribe = onAuthStateChange(async (user) => {
      if (user) {
        // User is signed in, fetch their Firestore profile
        setCurrentUser(user);
        try {
          const profile = await getUserProfile(user.uid);
          if (profile && profile.active) {
            setUserProfile(profile);
          } else {
            // Profile missing or inactive
            setUserProfile(null);
            // We do not auto-logout here to avoid infinite loops if logout fails,
            // but ProtectedRoute will block access.
          }
        } catch (error) {
          console.error('[AuthContext] Failed to load user profile:', error);
          setUserProfile(null);
        }
      } else {
        // User is signed out
        setCurrentUser(null);
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
