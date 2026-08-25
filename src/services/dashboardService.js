import { collection, query, where, getDocs, getCountFromServer, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../config/collections';

// Cache for variants
let cachedVariants = null;
let lastVariantsFetchTime = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export const fetchAllActiveVariants = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && cachedVariants && lastVariantsFetchTime && (now - lastVariantsFetchTime < CACHE_DURATION_MS)) {
    return cachedVariants;
  }
  
  const variantsRef = collection(db, COLLECTIONS.PRODUCT_VARIANTS);
  const variantsQuery = query(variantsRef, where('active', '==', true));
  const snapshot = await getDocs(variantsQuery);
  const variants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  cachedVariants = variants;
  lastVariantsFetchTime = now;
  return variants;
};

/**
 * Fetch aggregated inventory statistics for the dashboard
 */
export const getInventoryStats = async (forceRefresh = false) => {
  try {
    // 1. Fetch total products count
    const productsRef = collection(db, COLLECTIONS.PRODUCTS);
    const productsQuery = query(productsRef, where('active', '==', true));
    const productsCountSnap = await getCountFromServer(productsQuery);
    const totalProducts = productsCountSnap.data().count;

    // 2. Fetch all active variants
    const variants = await fetchAllActiveVariants(forceRefresh);
    
    // 3. Compute stats in memory (Fallback since Cloud Functions aren't deployed)
    let totalVariants = variants.length;
    let mabolaStock = 0;
    let jaffnaStock = 0;
    let overallStock = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    const chartDataMap = {};

    variants.forEach(v => {
      const oStock = parseFloat(v.stock?.overall || 0) || 0;
      const mStock = parseFloat(v.stock?.mabola || 0) || 0;
      const jStock = parseFloat(v.stock?.jaffna || 0) || 0;
      const reorder = parseFloat(v.reorderLevel || 0) || 0;

      overallStock += oStock;
      mabolaStock += mStock;
      jaffnaStock += jStock;

      if (oStock === 0) {
        outOfStockCount++;
      } else if (oStock <= reorder) {
        lowStockCount++;
      }

      if (v.name) {
        if (!chartDataMap[v.name]) {
          chartDataMap[v.name] = { name: v.name, stock: 0 };
        }
        chartDataMap[v.name].stock += oStock;
      }
    });

    const chartData = Object.values(chartDataMap)
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 15);

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
    const allVariants = await fetchAllActiveVariants();
    return allVariants.filter(v => {
      const overall = parseFloat(v.stock?.overall || 0) || 0;
      const reorder = parseFloat(v.reorderLevel || 0) || 0;
      return overall > 0 && overall <= reorder;
    });
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
    const allVariants = await fetchAllActiveVariants();
    return allVariants.filter(v => {
      const overall = parseFloat(v.stock?.overall || 0) || 0;
      return overall === 0;
    });
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
