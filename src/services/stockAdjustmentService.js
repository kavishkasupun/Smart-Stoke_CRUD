import { collection, doc, query, orderBy, getDocs } from 'firebase/firestore';
import { db, runTransaction } from '../firebase';
import { COLLECTIONS } from '../config/collections';
import { withCreationData, generateReferenceNumber } from './dbHelpers';
import { logAudit } from './auditService';
import { checkAndCreateLowStockNotifications } from './notificationService';

/**
 * Process a stock adjustment atomically
 * @param {object} adjustmentData - { branch, productId, variantId, adjustQty, type, reason, notes }
 * @param {string} userId - ID of the user performing the action
 */
export const createAdjustment = async (adjustmentData, userId) => {
  try {
    const { branch, variantId, adjustQty, type, reason } = adjustmentData;
    
    if (!branch || !variantId || adjustQty === 0 || !type) {
      throw new Error("Missing required fields for adjustment.");
    }

    const referenceId = generateReferenceNumber('ADJ');
    const adjustmentRef = doc(db, COLLECTIONS.STOCK_ADJUSTMENTS, referenceId);
    
    const result = await runTransaction(db, async (transaction) => {
      // 1. Read Variant Doc
      const variantRef = doc(db, COLLECTIONS.PRODUCT_VARIANTS, variantId);
      const variantSnap = await transaction.get(variantRef);

      if (!variantSnap.exists()) {
        throw new Error(`Variant ${variantId} does not exist.`);
      }

      const variantData = variantSnap.data();
      const currentStock = variantData.stock || { mabola: 0, jaffna: 0, overall: 0 };
      const branchKey = branch.toLowerCase();

      if (branchKey !== 'mabola' && branchKey !== 'jaffna') {
        throw new Error(`Invalid branch: ${branch}`);
      }

      const beforeQuantity = currentStock[branchKey] || 0;
      const afterQuantity = beforeQuantity + Number(adjustQty);

      if (afterQuantity < 0) {
        throw new Error(`Adjustment would result in negative stock. Available: ${beforeQuantity}, Adjusting by: ${adjustQty}`);
      }

      const newStock = {
        ...currentStock,
        [branchKey]: afterQuantity,
        overall: (currentStock.overall || 0) + Number(adjustQty)
      };

      // 2. Perform Writes
      
      // Update variant
      transaction.update(variantRef, { stock: newStock });

      // Create Stock Movement
      const movementRef = doc(collection(db, COLLECTIONS.STOCK_MOVEMENTS));
      const movementData = withCreationData({
        type: 'ADJUSTMENT',
        referenceId: referenceId,
        productId: adjustmentData.productId,
        variantId: variantId,
        branch: branch,
        quantity: Number(adjustQty),
        beforeQuantity: beforeQuantity,
        afterQuantity: afterQuantity,
        adjustmentType: type,
        reason: reason
      }, userId);
      transaction.set(movementRef, movementData);

      // Create Stock Adjustment record
      const adjPayload = withCreationData({
        referenceId,
        branch,
        productId: adjustmentData.productId,
        variantId,
        adjustQty: Number(adjustQty),
        beforeQuantity,
        afterQuantity,
        type,
        reason,
        notes: adjustmentData.notes || '',
        status: 'COMPLETED'
      }, userId);
      transaction.set(adjustmentRef, adjPayload);

      return {
        variantId,
        name: variantData.name,
        minStock: variantData.minimumStockLevel || 0,
        beforeQuantity,
        afterQuantity
      };
    });
    
    await logAudit({
      userId,
      action: 'ADJUST_STOCK',
      entityType: 'StockAdjustment',
      entityId: referenceId,
      branchId: branch,
      metadata: { adjustQty, type, reason }
    });

    // Trigger low stock notifications (non-blocking)
    if (Number(adjustQty) < 0) {
      checkAndCreateLowStockNotifications([{
        variantId: result.variantId,
        name: result.name,
        branch,
        beforeStock: result.beforeQuantity,
        afterStock: result.afterQuantity,
        minStock: result.minStock
      }]).catch(e => console.error('[StockAdjustmentService] Error triggering notifications:', e));
    }

    return referenceId;
  } catch (error) {
    console.error('[StockAdjustmentService] Error creating adjustment:', error);
    throw error;
  }
};

/**
 * Fetch history of stock adjustments
 */
export const getAdjustmentsHistory = async () => {
  try {
    const ref = collection(db, COLLECTIONS.STOCK_ADJUSTMENTS);
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[StockAdjustmentService] Error fetching history:', error);
    throw error;
  }
};

/**
 * Fetch a specific adjustment details
 */
export const getAdjustmentDetails = async (referenceId) => {
  try {
    const { getDoc } = await import('firebase/firestore');
    const docRef = doc(db, COLLECTIONS.STOCK_ADJUSTMENTS, referenceId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error(`[StockAdjustmentService] Error fetching details for ${referenceId}:`, error);
    throw error;
  }
};
