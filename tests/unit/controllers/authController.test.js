/**
 * Unit Tests for Auth Controller
 * Tests authentication, activation, and password recovery functions
 */

import { jest } from '@jest/globals';

// Mock modules before importing
jest.unstable_mockModule('../../../models/Seller.js', () => ({
  default: {
    findOne: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../models/PendingSeller.js', () => ({
  default: {
    findOne: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../models/PasswordResetToken.js', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('../../../utils/jwt.js', () => ({
  generateToken: jest.fn(),
  generateResetToken: jest.fn(),
}));

// Now import after mocks are set up
const authController = await import('../../../controllers/authController.js');
const Seller = (await import('../../../models/Seller.js')).default;
const PendingSeller = (await import('../../../models/PendingSeller.js')).default;
const PasswordResetToken = (await import('../../../models/PasswordResetToken.js')).default;
const { generateToken, generateResetToken } = await import('../../../utils/jwt.js');

describe("Auth Controller", () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      query: {},
      body: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe("getSellerByEmail", () => {
    it("should return active seller status when seller exists", async () => {
      const mockSeller = {
        email: "active@example.com",
        firstName: "Active",
        lastName: "User",
      };

      mockReq.query.email = "active@example.com";
      Seller.findOne.mockResolvedValue(mockSeller);

      await authController.getSellerByEmail(mockReq, mockRes);

      expect(Seller.findOne).toHaveBeenCalledWith({
        email: "active@example.com",
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        email: "active@example.com",
        status: "active",
      });
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should return pending seller status when no active seller but pending exists", async () => {
      const mockPendingSeller = {
        email: "pending@example.com",
        firstName: "Pending",
        lastName: "User",
        activatedAt: null,
      };

      mockReq.query.email = "pending@example.com";
      Seller.findOne.mockResolvedValue(null);
      PendingSeller.findOne.mockResolvedValue(mockPendingSeller);

      await authController.getSellerByEmail(mockReq, mockRes);

      expect(Seller.findOne).toHaveBeenCalledWith({
        email: "pending@example.com",
      });
      expect(PendingSeller.findOne).toHaveBeenCalledWith({
        email: "pending@example.com",
        activatedAt: null,
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        email: "pending@example.com",
        status: "pending",
      });
    });

    it("should return 404 when no seller exists", async () => {
      mockReq.query.email = "nonexistent@example.com";
      Seller.findOne.mockResolvedValue(null);
      PendingSeller.findOne.mockResolvedValue(null);

      await authController.getSellerByEmail(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Not Found",
        message: "No account found for this email address",
        statusCode: 404,
      });
    });

    it("should handle database errors", async () => {
      mockReq.query.email = "error@example.com";
      Seller.findOne.mockRejectedValue(new Error("Database error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await authController.getSellerByEmail(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Internal Server Error",
        message: "An error occurred while retrieving seller information",
        statusCode: 500,
      });

      consoleSpy.mockRestore();
    });
  });

  describe("login", () => {
    it("should login successfully with valid credentials", async () => {
      const mockSeller = {
        _id: "seller123",
        email: "user@example.com",
        role: "user",
        comparePassword: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({
          id: "seller123",
          email: "user@example.com",
          role: "user",
        }),
      };

      mockReq.body = {
        email: "user@example.com",
        password: "correctPassword",
      };

      Seller.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockSeller),
      });
      generateToken.mockReturnValue("generated-jwt-token");

      await authController.login(mockReq, mockRes);

      expect(Seller.findOne).toHaveBeenCalledWith({
        email: "user@example.com",
      });
      expect(mockSeller.comparePassword).toHaveBeenCalledWith(
        "correctPassword"
      );
      expect(generateToken).toHaveBeenCalledWith({
        id: "seller123",
        role: "user",
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        token: "generated-jwt-token",
        seller: {
          id: "seller123",
          email: "user@example.com",
          role: "user",
        },
      });
    });

    it("should return 401 for non-existent seller", async () => {
      mockReq.body = {
        email: "nonexistent@example.com",
        password: "password",
      };

      Seller.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Unauthorized",
        message: "Invalid email or password",
        statusCode: 401,
      });
    });

    it("should return 401 for incorrect password", async () => {
      const mockSeller = {
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      mockReq.body = {
        email: "user@example.com",
        password: "wrongPassword",
      };

      Seller.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockSeller),
      });

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Unauthorized",
        message: "Invalid email or password",
        statusCode: 401,
      });
    });

    it("should handle database errors", async () => {
      mockReq.body = {
        email: "error@example.com",
        password: "password",
      };

      Seller.findOne.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error("Database error")),
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Internal Server Error",
        message: "An error occurred during login",
        statusCode: 500,
      });

      consoleSpy.mockRestore();
    });
  });

  describe("activate", () => {
    it("should activate pending seller successfully", async () => {
      const mockPendingSeller = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        dateOfBirth: new Date("1990-01-01"),
        createdBy: "admin123",
        save: jest.fn().mockResolvedValue(),
      };

      const mockNewSeller = {
        toJSON: jest.fn().mockReturnValue({
          id: "newSeller123",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        }),
        save: jest.fn().mockResolvedValue(),
      };

      mockReq.body = {
        email: "john@example.com",
        dateOfBirth: "1990-01-01",
        lastName: "Doe",
        password: "NewPassword123!",
      };

      PendingSeller.findOne.mockResolvedValue(mockPendingSeller);
      Seller.mockImplementation(() => mockNewSeller);

      await authController.activate(mockReq, mockRes);

      expect(PendingSeller.findOne).toHaveBeenCalledWith({
        email: "john@example.com",
        dateOfBirth: new Date("1990-01-01"),
        lastName: "Doe",
        activatedAt: null,
      });

      expect(mockNewSeller.save).toHaveBeenCalled();
      expect(mockPendingSeller.save).toHaveBeenCalled();
      expect(mockPendingSeller.activatedAt).toBeInstanceOf(Date);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        id: "newSeller123",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      });
    });

    it("should return 404 when pending seller not found", async () => {
      mockReq.body = {
        email: "notfound@example.com",
        dateOfBirth: "1990-01-01",
        lastName: "NotFound",
        password: "Password123!",
      };

      PendingSeller.findOne.mockResolvedValue(null);

      await authController.activate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Not Found",
        message: "Pending seller not found or already activated",
        statusCode: 404,
      });
    });

    it("should handle database errors during activation", async () => {
      mockReq.body = {
        email: "error@example.com",
        dateOfBirth: "1990-01-01",
        lastName: "Error",
        password: "Password123!",
      };

      PendingSeller.findOne.mockRejectedValue(new Error("Database error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await authController.activate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Internal Server Error",
        message: "An error occurred during account activation",
        statusCode: 500,
      });

      consoleSpy.mockRestore();
    });
  });

  describe("recover", () => {
    it("should generate recovery token successfully", async () => {
      const mockSeller = {
        _id: "seller123",
        email: "user@example.com",
      };

      const mockResetToken = {
        token: "reset_abcdef123456",
        sellerId: "seller123",
        expiresAt: new Date(Date.now() + 3600000),
        save: jest.fn().mockResolvedValue(),
      };

      mockReq.body = {
        sellerId: "seller123",
      };

      Seller.findById.mockResolvedValue(mockSeller);
      generateResetToken.mockReturnValue("reset_abcdef123456");
      PasswordResetToken.mockImplementation(() => mockResetToken);

      await authController.recover(mockReq, mockRes);

      expect(Seller.findById).toHaveBeenCalledWith("seller123");
      expect(generateResetToken).toHaveBeenCalled();
      expect(mockResetToken.save).toHaveBeenCalled();

      expect(mockRes.json).toHaveBeenCalledWith({
        token: "reset_abcdef123456",
        sellerId: "seller123",
        expiresAt: mockResetToken.expiresAt,
      });
    });

    it("should return 404 when seller not found for recovery", async () => {
      mockReq.body = {
        sellerId: "nonexistent123",
      };

      Seller.findById.mockResolvedValue(null);

      await authController.recover(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Not Found",
        message: "Seller not found",
        statusCode: 404,
      });
    });

    it("should handle errors during recovery token generation", async () => {
      mockReq.body = {
        sellerId: "error123",
      };

      Seller.findById.mockRejectedValue(new Error("Database error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await authController.recover(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Internal Server Error",
        message: "An error occurred during password recovery",
        statusCode: 500,
      });

      consoleSpy.mockRestore();
    });
  });

  describe("reset", () => {
    it("should reset password successfully with valid token", async () => {
      const mockResetToken = {
        token: "valid_reset_token",
        sellerId: "seller123",
        expiresAt: new Date(Date.now() + 3600000),
      };

      const mockSeller = {
        _id: "seller123",
        email: "user@example.com",
        dateOfBirth: new Date("1990-01-01"),
        password: "oldHashedPassword",
        save: jest.fn().mockResolvedValue(),
      };

      mockReq.body = {
        token: "valid_reset_token",
        email: "user@example.com",
        dateOfBirth: "1990-01-01",
        newPassword: "NewPassword123!",
      };

      PasswordResetToken.findOne.mockResolvedValue(mockResetToken);
      Seller.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockSeller),
      });

      await authController.reset(mockReq, mockRes);

      expect(PasswordResetToken.findOne).toHaveBeenCalledWith({
        token: "valid_reset_token",
        expiresAt: { $gt: expect.any(Date) },
      });

      expect(Seller.findOne).toHaveBeenCalledWith({
        _id: "seller123",
        email: "user@example.com",
        dateOfBirth: new Date("1990-01-01"),
      });

      expect(mockSeller.password).toBe("NewPassword123!");
      expect(mockSeller.save).toHaveBeenCalled();

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Password reset successful",
      });
    });

    it("should return 400 for invalid or expired token", async () => {
      mockReq.body = {
        token: "invalid_token",
        email: "user@example.com",
        dateOfBirth: "1990-01-01",
        newPassword: "NewPassword123!",
      };

      PasswordResetToken.findOne.mockResolvedValue(null);

      await authController.reset(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid Token",
        message: "Reset token is invalid or expired",
        statusCode: 400,
      });
    });

    it("should return 400 for invalid seller details", async () => {
      const mockResetToken = {
        token: "valid_reset_token",
        sellerId: "seller123",
        expiresAt: new Date(Date.now() + 3600000),
      };

      mockReq.body = {
        token: "valid_reset_token",
        email: "wrong@example.com",
        dateOfBirth: "1990-01-01",
        newPassword: "NewPassword123!",
      };

      PasswordResetToken.findOne.mockResolvedValue(mockResetToken);
      Seller.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await authController.reset(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid Details",
        message: expect.any(String),
        statusCode: 400,
      });
    });
  });
});
