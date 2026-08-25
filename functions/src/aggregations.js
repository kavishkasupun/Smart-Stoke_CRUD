const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const db = getFirestore();

/**
 * Triggered on any write to product_variants.
 * Maintains the running totals in _metadata/dashboard_stats.
 */
exports.aggregateDashboardStats = onDocumentWritten('product_variants/{variantId}', async (event) => {
  const beforeData = event.data.before ? event.data.before.data() : null;
  const afterData = event.data.after ? event.data.after.data() : null;

  // We are calculating differences for:
  // - totalVariants
  // - mabolaStock
  // - jaffnaStock
  // - overallStock
  // - outOfStockCount
  // - lowStockCount

  let variantsDiff = 0;
  let mabolaDiff = 0;
  let jaffnaDiff = 0;
  let overallDiff = 0;
  let outOfStockDiff = 0;
  let lowStockDiff = 0;

  // Helper to determine status
  const getStatus = (data) => {
    if (!data || data.active === false) return 'INACTIVE';
    const overall = data.stock?.overall || 0;
    const reorder = data.reorderLevel || 0;
    if (overall === 0) return 'OUT_OF_STOCK';
    if (overall <= reorder) return 'LOW_STOCK';
    return 'OK';
  };

  const beforeStatus = getStatus(beforeData);
  const afterStatus = getStatus(afterData);

  // Variant Count (Only count active)
  const wasActive = beforeData?.active === true;
  const isActive = afterData?.active === true;
  if (!wasActive && isActive) variantsDiff = 1;
  else if (wasActive && !isActive) variantsDiff = -1;

  // Stock values
  const beforeMabola = beforeData?.stock?.mabola || 0;
  const beforeJaffna = beforeData?.stock?.jaffna || 0;
  const beforeOverall = beforeData?.stock?.overall || 0;

  const afterMabola = afterData?.stock?.mabola || 0;
  const afterJaffna = afterData?.stock?.jaffna || 0;
  const afterOverall = afterData?.stock?.overall || 0;

  if (isActive) {
    // If it is active now, but wasn't before, we add the entire current stock.
    if (!wasActive) {
      mabolaDiff = afterMabola;
      jaffnaDiff = afterJaffna;
      overallDiff = afterOverall;
      if (afterStatus === 'OUT_OF_STOCK') outOfStockDiff = 1;
      if (afterStatus === 'LOW_STOCK') lowStockDiff = 1;
    } else {
      // It was active before, and is active now. Calculate difference.
      mabolaDiff = afterMabola - beforeMabola;
      jaffnaDiff = afterJaffna - beforeJaffna;
      overallDiff = afterOverall - beforeOverall;

      if (beforeStatus === 'OUT_OF_STOCK' && afterStatus !== 'OUT_OF_STOCK') outOfStockDiff = -1;
      if (beforeStatus !== 'OUT_OF_STOCK' && afterStatus === 'OUT_OF_STOCK') outOfStockDiff = 1;

      if (beforeStatus === 'LOW_STOCK' && afterStatus !== 'LOW_STOCK') lowStockDiff = -1;
      if (beforeStatus !== 'LOW_STOCK' && afterStatus === 'LOW_STOCK') lowStockDiff = 1;
    }
  } else if (wasActive) {
    // It was active, now it's inactive. Subtract all old values.
    mabolaDiff = -beforeMabola;
    jaffnaDiff = -beforeJaffna;
    overallDiff = -beforeOverall;
    if (beforeStatus === 'OUT_OF_STOCK') outOfStockDiff = -1;
    if (beforeStatus === 'LOW_STOCK') lowStockDiff = -1;
  }

  // Update the stats document using FieldValue.increment to avoid race conditions
  if (
    variantsDiff !== 0 ||
    mabolaDiff !== 0 ||
    jaffnaDiff !== 0 ||
    overallDiff !== 0 ||
    outOfStockDiff !== 0 ||
    lowStockDiff !== 0
  ) {
    const statsRef = db.doc('_metadata/dashboard_stats');
    
    // Ensure document exists first
    const statsSnap = await statsRef.get();
    if (!statsSnap.exists) {
      await statsRef.set({
        totalVariants: 0,
        mabolaStock: 0,
        jaffnaStock: 0,
        overallStock: 0,
        outOfStockCount: 0,
        lowStockCount: 0,
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    await statsRef.update({
      totalVariants: FieldValue.increment(variantsDiff),
      mabolaStock: FieldValue.increment(mabolaDiff),
      jaffnaStock: FieldValue.increment(jaffnaDiff),
      overallStock: FieldValue.increment(overallDiff),
      outOfStockCount: FieldValue.increment(outOfStockDiff),
      lowStockCount: FieldValue.increment(lowStockDiff),
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  return null;
});
