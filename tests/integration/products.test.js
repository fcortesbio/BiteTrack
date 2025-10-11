/**
 * Products Routes Integration Tests
 * Tests all product management endpoints
 */
const request = require('supertest');
const app = require('../../testApp');
const Product = require('../../models/Product');
const Seller = require('../../models/Seller');
// const { faker } = require('@faker-js/faker'); // If you want to use faker later


// describe('Product Management Routes', () => {
//   it('TODO: Implement product tests', () => {
//     expect(true).toBe(true); // Placeholder to prevent test failures
//   });
// });

describe('Product Management Routes', () => {
  let authToken;
  let testSeller;

  // Setup authentication for all tests
  beforeEach(async () => {
    // Create a test seller for authentication
    testSeller = new Seller({
      firstName: 'Generic',
      lastName: 'Seller',
      email: 'salesman@bitetrack.io',
      password: 'TestPassword123!',
      dateOfBirth: new Date('1998-04-21'),
      role: 'user',
      createdBy: testUtils.generateObjectId(),
    });
    await testSeller.save();

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/bitetrack/auth/login')
      .send({
        email: 'salesman@bitetrack.io',
        password: 'TestPassword123!',
      });

    authToken = loginResponse.body.token;
  });
  // TODO: Implement comprehensive product route tests
  // This file will contain tests for:
  // - GET /products (list products with pagination/search)
  // - GET /products/:id (get single product)
  // - PUT /products/:id (update product)
  // - DELETE /products/:id (delete product)

  // - POST /products (create product)
  describe('POST /bitetrack/products', () => {
    it('should create a new product with valid data',
      async () => {
        // Arrange
        const productData = {
          productName: 'Delicious Sandwich',
          description: 'A mouth-watering sandwich with fresh ingredients',
          price: 12.99,
          count: 25
        };

        // Act
        const response = await request(app)
          .post('/bitetrack/products')
          .set('Authorization', `Bearer ${authToken}`)
          .send(productData);

        // Assert
        expect(response.status).toBe(201);
        expect(response.body.productName).toBe(productData.productName);
        expect(response.body.description).toBe(productData.description);
        expect(response.body.price).toBe(productData.price);
        expect(response.body.count).toBe(productData.count);
        expect(response.body).toHaveProperty('id'); // API returns 'id' instead of '_id'
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');

        // Verify product was saved to database
        const savedProduct = await Product.findById(response.body.id);
        expect(savedProduct).toBeTruthy();
        expect(savedProduct.productName).toBe(productData.productName);
      });
    // it('Should create product with minimum required fields',
    //   async () => {

    //   }
    // )
  });
});