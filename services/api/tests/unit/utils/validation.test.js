/**
 * Unit Tests for Validation Utils
 * Tests validation rules and middleware
 */

import { jest } from '@jest/globals';

// Mock express-validator for ESM
const mockValidationResult = jest.fn();

jest.unstable_mockModule('express-validator', () => ({
  validationResult: mockValidationResult,
  body: jest.fn(() => ({
    isEmail: jest.fn().mockReturnThis(),
    normalizeEmail: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    notEmpty: jest.fn().mockReturnThis(),
    isISO8601: jest.fn().mockReturnThis(),
    toDate: jest.fn().mockReturnThis(),
    trim: jest.fn().mockReturnThis(),
    matches: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    isInt: jest.fn().mockReturnThis(),
    isFloat: jest.fn().mockReturnThis(),
    isMongoId: jest.fn().mockReturnThis(),
    isArray: jest.fn().mockReturnThis(),
    custom: jest.fn().mockReturnThis(),
  })),
  query: jest.fn(() => ({
    isEmail: jest.fn().mockReturnThis(),
    normalizeEmail: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
  })),
}));

let validationRules, validate;
beforeAll(async () => {
  ({ validationRules, validate } = await import('../../../utils/validation.js'));
});

describe('Validation Utils', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('validationRules', () => {
    it('should have all required validation rule sets', () => {
      const expectedRules = [
        'login',
        'activate',
        'resetPassword',
        'getSellerByEmail',
        'createPendingSeller',
        'updateSeller',
        'changeRole',
        'createCustomer',
        'updateCustomer',
        'createProduct',
        'updateProduct',
        'createSale',
        'settleSale',
      ];

      expectedRules.forEach(rule => {
        expect(validationRules).toHaveProperty(rule);
        expect(Array.isArray(validationRules[rule])).toBe(true);
      });
    });

    it('should have non-empty validation arrays', () => {
      Object.keys(validationRules).forEach(key => {
        expect(validationRules[key].length).toBeGreaterThan(0);
      });
    });
  });

  describe('validate middleware', () => {
    it('should call next() when no validation errors', () => {
      const mockErrors = {
        isEmpty: jest.fn().mockReturnValue(true),
      };
      mockValidationResult.mockReturnValue(mockErrors);

      validate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 error when validation fails', () => {
      const mockErrorDetails = [
        { path: 'email', msg: 'Valid email is required' },
        { path: 'password', msg: 'Password is required' },
      ];
      
      const mockErrors = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(mockErrorDetails),
      };
      mockValidationResult.mockReturnValue(mockErrors);

      validate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: [
          { field: 'email', message: 'Valid email is required' },
          { field: 'password', message: 'Password is required' },
        ],
        statusCode: 400,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should map error details correctly', () => {
      const mockErrorDetails = [
        { path: 'firstName', msg: 'First name is required' },
      ];
      
      const mockErrors = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(mockErrorDetails),
      };
      mockValidationResult.mockReturnValue(mockErrors);

      validate(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: [
            { field: 'firstName', message: 'First name is required' },
          ],
        }),
      );
    });

    it('should handle multiple validation errors', () => {
      const mockErrorDetails = [
        { path: 'email', msg: 'Valid email is required' },
        { path: 'password', msg: 'Password must be at least 8 characters' },
        { path: 'firstName', msg: 'First name is required' },
      ];
      
      const mockErrors = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(mockErrorDetails),
      };
      mockValidationResult.mockReturnValue(mockErrors);

      validate(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            { field: 'email', message: 'Valid email is required' },
            { field: 'password', message: 'Password must be at least 8 characters' },
            { field: 'firstName', message: 'First name is required' },
          ]),
        }),
      );
    });
  });

  describe('validation rule structure', () => {
    it('should have proper structure for login validation', () => {
      expect(validationRules.login).toBeDefined();
      expect(Array.isArray(validationRules.login)).toBe(true);
    });

    it('should have proper structure for createCustomer validation', () => {
      expect(validationRules.createCustomer).toBeDefined();
      expect(Array.isArray(validationRules.createCustomer)).toBe(true);
    });

    it('should have proper structure for createProduct validation', () => {
      expect(validationRules.createProduct).toBeDefined();
      expect(Array.isArray(validationRules.createProduct)).toBe(true);
    });

    it('should have proper structure for createSale validation', () => {
      expect(validationRules.createSale).toBeDefined();
      expect(Array.isArray(validationRules.createSale)).toBe(true);
    });
  });
});