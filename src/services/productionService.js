import { collection, doc, query, orderBy, getDocs, getDoc, setDoc, where, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../config/collections';
import { withCreationData, generateReferenceNumber } from './dbHelpers';
import { logAudit } from './auditService';

/**
 * Creates a Production Order in 'DRAFT' status.
 * This explicitly does NOT deduct stock yet.
 */
export const createDraftProductionOrder = async (productionData, userId) => {
  try {
    const { branch, finishedProductId, finishedVariantId, bomId, quantityProduced, materials, notes } = productionData;

    if (!branch || (!finishedVariantId && !finishedProductId) || !quantityProduced || quantityProduced <= 0 || !materials || materials.length === 0) {
      throw new Error("Missing required fields for production.");
    }

    const referenceId = generateReferenceNumber('MFG');
    const productionRef = doc(db, COLLECTIONS.PRODUCTIONS, referenceId);
    
    // Save as draft without transaction since we are not mutating stock yet
    const productionPayload = withCreationData({
      referenceId,
      branch,
      finishedProductId,
      finishedVariantId: finishedVariantId || null,
      bomId, // Record which version of the BOM was used
      quantityProduced: Number(quantityProduced),
      materialsRequired: materials.map(m => ({
        productId: m.productId,
        variantId: m.variantId || null,
        quantityPerUnit: m.quantityPerUnit,
        totalRequired: m.totalRequired,
        availableAtCreation: m.availableAtCreation // Snapshot of stock at creation
      })),
      notes: notes || '',
      status: 'DRAFT'
    }, userId);
    
    await setDoc(productionRef, productionPayload);

    await logAudit({
      userId,
      action: 'CREATE_DRAFT_PRODUCTION',
      entityType: 'Production',
      entityId: referenceId,
      branchId: branch,
      metadata: { finishedVariantId, quantityProduced, status: 'DRAFT' }
    });

    return { id: referenceId, ...productionPayload };
  } catch (error) {
    console.error('[ProductionService] Error creating draft production:', error);
    throw error;
  }
};

/**
 * Fetches all production orders, optionally filtered by branch.
 */
export const getProductionOrders = async (branchId = 'all') => {
  try {
    const ref = collection(db, COLLECTIONS.PRODUCTIONS);
    let q = query(ref, orderBy('createdAt', 'desc'));
    
    // If we need strict Firestore filtering (requires index)
    // For now we'll fetch all and filter in memory if branchId is provided 
    // to avoid immediate index requirement overhead if they don't have it.
    
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (branchId !== 'all') {
      return docs.filter(d => d.branch === branchId);
    }
    return docs;
  } catch (error) {
    console.error('[ProductionService] Error fetching production orders:', error);
    throw error;
  }
};

/**
 * Fetches a single production order by ID.
 */
export const getProductionOrderById = async (id) => {
  try {
    const docRef = doc(db, COLLECTIONS.PRODUCTIONS, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`[ProductionService] Error fetching production order ${id}:`, error);
    throw error;
  }
};

/**
 * Cancels a DRAFT Production Order.
 */
export const cancelProductionOrder = async (orderId, userId) => {
  try {
    const orderRef = doc(db, COLLECTIONS.PRODUCTIONS, orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) {
      throw new Error("Production order not found.");
    }

    if (orderSnap.data().status !== 'DRAFT') {
      throw new Error("Only draft orders can be canceled.");
    }

    await setDoc(orderRef, {
      status: 'CANCELED',
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    }, { merge: true });

    await logAudit({
      userId,
      action: 'CANCEL_PRODUCTION',
      entityType: 'Production',
      entityId: orderId
    });

    return true;
  } catch (error) {
    console.error('[ProductionService] Error canceling production:', error);
    throw error;
  }
};

/**
 * Confirms a DRAFT Production Order.
 * Executes a transaction to deduct raw materials and add finished goods.
 */
export const confirmProductionOrder = async (orderId, userId, actualYield = null) => {
  try {
    const orderRef = doc(db, COLLECTIONS.PRODUCTIONS, orderId);
    
    await runTransaction(db, async (transaction) => {
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error("Production order not found.");
      }

      const orderData = orderSnap.data();
      if (orderData.status === 'COMPLETED') {
        throw new Error("Order is already completed. Cannot confirm again.");
      }

      const { branch, finishedProductId, finishedVariantId, quantityProduced, materialsRequired, referenceId } = orderData;
      const branchKey = branch.toLowerCase();

      // 1. Fetch finished product stock doc
      const finishedStockRef = finishedVariantId 
        ? doc(db, COLLECTIONS.PRODUCT_VARIANTS, finishedVariantId)
        : doc(db, COLLECTIONS.PRODUCTS, finishedProductId);
      const finishedSnap = await transaction.get(finishedStockRef);
      if (!finishedSnap.exists()) {
        throw new Error(`Finished stock document not found.`);
      }
      const finishedData = finishedSnap.data();

      // 2. Fetch all raw material stock docs
      const materialRefs = materialsRequired.map(m => 
        m.variantId
          ? doc(db, COLLECTIONS.PRODUCT_VARIANTS, m.variantId)
          : doc(db, COLLECTIONS.PRODUCTS, m.productId)
      );
      const materialSnaps = await Promise.all(materialRefs.map(ref => transaction.get(ref)));

      const updates = [];
      const movements = [];
      const consumedLog = [];

      // 3. Validate and calculate raw material deductions
      const finalYield = actualYield !== null && actualYield !== undefined ? Number(actualYield) : quantityProduced;

      for (let i = 0; i < materialsRequired.length; i++) {
        const req = materialsRequired[i];
        const snap = materialSnaps[i];
        
        if (!snap.exists()) {
          throw new Error(`Required material stock doc not found.`);
        }
        
        const matData = snap.data();
        const deductQty = req.totalRequired;
        const currentStock = matData.stock || { mabola: 0, jaffna: 0, overall: 0 };
        const beforeQty = currentStock[branchKey] || 0;
        const afterQty = beforeQty - deductQty;

        if (afterQty < 0) {
          throw new Error(`Insufficient stock for material ${matData.sku}. Needed: ${deductQty}, Available: ${beforeQty}`);
        }

        updates.push({
          ref: materialRefs[i],
          stock: {
            ...currentStock,
            [branchKey]: afterQty,
            overall: (currentStock.overall || 0) - deductQty
          }
        });

        const validConsumptionQty = Math.min(req.quantityPerUnit * finalYield, deductQty);
        const wastageQty = deductQty - validConsumptionQty;

        if (validConsumptionQty > 0) {
          movements.push({
            type: 'PRODUCTION_MATERIAL_CONSUMPTION',
            referenceId,
            productId: req.productId || matData.productId,
            variantId: req.variantId || null,
            branch,
            quantity: validConsumptionQty,
            beforeQuantity: beforeQty,
            afterQuantity: beforeQty - validConsumptionQty,
            reason: 'Production Consumption'
          });
        }

        if (wastageQty > 0) {
          movements.push({
            type: 'PRODUCTION_MATERIAL_DAMAGE',
            referenceId,
            productId: req.productId || matData.productId,
            variantId: req.variantId || null,
            branch,
            quantity: wastageQty,
            beforeQuantity: beforeQty - validConsumptionQty,
            afterQuantity: afterQty,
            reason: 'Production Material Damage'
          });
        }

        consumedLog.push({
          productId: req.productId || matData.productId,
          variantId: req.variantId || null,
          quantityConsumed: deductQty,
          quantityValid: validConsumptionQty,
          quantityDamaged: wastageQty,
          beforeQuantity: beforeQty,
          afterQuantity: afterQty
        });
      }

      // 4. Calculate finished product addition
      const currentFinishedStock = finishedData.stock || { mabola: 0, jaffna: 0, overall: 0 };
      const finishedBeforeQty = currentFinishedStock[branchKey] || 0;
      const finishedAfterQty = finishedBeforeQty + finalYield;

      updates.push({
        ref: finishedStockRef,
        stock: {
          ...currentFinishedStock,
          [branchKey]: finishedAfterQty,
          overall: (currentFinishedStock.overall || 0) + finalYield
        }
      });

      movements.push({
        type: 'PRODUCTION_FINISHED_RECEIPT',
        referenceId,
        productId: finishedProductId,
        variantId: finishedVariantId || null,
        branch,
        quantity: finalYield,
        beforeQuantity: finishedBeforeQty,
        afterQuantity: finishedAfterQty,
        reason: 'Production Finished Goods'
      });

      // 5. Perform Writes
      // Write variant updates
      updates.forEach(u => transaction.update(u.ref, { stock: u.stock }));

      // Write movements
      movements.forEach(m => {
        const mRef = doc(collection(db, COLLECTIONS.STOCK_MOVEMENTS));
        transaction.set(mRef, withCreationData(m, userId));
      });

      // Update production order to COMPLETED
      transaction.update(orderRef, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        completedBy: userId,
        actualQuantityProduced: finalYield,
        damagedQuantity: quantityProduced - finalYield,
        consumptionLog: consumedLog
      });
    });

    await logAudit({
      userId,
      action: 'CONFIRM_PRODUCTION',
      entityType: 'Production',
      entityId: orderId
    });

    return true;
  } catch (error) {
    console.error('[ProductionService] Error confirming production:', error);
    throw error;
  }
};
