import { collection, doc, query, where, getDocs, updateDoc, orderBy, onSnapshot, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { COLLECTIONS } from '../config/collections';

/**
 * Save an FCM token to a user's document
 * @param {string} userId 
 * @param {string} token 
 */
export const saveUserFCMToken = async (userId, token) => {
  if (!userId || !token) return;
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token)
    });
  } catch (error) {
    console.error('[NotificationService] Error saving FCM token:', error);
  }
};

/**
 * Listen to notifications for a specific user
 * @param {string} userId 
 * @param {function} callback - Called with array of notifications
 * @returns {function} Unsubscribe function
 */
export const listenToNotifications = (userId, callback) => {
  if (!userId) return () => {};
  
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(notifications);
  }, (error) => {
    console.error('[NotificationService] Error listening to notifications:', error);
  });
};

/**
 * Mark a specific notification as read
 * @param {string} notificationId 
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const ref = doc(db, 'notifications', notificationId);
    await updateDoc(ref, { read: true });
  } catch (error) {
    console.error('[NotificationService] Error marking notification as read:', error);
  }
};

/**
 * Mark all unread notifications as read for a user
 * @param {string} userId 
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    
    // In production with high volume, consider batch updates or a Cloud Function
    const promises = snap.docs.map(document => updateDoc(document.ref, { read: true }));
    await Promise.all(promises);
  } catch (error) {
    console.error('[NotificationService] Error marking all as read:', error);
  }
};
