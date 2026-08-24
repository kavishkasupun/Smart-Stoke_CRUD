/**
 * Business Logic Service Layer
 * 
 * This layer consumes the thin Firebase wrappers from src/firebase/
 * and implements actual business rules (e.g., stock validation, 
 * calculating bill totals, preparing complex queries).
 * 
 * UI components should call these services instead of calling 
 * Firestore directly.
 */

// Re-export the connection test utility for now
export { testFirebaseConnection } from '../firebase';

// Future services will be exported here:
// export * as ProductService from './productService';
// export * as StockService from './stockService';
// export * as BillingService from './billingService';
