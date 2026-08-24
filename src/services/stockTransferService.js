import { collection, doc, query, where, getDocs, orderBy, updateDoc } from 'firebase/firestore';
import { db, runTransaction } from '../firebase';
import { COLLECTIONS } from '../config/collections';
import { withCreationData, withUpdateData, generateReferenceNumber } from './dbHelpers';

/**
 * Initiate a new stock transfer (Status: PENDING)
 * No stock is actually moved at this stage.
 */
export const createTransfer = async (transferData, items, userId) => {
  try {
    if (!transferData.sourceBranch || !transferData.destinationBranch) {
      throw new Error("Source and Destination branches are required.");
    }
    if (transferData.sourceBranch === transferData.destinationBranch) {
      throw new Error("Source and Destination branches cannot be the same.");
    }
    if (!items || items.length === 0) throw new Error("At least one item is required.");

    const referenceId = generateReferenceNumber('TRN');
    const transferRef = doc(db, COLLECTIONS.STOCK_TRANSFERS, referenceId);
    
    const { setDoc } = await import('firebase/firestore');
    
    const payload = withCreationData({
      referenceId,
      sourceBranch: transferData.sourceBranch,
      destinationBranch: transferData.destinationBranch,
      notes: transferData.notes || '',
      status: 'PENDING',
      totalItems: items.length,
      items: items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: Number(item.quantity)
      }))
    }, userId);

    await setDoc(transferRef, payload);
    
    // Also create an audit log
    const auditLogRef = doc(collection(db, COLLECTIONS.AUDIT_LOGS));
    await setDoc(auditLogRef, withCreationData({
      action: 'TRANSFER_CREATED',
      entityId: referenceId,
      entityType: 'STOCK_TRANSFERS',
      details: `Created transfer request from ${transferData.sourceBranch} to ${transferData.destinationBranch}`,
    }, userId));

    return referenceId;
  } catch (error) {
    console.error('[StockTransferService] Error creating transfer:', error);
    throw error;
  }
};

/**
 * Approve and complete a transfer atomically.
 * This actually moves the stock and creates movement records.
 */
export const completeTransfer = async (referenceId, userId) => {
  try {
    const transferRef = doc(db, COLLECTIONS.STOCK_TRANSFERS, referenceId);
    
    await runTransaction(db, async (transaction) => {
      // 1. Read Transfer Doc
      const transferSnap = await transaction.get(transferRef);
      if (!transferSnap.exists()) throw new Error(`Transfer ${referenceId} not found.`);
      
      const transferData = transferSnap.data();
      if (transferData.status !== 'PENDING') {
        throw new Error(`Transfer cannot be completed because its status is ${transferData.status}.`);
      }

      const sourceKey = transferData.sourceBranch.toLowerCase();
      const destKey = transferData.destinationBranch.toLowerCase();
      const items = transferData.items;

      // 2. Read Variant Docs
      const variantRefs = items.map(item => doc(db, COLLECTIONS.PRODUCT_VARIANTS, item.variantId));
      const variantSnaps = await Promise.all(variantRefs.map(ref => transaction.get(ref)));

      const variantUpdates = [];

      // 3. Validate Stock and Prepare Updates
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const variantSnap = variantSnaps[i];

        if (!variantSnap.exists()) {
          throw new Error(`Variant ${item.variantId} does not exist anymore.`);
        }

        const variantData = variantSnap.data();
        const currentStock = variantData.stock || { mabola: 0, jaffna: 0, overall: 0 };
        
        const sourceBeforeQty = currentStock[sourceKey] || 0;
        if (sourceBeforeQty < item.quantity) {
          throw new Error(`Insufficient stock for variant ${item.variantId} in ${transferData.sourceBranch}. Available: ${sourceBeforeQty}, Requested: ${item.quantity}.`);
        }

        const destBeforeQty = currentStock[destKey] || 0;
        
        const newStock = {
          ...currentStock,
          [sourceKey]: sourceBeforeQty - item.quantity,
          [destKey]: destBeforeQty + item.quantity
          // Note: overall stock remains the same
        };

        variantUpdates.push({
          ref: variantRefs[i],
          data: { stock: newStock },
          sourceBeforeQty,
          sourceAfterQty: newStock[sourceKey],
          destBeforeQty,
          destAfterQty: newStock[destKey]
        });
      }

      // 4. Perform Writes
      
      // Update variants
      variantUpdates.forEach(update => {
        transaction.update(update.ref, update.data);
      });

      // Create Stock Movements (2 for each item: OUT and IN)
      items.forEach((item, index) => {
        const update = variantUpdates[index];
        
        // TRANSFER_OUT (Source)
        const outRef = doc(collection(db, COLLECTIONS.STOCK_MOVEMENTS));
        const outData = withCreationData({
          type: 'TRANSFER_OUT',
          referenceId: referenceId,
          productId: item.productId,
          variantId: item.variantId,
          branch: transferData.sourceBranch,
          quantity: Number(item.quantity),
          beforeQuantity: update.sourceBeforeQty,
          afterQuantity: update.sourceAfterQty
        }, userId);
        transaction.set(outRef, outData);

        // TRANSFER_IN (Destination)
        const inRef = doc(collection(db, COLLECTIONS.STOCK_MOVEMENTS));
        const inData = withCreationData({
          type: 'TRANSFER_IN',
          referenceId: referenceId,
          productId: item.productId,
          variantId: item.variantId,
          branch: transferData.destinationBranch,
          quantity: Number(item.quantity),
          beforeQuantity: update.destBeforeQty,
          afterQuantity: update.destAfterQty
        }, userId);
        transaction.set(inRef, inData);
      });

      // Update Transfer Status
      transaction.update(transferRef, withUpdateData({ status: 'COMPLETED' }, userId));

      // Create Audit Log
      const auditLogRef = doc(collection(db, COLLECTIONS.AUDIT_LOGS));
      const auditPayload = withCreationData({
        action: 'TRANSFER_COMPLETED',
        entityId: referenceId,
        entityType: 'STOCK_TRANSFERS',
        details: `Approved and completed transfer ${referenceId}`,
      }, userId);
      transaction.set(auditLogRef, auditPayload);
    });

    return true;
  } catch (error) {
    console.error('[StockTransferService] Error completing transfer:', error);
    throw error;
  }
};

/**
 * Cancel a pending transfer
 */
export const cancelTransfer = async (referenceId, userId) => {
  try {
    const transferRef = doc(db, COLLECTIONS.STOCK_TRANSFERS, referenceId);
    
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(transferRef);
      if (!snap.exists()) throw new Error('Transfer not found');
      
      const data = snap.data();
      if (data.status !== 'PENDING') throw new Error(`Cannot cancel a ${data.status} transfer.`);

      transaction.update(transferRef, withUpdateData({ status: 'CANCELLED' }, userId));

      const auditLogRef = doc(collection(db, COLLECTIONS.AUDIT_LOGS));
      transaction.set(auditLogRef, withCreationData({
        action: 'TRANSFER_CANCELLED',
        entityId: referenceId,
        entityType: 'STOCK_TRANSFERS',
        details: `Cancelled transfer ${referenceId}`,
      }, userId));
    });
    
    return true;
  } catch (error) {
    console.error('[StockTransferService] Error cancelling transfer:', error);
    throw error;
  }
};

/**
 * Fetch history of stock transfers
 */
export const getTransfersHistory = async () => {
  try {
    const ref = collection(db, COLLECTIONS.STOCK_TRANSFERS);
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[StockTransferService] Error fetching history:', error);
    throw error;
  }
};

/**
 * Fetch a specific transfer
 */
export const getTransferDetails = async (referenceId) => {
  try {
    const { getDoc } = await import('firebase/firestore');
    const docRef = doc(db, COLLECTIONS.STOCK_TRANSFERS, referenceId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error(`[StockTransferService] Error fetching details for ${referenceId}:`, error);
    throw error;
  }
};
