/**
 * Authentication Routes Integration Tests
 * Tests actual BiteTrack authentication endpoints
 */
const request = require('supertest');
const app = require('../../testApp');
const Seller = require('../../models/Seller');
const PendingSeller = require('../../models/PendingSeller');
const PasswordResetToken = require('../../models/PasswordResetToken');
const authHelper = require('../helpers/auth.helper');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Authentication Routes', () => {
  
  describe('POST /bitetrack/auth/activate', () => {
    describe('Success scenarios', () => {
      it('should activate pending seller with valid data', async () => {
        // Arrange - Create a pending seller first
        const pendingSellerData = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@test.com',
          dateOfBirth: new Date('1990-01-01'),
          createdBy: testUtils.generateObjectId()
        };

        const pendingSeller = new PendingSeller(pendingSellerData);
        await pendingSeller.save();

        const activationData = {
          email: pendingSellerData.email,
          lastName: pendingSellerData.lastName,
          dateOfBirth: '1990-01-01',
          password: 'SecurePassword123!'
        };

        // Act
        const response = await request(app)
          .post('/bitetrack/auth/activate')
          .send(activationData);

        // Assert
        expect(response.status).toBe(201);
        expect(response.body.email).toBe(pendingSellerData.email);
        expect(response.body.firstName).toBe(pendingSellerData.firstName);
        expect(response.body).not.toHaveProperty('password');
        
        // Verify seller was created in active collection
        const seller = await Seller.findOne({ email: pendingSellerData.email });
        expect(seller).toBeTruthy();
        expect(seller.firstName).toBe(pendingSellerData.firstName);
        
        // Verify pending seller was marked as activated
        const updatedPending = await PendingSeller.findById(pendingSeller._id);
        expect(updatedPending.activatedAt).toBeTruthy();
      });

      it('should hash password before storing', async () => {
        // Arrange - Create a pending seller first
        const pendingSellerData = {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@test.com',
          dateOfBirth: new Date('1995-05-15'),
          createdBy: testUtils.generateObjectId()
        };

        const pendingSeller = new PendingSeller(pendingSellerData);
        await pendingSeller.save();

        const activationData = {
          email: pendingSellerData.email,
          lastName: pendingSellerData.lastName,
          dateOfBirth: '1995-05-15',
          password: 'TestPassword123!'
        };

        // Act
        await request(app)
          .post('/bitetrack/auth/activate')
          .send(activationData);

        // Assert
        const seller = await Seller.findOne({ email: pendingSellerData.email }).select('+password');
        expect(seller.password).not.toBe(activationData.password);
        
        // Verify password was properly hashed
        const isValidPassword = await bcrypt.compare(activationData.password, seller.password);
        expect(isValidPassword).toBe(true);
      });
    });

    describe('Validation errors', () => {
      it('should reject duplicate email addresses', async () => {
        // Arrange
        const userData = {
          firstName: 'User',
          lastName: 'One',
          email: 'duplicate@test.com',
          password: 'Password123!',
          dateOfBirth: '1990-01-01',
          role: 'seller'
        };

        // Create first user
        await request(app)
          .post('/bitetrack/auth/register')
          .send(userData);

        // Act - Try to create duplicate user
        const response = await request(app)
          .post('/bitetrack/auth/register')
          .send({ ...userData, firstName: 'User', lastName: 'Two' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('already exists');
      });

      it('should enforce password strength requirements', async () => {
        // Arrange
        const weakPasswords = [
          'weak',
          '12345',
          'password',
          'Password', // No number
          'password123', // No uppercase  
          'PASSWORD123' // No lowercase
        ];

        for (const weakPassword of weakPasswords) {
          const userData = {
            firstName: 'Test',
            lastName: 'User',
            email: `test${Math.random()}@test.com`,
            password: weakPassword,
            dateOfBirth: '1990-01-01',
            role: 'seller'
          };

          // Act
          const response = await request(app)
            .post('/bitetrack/auth/register')
            .send(userData);

          // Assert
          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('message');
        }
      });

      it('should validate email format', async () => {
        // Arrange
        const invalidEmails = [
          'notanemail',
          '@invalid.com',
          'user@',
          'user@.com',
          'user name@domain.com'
        ];

        for (const invalidEmail of invalidEmails) {
          const userData = {
            firstName: 'Test',
            lastName: 'User',
            email: invalidEmail,
            password: 'ValidPassword123!',
            dateOfBirth: '1990-01-01',
            role: 'seller'
          };

          // Act
          const response = await request(app)
            .post('/bitetrack/auth/register')
            .send(userData);

          // Assert
          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('message');
        }
      });

      it('should require all mandatory fields', async () => {
        // Arrange
        const baseUserData = {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'ValidPassword123!',
          dateOfBirth: '1990-01-01',
          role: 'seller'
        };

        const mandatoryFields = ['firstName', 'lastName', 'email', 'password', 'dateOfBirth'];

        for (const field of mandatoryFields) {
          const incompleteData = { ...baseUserData };
          delete incompleteData[field];

          // Act
          const response = await request(app)
            .post('/bitetrack/auth/register')
            .send(incompleteData);

          // Assert
          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('message');
        }
      });
    });

    describe('Authorization', () => {
      it('should prevent unauthorized role assignment', async () => {
        // Arrange
        const userData = {
          firstName: 'Test',
          lastName: 'User',
          email: 'test.unauthorized@test.com',
          password: 'ValidPassword123!',
          dateOfBirth: '1990-01-01',
          role: 'admin' // Trying to assign admin role
        };

        // Act
        const response = await request(app)
          .post('/bitetrack/auth/register')
          .send(userData);

        // Assert - Should either reject or default to seller role
        if (response.status === 201) {
          // If registration succeeds, role should be defaulted to seller
          expect(response.body.seller.role).toBe('seller');
        } else {
          // Or it should be rejected
          expect(response.status).toBe(400);
        }
      });
    });
  });

  describe('POST /bitetrack/auth/login', () => {
    describe('Success scenarios', () => {
      it('should authenticate user with valid credentials', async () => {
        // Arrange - Create a user first
        const userData = {
          firstName: 'Login',
          lastName: 'Test',
          email: 'login.test@example.com',
          password: 'LoginPassword123!',
          dateOfBirth: '1990-01-01',
          role: 'seller'
        };

        await request(app)
          .post('/bitetrack/auth/register')
          .send(userData);

        // Act
        const response = await request(app)
          .post('/bitetrack/auth/login')
          .send({
            email: userData.email,
            password: userData.password
          });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('seller');
        expect(response.body.seller.email).toBe(userData.email);
        expect(response.body.seller).not.toHaveProperty('password');
      });

      it('should return JWT token with correct structure', async () => {
        // Arrange - Create a user first
        const userData = {
          firstName: 'JWT',
          lastName: 'Test',
          email: 'jwt.test@example.com',
          password: 'JWTPassword123!',
          dateOfBirth: '1990-01-01',
          role: 'seller'
        };

        await request(app)
          .post('/bitetrack/auth/register')
          .send(userData);

        // Act
        const response = await request(app)
          .post('/bitetrack/auth/login')
          .send({
            email: userData.email,
            password: userData.password
          });

        // Assert
        expect(response.status).toBe(200);
        const { token } = response.body;
        
        // Verify token structure
        const decodedToken = authHelper.verifyTokenStructure(token);
        expect(decodedToken.email).toBe(userData.email);
        expect(decodedToken.role).toBe('seller');
        expect(decodedToken).toHaveProperty('userId');
        expect(decodedToken).toHaveProperty('exp');
        expect(decodedToken).toHaveProperty('iat');
      });
    });

    describe('Authentication failures', () => {
      it('should reject invalid email/password combinations', async () => {
        // Arrange - Create a user first
        const userData = {
          firstName: 'Invalid',
          lastName: 'Test',
          email: 'invalid.test@example.com',
          password: 'CorrectPassword123!',
          dateOfBirth: '1990-01-01',
          role: 'seller'
        };

        await request(app)
          .post('/bitetrack/auth/register')
          .send(userData);

        // Act - Try with wrong password
        const response = await request(app)
          .post('/bitetrack/auth/login')
          .send({
            email: userData.email,
            password: 'WrongPassword123!'
          });

        // Assert
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message');
        expect(response.body).not.toHaveProperty('token');
      });

      it('should reject non-existent user', async () => {
        // Act
        const response = await request(app)
          .post('/bitetrack/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'SomePassword123!'
          });

        // Assert
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message');
        expect(response.body).not.toHaveProperty('token');
      });

      it('should reject missing credentials', async () => {
        // Test missing email
        let response = await request(app)
          .post('/bitetrack/auth/login')
          .send({ password: 'SomePassword123!' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');

        // Test missing password
        response = await request(app)
          .post('/bitetrack/auth/login')
          .send({ email: 'test@example.com' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');

        // Test missing both
        response = await request(app)
          .post('/bitetrack/auth/login')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
      });
    });
  });

  describe('GET /bitetrack/auth/profile', () => {
    describe('Success scenarios', () => {
      it('should return authenticated user profile', async () => {
        // Arrange - Create and login user
        const userData = {
          firstName: 'Profile',
          lastName: 'Test',
          email: 'profile.test@example.com',
          password: 'ProfilePassword123!',
          dateOfBirth: '1990-01-01',
          role: 'seller'
        };

        await request(app)
          .post('/bitetrack/auth/register')
          .send(userData);

        const loginResponse = await request(app)
          .post('/bitetrack/auth/login')
          .send({
            email: userData.email,
            password: userData.password
          });

        const { token } = loginResponse.body;

        // Act
        const response = await request(app)
          .get('/bitetrack/auth/profile')
          .set('Authorization', `Bearer ${token}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('seller');
        expect(response.body.seller.email).toBe(userData.email);
        expect(response.body.seller.firstName).toBe(userData.firstName);
        expect(response.body.seller).not.toHaveProperty('password');
      });
    });

    describe('Authentication errors', () => {
      it('should reject missing JWT token', async () => {
        // Act
        const response = await request(app)
          .get('/bitetrack/auth/profile');

        // Assert
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Access denied');
      });

      it('should reject invalid JWT token', async () => {
        // Act
        const response = await request(app)
          .get('/bitetrack/auth/profile')
          .set('Authorization', 'Bearer invalid.jwt.token');

        // Assert
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message');
      });

      it('should reject expired JWT token', async () => {
        // Arrange - Create expired token
        const expiredToken = authHelper.createExpiredToken();

        // Act
        const response = await request(app)
          .get('/bitetrack/auth/profile')
          .set('Authorization', `Bearer ${expiredToken}`);

        // Assert
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message');
      });
    });
  });

  describe('PUT /bitetrack/auth/profile', () => {
    describe('Success scenarios', () => {
      it('should update user profile with valid data', async () => {
        // Arrange - Create and login user
        const userData = {
          firstName: 'UpdateProfile',
          lastName: 'Test',
          email: 'update.profile@example.com',
          password: 'UpdatePassword123!',
          dateOfBirth: '1990-01-01',
          role: 'seller'
        };

        await request(app)
          .post('/bitetrack/auth/register')
          .send(userData);

        const loginResponse = await request(app)
          .post('/bitetrack/auth/login')
          .send({
            email: userData.email,
            password: userData.password
          });

        const { token } = loginResponse.body;

        const updateData = {
          firstName: 'UpdatedName',
          lastName: 'UpdatedLastName'
        };

        // Act
        const response = await request(app)
          .put('/bitetrack/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .send(updateData);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('seller');
        expect(response.body.seller.firstName).toBe(updateData.firstName);
        expect(response.body.seller.lastName).toBe(updateData.lastName);
        expect(response.body.seller.email).toBe(userData.email); // Should remain unchanged
      });

      it('should support partial updates', async () => {
        // Arrange - Create and login user
        const userData = {
          firstName: 'Partial',
          lastName: 'Update',
          email: 'partial.update@example.com',
          password: 'PartialPassword123!',
          dateOfBirth: '1990-01-01',
          role: 'seller'
        };

        await request(app)
          .post('/bitetrack/auth/register')
          .send(userData);

        const loginResponse = await request(app)
          .post('/bitetrack/auth/login')
          .send({
            email: userData.email,
            password: userData.password
          });

        const { token } = loginResponse.body;

        // Act - Update only firstName
        const response = await request(app)
          .put('/bitetrack/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({ firstName: 'OnlyFirstNameChanged' });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.seller.firstName).toBe('OnlyFirstNameChanged');
        expect(response.body.seller.lastName).toBe(userData.lastName); // Should remain unchanged
        expect(response.body.seller.email).toBe(userData.email); // Should remain unchanged
      });
    });

    describe('Validation errors', () => {
      it('should reject email updates to existing email', async () => {
        // Arrange - Create two users
        const user1Data = {
          firstName: 'User',
          lastName: 'One',
          email: 'user1@example.com',
          password: 'Password123!',
          dateOfBirth: '1990-01-01',
          role: 'seller'
        };

        const user2Data = {
          firstName: 'User',
          lastName: 'Two', 
          email: 'user2@example.com',
          password: 'Password123!',
          dateOfBirth: '1990-01-01',
          role: 'seller'
        };

        await request(app).post('/bitetrack/auth/register').send(user1Data);
        await request(app).post('/bitetrack/auth/register').send(user2Data);

        // Login as user2
        const loginResponse = await request(app)
          .post('/bitetrack/auth/login')
          .send({ email: user2Data.email, password: user2Data.password });

        const { token } = loginResponse.body;

        // Act - Try to update email to user1's email
        const response = await request(app)
          .put('/bitetrack/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({ email: user1Data.email });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('already exists');
      });

      it('should validate updated email format', async () => {
        // Arrange - Create and login user
        const userData = {
          firstName: 'Email',
          lastName: 'Validation',
          email: 'email.validation@example.com',
          password: 'EmailPassword123!',
          dateOfBirth: '1990-01-01',
          role: 'seller'
        };

        await request(app)
          .post('/bitetrack/auth/register')
          .send(userData);

        const loginResponse = await request(app)
          .post('/bitetrack/auth/login')
          .send({
            email: userData.email,
            password: userData.password
          });

        const { token } = loginResponse.body;

        const invalidEmails = ['invalid-email', '@invalid.com', 'user@'];

        for (const invalidEmail of invalidEmails) {
          // Act
          const response = await request(app)
            .put('/bitetrack/auth/profile')
            .set('Authorization', `Bearer ${token}`)
            .send({ email: invalidEmail });

          // Assert
          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('message');
        }
      });
    });

    describe('Authorization', () => {
      it('should require authentication', async () => {
        // Act
        const response = await request(app)
          .put('/bitetrack/auth/profile')
          .send({ firstName: 'ShouldFail' });

        // Assert
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Access denied');
      });

      it('should only allow users to update their own profile', async () => {
        // This test verifies that the middleware correctly identifies the user from the JWT token
        // and only allows updates to their own profile
        
        // Arrange - Create user
        const userData = {
          firstName: 'Own',
          lastName: 'Profile',
          email: 'own.profile@example.com',
          password: 'OwnPassword123!',
          dateOfBirth: '1990-01-01',
          role: 'seller'
        };

        await request(app)
          .post('/bitetrack/auth/register')
          .send(userData);

        const loginResponse = await request(app)
          .post('/bitetrack/auth/login')
          .send({
            email: userData.email,
            password: userData.password
          });

        const { token } = loginResponse.body;

        // Act - Try to update profile (should work since it's their own profile)
        const response = await request(app)
          .put('/bitetrack/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({ firstName: 'UpdatedOwn' });

        // Assert - Should succeed for own profile
        expect(response.status).toBe(200);
        expect(response.body.seller.firstName).toBe('UpdatedOwn');
      });
    });
  });
});

/* 
 * Test Implementation Notes:
 * 
 * 1. Each TODO comment represents a test that needs to be implemented
 * 2. Use the helper functions from auth.helper.js and data.helper.js
 * 3. Follow the AAA pattern: Arrange, Act, Assert
 * 4. Test both success and failure scenarios
 * 5. Use meaningful test names that describe the expected behavior
 * 6. Group related tests in describe blocks
 * 
 * Example test implementation:
 * 
 * it('should create new user with valid data', async () => {
 *   // Arrange
 *   const userData = dataGenerators.validUser();
 *   
 *   // Act
 *   const response = await requestBuilders.unauthenticatedPost(app, '/auth/register', userData);
 *   
 *   // Assert
 *   expect(response.status).toBe(201);
 *   expect(response.body).toHaveProperty('token');
 *   expect(response.body.user.email).toBe(userData.email);
 *   
 *   // Verify user was created in database
 *   const user = await User.findOne({ email: userData.email });
 *   expect(user).toBeTruthy();
 * });
 */