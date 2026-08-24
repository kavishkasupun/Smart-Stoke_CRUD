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

    // 2. Fetch Users to notify (Admins, Inventory Managers, Branch Managers)
    const usersSnap = await db.collection('users').get();
    const targetUsers = [];
    
    usersSnap.forEach(doc => {
      const user = { id: doc.id, ...doc.data() };
      const role = user.role;
      if (role === 'SUPER_ADMIN' || role === 'INVENTORY_MANAGER') {
        targetUsers.push(user);
      } else if (role === 'MABOLA_MANAGER' && alerts.some(a => a.branch === 'Mabola')) {
        targetUsers.push(user);
      } else if (role === 'JAFFNA_MANAGER' && alerts.some(a => a.branch === 'Jaffna')) {
        targetUsers.push(user);
      }
    });

    if (targetUsers.length === 0) return null;

    // 3. Process each alert
    for (const alert of alerts) {
      const title = alert.isOut ? 'Out of Stock Alert!' : 'Low Stock Alert!';
      const body = alert.isOut 
        ? `${fullName} is OUT OF STOCK in ${alert.branch}.`
        : `${fullName} is low in ${alert.branch}. Current stock: ${alert.currentStock}.`;

      // Construct FCM Message payload
      const notificationPayload = {
        notification: {
          title: title,
          body: body
        },
        data: {
          type: alert.isOut ? 'OUT_OF_STOCK' : 'LOW_STOCK',
          variantId: variantId,
          branch: alert.branch
        }
      };

      // Create in-app notification doc and send push
      const batch = db.batch();
      const tokens = [];

      targetUsers.forEach(user => {
        // Create in-app notification
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

        // Collect FCM tokens if they exist
        if (Array.isArray(user.fcmTokens)) {
          tokens.push(...user.fcmTokens);
        }
      });

      // Execute batch write for in-app notifications
      await batch.commit();

      // Send Push Notifications via FCM if tokens exist
      if (tokens.length > 0) {
        // Multicast message allows sending to up to 500 tokens
        const response = await messaging.sendEachForMulticast({
          tokens: tokens,
          notification: notificationPayload.notification,
          data: notificationPayload.data
        });
        console.log(`Successfully sent ${response.successCount} messages; ${response.failureCount} failed.`);
        
        // (Optional) Handle invalid tokens and remove them from user docs here
      }
    }
  } catch (error) {
    console.error('Error generating low stock notifications:', error);
  }

  return null;
});
