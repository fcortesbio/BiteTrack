/**
 * Unit Tests for JWT Utilities
 * Tests token generation, verification, and reset token creation
 */

const jwt = require('jsonwebtoken');
const { generateToken, verifyToken, generateResetToken } = require('../../../utils/jwt');

// Mock jwt module
jest.mock('jsonwebtoken');

describe('JWT Utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-secret-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateToken', () => {
    it('should generate a token with correct payload and options', () => {
      const mockToken = 'mock.jwt.token';
      const payload = { id: 'user123', role: 'user' };

      jwt.sign.mockReturnValue(mockToken);

      const result = generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        'test-secret-key',
        { expiresIn: '24h' },
      );
      expect(result).toBe(mockToken);
    });

    it('should use environment JWT_SECRET', () => {
      const payload = { id: 'user123' };
      
      generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        'test-secret-key',
        expect.any(Object),
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify token with correct secret', () => {
      const token = 'valid.jwt.token';
      const mockDecoded = { id: 'user123', role: 'user' };

      jwt.verify.mockReturnValue(mockDecoded);

      const result = verifyToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret-key');
      expect(result).toEqual(mockDecoded);
    });

    it('should throw error for invalid token', () => {
      const token = 'invalid.token';
      const error = new Error('Invalid token');

      jwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => verifyToken(token)).toThrow('Invalid token');
    });
  });

  describe('generateResetToken', () => {
    it('should generate a reset token with correct prefix', () => {
      const token = generateResetToken();

      expect(token).toMatch(/^reset_[A-Za-z0-9]{20}$/);
      expect(token.length).toBe(26); // 'reset_' (6) + 20 random chars
    });

    it('should generate unique tokens on multiple calls', () => {
      const token1 = generateResetToken();
      const token2 = generateResetToken();

      expect(token1).not.toBe(token2);
      expect(token1).toMatch(/^reset_/);
      expect(token2).toMatch(/^reset_/);
    });

    it('should only contain alphanumeric characters after prefix', () => {
      const token = generateResetToken();
      const randomPart = token.slice(6); // Remove 'reset_' prefix

      expect(randomPart).toMatch(/^[A-Za-z0-9]{20}$/);
    });
  });
});