import { verifyToken } from "../utils/jwt.js";
import Seller from "../models/Seller.js";

/**
 * Authentication middleware to verify JWT tokens
 * Validates the Authorization header and attaches the authenticated user to the request object
 *
 * @async
 * @function authenticate
 * @param {Object} req - Express request object
 * @param {Object} req.header - Request headers
 * @param {string} req.header.Authorization - Bearer token in format "Bearer <token>"
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Calls next() on success, sends 401 error on failure
 * @throws {401} If token is missing, invalid, or seller not found
 *
 * @example
 * // Usage in route
 * router.get('/protected', authenticate, (req, res) => {
 *   // req.user contains the authenticated seller
 *   res.json({ user: req.user });
 * });
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Access token is required",
        statusCode: 401,
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const seller = await Seller.findById(decoded.id);
    if (!seller) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid token",
        statusCode: 401,
      });
    }

    req.user = seller;
    next();
  } catch {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid token",
      statusCode: 401,
    });
  }
};

/**
 * Authorization middleware factory to restrict access based on user roles
 * Creates middleware that checks if authenticated user has required role(s)
 *
 * @function authorize
 * @param {...string} roles - One or more role names that are allowed access
 * @returns {Function} Express middleware function that performs role-based authorization
 *
 * @example
 * // Single role authorization
 * router.delete('/users/:id', authenticate, authorize('superadmin'), deleteUser);
 *
 * @example
 * // Multiple roles authorization
 * router.post('/products', authenticate, authorize('admin', 'superadmin'), createProduct);
 */
const authorize = (...roles) => {
  /**
   * @param {Object} req - Express request object with req.user attached by authenticate
   * @param {Object} req.user - Authenticated user object from authenticate middleware
   * @param {string} req.user.role - User's role (e.g., 'user', 'admin', 'superadmin')
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {void} Calls next() if authorized, sends 401/403 error if not
   */
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
        statusCode: 401,
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Insufficient permissions",
        statusCode: 403,
      });
    }

    next();
  };
};

export { authenticate, authorize };
