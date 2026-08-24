import { collection, query, where, getDocs, getCountFromServer, getAggregateFromServer, sum } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../config/collections';

/**
 * Fetch aggregated inventory statistics for the dashboard
 */
export const getInventoryStats = async () => {
  try {
    const productsRef = collection(db, COLLECTIONS.PRODUCTS);
    const variantsRef = collection(db, COLLECTIONS.PRODUCT_VARIANTS);

    // Get Total Active Products
    const productsQuery = query(productsRef, where('active', '==', true));
    const productsCountSnap = await getCountFromServer(productsQuery);
    const totalProducts = productsCountSnap.data().count;

    // Get Total Active Variants
    const variantsQuery = query(variantsRef, where('active', '==', true));
    const variantsCountSnap = await getCountFromServer(variantsQuery);
    const totalVariants = variantsCountSnap.data().count;

    // Get Stock Aggregations (Mabola, Jaffna, Overall)
    const stockAggregations = await getAggregateFromServer(variantsQuery, {
      totalMabola: sum('stock.mabola'),
      totalJaffna: sum('stock.jaffna'),
      totalOverall: sum('stock.overall')
    });

    const mabolaStock = stockAggregations.data().totalMabola || 0;
    const jaffnaStock = stockAggregations.data().totalJaffna || 0;
    const overallStock = stockAggregations.data().totalOverall || 0;

    // Out of stock variants count
    const outOfStockQuery = query(variantsQuery, where('stock.overall', '==', 0));
    const outOfStockCountSnap = await getCountFromServer(outOfStockQuery);
    const outOfStockCount = outOfStockCountSnap.data().count;

    // Since we cannot query stock.overall <= reorderLevel directly in Firestore,
    // we fetch active variants to calculate Low Stock Count. 
    // In future, adding 'isLowStock: boolean' to variant doc is recommended.
    const allVariantsSnap = await getDocs(variantsQuery);
    const activeVariants = allVariantsSnap.docs.map(doc => doc.data());
    const lowStockCount = activeVariants.filter(v => 
      v.stock?.overall > 0 && v.stock?.overall <= (v.reorderLevel || 0)
    ).length;

    return {
      totalProducts,
      totalVariants,
      mabolaStock,
      jaffnaStock,
      overallStock,
      outOfStockCount,
      lowStockCount
    };
  } catch (error) {
    console.error('[DashboardService] Error fetching inventory stats:', error);
    throw error;
  }
};

/**
 * Fetch variants that are currently low in stock (overall > 0 AND overall <= reorderLevel)
 */
export const getLowStockVariants = async () => {
  try {
    // Requires fetching active variants and filtering on client
    const variantsRef = collection(db, COLLECTIONS.PRODUCT_VARIANTS);
    const variantsQuery = query(variantsRef, where('active', '==', true));
    const snapshot = await getDocs(variantsQuery);
    
    const allVariants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return allVariants.filter(v => 
      v.stock?.overall > 0 && v.stock?.overall <= (v.reorderLevel || 0)
    );
  } catch (error) {
    console.error('[DashboardService] Error fetching low stock variants:', error);
    throw error;
  }
};

/**
 * Fetch variants that are currently out of stock (overall == 0)
 */
export const getOutOfStockVariants = async () => {
  try {
    const variantsRef = collection(db, COLLECTIONS.PRODUCT_VARIANTS);
    const outOfStockQuery = query(variantsRef, where('active', '==', true), where('stock.overall', '==', 0));
    const snapshot = await getDocs(outOfStockQuery);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[DashboardService] Error fetching out of stock variants:', error);
    throw error;
  }
};

/**
 * Fetch mock recent activity for dashboard placeholders
 */
export const getRecentActivity = () => {
  return [
    { id: 1, type: 'movement', desc: 'Received 500 units of Bulb 40W (Mabola)', time: '2 hours ago', icon: 'arrow-down' },
    { id: 2, type: 'transfer', desc: 'Transferred 100 units Office Desk (Mabola to Jaffna)', time: '5 hours ago', icon: 'arrow-right' },
    { id: 3, type: 'sale', desc: 'Sale: 50 units Bulb 40W', time: '1 day ago', icon: 'shopping-cart' },
    { id: 4, type: 'movement', desc: 'Adjusted stock: -2 Office Chair (Damaged)', time: '2 days ago', icon: 'alert-triangle' },
  ];
};
