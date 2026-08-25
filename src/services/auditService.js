import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../config/collections';

/**
 * Log an action to the audit logs collection
 * 
 * @param {object} params
 * @param {string} params.userId - ID of the user performing the action
 * @param {string} params.userName - Name of the user performing the action
 * @param {string} params.action - The action being performed (e.g., 'CREATE_PRODUCT', 'LOGIN')
 * @param {string} params.entityType - Type of entity affected (e.g., 'Product', 'User', 'Invoice')
 * @param {string} params.entityId - ID of the entity affected
 * @param {string} params.branchId - Branch context (if applicable)
 * @param {object} params.beforeData - State of the entity before the action
 * @param {object} params.afterData - State of the entity after the action
 * @param {object} params.metadata - Any additional contextual data
 */
export const logAudit = async ({
  userId,
  userName,
  action,
  entityType = null,
  entityId = null,
  branchId = null,
  beforeData = null,
  afterData = null,
  metadata = null
}) => {
  try {
    let resolvedUserName = userName;
    
    // Auto-resolve user name if missing
    if (!resolvedUserName && userId) {
      try {
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          resolvedUserName = userSnap.data().name;
        }
      } catch (e) {
        console.error('Failed to resolve user name for audit log', e);
      }
    }

    const logsRef = collection(db, COLLECTIONS.AUDIT_LOGS);
    await addDoc(logsRef, {
      userId,
      userName: resolvedUserName || 'Unknown User',
      action,
      entityType,
      entityId,
      branchId,
      beforeData,
      afterData,
      metadata,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    // We intentionally don't throw this error to avoid blocking the main operation
    // e.g. a product should still be created even if audit logging fails
    console.error('[AuditService] Failed to log audit event:', error);
  }
};

/**
 * Fetch audit logs with optional filtering
 * 
 * @param {object} filters 
 * @param {string} filters.userId
 * @param {string} filters.action
 * @param {string} filters.branchId
 * @param {number} filters.limitCount - Max records to fetch (default: 100)
 */
export const getAuditLogs = async (filters = {}) => {
  try {
    const logsRef = collection(db, COLLECTIONS.AUDIT_LOGS);
    let q = query(logsRef, orderBy('timestamp', 'desc'));

    if (filters.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }
    
    if (filters.action) {
      q = query(q, where('action', '==', filters.action));
    }
    
    if (filters.branchId) {
      q = query(q, where('branchId', '==', filters.branchId));
    }
    
    // limitCount is always applied to avoid pulling massive amounts of data
    const maxResults = filters.limitCount || 100;
    q = query(q, limit(maxResults));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('[AuditService] Error fetching audit logs:', error);
    throw error;
  }
};
