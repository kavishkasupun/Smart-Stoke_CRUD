import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../config/collections';
import { withCreationData, withUpdateData } from './dbHelpers';

let cachedCategories = null;
let lastFetchTime = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get all categories
 * @param {boolean} activeOnly - If true, fetches only active categories
 */
export const getCategories = async (activeOnly = false, forceRefresh = false) => {
  try {
    const now = Date.now();
    if (!forceRefresh && cachedCategories && lastFetchTime && (now - lastFetchTime < CACHE_DURATION_MS)) {
      return activeOnly ? cachedCategories.filter(c => c.active) : cachedCategories;
    }

    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    const q = categoriesRef; // Always fetch all, then filter on client to reuse cache
      
    const snapshot = await getDocs(q);
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    cachedCategories = categories;
    lastFetchTime = now;
    
    return activeOnly ? categories.filter(c => c.active) : categories;
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
    cachedCategories = null; // Invalidate cache
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
    cachedCategories = null; // Invalidate cache
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
    cachedCategories = null; // Invalidate cache
    return id;
  } catch (error) {
    console.error(`[CategoryService] Error deleting category ${id}:`, error);
    throw error;
  }
};
