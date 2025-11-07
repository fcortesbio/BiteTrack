/**
 * @bitetrack/shared-types
 * 
 * Shared types, constants, and validation schemas across BiteTrack services.
 * This package can be imported by:
 * - services/api (backend validation)
 * - services/frontend (TypeScript types)
 * - services/mcp (AI tool schemas)
 * 
 * Example usage:
 * import { USER_ROLES, PRODUCT_CATEGORIES } from '@bitetrack/shared-types';
 */

// User role constants (matches backend auth system)
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
};

// Product categories for inventory management
export const PRODUCT_CATEGORIES = {
  FOOD: 'food',
  BEVERAGE: 'beverage',
  OTHER: 'other',
};

// Payment status for sales tracking
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SETTLED: 'settled',
};

// Inventory drop reasons (food waste compliance)
export const DROP_REASONS = {
  EXPIRED: 'expired',
  DAMAGED: 'damaged',
  CONTAMINATED: 'contaminated',
  SPOILED: 'spoiled',
  OTHER: 'other',
};

// Export all constants
export default {
  USER_ROLES,
  PRODUCT_CATEGORIES,
  PAYMENT_STATUS,
  DROP_REASONS,
};
