import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../config/collections';
import { withCreationData, withUpdateData } from './dbHelpers';

/**
 * Get all categories
 * @param {boolean} activeOnly - If true, fetches only active categories
 */
export const getCategories = async (activeOnly = false) => {
  try {
    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    const q = activeOnly 
      ? query(categoriesRef, where('active', '==', true))
      : categoriesRef;
      
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[CategoryService] Error fetching categories:', error);
    throw error;
  }
};

/**
 * Add a new category
 * @param {object} data 
 * @param {string} userId 
 */
export const addCategory = async (data, userId) => {
  try {
    const categoryRef = doc(collection(db, COLLECTIONS.CATEGORIES));
    const payload = withCreationData({
      ...data,
      active: data.active !== undefined ? data.active : true,
    }, userId);
    
    await setDoc(categoryRef, payload);
    return { id: categoryRef.id, ...payload };
  } catch (error) {
    console.error('[CategoryService] Error adding category:', error);
    throw error;
  }
};

/**
 * Update an existing category
 * @param {string} id 
 * @param {object} data 
 * @param {string} userId 
 */
export const updateCategory = async (id, data, userId) => {
  try {
    const categoryRef = doc(db, COLLECTIONS.CATEGORIES, id);
    const payload = withUpdateData(data, userId);
    
    // setDoc with merge: true acts like updateDoc but creates if it doesn't exist (though it should)
    // using updateDoc is stricter, but setDoc(merge) is more forgiving for partials
    await setDoc(categoryRef, payload, { merge: true });
    return { id, ...payload };
  } catch (error) {
    console.error(`[CategoryService] Error updating category ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a category
 * @param {string} id 
 */
export const deleteCategory = async (id) => {
  try {
    const categoryRef = doc(db, COLLECTIONS.CATEGORIES, id);
    await deleteDoc(categoryRef);
    return id;
  } catch (error) {
    console.error(`[CategoryService] Error deleting category ${id}:`, error);
    throw error;
  }
};
