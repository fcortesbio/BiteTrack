/**
 * Request Helper Utilities for Testing
 * Provides common HTTP request patterns and utilities
 */
import request from 'supertest';

/**
 * Common request builder patterns
 */
const requestBuilders = {
  
  /**
   * Create authenticated POST request
   * @param {Express.Application} app - Express app instance
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @param {string} token - JWT token
   * @returns {supertest.Test} Configured request object
   */
  authenticatedPost: (app, endpoint, data, token) => {
    return request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${token}`)
      .send(data);
  },

  /**
   * Create authenticated GET request
   * @param {Express.Application} app - Express app instance
   * @param {string} endpoint - API endpoint
   * @param {string} token - JWT token
   * @param {Object} query - Query parameters
   * @returns {supertest.Test} Configured request object
   */
  authenticatedGet: (app, endpoint, token, query = {}) => {
    const req = request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${token}`);
    
    // Add query parameters if provided
    Object.keys(query).forEach(key => {
      req.query({ [key]: query[key] });
    });
    
    return req;
  },

  /**
   * Create authenticated PUT request
   * @param {Express.Application} app - Express app instance
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @param {string} token - JWT token
   * @returns {supertest.Test} Configured request object
   */
  authenticatedPut: (app, endpoint, data, token) => {
    return request(app)
      .put(endpoint)
      .set('Authorization', `Bearer ${token}`)
      .send(data);
  },

  /**
   * Create authenticated DELETE request
   * @param {Express.Application} app - Express app instance
   * @param {string} endpoint - API endpoint
   * @param {string} token - JWT token
   * @returns {supertest.Test} Configured request object
   */
  authenticatedDelete: (app, endpoint, token) => {
    return request(app)
      .delete(endpoint)
      .set('Authorization', `Bearer ${token}`);
  },

  /**
   * Create unauthenticated POST request
   * @param {Express.Application} app - Express app instance
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @returns {supertest.Test} Configured request object
   */
  unauthenticatedPost: (app, endpoint, data) => {
    return request(app)
      .post(endpoint)
      .send(data);
  },

  /**
   * Create unauthenticated GET request
   * @param {Express.Application} app - Express app instance
   * @param {string} endpoint - API endpoint
   * @param {Object} query - Query parameters
   * @returns {supertest.Test} Configured request object
   */
  unauthenticatedGet: (app, endpoint, query = {}) => {
    const req = request(app).get(endpoint);
    
    // Add query parameters if provided
    Object.keys(query).forEach(key => {
      req.query({ [key]: query[key] });
    });
    
    return req;
  },
};

/**
 * Request validation patterns
 */
const requestValidators = {
  
  /**
   * Test authentication requirement for endpoint
   * @param {Express.Application} app - Express app instance
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data (for POST/PUT)
   * @returns {Promise<Object>} Response object
   */
  testAuthenticationRequired: async(app, method, endpoint, data = {}) => {
    let request;
    
    switch (method.toUpperCase()) {
    case 'GET':
      request = requestBuilders.unauthenticatedGet(app, endpoint);
      break;
    case 'POST':
      request = requestBuilders.unauthenticatedPost(app, endpoint, data);
      break;
    case 'PUT':
      request = requestBuilders.unauthenticatedPut(app, endpoint, data);
      break;
    case 'DELETE':
      request = requestBuilders.unauthenticatedDelete(app, endpoint);
      break;
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
    }
    
    return await request;
  },

  /**
   * Test authorization requirement for different roles
   * @param {Express.Application} app - Express app instance
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {string} token - JWT token
   * @param {Object} data - Request body data
   * @returns {Promise<Object>} Response object
   */
  testAuthorizationRequired: async(app, method, endpoint, token, data = {}) => {
    let request;
    
    switch (method.toUpperCase()) {
    case 'GET':
      request = requestBuilders.authenticatedGet(app, endpoint, token);
      break;
    case 'POST':
      request = requestBuilders.authenticatedPost(app, endpoint, data, token);
      break;
    case 'PUT':
      request = requestBuilders.authenticatedPut(app, endpoint, data, token);
      break;
    case 'DELETE':
      request = requestBuilders.authenticatedDelete(app, endpoint, token);
      break;
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
    }
    
    return await request;
  },
};

/**
 * Common test scenarios
 */
const commonTestScenarios = {
  
  /**
   * Test pagination for GET endpoints
   * @param {Express.Application} app - Express app instance
   * @param {string} endpoint - API endpoint
   * @param {string} token - JWT token (optional)
   * @param {Object} testData - Test data configuration
   * @returns {Object} Test scenarios for pagination
   */
  paginationTests: (app, endpoint, token = null, _testData = {}) => ({
    
    /**
     * Test first page with default limit
     */
    testFirstPage: async() => {
      const req = token 
        ? requestBuilders.authenticatedGet(app, endpoint, token, { page: 1 })
        : requestBuilders.unauthenticatedGet(app, endpoint, { page: 1 });
      
      return await req;
    },

    /**
     * Test custom page size
     */
    testCustomPageSize: async(limit = 5) => {
      const req = token 
        ? requestBuilders.authenticatedGet(app, endpoint, token, { page: 1, limit })
        : requestBuilders.unauthenticatedGet(app, endpoint, { page: 1, limit });
      
      return await req;
    },

    /**
     * Test invalid pagination parameters
     */
    testInvalidPagination: async() => {
      const req = token 
        ? requestBuilders.authenticatedGet(app, endpoint, token, { page: -1, limit: 0 })
        : requestBuilders.unauthenticatedGet(app, endpoint, { page: -1, limit: 0 });
      
      return await req;
    },
  }),

  /**
   * Test CRUD operations for a resource
   * @param {Express.Application} app - Express app instance
   * @param {string} baseEndpoint - Base API endpoint (e.g., '/products')
   * @param {string} token - JWT token
   * @param {Object} testData - Test data for CRUD operations
   * @returns {Object} CRUD test scenarios
   */
  crudTests: (app, baseEndpoint, token, testData) => ({
    
    /**
     * Test resource creation
     */
    testCreate: async(data = testData.valid) => {
      return await requestBuilders.authenticatedPost(app, baseEndpoint, data, token);
    },

    /**
     * Test resource retrieval by ID
     */
    testGetById: async(resourceId) => {
      return await requestBuilders.authenticatedGet(app, `${baseEndpoint}/${resourceId}`, token);
    },

    /**
     * Test resource list retrieval
     */
    testGetAll: async(query = {}) => {
      return await requestBuilders.authenticatedGet(app, baseEndpoint, token, query);
    },

    /**
     * Test resource update
     */
    testUpdate: async(resourceId, updateData = testData.update) => {
      return await requestBuilders.authenticatedPut(app, `${baseEndpoint}/${resourceId}`, updateData, token);
    },

    /**
     * Test resource deletion
     */
    testDelete: async(resourceId) => {
      return await requestBuilders.authenticatedDelete(app, `${baseEndpoint}/${resourceId}`, token);
    },

    /**
     * Test resource creation with invalid data
     */
    testCreateWithInvalidData: async(invalidData = testData.invalid) => {
      return await requestBuilders.authenticatedPost(app, baseEndpoint, invalidData, token);
    },

    /**
     * Test non-existent resource access
     */
    testNonExistentResource: async() => {
      const fakeId = '507f1f77bcf86cd799439011'; // Valid ObjectId format but non-existent
      return await requestBuilders.authenticatedGet(app, `${baseEndpoint}/${fakeId}`, token);
    },

    /**
     * Test invalid ObjectId format
     */
    testInvalidObjectId: async() => {
      const invalidId = 'invalid-object-id';
      return await requestBuilders.authenticatedGet(app, `${baseEndpoint}/${invalidId}`, token);
    },
  }),
};

/**
 * Performance testing helpers
 */
const performanceTestHelpers = {
  
  /**
   * Measure endpoint response time
   * @param {Function} requestFunction - Function that returns a promise for the request
   * @param {number} iterations - Number of iterations to run
   * @returns {Promise<Object>} Performance metrics
   */
  measureResponseTime: async(requestFunction, iterations = 10) => {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      await requestFunction();
      const endTime = Date.now();
      times.push(endTime - startTime);
    }
    
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    return {
      average: avgTime,
      minimum: minTime,
      maximum: maxTime,
      iterations,
      allTimes: times,
    };
  },

  /**
   * Test concurrent requests
   * @param {Function} requestFunction - Function that returns a promise for the request
   * @param {number} concurrentRequests - Number of concurrent requests
   * @returns {Promise<Object>} Concurrency test results
   */
  testConcurrency: async(requestFunction, concurrentRequests = 5) => {
    const startTime = Date.now();
    
    const promises = Array.from({ length: concurrentRequests }, () => requestFunction());
    const results = await Promise.allSettled(promises);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;
    
    return {
      totalTime,
      concurrentRequests,
      successful,
      failed,
      successRate: (successful / concurrentRequests) * 100,
      results,
    };
  },
};

export {
  requestBuilders,
  requestValidators,
  commonTestScenarios,
  performanceTestHelpers,
};
