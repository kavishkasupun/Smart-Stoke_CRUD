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

    // Get Total Active Products (Still using getCountFromServer as it only filters by active)
    const productsQuery = query(productsRef, where('active', '==', true));
    const productsCountSnap = await getCountFromServer(productsQuery);
    const totalProducts = productsCountSnap.data().count;

    // Fetch all active variants once to calculate everything else
    // This avoids requiring composite indexes for aggregations on dynamic fields
    const variantsQuery = query(variantsRef, where('active', '==', true));
    const allVariantsSnap = await getDocs(variantsQuery);
    const activeVariants = allVariantsSnap.docs.map(doc => doc.data());

    const totalVariants = activeVariants.length;

    let mabolaStock = 0;
    let jaffnaStock = 0;
    let overallStock = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    const chartDataMap = {};

    activeVariants.forEach(v => {
      const mabola = v.stock?.mabola || 0;
      const jaffna = v.stock?.jaffna || 0;
      const overall = v.stock?.overall || 0;
      const reorderLevel = v.reorderLevel || 0;

      mabolaStock += mabola;
      jaffnaStock += jaffna;
      overallStock += overall;

      if (overall === 0) {
        outOfStockCount++;
      } else if (overall > 0 && overall <= reorderLevel) {
        lowStockCount++;
      }

      // Aggregate for chart
      if (v.name) {
        if (!chartDataMap[v.name]) {
          chartDataMap[v.name] = { name: v.name, stock: 0 };
        }
        chartDataMap[v.name].stock += overall;
      }
    });

    const chartData = Object.values(chartDataMap).sort((a, b) => b.stock - a.stock);

    return {
      totalProducts,
      totalVariants,
      mabolaStock,
      jaffnaStock,
      overallStock,
      outOfStockCount,
      lowStockCount,
      chartData
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
    // Since Firebase sometimes complains about composite indexes with active=true and stock=0 without index,
    // we can query active and filter on client to avoid index creation for now.
    const variantsQuery = query(variantsRef, where('active', '==', true));
    const snapshot = await getDocs(variantsQuery);
    
    const allVariants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return allVariants.filter(v => v.stock?.overall === 0);
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
