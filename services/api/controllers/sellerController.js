import Seller from "../models/Seller.js";
import PendingSeller from "../models/PendingSeller.js";

/**
 * List all active sellers
 *
 * @async
 * @function listSellers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON array of all active sellers
 */
const listSellers = async (req, res) => {
  const sellers = await Seller.find({});
  res.json(sellers);
};

/**
 * Create a pending seller account (Admin/SuperAdmin only)
 * First phase of two-phase account creation - creates pending record awaiting activation
 *
 * @async
 * @function createPendingSeller
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.firstName - Seller's first name
 * @param {string} req.body.lastName - Seller's last name
 * @param {string} req.body.email - Seller's email address
 * @param {string} req.body.dateOfBirth - Date of birth (YYYY-MM-DD)
 * @param {Object} req.user - Authenticated user (from middleware)
 * @param {string} req.user._id - ID of user creating the pending seller
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with created pending seller (201)
 * @throws {400} If seller or pending seller with email already exists
 *
 * @example
 * POST /sellers/pending
 * Body: {
 *   firstName: "John",
 *   lastName: "Doe",
 *   email: "john@example.com",
 *   dateOfBirth: "1990-01-01"
 * }
 */
const createPendingSeller = async (req, res) => {
  const { firstName, lastName, email, dateOfBirth } = req.body;

  // Check if seller already exists
  const existingSeller = await Seller.findOne({ email });
  if (existingSeller) {
    return res.status(400).json({
      error: "Duplicate Error",
      message: "Seller with this email already exists",
      statusCode: 400,
    });
  }

  // Check if pending seller already exists
  const existingPending = await PendingSeller.findOne({ email });
  if (existingPending) {
    return res.status(400).json({
      error: "Duplicate Error",
      message: "Pending seller with this email already exists",
      statusCode: 400,
    });
  }

  const pendingSeller = new PendingSeller({
    firstName,
    lastName,
    email,
    dateOfBirth: new Date(dateOfBirth),
    createdBy: req.user._id,
  });

  await pendingSeller.save();
  res.status(201).json(pendingSeller.toJSON());
};

/**
 * Update seller profile (self-service)
 * Allows sellers to update their own profile with sensitive field protections
 *
 * @async
 * @function updateSeller
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - Seller ID to update
 * @param {Object} req.body - Fields to update
 * @param {string} [req.body.firstName] - Updated first name
 * @param {string} [req.body.lastName] - Updated last name
 * @param {string} [req.body.email] - Updated email (requires oldPassword)
 * @param {string} [req.body.dateOfBirth] - Updated date of birth (requires oldPassword)
 * @param {string} [req.body.oldPassword] - Current password (required for sensitive updates)
 * @param {string} [req.body.newPassword] - New password (requires oldPassword)
 * @param {Object} req.user - Authenticated user
 * @param {string} req.user._id - Authenticated user's ID
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with updated seller
 * @throws {403} If user tries to update another user's profile or password is invalid
 * @throws {404} If seller not found
 * @throws {400} If oldPassword not provided for sensitive updates
 *
 * @example
 * PATCH /sellers/507f1f77bcf86cd799439011
 * Body: { firstName: "Jane", lastName: "Smith" }
 */
const updateSeller = async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, dateOfBirth, oldPassword, newPassword } =
    req.body;

  // Verify user can only update their own profile
  if (req.user._id.toString() !== id) {
    return res.status(403).json({
      error: "Forbidden",
      message: "You can only update your own profile",
      statusCode: 403,
    });
  }

  const seller = await Seller.findById(id).select("+password");
  if (!seller) {
    return res.status(404).json({
      error: "Not Found",
      message: "Seller not found",
      statusCode: 404,
    });
  }

  // Check if sensitive fields are being updated
  const sensitiveUpdate =
    email !== undefined ||
    dateOfBirth !== undefined ||
    newPassword !== undefined;

  if (sensitiveUpdate) {
    if (!oldPassword) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Old password required for sensitive updates",
        statusCode: 400,
      });
    }

    const isValidPassword = await seller.comparePassword(oldPassword);
    if (!isValidPassword) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Invalid old password",
        statusCode: 403,
      });
    }

    // Additional verification for email or dateOfBirth changes
    if (email !== undefined || dateOfBirth !== undefined) {
      const currentEmail = email || seller.email;
      const currentDob = dateOfBirth
        ? new Date(dateOfBirth)
        : seller.dateOfBirth;

      // Verify at least one matches current values
      const emailMatches = currentEmail === seller.email;
      const dobMatches = currentDob.getTime() === seller.dateOfBirth.getTime();

      if (!emailMatches && !dobMatches) {
        return res.status(403).json({
          error: "Forbidden",
          message:
            "Must provide current email or date of birth for verification",
          statusCode: 403,
        });
      }
    }
  }

  // Update fields
  if (firstName !== undefined) {
    seller.firstName = firstName;
  }
  if (lastName !== undefined) {
    seller.lastName = lastName;
  }
  if (email !== undefined) {
    seller.email = email;
  }
  if (dateOfBirth !== undefined) {
    seller.dateOfBirth = new Date(dateOfBirth);
  }
  if (newPassword !== undefined) {
    seller.password = newPassword;
  }

  await seller.save();
  res.json(seller.toJSON());
};

/**
 * Change seller's role (SuperAdmin only)
 * Promotes or demotes sellers between user, admin, and superadmin roles
 *
 * @async
 * @function changeRole
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - Seller ID to update
 * @param {Object} req.body - Request body
 * @param {string} req.body.role - New role ('user', 'admin', or 'superadmin')
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with updated seller
 * @throws {404} If seller not found
 *
 * @example
 * PATCH /sellers/507f1f77bcf86cd799439011/role
 * Body: { role: "admin" }
 */
const changeRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const seller = await Seller.findById(id);
  if (!seller) {
    return res.status(404).json({
      error: "Not Found",
      message: "Seller not found",
      statusCode: 404,
    });
  }

  seller.role = role;
  await seller.save();

  res.json(seller.toJSON());
};

/**
 * List all pending seller accounts
 * Returns pending sellers awaiting activation with creator information
 *
 * @async
 * @function listPendingSellers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with count and array of pending sellers
 *
 * @example
 * GET /sellers/pending
 * Response: {
 *   count: 2,
 *   pendingSellers: [{ _id: "...", firstName: "John", ... }]
 * }
 */
const listPendingSellers = async (req, res) => {
  const pendingSellers = await PendingSeller.find({})
    .populate("createdBy", "firstName lastName email role")
    .sort({ createdAt: -1 })
    .select("-__v");

  const response = {
    count: pendingSellers.length,
    pendingSellers: pendingSellers.map((seller) => ({
      _id: seller._id,
      firstName: seller.firstName,
      lastName: seller.lastName,
      email: seller.email,
      dateOfBirth: seller.dateOfBirth,
      createdAt: seller.createdAt,
      testingUser: seller.testingUser || false,
      createdBy: seller.createdBy
        ? {
            _id: seller.createdBy._id,
            firstName: seller.createdBy.firstName,
            lastName: seller.createdBy.lastName,
            email: seller.createdBy.email,
            role: seller.createdBy.role,
          }
        : null,
    })),
  };

  res.json(response);
};

/**
 * Deactivate (delete) a seller account (SuperAdmin only)
 * Permanently removes seller from the system
 *
 * @async
 * @function deactivateSeller
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - Seller ID to deactivate
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Empty response with 204 status
 * @throws {404} If seller not found
 *
 * @example
 * DELETE /sellers/507f1f77bcf86cd799439011
 * Response: 204 No Content
 */
const deactivateSeller = async (req, res) => {
  const { id } = req.params;

  const seller = await Seller.findById(id);
  if (!seller) {
    return res.status(404).json({
      error: "Not Found",
      message: "Seller not found",
      statusCode: 404,
    });
  }

  await Seller.deleteOne({ _id: id });
  res.status(204).send();
};

export {
  listSellers,
  listPendingSellers,
  createPendingSeller,
  updateSeller,
  changeRole,
  deactivateSeller,
};
