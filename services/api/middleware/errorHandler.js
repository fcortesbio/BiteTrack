const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Global error handling middleware for Express application
 * Handles various types of errors (Mongoose validation, JWT, Multer, etc.)
 * and returns consistent error responses
 *
 * @function errorHandler
 * @param {Error} err - Error object thrown by application or middleware
 * @param {string} err.name - Error type name (e.g., 'ValidationError', 'CastError', 'JsonWebTokenError')
 * @param {string} err.message - Error message
 * @param {number} [err.statusCode] - HTTP status code for custom errors
 * @param {string} [err.code] - Error code for specific error types (e.g., 11000 for MongoDB duplicate key)
 * @param {Object} req - Express request object
 * @param {string} req.method - HTTP method
 * @param {string} req.originalUrl - Original URL requested
 * @param {string} req.ip - Client IP address
 * @param {Object} res - Express response object
 * @param {Function} _next - Express next middleware function (unused but required by signature)
 * @returns {void} Sends JSON error response with appropriate status code
 *
 * @description
 * Handles the following error types:
 * - Mongoose ValidationError: 400 with field-specific error details
 * - MongoDB duplicate key (code 11000): 400 with duplicate field info
 * - Mongoose CastError (invalid ObjectId): 400 with invalid ID message
 * - JWT errors (JsonWebTokenError, TokenExpiredError): 401 unauthorized
 * - Multer file upload errors (LIMIT_FILE_SIZE): 400 with file size message
 * - Custom operational errors: Uses error.statusCode
 * - Unknown errors: 500 internal server error
 *
 * Logs all errors with contextual information (request details, timestamp, stack trace in dev)
 * Sanitizes error responses in production to prevent information leakage
 *
 * @example
 * // Usage in Express app
 * app.use(errorHandler);
 *
 * @example
 * // Throwing custom error in controller
 * const error = new Error('Resource not found');
 * error.statusCode = 404;
 * throw error;
 */
const errorHandler = (err, req, res, _next) => {
  // Log error with request context
  const timestamp = new Date().toISOString();

  console.error(`\nERROR [${timestamp}]`);
  console.error("Request:", `${req.method} ${req.originalUrl}`);
  console.error("IP:", req.ip);
  console.error("Error Type:", err.name || "Unknown");
  console.error("Error Message:", err.message);

  if (isDevelopment && err.stack) {
    console.error("Stack Trace:", err.stack);
  }

  // Sanitize error for response (don't expose sensitive information)
  const sanitizeError = (_error) => {
    if (isDevelopment) {
      return _error; // Show full error in development
    }
    // In production, sanitize potentially sensitive information
    const sanitized = { ..._error };
    delete sanitized.stack;
    return sanitized;
  };

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));

    console.error("Validation Details:", errors);

    return res.status(400).json({
      error: "Validation Error",
      message: "Invalid input data",
      details: errors,
      statusCode: 400,
      timestamp,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    console.error("Duplicate Key Error:", field, err.keyValue[field]);

    return res.status(400).json({
      error: "Duplicate Error",
      message: `${field} already exists`,
      statusCode: 400,
      timestamp,
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    console.error("Cast Error:", err.path, err.value);

    return res.status(400).json({
      error: "Invalid ID",
      message: "Invalid resource ID format",
      statusCode: 400,
      timestamp,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    console.error("JWT Error:", err.message);

    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid token",
      statusCode: 401,
      timestamp,
    });
  }

  if (err.name === "TokenExpiredError") {
    console.error("Token Expired:", err.message);

    return res.status(401).json({
      error: "Unauthorized",
      message: "Token expired",
      statusCode: 401,
      timestamp,
    });
  }

  // Multer file upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    console.error("File Upload Error: File too large");

    return res.status(400).json({
      error: "File Upload Error",
      message: "File size exceeds the allowed limit",
      statusCode: 400,
      timestamp,
    });
  }

  // Custom application errors
  if (err.isOperational) {
    console.error("Application Error:", err.message);

    return res.status(err.statusCode || 400).json({
      error: err.name || "Application Error",
      message: err.message,
      statusCode: err.statusCode || 400,
      timestamp,
    });
  }

  // Log unknown errors with more context
  console.error("UNKNOWN ERROR - This should be investigated:");
  console.error("Error Object:", sanitizeError(err));

  // Default server error - don't expose internal details in production
  const statusCode = err.statusCode || 500;
  const message = isDevelopment ? err.message : "Something went wrong";

  res.status(statusCode).json({
    error: "Internal Server Error",
    message,
    statusCode,
    timestamp,
    ...(isDevelopment && { errorType: err.name, details: err.message }),
  });
};

export default errorHandler;
