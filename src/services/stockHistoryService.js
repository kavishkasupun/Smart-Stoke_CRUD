import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../config/collections';

/**
 * Fetches and aggregates stock movements for a specific product and optional variant.
 * Calculates opening stock prior to the start date, and closing stock at the end date.
 * 
 * @param {string} productId - The selected Product ID
 * @param {string|null} variantId - The selected Variant ID, or null
 * @param {string} branchId - 'all', 'mabola', or 'jaffna'
 * @param {Date|null} startDate - The start date for the transaction window
 * @param {Date|null} endDate - The end date for the transaction window
 */
export const getProductStockHistory = async (productId, variantId, branchId, startDate, endDate) => {
  try {
    if (!productId) throw new Error("Product ID is required");

    // Fetch all movements for this product. 
    // Sorting and extra filtering done in-memory to avoid complex composite index requirements.
    const movementsRef = collection(db, COLLECTIONS.STOCK_MOVEMENTS);
    const q = query(movementsRef, where('productId', '==', productId));
    
    const snapshot = await getDocs(q);
    let allMovements = snapshot.docs.map(doc => {
      const data = doc.data();
      // Normalize timestamp
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      return { id: doc.id, ...data, createdAt, timestamp: createdAt.getTime() };
    });

    // 1. Filter by Variant
    if (variantId) {
      allMovements = allMovements.filter(m => m.variantId === variantId);
    }

    // 2. Filter by Branch
    if (branchId && branchId !== 'all') {
      allMovements = allMovements.filter(m => m.branch?.toLowerCase() === branchId.toLowerCase());
    }

    // Sort chronologically ascending
    allMovements.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate dates
    const start = startDate ? new Date(startDate) : new Date(0); // Epoch if no start
    if (startDate) start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    if (endDate) end.setHours(23, 59, 59, 999);

    let openingStock = 0;
    
    // Aggregate before start date to find opening stock
    const priorMovements = allMovements.filter(m => m.timestamp < start.getTime());
    priorMovements.forEach(m => {
      openingStock += Number(m.quantity || 0);
    });

    // Movements within the date range
    const rangeMovements = allMovements.filter(m => m.timestamp >= start.getTime() && m.timestamp <= end.getTime());

    // Summarize range movements
    const summary = {
      received: 0,
      sold: 0,
      transferredIn: 0,
      transferredOut: 0,
      produced: 0,
      consumed: 0,
      adjusted: 0,
      returned: 0
    };

    let runningBalance = openingStock;
    
    // Attach a running balance to each range movement
    const detailedMovements = rangeMovements.map(m => {
      const qty = Number(m.quantity || 0);
      
      const type = m.type || m.movementType;
      
      if (type === 'RECEIVE_STOCK' || type === 'STOCK_RECEIVE') summary.received += qty;
      else if (type === 'SALE' || type === 'BILLING') summary.sold += Math.abs(qty);
      else if (type === 'TRANSFER_IN') summary.transferredIn += qty;
      else if (type === 'TRANSFER_OUT') summary.transferredOut += Math.abs(qty);
      else if (type === 'PRODUCTION_FINISHED_RECEIPT') summary.produced += qty;
      else if (type === 'PRODUCTION_MATERIAL_CONSUMPTION') summary.consumed += Math.abs(qty);
      else if (type === 'ADJUSTMENT' || type === 'STOCK_ADJUSTMENT') summary.adjusted += qty;
      else if (type === 'SALE_RETURN') summary.returned += qty;
      
      const prevBal = runningBalance;
      runningBalance += qty;

      return {
        ...m,
        computedBefore: prevBal,
        computedAfter: runningBalance
      };
    });

    // --- Calculate Sales Summary for the selected date range ---
    let totalUnitsSold = 0;
    let totalSalesValue = 0;
    let totalDiscounts = 0;
    const invoiceIds = new Set();
    
    // Find unique invoices associated with these movements
    rangeMovements.forEach(m => {
      const type = m.type || m.movementType;
      if (type === 'SALE' || type === 'BILLING') {
        if (m.referenceId) invoiceIds.add(m.referenceId);
      }
    });

    // Fetch the actual invoices to get prices and discounts
    const invoicesData = await Promise.all(
      Array.from(invoiceIds).map(async (invId) => {
        const invRef = doc(db, COLLECTIONS.INVOICES, invId);
        const invSnap = await getDoc(invRef);
        return invSnap.exists() ? { id: invSnap.id, ...invSnap.data() } : null;
      })
    );

    const validInvoices = invoicesData.filter(Boolean);

    validInvoices.forEach(inv => {
      // Find the items in the invoice that match the product/variant
      (inv.items || []).forEach(item => {
        const matchesProduct = item.productId === productId;
        const matchesVariant = variantId ? item.variantId === variantId : true; // If no variantId provided to filter, count all variants

        if (matchesProduct && matchesVariant) {
          const qty = Number(item.quantity || 0);
          const price = Number(item.unitPrice || 0);
          const discount = Number(item.discount || 0);
          
          totalUnitsSold += qty;
          totalSalesValue += (qty * price) - discount;
          totalDiscounts += discount;
        }
      });
    });

    const averageSellingPrice = totalUnitsSold > 0 ? (totalSalesValue / totalUnitsSold) : 0;

    const salesSummary = {
      totalUnitsSold,
      numberOfBills: validInvoices.length,
      totalSalesValue,
      totalDiscounts,
      averageSellingPrice
    };

    return {
      openingStock,
      closingStock: runningBalance,
      summary,
      salesSummary,
      movements: detailedMovements.reverse() // Newest first for UI table
    };

  } catch (error) {
    console.error('[StockHistoryService] Error fetching history:', error);
    throw error;
  }
};
