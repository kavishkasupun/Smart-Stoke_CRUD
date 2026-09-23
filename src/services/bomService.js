import { collection, query, where, getDocs, doc, getDoc, runTransaction, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../config/collections';
import { withCreationData } from './dbHelpers';
import { logAudit } from './auditService';

/**
 * Get all currently active BOMs.
 */
export const getActiveBoms = async () => {
  try {
    const bomsRef = collection(db, COLLECTIONS.BOMS);
    const q = query(bomsRef, where('active', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[BomService] Error fetching active BOMs:', error);
    throw error;
  }
};

/**
 * Get a specific BOM by ID (historical or active).
 */
export const getBomById = async (id) => {
  try {
    const docRef = doc(db, COLLECTIONS.BOMS, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`[BomService] Error fetching BOM ${id}:`, error);
    throw error;
  }
};

/**
 * Get the currently active BOM for a specific finished product variant.
 */
export const getActiveBomByFinishedVariantId = async (variantId) => {
  try {
    const bomsRef = collection(db, COLLECTIONS.BOMS);
    const q = query(
      bomsRef, 
      where('finishedVariantId', '==', variantId),
      where('active', '==', true)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error(`[BomService] Error fetching active BOM for variant ${variantId}:`, error);
    throw error;
  }
};

/**
 * Get all BOM versions for a specific finished product variant, ordered by version descending.
 */
export const getBomHistory = async (variantId) => {
  try {
    const bomsRef = collection(db, COLLECTIONS.BOMS);
    // Sort in memory to avoid strict index requirement immediately
    const q = query(bomsRef, where('finishedVariantId', '==', variantId));
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return docs.sort((a, b) => (b.version || 0) - (a.version || 0));
  } catch (error) {
    console.error(`[BomService] Error fetching BOM history for variant ${variantId}:`, error);
    throw error;
  }
};

/**
 * Saves a new BOM version.
 * This function ensures that historical BOM data is never overwritten.
 * It creates a new BOM document and deactivates the previous one atomically.
 */
export const saveBomVersion = async (data, userId) => {
  try {
    const bomsRef = collection(db, COLLECTIONS.BOMS);
    
    // 1. Query outside transaction to find the current active one and max version
    const q = query(bomsRef, where('finishedVariantId', '==', data.finishedVariantId));
    const snapshot = await getDocs(q);
    
    let currentActiveId = null;
    let maxVersion = 0;
    
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      if ((d.version || 0) > maxVersion) maxVersion = d.version;
      if (d.active === true) currentActiveId = docSnap.id;
    });

    const newVersion = maxVersion + 1;
    const newBomRef = doc(bomsRef);
    
    const payload = withCreationData({
      ...data,
      version: newVersion,
      active: true
    }, userId);

    // 2. Perform atomic replacement
    await runTransaction(db, async (transaction) => {
      // If there was an active BOM, verify and deactivate it
      if (currentActiveId) {
        const activeRef = doc(db, COLLECTIONS.BOMS, currentActiveId);
        const activeDoc = await transaction.get(activeRef);
        if (activeDoc.exists() && activeDoc.data().active === true) {
           transaction.update(activeRef, { 
             active: false, 
             updatedAt: new Date().toISOString(),
             updatedBy: userId 
           });
        }
      }
      
      // Create new version
      transaction.set(newBomRef, payload);
    });

    await logAudit({
      userId,
      action: 'SAVE_BOM_VERSION',
      entityType: 'BOM',
      entityId: newBomRef.id,
      afterData: payload,
      metadata: { 
        finishedVariantId: data.finishedVariantId,
        version: newVersion,
        previousBomId: currentActiveId 
      }
    });

    return { id: newBomRef.id, ...payload };
  } catch (error) {
    console.error('[BomService] Error saving BOM version:', error);
    throw error;
  }
};

/**
 * Manually activate or deactivate a specific BOM.
 */
export const toggleBomStatus = async (bomId, newStatus, userId) => {
  try {
    const targetRef = doc(db, COLLECTIONS.BOMS, bomId);
    
    await runTransaction(db, async (transaction) => {
      const targetDoc = await transaction.get(targetRef);
      if (!targetDoc.exists()) throw new Error("BOM not found");
      
      transaction.update(targetRef, {
        active: newStatus,
        updatedAt: new Date().toISOString(),
        updatedBy: userId
      });
    });

    await logAudit({
      userId,
      action: 'TOGGLE_BOM_STATUS',
      entityType: 'BOM',
      entityId: bomId,
      metadata: { newStatus }
    });
    
    return true;
  } catch (error) {
    console.error(`[BomService] Error toggling BOM ${bomId}:`, error);
    throw error;
  }
};
