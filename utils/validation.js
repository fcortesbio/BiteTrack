const { body, query, validationResult } = require('express-validator');

// Password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Validation rules
const validationRules = {
  // Auth validations
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  activate: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('dateOfBirth')
      .isISO8601()
      .toDate()
      .withMessage('Valid date of birth is required'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required'),
    body('password')
      .matches(passwordRegex)
      .withMessage('Password must be at least 8 characters with mixed case, numbers, and symbols')
  ],

  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('dateOfBirth')
      .isISO8601()
      .toDate()
      .withMessage('Valid date of birth is required'),
    body('newPassword')
      .matches(passwordRegex)
      .withMessage('Password must be at least 8 characters with mixed case, numbers, and symbols')
  ],

  getSellerByEmail: [
    query('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
  ],

  // Seller validations
  createPendingSeller: [
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('dateOfBirth')
      .isISO8601()
      .toDate()
      .withMessage('Valid date of birth is required')
  ],

  updateSeller: [
    body('firstName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('First name cannot be empty'),
    body('lastName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Last name cannot be empty'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Valid date of birth is required'),
    body('newPassword')
      .optional()
      .matches(passwordRegex)
      .withMessage('Password must be at least 8 characters with mixed case, numbers, and symbols')
  ],

  changeRole: [
    body('role')
      .isIn(['user', 'admin', 'superadmin'])
      .withMessage('Role must be user, admin, or superadmin')
  ],

  // Customer validations
  createCustomer: [
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required'),
    body('phoneNumber')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
  ],

  updateCustomer: [
    body('firstName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('First name cannot be empty'),
    body('lastName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Last name cannot be empty'),
    body('phoneNumber')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Phone number cannot be empty'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
  ],

  // Product validations
  createProduct: [
    body('productName')
      .trim()
      .notEmpty()
      .withMessage('Product name is required'),
    body('description')
      .optional()
      .trim(),
    body('count')
      .isInt({ min: 0 })
      .withMessage('Count must be a non-negative integer'),
    body('price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a non-negative number')
  ],

  updateProduct: [
    body('productName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Product name cannot be empty'),
    body('description')
      .optional()
      .trim(),
    body('count')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Count must be a non-negative integer'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a non-negative number')
  ],

  // Sales validations
  createSale: [
    body('customerId')
      .isMongoId()
      .withMessage('Valid customer ID is required'),
    body('products')
      .isArray({ min: 1 })
      .withMessage('At least one product is required'),
    body('products.*.productId')
      .isMongoId()
      .withMessage('Valid product ID is required'),
    body('products.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be at least 1'),
    body('amountPaid')
      .isFloat({ min: 0 })
      .withMessage('Amount paid must be non-negative')
  ],

  settleSale: [
    body('amountPaid')
      .isFloat({ min: 0 })
      .withMessage('Amount paid must be non-negative')
  ]
};

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      })),
      statusCode: 400
    });
  }
  next();
};

module.exports = {
  validationRules,
  validate
};