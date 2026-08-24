import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { app } from './app';

// Re-export advanced utilities for use in services
export { serverTimestamp, increment, writeBatch, runTransaction, doc, collection };

/**
 * Firebase Firestore Instance
 */
export const db = app ? getFirestore(app) : null;

/**
 * Helper: Get a single document
 * @param {string} collectionName 
 * @param {string} docId 
 * @returns {Promise<object|null>}
 */
export const getDocument = async (collectionName, docId) => {
  if (!db) throw new Error('Firestore not initialized');
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`[Firestore] Error getting document ${collectionName}/${docId}:`, error);
    throw error;
  }
};

/**
 * Helper: Get a collection with optional queries
 * @param {string} collectionName 
 * @param {...import('firebase/firestore').QueryConstraint} queryConstraints 
 * @returns {Promise<Array<object>>}
 */
export const getCollection = async (collectionName, ...queryConstraints) => {
  if (!db) throw new Error('Firestore not initialized');
  try {
    const collectionRef = collection(db, collectionName);
    const q = queryConstraints.length > 0 ? query(collectionRef, ...queryConstraints) : collectionRef;
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`[Firestore] Error getting collection ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Helper: Add a new document
 * @param {string} collectionName 
 * @param {object} data 
 * @returns {Promise<string>} The new document ID
 */
export const addDocument = async (collectionName, data) => {
  if (!db) throw new Error('Firestore not initialized');
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date().toISOString(), // Basic timestamp
    });
    return docRef.id;
  } catch (error) {
    console.error(`[Firestore] Error adding document to ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Helper: Update an existing document
 * @param {string} collectionName 
 * @param {string} docId 
 * @param {object} data 
 * @returns {Promise<void>}
 */
export const updateDocument = async (collectionName, docId, data) => {
  if (!db) throw new Error('Firestore not initialized');
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[Firestore] Error updating document ${collectionName}/${docId}:`, error);
    throw error;
  }
};

/**
 * Helper: Delete a document
 * @param {string} collectionName 
 * @param {string} docId 
 * @returns {Promise<void>}
 */
export const deleteDocument = async (collectionName, docId) => {
  if (!db) throw new Error('Firestore not initialized');
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`[Firestore] Error deleting document ${collectionName}/${docId}:`, error);
    throw error;
  }
};

/**
 * Helper: Listen to real-time updates on a collection or query
 * @param {string} collectionName 
 * @param {function} callback - Called with the array of documents
 * @param {...import('firebase/firestore').QueryConstraint} queryConstraints 
 * @returns {function} Unsubscribe function
 */
export const onSnapshotListener = (collectionName, callback, ...queryConstraints) => {
  if (!db) {
    console.warn('[Firestore] Firestore not initialized. Cannot set up snapshot listener.');
    return () => {};
  }
  
  const collectionRef = collection(db, collectionName);
  const q = queryConstraints.length > 0 ? query(collectionRef, ...queryConstraints) : collectionRef;
  
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(docs);
  }, (error) => {
    console.error(`[Firestore] Snapshot error on ${collectionName}:`, error);
  });
};
