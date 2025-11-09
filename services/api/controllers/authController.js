import mongoose from "mongoose";
import Seller from "../models/Seller.js";
import PendingSeller from "../models/PendingSeller.js";
import PasswordResetToken from "../models/PasswordResetToken.js";
import { generateToken, generateResetToken } from "../utils/jwt.js";
import { sendPasswordResetEmail } from "../utils/emailService.js";

/**
 * Custom HTTP Error class for throwing errors with status codes
 * @class HttpError
 * @extends Error
 */
class HttpError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} error - Error type/name
   * @param {string} message - Error message
   */
  constructor(statusCode, error, message) {
    super(message);
    this.statusCode = statusCode;
    this.error = error;
  }
}

/**
 * Check seller account status by email (public endpoint)
 * Returns whether an account exists and its status (active or pending)
 *
 * @async
 * @function getSellerByEmail
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.email - Email address to check
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with email and status or 404 if not found
 *
 * @example
 * GET /auth/seller-status?email=user@example.com
 * Response: { email: "user@example.com", status: "active" }
 */
const getSellerByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    // First, check for an active account in sellers collection
    const activeSeller = await Seller.findOne({ email });

    if (activeSeller) {
      return res.json({
        email: activeSeller.email,
        status: "active",
      });
    }

    // If no active account, check for pending account
    const pendingSeller = await PendingSeller.findOne({ email });

    if (pendingSeller) {
      return res.json({
        email: pendingSeller.email,
        status: "pending",
      });
    }

    // No account found in either collection
    return res.status(404).json({
      error: "Not Found",
      message: "No account found for this email address",
      statusCode: 404,
    });
  } catch (error) {
    console.error("Error in getSellerByEmail:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while retrieving seller information",
      statusCode: 500,
    });
  }
};

/**
 * Authenticate seller and generate JWT token
 * Validates email and password, returns JWT token and seller info
 *
 * @async
 * @function login
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - Seller email address
 * @param {string} req.body.password - Seller password
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with JWT token and seller object
 * @throws {401} If email or password is invalid
 * @throws {500} If server error occurs during login
 *
 * @example
 * POST /auth/login
 * Body: { email: "user@example.com", password: "SecurePass123!" }
 * Response: { token: "jwt.token.here", seller: {...} }
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find seller with password field included
    const seller = await Seller.findOne({ email }).select("+password");

    if (!seller || !(await seller.comparePassword(password))) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
        statusCode: 401,
      });
    }

    const token = generateToken({ id: seller._id, role: seller.role });

    // Remove password from response
    const sellerResponse = seller.toJSON();

    res.json({
      token,
      seller: sellerResponse,
    });
  } catch (error) {
    console.error("Error in login:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred during login",
      statusCode: 500,
    });
  }
};

/**
 * Activate a pending seller account (two-phase account creation)
 * Verifies pending seller details and creates active seller account with password
 * Uses MongoDB transaction to ensure data consistency
 *
 * @async
 * @function activate
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - Pending seller email
 * @param {string} req.body.dateOfBirth - Date of birth for verification (YYYY-MM-DD)
 * @param {string} req.body.lastName - Last name for verification
 * @param {string} req.body.password - New password (must meet security requirements)
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with activated seller object
 * @throws {404} If pending seller not found or verification fails
 * @throws {409} If active account already exists
 * @throws {500} If server error occurs during activation
 *
 * @example
 * POST /auth/activate
 * Body: {
 *   email: "user@example.com",
 *   dateOfBirth: "1990-01-01",
 *   lastName: "Doe",
 *   password: "SecurePass123!"
 * }
 */
const activate = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { email, dateOfBirth, lastName, password } = req.body;

      // Check if seller already exists (race condition protection)
      const existingSeller = await Seller.findOne({ email }).session(session);
      if (existingSeller) {
        throw new HttpError(
          409,
          "Conflict",
          "An active account with this email already exists",
        );
      }

      // Find pending seller
      const pendingSeller = await PendingSeller.findOne({
        email,
        dateOfBirth: new Date(dateOfBirth),
        lastName,
      }).session(session);

      if (!pendingSeller) {
        throw new HttpError(
          404,
          "Not Found",
          "Pending seller not found or verification details do not match",
        );
      }

      // Create activated seller
      const seller = new Seller({
        firstName: pendingSeller.firstName,
        lastName: pendingSeller.lastName,
        email: pendingSeller.email,
        dateOfBirth: pendingSeller.dateOfBirth,
        password,
        role: "user",
        createdBy: pendingSeller.createdBy,
      });

      await seller.save({ session });

      // Delete pending seller
      await PendingSeller.deleteOne({ _id: pendingSeller._id }).session(
        session,
      );

      // Store seller for response (outside transaction to avoid issues)
      res.locals.activatedSeller = seller;
    });

    // Transaction succeeded
    res.status(201).json(res.locals.activatedSeller.toJSON());
  } catch (error) {
    console.error("Error in activate:", error);

    // Handle custom errors from transaction
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: error.error,
        message: error.message,
        statusCode: error.statusCode,
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        error: "Conflict",
        message: "An account with this email already exists",
        statusCode: 409,
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred during account activation",
      statusCode: 500,
    });
  } finally {
    session.endSession();
  }
};

/**
 * Initiate password recovery for seller (SuperAdmin only)
 * Generates password reset token and sends reset email
 *
 * @async
 * @function recover
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.sellerId - ID of seller requiring password reset
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with reset details
 * @throws {404} If seller not found
 * @throws {500} If email sending fails or server error occurs
 *
 * @description
 * In development, response includes token and email preview URL for testing
 * In production, only confirmation message is returned
 *
 * @example
 * POST /auth/recover
 * Body: { sellerId: "507f1f77bcf86cd799439011" }
 */
const recover = async (req, res) => {
  try {
    const { sellerId } = req.body;

    // Verify seller exists
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return res.status(404).json({
        error: "Not Found",
        message: "Seller not found",
        statusCode: 404,
      });
    }

    // Generate reset token
    const token = generateResetToken();
    const resetToken = new PasswordResetToken({
      token,
      sellerId,
    });

    await resetToken.save();

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(seller.email, token);

    if (!emailResult.success) {
      return res.status(500).json({
        error: "Email Service Error",
        message: "Failed to send password reset email",
        statusCode: 500,
      });
    }

    // Only return token in development for testing
    const responseData = {
      message: "Password reset email sent successfully",
      sellerId,
      expiresAt: resetToken.expiresAt,
    };

    // In development, include the token and preview URL for testing
    if (process.env.NODE_ENV !== "production") {
      responseData.token = token;
      responseData.emailPreview = emailResult.previewUrl;
    }

    res.json(responseData);
  } catch (error) {
    console.error("Error in recover:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred during password recovery",
      statusCode: 500,
    });
  }
};

/**
 * Self-service password recovery request
 * Allows users to request password reset by providing email and date of birth
 * Returns same response whether account exists or not (security best practice)
 *
 * @async
 * @function requestRecovery
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - Seller email address
 * @param {string} req.body.dateOfBirth - Date of birth for verification (YYYY-MM-DD)
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with generic success message
 *
 * @description
 * Returns identical message whether account exists or not to prevent email enumeration
 * In development, response includes token and email preview URL for testing
 *
 * @example
 * POST /auth/request-recovery
 * Body: {
 *   email: "user@example.com",
 *   dateOfBirth: "1990-01-01"
 * }
 */
const requestRecovery = async (req, res) => {
  try {
    const { email, dateOfBirth } = req.body;

    // Verify seller exists with matching details
    const seller = await Seller.findOne({
      email,
      dateOfBirth: new Date(dateOfBirth),
    });

    if (!seller) {
      // Don't reveal whether email exists (security best practice)
      return res.json({
        message:
          "If an account exists with this email and date of birth, a password reset link has been sent",
      });
    }

    // Generate reset token
    const token = generateResetToken();
    const resetToken = new PasswordResetToken({
      token,
      sellerId: seller._id,
    });

    await resetToken.save();

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(seller.email, token);

    if (!emailResult.success) {
      // Still return success message to not reveal email service issues
      console.error("Failed to send password reset email:", emailResult);
      return res.json({
        message:
          "If an account exists with this email and date of birth, a password reset link has been sent",
      });
    }

    // Return same message whether or not account exists (security)
    const responseData = {
      message:
        "If an account exists with this email and date of birth, a password reset link has been sent",
    };

    // In development, include the token and preview URL for testing
    if (process.env.NODE_ENV !== "production") {
      responseData.token = token;
      responseData.emailPreview = emailResult.previewUrl;
    }

    res.json(responseData);
  } catch (error) {
    console.error("Error in requestRecovery:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred during password recovery request",
      statusCode: 500,
    });
  }
};

/**
 * Reset seller password using recovery token
 * Validates reset token and seller verification details, then updates password
 *
 * @async
 * @function reset
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.token - Password reset token
 * @param {string} req.body.email - Seller email for verification
 * @param {string} req.body.dateOfBirth - Date of birth for verification (YYYY-MM-DD)
 * @param {string} req.body.newPassword - New password (must meet security requirements)
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response confirming password reset
 * @throws {400} If token is invalid/expired or seller details don't match
 * @throws {500} If server error occurs during reset
 *
 * @example
 * POST /auth/reset
 * Body: {
 *   token: "reset-token-string",
 *   email: "user@example.com",
 *   dateOfBirth: "1990-01-01",
 *   newPassword: "NewSecurePass123!"
 * }
 */
const reset = async (req, res) => {
  try {
    const { token, email, dateOfBirth, newPassword } = req.body;

    // Find valid reset token
    const resetToken = await PasswordResetToken.findOne({
      token,
      expiresAt: { $gt: new Date() },
    });

    if (!resetToken) {
      return res.status(400).json({
        error: "Invalid Token",
        message: "Reset token is invalid or expired",
        statusCode: 400,
      });
    }

    // Verify seller details
    const seller = await Seller.findOne({
      _id: resetToken.sellerId,
      email,
      dateOfBirth: new Date(dateOfBirth),
    }).select("+password");

    if (!seller) {
      return res.status(400).json({
        error: "Invalid Details",
        message: "Seller details do not match",
        statusCode: 400,
      });
    }

    // Update password
    seller.password = newPassword;
    await seller.save();

    // Delete used token
    await PasswordResetToken.deleteOne({ _id: resetToken._id });

    res.json({
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Error in reset:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred during password reset",
      statusCode: 500,
    });
  }
};

export { login, activate, recover, requestRecovery, reset, getSellerByEmail };
