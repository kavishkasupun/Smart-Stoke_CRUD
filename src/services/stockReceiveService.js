import { collection, doc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, runTransaction } from '../firebase';
import { COLLECTIONS } from '../config/collections';
import { withCreationData } from './dbHelpers';
import { logAudit } from './auditService';

/**
 * Process a stock receive atomically
 * @param {object} receiveData - { referenceId, supplier, importDate, destinationBranch, notes }
 * @param {Array} items - Array of { productId, variantId, quantity, costPrice, batchReference }
 * @param {string} userId - ID of the user performing the action
 */
export const processStockReceive = async (receiveData, items, userId) => {
  try {
    if (!receiveData.referenceId) throw new Error("Reference ID is required.");
    if (!items || items.length === 0) throw new Error("At least one item is required.");

    // Validate quantities
    const invalidItems = items.filter(item => !item.quantity || item.quantity <= 0);
    if (invalidItems.length > 0) throw new Error("All items must have a quantity greater than 0.");

    const receiveDocRef = doc(db, COLLECTIONS.STOCK_RECEIVES, receiveData.referenceId);
    
    // We will use the Firebase transaction to guarantee all updates succeed or fail together.
    await runTransaction(db, async (transaction) => {
      // 1. Check if this reference ID was already used (prevent duplicate submission)
      const receiveDocSnap = await transaction.get(receiveDocRef);
      if (receiveDocSnap.exists()) {
        throw new Error(`A stock receive with reference ${receiveData.referenceId} already exists.`);
      }

      // 2. Read all variant documents first (Firestore rule: all reads must come before writes in a transaction)
      const variantRefs = items.map(item => doc(db, COLLECTIONS.PRODUCT_VARIANTS, item.variantId));
      const variantSnaps = await Promise.all(variantRefs.map(ref => transaction.get(ref)));

      const variantUpdates = [];

      // Process each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const variantSnap = variantSnaps[i];

        if (!variantSnap.exists()) {
          throw new Error(`Variant ${item.variantId} does not exist.`);
        }

        const variantData = variantSnap.data();
        const currentStock = variantData.stock || { mabola: 0, jaffna: 0, overall: 0 };
        const branchKey = receiveData.destinationBranch.toLowerCase(); // 'mabola' or 'jaffna'
        
        if (branchKey !== 'mabola' && branchKey !== 'jaffna') {
          throw new Error(`Invalid destination branch: ${receiveData.destinationBranch}`);
        }

        const beforeQuantity = currentStock[branchKey] || 0;
        const afterQuantity = beforeQuantity + Number(item.quantity);

        const newStock = {
          ...currentStock,
          [branchKey]: afterQuantity,
          overall: (currentStock.overall || 0) + Number(item.quantity)
        };

        variantUpdates.push({
          ref: variantRefs[i],
          data: { stock: newStock },
          beforeQuantity,
          afterQuantity
        });
      }

      // 3. Perform Writes (After all reads are complete)
      
      // Update variants
      variantUpdates.forEach(update => {
        transaction.update(update.ref, update.data);
      });

      // Create Stock Movements
      items.forEach((item, index) => {
        const movementRef = doc(collection(db, COLLECTIONS.STOCK_MOVEMENTS));
        const movementData = withCreationData({
          type: 'RECEIVE',
          referenceId: receiveData.referenceId,
          productId: item.productId,
          variantId: item.variantId,
          branch: receiveData.destinationBranch,
          quantity: Number(item.quantity),
          costPrice: Number(item.costPrice || 0),
          batchReference: item.batchReference || '',
          beforeQuantity: variantUpdates[index].beforeQuantity,
          afterQuantity: variantUpdates[index].afterQuantity
        }, userId);
        transaction.set(movementRef, movementData);
      });

      // Create Stock Receive record
      const receivePayload = withCreationData({
        ...receiveData,
        totalItems: items.length,
        status: 'COMPLETED'
      }, userId);
      transaction.set(receiveDocRef, receivePayload);

    });

    // Fire-and-forget unified audit log outside of the transaction
    await logAudit({
      userId,
      action: 'RECEIVE_STOCK',
      entityType: 'StockReceive',
      entityId: receiveData.referenceId,
      branchId: receiveData.destinationBranch,
      metadata: { itemsCount: items.length }
    });

    return receiveData.referenceId;
  } catch (error) {
    console.error('[StockReceiveService] Transaction failed:', error);
    throw error;
  }
};

/**
 * Fetch history of stock receives
 */
export const getReceivesHistory = async () => {
  try {
    const receivesRef = collection(db, COLLECTIONS.STOCK_RECEIVES);
    // Order by createdAt desc
    const q = query(receivesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[StockReceiveService] Error fetching history:', error);
    throw error;
  }
};

/**
 * Fetch a specific receive and its movements
 */
export const getReceiveDetails = async (referenceId) => {
  try {
    // 1. Get the receive doc (it's the ID itself based on our logic)
    const receiveDocRef = doc(db, COLLECTIONS.STOCK_RECEIVES, referenceId);
    // Alternatively, we can use a standard get call since we know the ID.
    // However, it's safer to just fetch it via query if it wasn't the ID, but it is.
    const { getDoc } = await import('firebase/firestore');
    const receiveSnap = await getDoc(receiveDocRef);
    
    if (!receiveSnap.exists()) return null;
    const receive = { id: receiveSnap.id, ...receiveSnap.data() };

    // 2. Get the movements
    const movementsRef = collection(db, COLLECTIONS.STOCK_MOVEMENTS);
    const q = query(movementsRef, where('referenceId', '==', referenceId));
    const movSnap = await getDocs(q);
    const movements = movSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return { receive, movements };
  } catch (error) {
    console.error(`[StockReceiveService] Error fetching details for ${referenceId}:`, error);
    throw error;
  }
};
