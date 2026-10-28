import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../services/authService';
import { useToast } from '../contexts/ToastContext';

// 5 hours in milliseconds
const TIMEOUT = 1 * 60 * 60 * 1000;

export function useAutoLogout() {
  const { currentUser } = useAuth();
  const toast = useToast();
  const timerRef = useRef(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    // Only set timer if user is logged in
    if (currentUser) {
      timerRef.current = setTimeout(async () => {
        try {
          await logout();
          toast.info('You have been logged out due to inactivity.');
        } catch (error) {
          console.error('Auto-logout failed:', error);
        }
      }, TIMEOUT);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Set initial timer
    resetTimer();

    // Events to listen for
    const events = [
      'mousemove',
      'mousedown',
      'keypress',
      'DOMMouseScroll',
      'mousewheel',
      'touchmove',
      'MSPointerMove',
      'scroll' // Window scroll
    ];

    // Throttle the reset so we aren't calling setTimeout 100 times a second on mousemove
    let throttleTimer;
    const handleActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        resetTimer();
        throttleTimer = null;
      }, 500); // 500ms throttle
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (throttleTimer) clearTimeout(throttleTimer);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [currentUser]); // Re-run if auth state changes
}
