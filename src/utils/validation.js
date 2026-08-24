/**
 * Data Validation Utilities
 * 
 * Simple schema validators to ensure data integrity before writing to Firestore.
 * In a larger production app, you might replace this with Zod or Yup.
 */

export const validateProduct = (data) => {
  const errors = [];
  if (!data.name?.trim()) errors.push('Product name is required.');
  if (!data.categoryId?.trim()) errors.push('Category ID is required.');
  return { valid: errors.length === 0, errors };
};

export const validateProductVariant = (data) => {
  const errors = [];
  if (!data.productId?.trim()) errors.push('Product ID is required.');
  if (!data.name?.trim()) errors.push('Variant name is required.');
  
  if (data.costPrice === undefined || data.costPrice < 0) {
    errors.push('Cost price must be a positive number or zero.');
  }
  
  if (data.sellingPrice === undefined || data.sellingPrice < 0) {
    errors.push('Selling price must be a positive number or zero.');
  }

  return { valid: errors.length === 0, errors };
};

export const validateStockMovement = (data) => {
  const errors = [];
  const validTypes = ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'SALE', 'RETURN'];
  
  if (!data.variantId?.trim()) errors.push('Variant ID is required.');
  if (!data.branchId?.trim()) errors.push('Branch ID is required.');
  
  if (!data.movementType || !validTypes.includes(data.movementType)) {
    errors.push(`Movement type must be one of: ${validTypes.join(', ')}`);
  }
  
  if (data.quantity === undefined || data.quantity === 0) {
    errors.push('Quantity must be a non-zero number.');
  }

  // Stock movements must have an audit trail reason
  if (!data.reason?.trim() && data.movementType === 'ADJUSTMENT') {
    errors.push('Reason is required for manual stock adjustments.');
  }

  return { valid: errors.length === 0, errors };
};

export const validateStockTransfer = (data) => {
  const errors = [];
  if (!data.fromBranchId?.trim()) errors.push('Source branch is required.');
  if (!data.toBranchId?.trim()) errors.push('Destination branch is required.');
  if (data.fromBranchId === data.toBranchId) errors.push('Source and destination branches must be different.');
  if (!Array.isArray(data.items) || data.items.length === 0) {
    errors.push('Transfer must contain at least one item.');
  }
  return { valid: errors.length === 0, errors };
};
