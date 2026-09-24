import { collection, doc, runTransaction, query, orderBy, getDocs, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { COLLECTIONS } from '../config/collections';
import { uploadFile, getFileUrl } from './../firebase/storage';
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

    // 2. Prepare Stock Reads
    const stockRefs = items.map(item => 
      item.variantId 
        ? doc(db, COLLECTIONS.PRODUCT_VARIANTS, item.variantId)
        : doc(db, COLLECTIONS.PRODUCTS, item.productId)
    );
    const stockSnaps = await Promise.all(stockRefs.map(ref => transaction.get(ref)));

    // 3. Process Validation & Calculate New Stock
    const stockUpdates = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const snap = stockSnaps[i];

      if (!snap.exists()) {
        throw new Error(`Item ${item.variantName || item.productName} does not exist in database.`);
      }

      const stockData = snap.data();
      const currentStock = stockData.stock?.[branch] || 0;
      const currentOverall = stockData.stock?.overall || 0;

      // Validate Stock
      if (currentStock < item.quantity) {
        throw new Error(`Insufficient stock for ${stockData.name} in ${branch}. Available: ${currentStock}, Requested: ${item.quantity}.`);
      }

      // Prepare Update
      const newBranchStock = currentStock - item.quantity;
      const newOverallStock = currentOverall - item.quantity;

      stockUpdates.push({
        ref: snap.ref,
        productId: item.productId,
        variantId: item.variantId || null,
        name: stockData.name,
        beforeQuantity: currentStock,
        afterQuantity: newBranchStock,
        minStock: stockData.minimumStockLevel || 0,
        updates: {
          [`stock.${branch}`]: newBranchStock,
          'stock.overall': newOverallStock,
          updatedAt: new Date().toISOString(),
          updatedBy: userProfile.id
        }
      });
    }

    // 4. Execute Writes
    
    // 4.1 Update Stock
    stockUpdates.forEach(update => {
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
      const updateData = stockUpdates[i];
      
      const movementRef = doc(collection(db, COLLECTIONS.STOCK_MOVEMENTS));
      const movementPayload = withCreationData({
        type: 'SALE',
        referenceId: invoiceRef.id,
        referenceNumber: invoiceNumber,
        productId: updateData.productId,
        productName: updateData.name,
        variantId: item.variantId || null,
        variantName: item.variantName || null,
        branch: branch,
        quantity: -item.quantity, // Negative for deduction
        beforeQuantity: updateData.beforeQuantity,
        afterQuantity: updateData.afterQuantity,
        notes: `Sale - Invoice ${invoiceNumber}`
      }, userProfile.id);

      transaction.set(movementRef, movementPayload);
    }

    return { invoiceId: invoiceRef.id, invoiceNumber, stockUpdates };
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
  if (result.stockUpdates && result.stockUpdates.length > 0) {
    const notificationPayloads = result.stockUpdates.map(u => ({
      variantId: u.variantId || null,
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

/**
 * Uploads a generated PDF blob to Firebase Storage and updates the invoice record with the URL.
 * @param {string} invoiceId 
 * @param {Blob} pdfBlob 
 * @returns {Promise<string>} The download URL
 */
export const uploadInvoicePDF = async (invoiceId, pdfBlob) => {
  try {
    const path = `invoices/${invoiceId}.pdf`;
    
    // uploadFile returns an UploadTask
    const uploadTask = await uploadFile(path, pdfBlob, { contentType: 'application/pdf' });
    
    // Once uploaded, get the download URL
    const pdfUrl = await getFileUrl(path);
    
    // Update the invoice document
    const docRef = doc(db, COLLECTIONS.INVOICES, invoiceId);
    await updateDoc(docRef, { pdfUrl });
    
    return pdfUrl;
  } catch (error) {
    console.error(`[InvoiceService] Error uploading PDF for ${invoiceId}:`, error);
    throw error;
  }
};

