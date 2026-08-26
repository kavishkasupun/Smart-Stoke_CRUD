import { collection, doc, query, where, getDocs, updateDoc, orderBy, onSnapshot, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { COLLECTIONS } from '../config/collections';

/**
 * Save an FCM token to a user's fcm_tokens subcollection
 * @param {string} userId 
 * @param {string} token 
 */
export const registerDeviceToken = async (userId, token) => {
  if (!userId || !token) return;
  try {
    const tokenRef = doc(db, COLLECTIONS.USERS, userId, 'fcm_tokens', token);
    await setDoc(tokenRef, {
      token,
      updatedAt: new Date().toISOString(),
      deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
    });
  } catch (error) {
    console.error('[NotificationService] Error registering device token:', error);
  }
};

/**
 * Remove an FCM token from a user's fcm_tokens subcollection
 * @param {string} userId 
 * @param {string} token 
 */
export const unregisterDeviceToken = async (userId, token) => {
  if (!userId || !token) return;
  try {
    const tokenRef = doc(db, COLLECTIONS.USERS, userId, 'fcm_tokens', token);
    await deleteDoc(tokenRef);
  } catch (error) {
    console.error('[NotificationService] Error unregistering device token:', error);
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
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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

/**
 * Check stock changes and create in-app notifications directly in Firestore
 * @param {Array} variantUpdates - Array of { variantId, name, branch, beforeStock, afterStock, minStock }
 */
export const checkAndCreateLowStockNotifications = async (variantUpdates) => {
  try {
    const alerts = [];

    variantUpdates.forEach(update => {
      const { beforeStock, afterStock, minStock } = update;
      // Trigger if stock dropped and is now below/equal to minStock
      if (afterStock < beforeStock && afterStock <= minStock && afterStock > 0) {
        alerts.push({ ...update, isOut: false });
      } else if (afterStock < beforeStock && afterStock === 0) {
        alerts.push({ ...update, isOut: true });
      }
    });

    if (alerts.length === 0) return;

    // Fetch active users to determine who gets notified
    const usersSnap = await getDocs(query(collection(db, COLLECTIONS.USERS), where('active', '==', true)));
    const targetUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const batch = writeBatch(db);
    let batchCount = 0;

    for (const alert of alerts) {
      const title = alert.isOut ? 'Out of Stock Alert!' : 'Low Stock Alert!';
      const body = alert.isOut 
        ? `${alert.name} is OUT OF STOCK in ${alert.branch}.`
        : `${alert.name} is low in ${alert.branch}. Current stock: ${alert.afterStock}.`;

      targetUsers.forEach(user => {
        const prefs = user.preferences;
        const branchKey = alert.branch.toLowerCase();
        
        let shouldNotify = false;
        if (prefs) {
           if (branchKey === 'mabola' && prefs.mabolaLowStock) shouldNotify = true;
           if (branchKey === 'jaffna' && prefs.jaffnaLowStock) shouldNotify = true;
        } else {
           const role = user.role;
           if (role === 'SUPER_ADMIN' || role === 'INVENTORY_MANAGER') {
             shouldNotify = true;
           } else if (role === 'MABOLA_MANAGER' && branchKey === 'mabola') {
             shouldNotify = true;
           } else if (role === 'JAFFNA_MANAGER' && branchKey === 'jaffna') {
             shouldNotify = true;
           }
        }

        if (shouldNotify) {
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId: user.id,
            title,
            body,
            type: alert.isOut ? 'OUT_OF_STOCK' : 'LOW_STOCK',
            variantId: alert.variantId,
            branch: alert.branch,
            read: false,
            createdAt: new Date().toISOString()
          });
          batchCount++;
        }
      });
    }

    if (batchCount > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error('[NotificationService] Error creating low stock notifications:', error);
  }
};
