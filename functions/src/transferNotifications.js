const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const db = getFirestore();
const messaging = getMessaging();

/**
 * Handle transfer creation or status update
 */
exports.onTransferChanged = onDocumentUpdated('stock_transfers/{transferId}', async (event) => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  const transferId = event.params.transferId;

  // We only care if status changes
  if (beforeData.status === afterData.status) return null;

  const status = afterData.status;
  const sourceBranch = afterData.sourceBranch;
  const destBranch = afterData.destinationBranch;

  let title = '';
  let body = '';
  let targetBranch = '';

  if (status === 'COMPLETED') {
    title = 'Transfer Completed';
    body = `Transfer ${afterData.referenceId} from ${sourceBranch} was marked as COMPLETED.`;
    targetBranch = sourceBranch; // Notify source that it arrived
  } else if (status === 'CANCELLED') {
    title = 'Transfer Cancelled';
    body = `Transfer ${afterData.referenceId} to ${destBranch} was CANCELLED.`;
    targetBranch = destBranch; // Notify dest that it's cancelled (or source, but let's notify source for simplicity)
    targetBranch = sourceBranch; 
  } else if (status === 'PENDING') {
    // If it somehow goes back to pending? Unlikely.
    return null;
  }

  return await sendTransferNotification(title, body, targetBranch, transferId);
});

exports.onTransferCreated = onDocumentCreated('stock_transfers/{transferId}', async (event) => {
  const data = event.data.data();
  const transferId = event.params.transferId;

  if (data.status !== 'PENDING') return null;

  const title = 'New Incoming Transfer';
  const body = `A new transfer (${data.referenceId}) is incoming from ${data.sourceBranch}.`;
  
  // Notify the destination branch
  return await sendTransferNotification(title, body, data.destinationBranch, transferId);
});

async function sendTransferNotification(title, body, targetBranch, transferId) {
  try {
    // 1. Fetch Users to notify
    const usersSnap = await db.collection('users').get();
    const targetUsers = [];
    
    usersSnap.forEach(doc => {
      const user = { id: doc.id, ...doc.data() };
      const prefs = user.preferences;
      
      let shouldNotify = false;
      
      if (prefs && prefs.transfers !== false) {
        // If they have preferences and transfers is not explicitly false
        if (user.role === 'SUPER_ADMIN' || user.role === 'INVENTORY_MANAGER') shouldNotify = true;
        if (user.branchId === 'all') shouldNotify = true;
        if (user.branchId === targetBranch.toLowerCase()) shouldNotify = true;
      } else if (!prefs) {
        // Fallback if no preferences exist
        if (user.role === 'SUPER_ADMIN' || user.role === 'INVENTORY_MANAGER') shouldNotify = true;
        if (user.branchId === 'all' || user.branchId === targetBranch.toLowerCase()) shouldNotify = true;
      }

      if (shouldNotify && user.active !== false) {
        targetUsers.push(user);
      }
    });

    if (targetUsers.length === 0) return null;

    // 2. Fetch tokens
    const tokenPromises = targetUsers.map(async (user) => {
      const tokensSnap = await db.collection('users').doc(user.id).collection('fcm_tokens').get();
      return {
        userId: user.id,
        tokens: tokensSnap.docs.map(tDoc => tDoc.id)
      };
    });
    const userTokensArray = await Promise.all(tokenPromises);
    
    const tokens = [];
    const tokenToUserMap = {};
    userTokensArray.forEach(ut => {
      ut.tokens.forEach(t => {
        tokens.push(t);
        tokenToUserMap[t] = ut.userId;
      });
    });

    // 3. Create payload
    const notificationPayload = {
      notification: { title, body },
      data: {
        type: 'TRANSFER',
        transferId: transferId,
        branch: targetBranch
      }
    };

    // 4. Batch in-app notifications
    const batch = db.batch();
    targetUsers.forEach(user => {
      const notifRef = db.collection('notifications').doc();
      batch.set(notifRef, {
        userId: user.id,
        title: title,
        body: body,
        type: notificationPayload.data.type,
        transferId: transferId,
        branch: targetBranch,
        read: false,
        createdAt: new Date().toISOString()
      });
    });
    await batch.commit();

    // 5. Send Push
    if (tokens.length > 0) {
      const response = await messaging.sendEachForMulticast({
        tokens: tokens,
        notification: notificationPayload.notification,
        data: notificationPayload.data
      });
      
      // Clean up invalid tokens
      if (response.failureCount > 0) {
        const failedDeletes = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (errorCode === 'messaging/invalid-registration-token' || 
                errorCode === 'messaging/registration-token-not-registered') {
              const badToken = tokens[idx];
              const uid = tokenToUserMap[badToken];
              if (uid) {
                failedDeletes.push(db.collection('users').doc(uid).collection('fcm_tokens').doc(badToken).delete());
              }
            }
          }
        });
        if (failedDeletes.length > 0) {
          await Promise.all(failedDeletes);
        }
      }
    }
  } catch (error) {
    console.error('Error generating transfer notifications:', error);
  }
  return null;
}
