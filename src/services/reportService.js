import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { COLLECTIONS } from '../config/collections';

/**
 * Helper to get a Firestore query for a specific date range based on 'createdAt'
 */
const getDateRangeQuery = (collectionName, startDate, endDate) => {
  const collRef = collection(db, collectionName);
  
  if (!startDate || !endDate) {
    return query(collRef, orderBy('createdAt', 'desc'));
  }

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return query(
    collRef,
    where('createdAt', '>=', start),
    where('createdAt', '<=', end),
    orderBy('createdAt', 'desc')
  );
};

export const getInventoryReportData = async () => {
  try {
    const q = query(collection(db, COLLECTIONS.PRODUCT_VARIANTS));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[ReportService] Error getting inventory data:', error);
    throw error;
  }
};

export const getSalesReportData = async (startDate, endDate) => {
  try {
    const invoicesQuery = getDateRangeQuery(COLLECTIONS.INVOICES, startDate, endDate);
    const returnsQuery = getDateRangeQuery(COLLECTIONS.SALES_RETURNS, startDate, endDate);

    const [invoicesSnap, returnsSnap] = await Promise.all([
      getDocs(invoicesQuery),
      getDocs(returnsQuery)
    ]);

    const invoices = invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const returns = returnsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return { invoices, returns };
  } catch (error) {
    console.error('[ReportService] Error getting sales data:', error);
    throw error;
  }
};

export const getOperationsReportData = async (startDate, endDate) => {
  try {
    const movementsQuery = getDateRangeQuery(COLLECTIONS.STOCK_MOVEMENTS, startDate, endDate);
    const transfersQuery = getDateRangeQuery(COLLECTIONS.STOCK_TRANSFERS, startDate, endDate);
    const adjustmentsQuery = getDateRangeQuery(COLLECTIONS.STOCK_ADJUSTMENTS, startDate, endDate);

    const [movementsSnap, transfersSnap, adjustmentsSnap] = await Promise.all([
      getDocs(movementsQuery),
      getDocs(transfersQuery),
      getDocs(adjustmentsQuery)
    ]);

    const movements = movementsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const transfers = transfersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const adjustments = adjustmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return { movements, transfers, adjustments };
  } catch (error) {
    console.error('[ReportService] Error getting operations data:', error);
    throw error;
  }
};

export const getDashboardAnalytics = async (startDate, endDate) => {
  try {
    const { invoices, returns } = await getSalesReportData(startDate, endDate);
    const { movements } = await getOperationsReportData(startDate, endDate);
    const inventory = await getInventoryReportData();

    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const totalDiscounts = invoices.reduce((sum, inv) => sum + (inv.totalDiscount || 0), 0);
    const totalReturns = returns.reduce((sum, ret) => sum + (ret.returnQuantity || 0) * (ret.unitPrice || 0), 0);

    const lowStockCount = inventory.filter(v => {
      const stock = v.stock?.overall || 0;
      const reorder = v.reorderLevel || 0;
      return stock <= reorder && stock > 0;
    }).length;

    const outOfStockCount = inventory.filter(v => (v.stock?.overall || 0) === 0).length;

    const salesByDate = {};
    invoices.forEach(inv => {
      const d = inv.createdAt?.seconds ? new Date(inv.createdAt.seconds * 1000) : new Date();
      const dateStr = d.toLocaleDateString('en-GB'); 
      if (!salesByDate[dateStr]) salesByDate[dateStr] = { date: dateStr, revenue: 0 };
      salesByDate[dateStr].revenue += (inv.grandTotal || 0);
    });
    const salesTrend = Object.values(salesByDate);

    let mabolaSales = 0;
    let jaffnaSales = 0;
    invoices.forEach(inv => {
      if (inv.branch?.toLowerCase() === 'mabola') mabolaSales += (inv.grandTotal || 0);
      if (inv.branch?.toLowerCase() === 'jaffna') jaffnaSales += (inv.grandTotal || 0);
    });
    const branchComparison = [
      { branch: 'Mabola', sales: mabolaSales },
      { branch: 'Jaffna', sales: jaffnaSales }
    ];

    let totalIn = 0;
    let totalOut = 0;
    movements.forEach(m => {
      if (m.type === 'SALE' || m.type === 'TRANSFER_OUT') totalOut += Math.abs(m.quantity || 0);
      else if (m.type === 'RECEIVE_STOCK' || m.type === 'SALE_RETURN' || m.type === 'TRANSFER_IN' || m.type === 'STOCK_RECEIVE') totalIn += Math.abs(m.quantity || 0);
      else if (m.type === 'ADJUSTMENT') {
         if (m.adjustmentType === 'DEDUCTION') totalOut += Math.abs(m.quantity || 0);
         else totalIn += Math.abs(m.quantity || 0);
      }
    });
    const movementChart = [
      { name: 'Incoming', value: totalIn, fill: '#10B981' }, 
      { name: 'Outgoing', value: totalOut, fill: '#EF4444' } 
    ];

    const variantSales = {};
    invoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        if (!variantSales[item.variantId]) {
          variantSales[item.variantId] = {
            id: item.variantId,
            name: `${item.productName} - ${item.variantName}`,
            quantity: 0
          };
        }
        variantSales[item.variantId].quantity += (item.quantity || 0);
      });
    });
    const topVariants = Object.values(variantSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      kpis: {
        totalRevenue,
        totalDiscounts,
        totalReturns,
        lowStockCount,
        outOfStockCount,
        totalInvoices: invoices.length,
        totalMovements: movements.length
      },
      charts: {
        salesTrend,
        branchComparison,
        movementChart,
        topVariants
      }
    };
  } catch (error) {
    console.error('[ReportService] Error generating dashboard analytics:', error);
    throw error;
  }
};
