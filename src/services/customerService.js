import { collection, doc, query, orderBy, getDocs, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { COLLECTIONS } from '../config/collections';
import { withCreationData, withUpdateData, generateReferenceNumber } from './dbHelpers';

/**
 * Fetch all customers
 */
export const getCustomers = async (options = {}) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.CUSTOMERS),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    let customers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (options.activeOnly) {
      customers = customers.filter(c => c.active === true);
    }

    return customers;
  } catch (error) {
    console.error('[CustomerService] Error getting customers:', error);
    throw error;
  }
};

/**
 * Fetch a single customer by ID
 */
export const getCustomerById = async (id) => {
  try {
    const { getDoc } = await import('firebase/firestore');
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`[CustomerService] Error getting customer ${id}:`, error);
    throw error;
  }
};

/**
 * Add a new customer
 */
export const addCustomer = async (data, userId) => {
  try {
    const customerCode = generateReferenceNumber('CUST');
    const docRef = doc(collection(db, COLLECTIONS.CUSTOMERS));
    
    const payload = withCreationData({
      ...data,
      customerCode,
      active: data.active !== undefined ? data.active : true
    }, userId);

    await setDoc(docRef, payload);
    return { id: docRef.id, ...payload };
  } catch (error) {
    console.error('[CustomerService] Error adding customer:', error);
    throw error;
  }
};

/**
 * Update an existing customer
 */
export const updateCustomer = async (id, data, userId) => {
  try {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, id);
    const payload = withUpdateData(data, userId);
    
    await updateDoc(docRef, payload);
    return true;
  } catch (error) {
    console.error(`[CustomerService] Error updating customer ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a customer (Soft delete by setting active to false)
 */
export const deleteCustomer = async (id, userId) => {
  try {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, id);
    await updateDoc(docRef, withUpdateData({ active: false }, userId));
    return true;
  } catch (error) {
    console.error(`[CustomerService] Error deleting customer ${id}:`, error);
    throw error;
  }
};
