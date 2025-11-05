/**
 * Jest Test Setup Configuration
 * Sets up in-memory MongoDB for isolated testing
 */
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

// Setup environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.NODE_ENV = 'test';

// Setup before all tests
beforeAll(async() => {
  // Start MongoDB Memory Server
mongoServer = await MongoMemoryReplSet.create({
    replset: {
      count: 1,
      storageEngine: 'wiredTiger',
      // version: '8.0.14', // Our Docker Image MongoDB version
    },
  });
  
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri, {
    // Remove deprecated options
  });

  // Increase test timeout for complex operations
  jest.setTimeout(30000);
});

// Cleanup after all tests
afterAll(async() => {
  // Close mongoose connection
  await mongoose.connection.close();
  
  // Stop MongoDB Memory Server
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Clear database between tests to ensure isolation
afterEach(async() => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});

// Global test utilities
global.testUtils = {
  // Helper to create test user
  createTestUser: () => ({
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'TestPassword123!',
    role: 'seller',
  }),

  // Helper to create admin user
  createAdminUser: () => ({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com', 
    password: 'AdminPassword123!',
    role: 'admin',
  }),

  // Helper to create test product
  createTestProduct: () => ({
    productName: 'Test Sandwich',
    description: 'A test sandwich for testing purposes',
    price: 9.99,
    count: 50,
  }),

  // Helper to create test customer
  createTestCustomer: () => ({
    firstName: 'Test',
    lastName: 'Customer',
    email: 'customer@example.com',
    phone: '+1234567890',
  }),

  // Generate valid MongoDB ObjectId string
  generateObjectId: () => new mongoose.Types.ObjectId().toString(),
  
  // Wait helper for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
};

// Console logging for test debugging
console.log('🧪 Test environment initialized with MongoDB Memory Server');