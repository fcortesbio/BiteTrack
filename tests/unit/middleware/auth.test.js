/**
 * Unit Tests for Authentication Middleware
 * Tests authenticate and authorize functions
 */

import { jest } from '@jest/globals';

// Mock dependencies for ESM
const mockVerifyToken = jest.fn();
const mockSeller = {
  findById: jest.fn(),
};

jest.unstable_mockModule('../../../utils/jwt.js', () => ({
  verifyToken: mockVerifyToken,
}));

jest.unstable_mockModule('../../../models/Seller.js', () => ({
  default: mockSeller,
}));

const { authenticate, authorize } = await import('../../../middleware/auth.js');
const verifyToken = mockVerifyToken;
const Seller = mockSeller;

describe('Auth Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      header: jest.fn(),
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token and set req.user', async() => {
      const mockToken = 'valid.jwt.token';
      const mockDecoded = { id: 'user123', role: 'user' };
      const mockSeller = { _id: 'user123', role: 'user', email: 'test@example.com' };

      mockReq.header.mockReturnValue(`Bearer ${mockToken}`);
      verifyToken.mockReturnValue(mockDecoded);
      Seller.findById.mockResolvedValue(mockSeller);

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockReq.header).toHaveBeenCalledWith('Authorization');
      expect(verifyToken).toHaveBeenCalledWith(mockToken);
      expect(Seller.findById).toHaveBeenCalledWith(mockDecoded.id);
      expect(mockReq.user).toBe(mockSeller);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 when no Authorization header', async() => {
      mockReq.header.mockReturnValue(null);

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Access token is required',
        statusCode: 401,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header does not start with Bearer', async() => {
      mockReq.header.mockReturnValue('InvalidToken');

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Access token is required',
        statusCode: 401,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token verification fails', async() => {
      const mockToken = 'invalid.jwt.token';
      
      mockReq.header.mockReturnValue(`Bearer ${mockToken}`);
      verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid token',
        statusCode: 401,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when seller not found in database', async() => {
      const mockToken = 'valid.jwt.token';
      const mockDecoded = { id: 'nonexistent123', role: 'user' };

      mockReq.header.mockReturnValue(`Bearer ${mockToken}`);
      verifyToken.mockReturnValue(mockDecoded);
      Seller.findById.mockResolvedValue(null);

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid token',
        statusCode: 401,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async() => {
      const mockToken = 'valid.jwt.token';
      const mockDecoded = { id: 'user123', role: 'user' };

      mockReq.header.mockReturnValue(`Bearer ${mockToken}`);
      verifyToken.mockReturnValue(mockDecoded);
      Seller.findById.mockRejectedValue(new Error('Database error'));

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid token',
        statusCode: 401,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    it('should allow access when user has required role', () => {
      const authorizeMiddleware = authorize('admin', 'user');
      mockReq.user = { role: 'admin' };

      authorizeMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow access when user has one of multiple required roles', () => {
      const authorizeMiddleware = authorize('admin', 'superadmin');
      mockReq.user = { role: 'superadmin' };

      authorizeMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 when req.user is not set', () => {
      const authorizeMiddleware = authorize('admin');

      authorizeMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required',
        statusCode: 401,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user does not have required role', () => {
      const authorizeMiddleware = authorize('admin');
      mockReq.user = { role: 'user' };

      authorizeMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        statusCode: 403,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user role is not in allowed roles list', () => {
      const authorizeMiddleware = authorize('admin', 'superadmin');
      mockReq.user = { role: 'user' };

      authorizeMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        statusCode: 403,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should work with single role parameter', () => {
      const authorizeMiddleware = authorize('user');
      mockReq.user = { role: 'user' };

      authorizeMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });
});