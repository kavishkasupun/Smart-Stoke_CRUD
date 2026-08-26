import { collection, doc, runTransaction, query, orderBy, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { COLLECTIONS } from '../config/collections';
import { withCreationData, generateReferenceNumber } from './dbHelpers';
import { logAudit } from './auditService';
import { checkAndCreateLowStockNotifications } from './notificationService';

/**
 * Fetch all invoices
 */
export const getInvoices = async () => {
  try {
    const q = query(
      collection(db, COLLECTIONS.INVOICES),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[InvoiceService] Error getting invoices:', error);
    throw error;
  }
};

/**
 * Fetch a single invoice by ID
 */
export const getInvoiceById = async (id) => {
  try {
    const docRef = doc(db, COLLECTIONS.INVOICES, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (error) {
    console.error(`[InvoiceService] Error getting invoice ${id}:`, error);
    throw error;
  }
};

/**
 * Create a new invoice/bill atomically
 * Validates stock, deducts stock, creates stock movements, and saves invoice.
 * @param {Object} invoiceData - Invoice header and items
 * @param {Object} userProfile - Logged in user profile
 */
export const createInvoice = async (invoiceData, userProfile) => {
  const result = await runTransaction(db, async (transaction) => {
    const { 
      mode, // 'PRICE_INCLUDED' or 'QUANTITY_ONLY'
      branch, 
      customerId, 
      customerName,
      items, 
      notes,
      subTotal = 0,
      totalDiscount = 0,
      grandTotal = 0
    } = invoiceData;

    // 1. Validate inputs
    if (!branch) throw new Error("Branch is required.");
    if (!items || items.length === 0) throw new Error("At least one item is required.");

    // 2. Prepare Variant Reads
    const variantRefs = items.map(item => doc(db, COLLECTIONS.PRODUCT_VARIANTS, item.variantId));
    const variantSnaps = await Promise.all(variantRefs.map(ref => transaction.get(ref)));

    // 3. Process Validation & Calculate New Stock
    const variantUpdates = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const snap = variantSnaps[i];

      if (!snap.exists()) {
        throw new Error(`Variant ${item.variantName} does not exist in database.`);
      }

      const variantData = snap.data();
      const currentStock = variantData.stock?.[branch] || 0;
      const currentOverall = variantData.stock?.overall || 0;

      // Validate Stock
      if (currentStock < item.quantity) {
        throw new Error(`Insufficient stock for ${variantData.name} in ${branch}. Available: ${currentStock}, Requested: ${item.quantity}.`);
      }

      // Prepare Update
      const newBranchStock = currentStock - item.quantity;
      const newOverallStock = currentOverall - item.quantity;

      variantUpdates.push({
        ref: snap.ref,
        productId: variantData.productId,
        variantId: item.variantId,
        name: variantData.name,
        beforeQuantity: currentStock,
        afterQuantity: newBranchStock,
        minStock: variantData.minimumStockLevel || 0,
        updates: {
          [`stock.${branch}`]: newBranchStock,
          'stock.overall': newOverallStock,
          updatedAt: new Date().toISOString(),
          updatedBy: userProfile.id
        }
      });
    }

    // 4. Execute Writes
    
    // 4.1 Update Variants
    variantUpdates.forEach(update => {
      transaction.update(update.ref, update.updates);
    });

    // 4.2 Create Invoice Document
    const invoiceNumber = generateReferenceNumber('INV');
    const invoiceRef = doc(collection(db, COLLECTIONS.INVOICES));
    
    const invoicePayload = withCreationData({
      invoiceNumber,
      mode,
      branch,
      customerId: customerId || null,
      customerName: customerName || 'Walk-in Customer',
      items, // Embed items directly in the invoice
      subTotal,
      totalDiscount,
      grandTotal,
      notes: notes || '',
      status: 'COMPLETED'
    }, userProfile.id);

    transaction.set(invoiceRef, invoicePayload);

    // 4.3 Create Stock Movements for each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const updateData = variantUpdates[i];
      
      const movementRef = doc(collection(db, COLLECTIONS.STOCK_MOVEMENTS));
      const movementPayload = withCreationData({
        type: 'SALE',
        referenceId: invoiceRef.id,
        referenceNumber: invoiceNumber,
        productId: updateData.productId,
        productName: updateData.name,
        variantId: item.variantId,
        variantName: item.variantName,
        branch: branch,
        quantity: -item.quantity, // Negative for deduction
        beforeQuantity: updateData.beforeQuantity,
        afterQuantity: updateData.afterQuantity,
        notes: `Sale - Invoice ${invoiceNumber}`
      }, userProfile.id);

      transaction.set(movementRef, movementPayload);
    }

    return { invoiceId: invoiceRef.id, invoiceNumber, variantUpdates };
  });
  
  await logAudit({
    userId: userProfile.id,
    userName: userProfile.name,
    action: 'CREATE_BILL',
    entityType: 'Invoice',
    entityId: result.invoiceId,
    branchId: invoiceData.branch,
    metadata: { invoiceNumber: result.invoiceNumber }
  });
  
  // Trigger low stock notifications (non-blocking)
  if (result.variantUpdates && result.variantUpdates.length > 0) {
    const notificationPayloads = result.variantUpdates.map(u => ({
      variantId: u.variantId,
      name: u.name,
      branch: invoiceData.branch,
      beforeStock: u.beforeQuantity,
      afterStock: u.afterQuantity,
      minStock: u.minStock
    }));
    checkAndCreateLowStockNotifications(notificationPayloads).catch(e => 
      console.error('[InvoiceService] Error triggering notifications:', e)
    );
  }
  
  return result.invoiceId;
};
