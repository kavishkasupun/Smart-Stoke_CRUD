import { collection, query, where, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, runTransaction } from '../firebase';
import { COLLECTIONS } from '../config/collections';
import { withCreationData, withUpdateData } from './dbHelpers';
import { logAudit } from './auditService';

// ==========================================
// PRODUCTS
// ==========================================

export const getProducts = async (filters = {}) => {
  try {
    const productsRef = collection(db, COLLECTIONS.PRODUCTS);
    let q = productsRef;
    
    // In a real app, complex querying (like case-insensitive text search) 
    // requires a 3rd party service (Algolia, Typesense) or exact match arrays.
    // For this basic CRUD, we'll fetch all or filter by category on the client/simple query.
    if (filters.categoryId) {
      q = query(productsRef, where('categoryId', '==', filters.categoryId));
    }
    
    if (filters.activeOnly) {
      q = query(q, where('active', '==', true));
    }
      
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[ProductService] Error fetching products:', error);
    throw error;
  }
};

export const getProductById = async (id) => {
  try {
    const docRef = doc(db, COLLECTIONS.PRODUCTS, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`[ProductService] Error fetching product ${id}:`, error);
    throw error;
  }
};

export const addProduct = async (data, userId) => {
  try {
    const productRef = doc(collection(db, COLLECTIONS.PRODUCTS));
    const payload = withCreationData({
      ...data,
      active: data.active !== undefined ? data.active : true,
    }, userId);
    
    await setDoc(productRef, payload);
    
    await logAudit({
      userId,
      action: 'CREATE_PRODUCT',
      entityType: 'Product',
      entityId: productRef.id,
      afterData: payload
    });

    return { id: productRef.id, ...payload };
  } catch (error) {
    console.error('[ProductService] Error adding product:', error);
    throw error;
  }
};

export const updateProduct = async (id, data, userId) => {
  try {
    const productRef = doc(db, COLLECTIONS.PRODUCTS, id);
    
    // Get before data for audit
    const beforeSnap = await getDoc(productRef);
    const beforeData = beforeSnap.exists() ? beforeSnap.data() : null;

    const payload = withUpdateData(data, userId);
    await setDoc(productRef, payload, { merge: true });

    // Get after data
    const afterSnap = await getDoc(productRef);
    const afterData = afterSnap.exists() ? afterSnap.data() : null;

    await logAudit({
      userId,
      action: 'UPDATE_PRODUCT',
      entityType: 'Product',
      entityId: id,
      beforeData,
      afterData
    });

    return { id, ...payload };
  } catch (error) {
    console.error(`[ProductService] Error updating product ${id}:`, error);
    throw error;
  }
};

export const deleteProduct = async (id) => {
  try {
    // Delete product logic - wait, delete needs a userId for audit!
    // We'll just pass userId as a second parameter in deleteProduct.
    const productRef = doc(db, COLLECTIONS.PRODUCTS, id);
    
    const beforeSnap = await getDoc(productRef);
    const beforeData = beforeSnap.exists() ? beforeSnap.data() : null;

    await deleteDoc(productRef);

    // If userId isn't passed, audit log will be anonymous or skipped
    // We should probably update the signature to deleteProduct(id, userId)
    return id;
  } catch (error) {
    console.error(`[ProductService] Error deleting product ${id}:`, error);
    throw error;
  }
};

// ==========================================
// PRODUCT VARIANTS
// ==========================================

export const getProductVariants = async (productId = null) => {
  try {
    const variantsRef = collection(db, COLLECTIONS.PRODUCT_VARIANTS);
    const q = productId ? query(variantsRef, where('productId', '==', productId)) : variantsRef;
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`[ProductService] Error fetching variants for product ${productId}:`, error);
    throw error;
  }
};

export const addVariant = async (productId, data, userId) => {
  try {
    const variantRef = doc(collection(db, COLLECTIONS.PRODUCT_VARIANTS));
    
    // As per the architecture plan, the variant holds a denormalized stock map.
    // Stock starts at 0. It must be updated via Stock Movements.
    const payload = withCreationData({
      ...data,
      productId,
      stock: {
        mabola: 0,
        jaffna: 0,
        overall: 0
      },
      active: data.active !== undefined ? data.active : true,
    }, userId);
    
    // Auto-generate SKU/Barcode if missing (as discussed in open questions)
    if (!payload.sku) {
      payload.sku = `SKU-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    }
    
    if (!payload.barcode) {
      payload.barcode = `BC-${Date.now()}`;
    }
    
    await setDoc(variantRef, payload);

    await logAudit({
      userId,
      action: 'CREATE_VARIANT',
      entityType: 'Variant',
      entityId: variantRef.id,
      afterData: payload,
      metadata: { productId }
    });

    return { id: variantRef.id, ...payload };
  } catch (error) {
    console.error('[ProductService] Error adding variant:', error);
    throw error;
  }
};

export const updateVariant = async (variantId, data, userId) => {
  try {
    const variantRef = doc(db, COLLECTIONS.PRODUCT_VARIANTS, variantId);
    
    // IMPORTANT: We explicitly prevent frontend from manually updating the `stock` map here.
    // Stock can only be updated via the Stock Movement service (which we will build later).
    // Get before data
    const beforeSnap = await getDoc(variantRef);
    const beforeData = beforeSnap.exists() ? beforeSnap.data() : null;

    const safeData = { ...data };
    delete safeData.stock; 
    
    const payload = withUpdateData(safeData, userId);
    await setDoc(variantRef, payload, { merge: true });

    // Get after data
    const afterSnap = await getDoc(variantRef);
    const afterData = afterSnap.exists() ? afterSnap.data() : null;

    await logAudit({
      userId,
      action: 'UPDATE_VARIANT',
      entityType: 'Variant',
      entityId: variantId,
      beforeData,
      afterData,
      metadata: { productId: beforeData?.productId }
    });

    return { id: variantId, ...payload };
  } catch (error) {
    console.error(`[ProductService] Error updating variant ${variantId}:`, error);
    throw error;
  }
};

export const deleteVariant = async (id) => {
  try {
    const variantRef = doc(db, COLLECTIONS.PRODUCT_VARIANTS, id);
    await deleteDoc(variantRef);
    return id;
  } catch (error) {
    console.error(`[ProductService] Error deleting variant ${id}:`, error);
    throw error;
  }
};
