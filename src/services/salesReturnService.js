import { collection, doc, runTransaction, query, orderBy, getDocs, getDoc, where } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { COLLECTIONS } from '../config/collections';
import { withCreationData, generateReferenceNumber } from './dbHelpers';
import { logAudit } from './auditService';

/**
 * Fetch all sales returns
 */
export const getSalesReturns = async () => {
  try {
    const q = query(
      collection(db, COLLECTIONS.SALES_RETURNS),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[SalesReturnService] Error getting sales returns:', error);
    throw error;
  }
};

/**
 * Fetch a single sales return by ID
 */
export const getSalesReturnById = async (id) => {
  try {
    const docRef = doc(db, COLLECTIONS.SALES_RETURNS, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (error) {
    console.error(`[SalesReturnService] Error getting return ${id}:`, error);
    throw error;
  }
};

/**
 * Process a sales return atomically
 * Validates return quantity against sold - previously returned quantity.
 * Restocks variant, creates return record, updates invoice, creates stock movement & audit log.
 */
export const processSalesReturn = async (invoiceId, returnData, userProfile) => {
  const result = await runTransaction(db, async (transaction) => {
    const { 
      itemIndex, // Index of the item in the invoice.items array
      returnQuantity, 
      reason, 
      notes 
    } = returnData;

    if (returnQuantity <= 0) {
      throw new Error("Return quantity must be greater than zero.");
    }

    // 1. Read Invoice Document
    const invoiceRef = doc(db, COLLECTIONS.INVOICES, invoiceId);
    const invoiceSnap = await transaction.get(invoiceRef);
    
    if (!invoiceSnap.exists()) {
      throw new Error("Invoice not found.");
    }

    const invoiceData = invoiceSnap.data();
    const item = invoiceData.items[itemIndex];

    if (!item) {
      throw new Error("Invoice item not found.");
    }

    // 2. Validate quantities
    const soldQty = item.quantity;
    const previouslyReturnedQty = item.returnedQuantity || 0;
    const maxReturnable = soldQty - previouslyReturnedQty;

    if (returnQuantity > maxReturnable) {
      throw new Error(`Cannot return ${returnQuantity}. Only ${maxReturnable} left to return.`);
    }

    // 3. Read Variant Document
    const variantRef = doc(db, COLLECTIONS.PRODUCT_VARIANTS, item.variantId);
    const variantSnap = await transaction.get(variantRef);

    if (!variantSnap.exists()) {
      throw new Error(`Variant ${item.variantName} no longer exists in database.`);
    }

    const variantData = variantSnap.data();
    const branch = invoiceData.branch;
    const currentStock = variantData.stock?.[branch] || 0;
    const currentOverall = variantData.stock?.overall || 0;

    // 4. Calculate new values
    const newReturnedQty = previouslyReturnedQty + returnQuantity;
    const newBranchStock = currentStock + returnQuantity; // Restocking
    const newOverallStock = currentOverall + returnQuantity; // Restocking

    // 5. Writes
    
    // 5.1 Update Variant Stock
    transaction.update(variantRef, {
      [`stock.${branch}`]: newBranchStock,
      'stock.overall': newOverallStock,
      updatedAt: new Date().toISOString(),
      updatedBy: userProfile.id
    });

    // 5.2 Update Invoice Item
    const updatedItems = [...invoiceData.items];
    updatedItems[itemIndex] = {
      ...item,
      returnedQuantity: newReturnedQty
    };
    transaction.update(invoiceRef, {
      items: updatedItems,
      updatedAt: new Date().toISOString(),
      updatedBy: userProfile.id
    });

    // 5.3 Create Return Record
    const returnNumber = generateReferenceNumber('SRT');
    const returnRef = doc(collection(db, COLLECTIONS.SALES_RETURNS));
    
    const returnPayload = withCreationData({
      returnNumber,
      invoiceId,
      invoiceNumber: invoiceData.invoiceNumber,
      branch: invoiceData.branch,
      customerId: invoiceData.customerId,
      customerName: invoiceData.customerName,
      productName: item.productName,
      variantName: item.variantName,
      variantId: item.variantId,
      returnQuantity,
      unitPrice: item.unitPrice || 0,
      reason,
      notes: notes || '',
      status: 'COMPLETED'
    }, userProfile.id);

    transaction.set(returnRef, returnPayload);

    // 5.4 Create Stock Movement
    const movementRef = doc(collection(db, COLLECTIONS.STOCK_MOVEMENTS));
    const movementPayload = withCreationData({
      type: 'SALE_RETURN',
      referenceId: returnRef.id,
      referenceNumber: returnNumber,
      productId: variantData.productId,
      productName: variantData.name,
      variantId: item.variantId,
      variantName: item.variantName,
      branch: invoiceData.branch,
      quantity: returnQuantity, // Positive for restocking
      beforeQuantity: currentStock,
      afterQuantity: newBranchStock,
      notes: `Return for Invoice ${invoiceData.invoiceNumber} - ${reason}`
    }, userProfile.id);

    transaction.set(movementRef, movementPayload);

    return { returnId: returnRef.id, invoiceNumber: invoiceData.invoiceNumber };
  });
  
  await logAudit({
    userId: userProfile.id,
    userName: userProfile.name,
    action: 'SALE_RETURN',
    entityType: 'SalesReturn',
    entityId: result.returnId,
    metadata: { invoiceId, invoiceNumber: result.invoiceNumber }
  });
  
  return result.returnId;
};
