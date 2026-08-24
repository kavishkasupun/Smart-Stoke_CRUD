import { USER_ROLES } from '../config/constants';

/**
 * Role-Based Access Control (RBAC) Utility Functions
 * 
 * Centralized place to define what roles can do what.
 * Note: These are client-side checks for UI rendering. 
 * Real security must be enforced by Firestore Security Rules.
 */

/**
 * Basic role check
 * @param {string} userRole 
 * @param {string[]} allowedRoles 
 * @returns {boolean}
 */
export function hasRole(userRole, allowedRoles) {
  if (!userRole) return false;
  if (userRole === USER_ROLES.SUPER_ADMIN) return true; // Super Admin can do anything
  return allowedRoles.includes(userRole);
}

/**
 * Check if the user can manage users and roles
 * @param {string} role 
 */
export function canManageUsers(role) {
  return hasRole(role, [USER_ROLES.SUPER_ADMIN]);
}

/**
 * Check if the user can manage inventory (products, categories)
 * @param {string} role 
 */
export function canManageInventory(role) {
  return hasRole(role, [
    USER_ROLES.SUPER_ADMIN, 
    USER_ROLES.INVENTORY_MANAGER
  ]);
}

/**
 * Check if user can receive/import stock
 * @param {string} role 
 * @param {string} userBranch 
 * @param {string} targetBranch 
 */
export function canReceiveStock(role, userBranch, targetBranch) {
  if (role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.INVENTORY_MANAGER) return true;
  
  if (role === USER_ROLES.MABOLA_MANAGER) {
    return targetBranch === 'mabola';
  }
  
  if (role === USER_ROLES.JAFFNA_MANAGER) {
    return targetBranch === 'jaffna';
  }

  return false; // Sales users and viewers cannot receive stock
}

/**
 * Check if user can adjust stock
 * @param {string} role 
 * @param {string} userBranch 
 * @param {string} targetBranch 
 */
export function canAdjustStock(role, userBranch, targetBranch) {
  if (role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.INVENTORY_MANAGER) return true;
  
  if (role === USER_ROLES.MABOLA_MANAGER) {
    return targetBranch === 'mabola';
  }
  
  if (role === USER_ROLES.JAFFNA_MANAGER) {
    return targetBranch === 'jaffna';
  }

  return false; // Sales users cannot adjust stock
}

/**
 * Check if user can create bills
 * @param {string} role 
 */
export function canCreateBills(role) {
  return hasRole(role, [
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.MABOLA_MANAGER,
    USER_ROLES.JAFFNA_MANAGER,
    USER_ROLES.SALES_USER
  ]);
}

/**
 * Check if the user has access to a specific branch's data
 * @param {string} userRole 
 * @param {string} userBranch 
 * @param {string} targetBranch 
 */
export function hasBranchAccess(userRole, userBranch, targetBranch) {
  // Global roles or 'all' branch access
  if (
    userRole === USER_ROLES.SUPER_ADMIN || 
    userRole === USER_ROLES.INVENTORY_MANAGER ||
    userBranch === 'all'
  ) {
    return true;
  }
  
  // Specific branch access
  return userBranch === targetBranch;
}
