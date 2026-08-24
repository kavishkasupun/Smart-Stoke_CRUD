import { serverTimestamp } from 'firebase/firestore';

/**
 * Standardize creation payloads with timestamps and user info
 * @param {object} payload 
 * @param {string} userId 
 * @returns {object}
 */
export const withCreationData = (payload, userId) => {
  return {
    ...payload,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
};

/**
 * Standardize update payloads with timestamps
 * @param {object} payload 
 * @param {string} userId 
 * @returns {object}
 */
export const withUpdateData = (payload, userId) => {
  return {
    ...payload,
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  };
};

/**
 * Generate a sequential-looking ID string, useful for Transfer Numbers or Bill Numbers.
 * In a high-concurrency production app, you'd use a Firestore transaction with a counter collection.
 * For this scale, a timestamp + random string is often sufficient, or you can implement
 * a dedicated counter service if strict sequence is legally required (e.g. invoices).
 * 
 * @param {string} prefix e.g., 'TRN' or 'BILL'
 * @returns {string} e.g., 'TRN-1694200100-AB3'
 */
export const generateReferenceNumber = (prefix) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${randomStr}`;
};
