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
    // 1. Fetch total products and build map for product types
    const productsRef = collection(db, COLLECTIONS.PRODUCTS);
    const productsQuery = query(productsRef, where('active', '==', true));
    const productsSnapshot = await getDocs(productsQuery);
    
    const totalProducts = productsSnapshot.docs.length;
    const productsMap = {};
    const noVariantProducts = [];
    
    productsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      productsMap[doc.id] = data;
      
      // If product has no variants, treat it as a stock item itself
      if (data.hasVariants === false) {
        noVariantProducts.push({
          id: doc.id,
          productId: doc.id, // For product lookup
          name: data.name,
          stock: data.stock || { overall: 0, mabola: 0, jaffna: 0 },
          reorderLevel: data.reorderLevel || 0,
          isBaseProduct: true
        });
      }
    });

    // 2. Fetch all active variants
    const variants = await fetchAllActiveVariants(forceRefresh);
    
    // Combine variants and base products without variants
    const allStockItems = [...variants, ...noVariantProducts];
    
    // 3. Compute stats in memory (Fallback since Cloud Functions aren't deployed)
    let totalVariants = variants.length;
    let mabolaStock = 0;
    let jaffnaStock = 0;
    let overallStock = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    const chartDataFinishedMap = {};
    const chartDataRawMap = {};

    allStockItems.forEach(item => {
      const oStock = parseFloat(item.stock?.overall || 0) || 0;
      const mStock = parseFloat(item.stock?.mabola || 0) || 0;
      const jStock = parseFloat(item.stock?.jaffna || 0) || 0;
      
      // Determine reorder level: use item's, fallback to product's, fallback to 0
      const product = productsMap[item.productId || item.id];
      const reorder = parseFloat(item.reorderLevel || (product && product.reorderLevel) || 0) || 0;

      overallStock += oStock;
      mabolaStock += mStock;
      jaffnaStock += jStock;

      if (oStock === 0) {
        outOfStockCount++;
      } else if (oStock <= reorder) {
        lowStockCount++;
      }

      // Group chart data by product name instead of variant name to be more meaningful, 
      // or use variant name if product is not found.
      const groupName = product ? product.name : (item.name || 'Unknown');
      const pType = product ? product.productType : 'FINISHED_PRODUCT';

      const targetMap = pType === 'RAW_MATERIAL' ? chartDataRawMap : chartDataFinishedMap;

      if (!targetMap[groupName]) {
        targetMap[groupName] = { name: groupName, stock: 0 };
      }
      targetMap[groupName].stock += oStock;
    });

    const chartDataFinished = Object.values(chartDataFinishedMap)
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 15);
      
    const chartDataRaw = Object.values(chartDataRawMap)
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
      chartDataFinished,
      chartDataRaw
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
    const productsRef = collection(db, COLLECTIONS.PRODUCTS);
    const productsSnapshot = await getDocs(query(productsRef, where('active', '==', true)));
    const productsMap = {};
    const noVariantProducts = [];
    
    productsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      productsMap[doc.id] = data;
      if (data.hasVariants === false) {
        noVariantProducts.push({
          id: doc.id,
          productId: doc.id,
          name: data.name,
          stock: data.stock,
          reorderLevel: data.reorderLevel
        });
      }
    });

    const variants = await fetchAllActiveVariants();
    const allStockItems = [...variants, ...noVariantProducts];
    
    return allStockItems.filter(item => {
      const overall = parseFloat(item.stock?.overall || 0) || 0;
      const product = productsMap[item.productId || item.id];
      const reorder = parseFloat(item.reorderLevel || (product && product.reorderLevel) || 0) || 0;
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
    const productsRef = collection(db, COLLECTIONS.PRODUCTS);
    const productsSnapshot = await getDocs(query(productsRef, where('active', '==', true)));
    const noVariantProducts = [];
    
    productsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.hasVariants === false) {
        noVariantProducts.push({
          id: doc.id,
          productId: doc.id,
          name: data.name,
          stock: data.stock
        });
      }
    });

    const variants = await fetchAllActiveVariants();
    const allStockItems = [...variants, ...noVariantProducts];
    
    return allStockItems.filter(item => {
      const overall = parseFloat(item.stock?.overall || 0) || 0;
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
