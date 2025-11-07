/**
 * Authentication Helper Utilities for Testing
 * Provides common authentication patterns and JWT token management
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import Seller from '../../models/Seller.js';

/**
 * Login a user and return response with token
 * @param {Express.Application} app - Express app instance
 * @param {Object} credentials - Login credentials
 * @returns {Promise<Object>} Login response with token
 */
const loginUser = async(app, credentials) => {
  const response = await request(app)
    .post('/bitetrack/auth/login')
    .send(credentials);
  
  return response;
};

/**
 * Register and login a user, return auth token
 * @param {Express.Application} app - Express app instance
 * @param {Object} userData - User registration data
 * @returns {Promise<string>} JWT token
 */
const getAuthToken = async(app, userData = null) => {
  // Use provided data or create default test user
  const defaultUserData = userData || testUtils.createTestUser();
  
  // Register user
  await request(app)
    .post('/bitetrack/auth/register')
    .send(defaultUserData);
  
  // Login user
  const loginResponse = await loginUser(app, {
    email: defaultUserData.email,
    password: defaultUserData.password,
  });
  
  if (loginResponse.status === 200 && loginResponse.body.token) {
    return loginResponse.body.token;
  }
  
  throw new Error(`Failed to get auth token: ${loginResponse.body.message || 'Unknown error'}`);
};

/**
 * Get auth token for a specific role
 * @param {Express.Application} app - Express app instance
 * @param {string} role - User role ('seller', 'admin', 'superadmin')
 * @returns {Promise<string>} JWT token
 */
const getAuthTokenForRole = async(app, role = 'seller') => {
  let userData;
  
  switch (role) {
  case 'admin':
  case 'superadmin':
    userData = testUtils.createAdminUser();
    userData.role = role;
    break;
  default:
    userData = testUtils.createTestUser();
    userData.role = role;
  }
  
  return await getAuthToken(app, userData);
};

/**
 * Create authenticated request with token in header
 * @param {supertest.Test} requestObject - Supertest request object
 * @param {string} token - JWT token
 * @returns {supertest.Test} Request with authorization header
 */
const createAuthenticatedRequest = (requestObject, token) => {
  return requestObject.set('Authorization', `Bearer ${token}`);
};

/**
 * Create and return a registered user directly in database
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user object
 */
const createUserDirectly = async(userData = null) => {
  const defaultUserData = userData || testUtils.createTestUser();
  
  const user = new Seller(defaultUserData);
  await user.save();
  
  return user;
};

/**
 * Create admin user directly in database  
 * @param {string} role - Admin role ('admin' or 'superadmin')
 * @returns {Promise<Object>} Created admin user object
 */
const createAdminUserDirectly = async(role = 'admin') => {
  const adminData = testUtils.createAdminUser();
  adminData.role = role;
  
  const admin = new Seller(adminData);
  await admin.save();
  
  return admin;
};

/**
 * Verify JWT token structure and validity
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyTokenStructure = (token) => {
  expect(token).toBeTruthy();
  expect(typeof token).toBe('string');
  
  // Decode without verification to check structure
  const decoded = jwt.decode(token);
  expect(decoded).toHaveProperty('userId');
  expect(decoded).toHaveProperty('email');
  expect(decoded).toHaveProperty('role');
  expect(decoded).toHaveProperty('iat');
  expect(decoded).toHaveProperty('exp');
  
  return decoded;
};

/**
 * Extract user ID from JWT token
 * @param {string} token - JWT token
 * @returns {string} User ID
 */
const getUserIdFromToken = (token) => {
  const decoded = jwt.decode(token);
  return decoded.userId;
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if token is expired
 */
const isTokenExpired = (token) => {
  const decoded = jwt.decode(token);
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
};

/**
 * Create expired JWT token for testing
 * @param {Object} payload - Token payload
 * @returns {string} Expired JWT token
 */
const createExpiredToken = (payload = {}) => {
  const expiredPayload = {
    userId: testUtils.generateObjectId(),
    email: 'test@example.com',
    role: 'seller',
    ...payload,
  };
  
  return jwt.sign(expiredPayload, process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only-not-for-production', {
    expiresIn: '-1h', // Expired 1 hour ago
  });
};

/**
 * Create malformed JWT token for testing
 * @returns {string} Malformed token
 */
const createMalformedToken = () => {
  return 'invalid.jwt.token.structure';
};

export {
  loginUser,
  getAuthToken,
  getAuthTokenForRole,
  createAuthenticatedRequest,
  createUserDirectly,
  createAdminUserDirectly,
  verifyTokenStructure,
  getUserIdFromToken,
  isTokenExpired,
  createExpiredToken,
  createMalformedToken,
};
