const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const db = getFirestore();
const messaging = getMessaging();

/**
 * Triggered whenever a product variant is updated.
 * Checks for low stock across branches and sends notifications.
 */
exports.checkLowStock = onDocumentUpdated('product_variants/{variantId}', async (event) => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  const variantId = event.params.variantId;

  // Ensure minimums exist (default to 0 if not set)
  const minMabola = afterData.minimumStockLevel || 0;
  const minJaffna = afterData.minimumStockLevel || 0; 
  // Note: For simplicity, using a single minimumStockLevel per variant. 
  // A robust system might have per-branch minimums.

  const stockBefore = beforeData.stock || {};
  const stockAfter = afterData.stock || {};

  const alerts = [];

  // Check Mabola
  const mabolaBefore = stockBefore.mabola || 0;
  const mabolaAfter = stockAfter.mabola || 0;
  if (mabolaBefore > minMabola && mabolaAfter <= minMabola) {
    alerts.push({
      branch: 'Mabola',
      currentStock: mabolaAfter,
      isOut: mabolaAfter === 0
    });
  } else if (mabolaBefore > 0 && mabolaAfter === 0) {
    // Edge case: if min was 0, but it dropped to 0
    alerts.push({
      branch: 'Mabola',
      currentStock: 0,
      isOut: true
    });
  }

  // Check Jaffna
  const jaffnaBefore = stockBefore.jaffna || 0;
  const jaffnaAfter = stockAfter.jaffna || 0;
  if (jaffnaBefore > minJaffna && jaffnaAfter <= minJaffna) {
    alerts.push({
      branch: 'Jaffna',
      currentStock: jaffnaAfter,
      isOut: jaffnaAfter === 0
    });
  } else if (jaffnaBefore > 0 && jaffnaAfter === 0) {
    alerts.push({
      branch: 'Jaffna',
      currentStock: 0,
      isOut: true
    });
  }

  // If no alerts, exit
  if (alerts.length === 0) return null;

  try {
    // 1. Fetch Product details for better notification text
    const productSnap = await db.collection('products').doc(afterData.productId).get();
    const productName = productSnap.exists ? productSnap.data().name : 'Unknown Product';
    const variantName = afterData.size ? `${afterData.name} (${afterData.size})` : afterData.name;
    const fullName = `${productName} - ${variantName}`;

    // 2. Fetch Users to notify based on preferences
    const usersSnap = await db.collection('users').get();
    const targetUsers = [];
    
    usersSnap.forEach(doc => {
      const user = { id: doc.id, ...doc.data() };
      const prefs = user.preferences;
      
      let shouldNotify = false;
      
      if (prefs) {
        if (alerts.some(a => a.branch === 'Mabola') && prefs.mabolaLowStock) shouldNotify = true;
        if (alerts.some(a => a.branch === 'Jaffna') && prefs.jaffnaLowStock) shouldNotify = true;
      } else {
        // Fallback if no preferences exist
        const role = user.role;
        if (role === 'SUPER_ADMIN' || role === 'INVENTORY_MANAGER') {
          shouldNotify = true;
        } else if (role === 'MABOLA_MANAGER' && alerts.some(a => a.branch === 'Mabola')) {
          shouldNotify = true;
        } else if (role === 'JAFFNA_MANAGER' && alerts.some(a => a.branch === 'Jaffna')) {
          shouldNotify = true;
        }
      }

      if (shouldNotify && user.active !== false) {
        targetUsers.push(user);
      }
    });

    if (targetUsers.length === 0) return null;

    // 3. Fetch all fcm_tokens from subcollections concurrently
    const tokenPromises = targetUsers.map(async (user) => {
      const tokensSnap = await db.collection('users').doc(user.id).collection('fcm_tokens').get();
      return {
        userId: user.id,
        tokens: tokensSnap.docs.map(tDoc => tDoc.id)
      };
    });
    const userTokensArray = await Promise.all(tokenPromises);
    
    const allTokens = [];
    const tokenToUserMap = {};
    userTokensArray.forEach(ut => {
      ut.tokens.forEach(t => {
        allTokens.push(t);
        tokenToUserMap[t] = ut.userId;
      });
    });

    // 4. Process each alert
    for (const alert of alerts) {
      const title = alert.isOut ? 'Out of Stock Alert!' : 'Low Stock Alert!';
      const body = alert.isOut 
        ? `${fullName} is OUT OF STOCK in ${alert.branch}.`
        : `${fullName} is low in ${alert.branch}. Current stock: ${alert.currentStock}.`;

      // Construct FCM Message payload
      const notificationPayload = {
        notification: { title, body },
        data: {
          type: alert.isOut ? 'OUT_OF_STOCK' : 'LOW_STOCK',
          variantId: variantId,
          branch: alert.branch
        }
      };

      // Create in-app notification doc
      const batch = db.batch();
      
      targetUsers.forEach(user => {
        // Only create in-app notification if they requested this branch
        const prefs = user.preferences;
        if (prefs) {
           if (alert.branch === 'Mabola' && !prefs.mabolaLowStock) return;
           if (alert.branch === 'Jaffna' && !prefs.jaffnaLowStock) return;
        }

        const notifRef = db.collection('notifications').doc();
        batch.set(notifRef, {
          userId: user.id,
          title: title,
          body: body,
          type: notificationPayload.data.type,
          variantId: variantId,
          branch: alert.branch,
          read: false,
          createdAt: new Date().toISOString()
        });
      });

      await batch.commit();

      // Send Push Notifications via FCM if tokens exist
      // Note: We filter tokens to only those belonging to users who should get this specific alert branch
      const alertTokens = [];
      const alertTokenToUserMap = {};
      userTokensArray.forEach(ut => {
        const user = targetUsers.find(u => u.id === ut.userId);
        if (!user) return;
        const prefs = user.preferences;
        if (prefs) {
           if (alert.branch === 'Mabola' && !prefs.mabolaLowStock) return;
           if (alert.branch === 'Jaffna' && !prefs.jaffnaLowStock) return;
        }
        ut.tokens.forEach(t => {
          alertTokens.push(t);
          alertTokenToUserMap[t] = ut.userId;
        });
      });

      if (alertTokens.length > 0) {
        const response = await messaging.sendEachForMulticast({
          tokens: alertTokens,
          notification: notificationPayload.notification,
          data: notificationPayload.data
        });
        console.log(`Successfully sent ${response.successCount} messages; ${response.failureCount} failed.`);
        
        // Clean up invalid tokens
        if (response.failureCount > 0) {
          const failedDeletes = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const errorCode = resp.error?.code;
              if (errorCode === 'messaging/invalid-registration-token' || 
                  errorCode === 'messaging/registration-token-not-registered') {
                const badToken = alertTokens[idx];
                const uid = alertTokenToUserMap[badToken];
                if (uid) {
                  failedDeletes.push(db.collection('users').doc(uid).collection('fcm_tokens').doc(badToken).delete());
                }
              }
            }
          });
          if (failedDeletes.length > 0) {
            await Promise.all(failedDeletes);
            console.log(`Cleaned up ${failedDeletes.length} invalid tokens.`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error generating low stock notifications:', error);
  }

  return null;
});
