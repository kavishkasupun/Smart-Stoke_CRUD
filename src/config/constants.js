/**
 * Application-wide constants and configuration.
 */

export const APP_NAME = 'Stoke CRUD';
export const APP_DESCRIPTION = 'Multi-Branch Inventory & Billing Management';

/**
 * Branch definitions.
 */
export const BRANCHES = {
  MABOLA: { id: 'mabola', name: 'Mabola', code: 'MAB' },
  JAFFNA: { id: 'jaffna', name: 'Jaffna', code: 'JAF' },
};

export const BRANCH_LIST = Object.values(BRANCHES);

/**
 * Stock movement types — every stock change must create a movement record.
 */
export const STOCK_MOVEMENT_TYPES = {
  IMPORT: 'IMPORT',
  RECEIVE: 'RECEIVE',
  TRANSFER_OUT: 'TRANSFER_OUT',
  TRANSFER_IN: 'TRANSFER_IN',
  SALE: 'SALE',
  SALE_RETURN: 'SALE_RETURN',
  ADJUSTMENT_IN: 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT: 'ADJUSTMENT_OUT',
};

/**
 * Stock movement type labels for display.
 */
export const MOVEMENT_TYPE_LABELS = {
  [STOCK_MOVEMENT_TYPES.IMPORT]: 'Import / Receive',
  [STOCK_MOVEMENT_TYPES.RECEIVE]: 'Receive',
  [STOCK_MOVEMENT_TYPES.TRANSFER_OUT]: 'Transfer Out',
  [STOCK_MOVEMENT_TYPES.TRANSFER_IN]: 'Transfer In',
  [STOCK_MOVEMENT_TYPES.SALE]: 'Sale',
  [STOCK_MOVEMENT_TYPES.SALE_RETURN]: 'Sale Return',
  [STOCK_MOVEMENT_TYPES.ADJUSTMENT_IN]: 'Adjustment In',
  [STOCK_MOVEMENT_TYPES.ADJUSTMENT_OUT]: 'Adjustment Out',
};

/**
 * Bill / Invoice statuses.
 */
export const BILL_STATUS = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
};

/**
 * Discount types.
 */
export const DISCOUNT_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
};

/**
 * User role definitions.
 */
export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  MABOLA_MANAGER: 'MABOLA_MANAGER',
  JAFFNA_MANAGER: 'JAFFNA_MANAGER',
  SALES_USER: 'SALES_USER',
  VIEWER: 'VIEWER',
};

export const USER_ROLE_LABELS = {
  [USER_ROLES.SUPER_ADMIN]: 'Super Admin',
  [USER_ROLES.INVENTORY_MANAGER]: 'Inventory Manager',
  [USER_ROLES.MABOLA_MANAGER]: 'Mabola Manager',
  [USER_ROLES.JAFFNA_MANAGER]: 'Jaffna Manager',
  [USER_ROLES.SALES_USER]: 'Sales User',
  [USER_ROLES.VIEWER]: 'Viewer',
};

/**
 * Pagination defaults.
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
};

/**
 * Low stock threshold (default, can be overridden per product).
 */
export const DEFAULT_LOW_STOCK_THRESHOLD = 10;
export const DEFAULT_REORDER_LEVEL = 20;
