/**
 * Data Helper Utilities for Testing
 * Provides test data generation and validation utilities
 */
import mongoose from 'mongoose';

/**
 * Generate realistic test data for various scenarios
 */
const dataGenerators = {
  
  /**
   * Generate valid user registration data
   * @param {Object} overrides - Fields to override
   * @returns {Object} User data
   */
  validUser: (overrides = {}) => ({
    firstName: 'John',
    lastName: 'Doe', 
    email: `user${Date.now()}@example.com`,
    password: 'StrongPassword123!',
    role: 'seller',
    ...overrides,
  }),

  /**
   * Generate admin user data
   * @param {Object} overrides - Fields to override
   * @returns {Object} Admin user data
   */
  adminUser: (overrides = {}) => ({
    firstName: 'Admin',
    lastName: 'User',
    email: `admin${Date.now()}@example.com`,
    password: 'AdminPassword123!',
    role: 'admin',
    ...overrides,
  }),

  /**
   * Generate superadmin user data
   * @param {Object} overrides - Fields to override
   * @returns {Object} Superadmin user data
   */
  superAdminUser: (overrides = {}) => ({
    firstName: 'Super',
    lastName: 'Admin',
    email: `superadmin${Date.now()}@example.com`,
    password: 'SuperAdminPassword123!',
    role: 'superadmin',
    ...overrides,
  }),

  /**
   * Generate product data
   * @param {Object} overrides - Fields to override
   * @returns {Object} Product data
   */
  validProduct: (overrides = {}) => ({
    productName: `Test Product ${Date.now()}`,
    description: 'A delicious test product for testing purposes',
    price: 12.99,
    count: 50,
    ...overrides,
  }),

  /**
   * Generate customer data
   * @param {Object} overrides - Fields to override
   * @returns {Object} Customer data
   */
  validCustomer: (overrides = {}) => ({
    firstName: 'Customer',
    lastName: 'Test',
    email: `customer${Date.now()}@example.com`,
    phone: '+1234567890',
    ...overrides,
  }),

  /**
   * Generate sales transaction data
   * @param {string} customerId - Customer ID
   * @param {Array} products - Array of {productId, quantity, unitPrice}
   * @param {Object} overrides - Fields to override
   * @returns {Object} Sale data
   */
  validSale: (customerId, products = [], overrides = {}) => ({
    customerId,
    products: products.length > 0 ? products : [
      {
        productId: new mongoose.Types.ObjectId().toString(),
        quantity: 2,
        unitPrice: 12.99,
      },
    ],
    paymentMethod: 'cash',
    ...overrides,
  }),

  /**
   * Generate inventory drop data
   * @param {string} productId - Product ID
   * @param {Object} overrides - Fields to override
   * @returns {Object} Inventory drop data
   */
  validInventoryDrop: (productId, overrides = {}) => ({
    productId,
    quantityToDrop: 5,
    reason: 'end_of_day',
    notes: 'Test inventory drop',
    ...overrides,
  }),
};

/**
 * Invalid data generators for testing validation
 */
const invalidDataGenerators = {
  
  /**
   * Generate user data with validation errors
   */
  userValidationErrors: {
    missingEmail: () => ({ firstName: 'Test', lastName: 'User', password: 'Password123!' }),
    invalidEmail: () => ({ firstName: 'Test', lastName: 'User', email: 'invalid-email', password: 'Password123!' }),
    weakPassword: () => ({ firstName: 'Test', lastName: 'User', email: 'test@example.com', password: '123' }),
    missingFirstName: () => ({ lastName: 'User', email: 'test@example.com', password: 'Password123!' }),
    invalidRole: () => ({ firstName: 'Test', lastName: 'User', email: 'test@example.com', password: 'Password123!', role: 'invalid_role' }),
  },

  /**
   * Generate product data with validation errors
   */
  productValidationErrors: {
    missingName: () => ({ description: 'Test description', price: 12.99, count: 50 }),
    negativePrice: () => ({ productName: 'Test Product', description: 'Test description', price: -5.99, count: 50 }),
    negativeCount: () => ({ productName: 'Test Product', description: 'Test description', price: 12.99, count: -10 }),
    invalidPriceType: () => ({ productName: 'Test Product', description: 'Test description', price: 'invalid', count: 50 }),
  },

  /**
   * Generate customer data with validation errors
   */
  customerValidationErrors: {
    missingEmail: () => ({ firstName: 'Customer', lastName: 'Test', phone: '+1234567890' }),
    invalidEmail: () => ({ firstName: 'Customer', lastName: 'Test', email: 'invalid-email', phone: '+1234567890' }),
    invalidPhone: () => ({ firstName: 'Customer', lastName: 'Test', email: 'customer@example.com', phone: 'invalid-phone' }),
  },
};

/**
 * Database test utilities
 */
const dbTestUtils = {
  
  /**
   * Generate valid MongoDB ObjectId
   * @returns {string} Valid ObjectId string
   */
  generateObjectId: () => new mongoose.Types.ObjectId().toString(),
  
  /**
   * Generate invalid ObjectId for testing
   * @returns {string} Invalid ObjectId string
   */
  generateInvalidObjectId: () => 'invalid-object-id-format',
  
  /**
   * Check if string is valid ObjectId
   * @param {string} id - ID to check
   * @returns {boolean} True if valid ObjectId
   */
  isValidObjectId: (id) => mongoose.Types.ObjectId.isValid(id),
  
  /**
   * Create test ObjectIds for relationships
   * @param {number} count - Number of ObjectIds to generate
   * @returns {Array<string>} Array of ObjectId strings
   */
  generateObjectIds: (count = 1) => {
    return Array.from({ length: count }, () => new mongoose.Types.ObjectId().toString());
  },
};

/**
 * HTTP response test utilities
 */
const responseTestUtils = {
  
  /**
   * Assert successful response structure
   * @param {Object} response - Supertest response object
   * @param {number} expectedStatus - Expected status code
   * @param {Array<string>} expectedFields - Expected response fields
   */
  assertSuccessResponse: (response, expectedStatus = 200, expectedFields = []) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
    
    expectedFields.forEach(field => {
      expect(response.body).toHaveProperty(field);
    });
  },
  
  /**
   * Assert error response structure
   * @param {Object} response - Supertest response object
   * @param {number} expectedStatus - Expected status code
   * @param {string} expectedMessage - Expected error message (optional)
   */
  assertErrorResponse: (response, expectedStatus, expectedMessage = null) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
    
    if (expectedMessage) {
      expect(response.body.message).toMatch(expectedMessage);
    }
  },
  
  /**
   * Assert validation error response
   * @param {Object} response - Supertest response object
   * @param {Array<string>} expectedFieldErrors - Expected validation error fields
   */
  assertValidationErrorResponse: (response, expectedFieldErrors = []) => {
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
    
    if (expectedFieldErrors.length > 0) {
      expectedFieldErrors.forEach(field => {
        expect(response.body.message.toLowerCase()).toContain(field.toLowerCase());
      });
    }
  },
  
  /**
   * Assert authentication error
   * @param {Object} response - Supertest response object
   */
  assertAuthenticationError: (response) => {
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.message).toMatch(/unauthorized|authentication|token/i);
  },
  
  /**
   * Assert authorization error
   * @param {Object} response - Supertest response object
   */
  assertAuthorizationError: (response) => {
    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.message).toMatch(/forbidden|permission|authorization/i);
  },
};

/**
 * Pagination test utilities
 */
const paginationTestUtils = {
  
  /**
   * Generate pagination query parameters
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {Object} additionalParams - Additional query parameters
   * @returns {Object} Query parameters object
   */
  createPaginationParams: (page = 1, limit = 10, additionalParams = {}) => ({
    page,
    limit,
    ...additionalParams,
  }),
  
  /**
   * Assert pagination response structure
   * @param {Object} response - API response
   * @param {number} expectedPage - Expected current page
   * @param {number} expectedLimit - Expected limit
   */
  assertPaginationResponse: (response, expectedPage = 1, _expectedLimit = 10) => {
    expect(response.body).toHaveProperty('pagination');
    
    const pagination = response.body.pagination;
    expect(pagination).toHaveProperty('currentPage', expectedPage);
    expect(pagination).toHaveProperty('totalPages');
    expect(pagination).toHaveProperty('totalCount');
    expect(pagination).toHaveProperty('hasNextPage');
    expect(pagination).toHaveProperty('hasPrevPage');
    
    // Validate pagination logic
    expect(typeof pagination.totalPages).toBe('number');
    expect(typeof pagination.totalCount).toBe('number');
    expect(typeof pagination.hasNextPage).toBe('boolean');
    expect(typeof pagination.hasPrevPage).toBe('boolean');
  },
};

export {
  dataGenerators,
  invalidDataGenerators,
  dbTestUtils,
  responseTestUtils,
  paginationTestUtils,
};
