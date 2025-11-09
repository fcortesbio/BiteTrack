import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import mongoose from "mongoose";
import csv from "csv-parser";
import multer from "multer";
import { Readable } from "stream";

/**
 * List all sales with advanced filtering, pagination, and sorting
 * Supports filtering by customer, seller, settlement status, and date ranges
 *
 * @async
 * @function listSales
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.customerId] - Filter by customer ID
 * @param {string} [req.query.sellerId] - Filter by seller ID
 * @param {string} [req.query.settled] - Filter by settled status ("true" or "false")
 * @param {string} [req.query.startDate] - Start date filter (YYYY-MM-DD)
 * @param {string} [req.query.endDate] - End date filter (YYYY-MM-DD)
 * @param {string} [req.query.dateField="createdAt"] - Date field to filter on
 * @param {number} [req.query.page=1] - Page number
 * @param {number} [req.query.limit=50] - Results per page (1-100)
 * @param {string} [req.query.sort="-createdAt"] - Sort field (prefix with - for descending)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} JSON response with sales array, pagination, and filters
 * @throws {400} If date format is invalid or pagination parameters are out of range
 */
const listSales = async (req, res, next) => {
  try {
    const {
      customerId,
      sellerId,
      settled,
      startDate,
      endDate,
      dateField = "createdAt",
      page = 1,
      limit = 50,
      sort = "-createdAt",
    } = req.query;

    const filter = {};

    // Existing filters
    if (customerId) {
      filter.customerId = customerId;
    }
    if (sellerId) {
      filter.sellerId = sellerId;
    }
    if (settled !== undefined) {
      filter.settled = settled === "true";
    }

    // Date range filtering
    if (startDate || endDate) {
      const dateFilter = {};

      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({
            error: "Bad Request",
            message:
              "Invalid startDate format. Use YYYY-MM-DD or ISO 8601 format",
            statusCode: 400,
          });
        }
        // Set to start of day (00:00:00.000Z)
        start.setUTCHours(0, 0, 0, 0);
        dateFilter.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({
            error: "Bad Request",
            message:
              "Invalid endDate format. Use YYYY-MM-DD or ISO 8601 format",
            statusCode: 400,
          });
        }
        // Set to end of day (23:59:59.999Z)
        end.setUTCHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }

      // Validate dateField parameter
      if (!["createdAt", "updatedAt"].includes(dateField)) {
        return res.status(400).json({
          error: "Bad Request",
          message: 'Invalid dateField. Must be "createdAt" or "updatedAt"',
          statusCode: 400,
        });
      }

      filter[dateField] = dateFilter;
    }

    // Pagination validation
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (pageNum < 1) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Page must be greater than 0",
        statusCode: 400,
      });
    }

    if (limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Limit must be between 1 and 100",
        statusCode: 400,
      });
    }

    // Parse sort parameter (format: "-createdAt" for desc, "createdAt" for asc)
    const sortObj = {};
    if (sort.startsWith("-")) {
      sortObj[sort.substring(1)] = -1; // Descending
    } else {
      sortObj[sort] = 1; // Ascending
    }

    // Get total count for pagination
    const totalSales = await Sale.countDocuments(filter);
    const totalPages = Math.ceil(totalSales / limitNum);

    // Execute query with pagination and sorting
    const sales = await Sale.find(filter)
      .sort(sortObj)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .populate("customerId", "firstName lastName email")
      .populate("sellerId", "firstName lastName")
      .populate("products.productId", "productName price");

    // Response with pagination metadata
    res.json({
      sales: sales.map((sale) => {
        const saleObj = sale.toJSON();
        // Ensure product references have name field for API consistency
        if (saleObj.products) {
          saleObj.products = saleObj.products.map((product) => {
            if (product.productId && product.productId.productName) {
              product.productId.name = product.productId.productName;
            }
            return product;
          });
        }
        return saleObj;
      }),
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalSales,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      filters: {
        customerId: customerId || null,
        sellerId: sellerId || null,
        settled: settled !== undefined ? settled === "true" : null,
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null,
          dateField,
        },
        sort,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Create a new sale with atomic inventory management
 * Uses MongoDB transactions to ensure data consistency across sale and inventory updates
 *
 * @async
 * @function createSale
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.customerId - Customer ID
 * @param {Array<Object>} req.body.products - Array of product items
 * @param {string} req.body.products[].productId - Product ID
 * @param {number} req.body.products[].quantity - Quantity to purchase
 * @param {number} [req.body.amountPaid=0] - Amount paid (defaults to 0)
 * @param {Object} req.user - Authenticated user
 * @param {string} req.user._id - Seller ID from authentication
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} JSON response with created sale (201)
 * @throws {404} If customer or product not found
 * @throws {400} If insufficient inventory
 *
 * @description
 * - Verifies customer exists
 * - Validates product availability and inventory levels
 * - Atomically decrements inventory and creates sale record
 * - Updates customer's lastTransaction timestamp
 * - All operations wrapped in MongoDB transaction
 */
const createSale = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { customerId, products, amountPaid = 0 } = req.body;

      // Verify customer exists
      const customer = await Customer.findById(customerId).session(session);
      if (!customer) {
        const error = new Error("Customer not found");
        error.statusCode = 404;
        throw error;
      }

      // Verify products and calculate total
      let totalAmount = 0;
      const saleProducts = [];

      for (const item of products) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) {
          const error = new Error(`Product ${item.productId} not found`);
          error.statusCode = 404;
          throw error;
        }

        if (product.count < item.quantity) {
          const error = new Error(
            `Insufficient inventory for ${product.productName}. Available: ${product.count}, Requested: ${item.quantity}`,
          );
          error.statusCode = 400;
          throw error;
        }

        // Calculate price for this item
        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        saleProducts.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtSale: product.price,
        });

        // Decrement inventory
        product.count -= item.quantity;
        await product.save({ session });
      }

      // Create sale
      const sale = new Sale({
        customerId,
        sellerId: req.user._id,
        products: saleProducts,
        totalAmount,
        amountPaid,
        settled: amountPaid >= totalAmount,
      });

      await sale.save({ session });

      // Update customer's last transaction
      customer.lastTransaction = new Date();
      await customer.save({ session });

      res.status(201).json(sale.toJSON());
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
        statusCode: 404,
      });
    }
    if (
      error.statusCode === 400 ||
      error.message.includes("Insufficient inventory")
    ) {
      return res.status(400).json({
        error: "Bad Request",
        message: error.message,
        statusCode: 400,
      });
    }
    return next(error);
  } finally {
    await session.endSession();
  }
};

/**
 * Get a single sale by ID
 *
 * @async
 * @function getSale
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - Sale ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} JSON response with sale details
 * @throws {404} If sale not found
 */
const getSale = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sale = await Sale.findById(id);
    if (!sale) {
      return res.status(404).json({
        error: "Not Found",
        message: "Sale not found",
        statusCode: 404,
      });
    }

    res.json(sale.toJSON());
  } catch (error) {
    return next(error);
  }
};

/**
 * Settle a pending sale by recording payment
 * Updates sale settlement status and records payment amount
 *
 * @async
 * @function settleSale
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - Sale ID to settle
 * @param {Object} req.body - Request body
 * @param {number} [req.body.amountPaid] - Amount paid (defaults to full amount)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} JSON response with updated sale
 * @throws {404} If sale not found
 * @throws {400} If sale is already settled
 */
const settleSale = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amountPaid } = req.body;

    const sale = await Sale.findById(id);
    if (!sale) {
      return res.status(404).json({
        error: "Not Found",
        message: "Sale not found",
        statusCode: 404,
      });
    }

    // Check if already settled
    if (sale.settled) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Sale is already settled",
        statusCode: 400,
      });
    }

    // If no amountPaid provided, settle for full amount
    const paymentAmount =
      amountPaid !== undefined ? amountPaid : sale.totalAmount;

    sale.amountPaid = paymentAmount;
    sale.settled = paymentAmount >= sale.totalAmount;

    // Set settledAt timestamp if now settled
    if (sale.settled) {
      sale.settledAt = new Date();
    }

    await sale.save();
    res.json(sale.toJSON());
  } catch (error) {
    return next(error);
  }
};

/**
 * Parse timestamp string from CSV
 *
 * @function parseCSVTimestamp
 * @param {string} timestampStr - Timestamp string (MM/DD/YYYY HH:mm:ss)
 * @returns {Date} Parsed date object
 * @throws {Error} If timestamp format is invalid
 */
const parseCSVTimestamp = (timestampStr) => {
  // Expected format: MM/DD/YYYY HH:mm:ss
  const parsed = new Date(timestampStr);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid timestamp format: ${timestampStr}`);
  }
  return parsed;
};

/**
 * Parse contact string to determine if it's email or phone number
 * Normalizes phone numbers to 10-digit format
 *
 * @function parseContact
 * @param {string} contact - Contact string (email or phone)
 * @returns {Object} Object with type and normalized value
 * @returns {string} return.type - "email" or "phone"
 * @returns {string} return.value - Normalized contact value
 * @throws {Error} If contact format is invalid
 */
const parseContact = (contact) => {
  const trimmedContact = contact.toString().trim();

  // Check if it looks like email
  if (trimmedContact.includes("@")) {
    return { type: "email", value: trimmedContact.toLowerCase() };
  }

  // Extract digits from phone number (handle formats like +1-555-0101, (555) 123-4567, etc.)
  const digitsOnly = trimmedContact.replace(/\D/g, "");

  // Check if it's 10 digits (US format) or 11 digits with country code (like +1)
  if (/^\d{10}$/.test(digitsOnly)) {
    return { type: "phone", value: digitsOnly };
  }

  if (/^1\d{10}$/.test(digitsOnly)) {
    // Remove leading 1 for US numbers
    return { type: "phone", value: digitsOnly.substring(1) };
  }

  throw new Error(`Invalid contact format: ${contact}`);
};

/**
 * Find customer by email or phone number
 *
 * @async
 * @function findCustomerByContact
 * @param {string} contact - Customer email or phone number
 * @returns {Promise<Object|null>} Customer object or null if not found
 */
const findCustomerByContact = async (contact) => {
  const parsedContact = parseContact(contact);

  if (parsedContact.type === "email") {
    return await Customer.findOne({ email: parsedContact.value });
  } else {
    return await Customer.findOne({ phoneNumber: parsedContact.value });
  }
};

/**
 * Find product by name (case-insensitive)
 *
 * @async
 * @function findProductByName
 * @param {string} productName - Product name to search for
 * @returns {Promise<Object|null>} Product object or null if not found
 */
const findProductByName = async (productName) => {
  return await Product.findOne({
    productName: { $regex: new RegExp(`^${productName.trim()}$`, "i") },
  });
};

/**
 * Normalize CSV row data by mapping columns to expected field names
 *
 * @function normalizeCSVRow
 * @param {Object} row - Raw CSV row data
 * @returns {Object} Normalized data object
 */
const normalizeCSVRow = (row) => {
  const normalized = {};

  // Map CSV columns to expected field names
  const columnMapping = {
    Date: "timestamp",
    "Contact Name": "customerName",
    "Contact Phone": "contactPhone",
    "Contact Email": "contactEmail",
    Product: "productName",
    Quantity: "quantity",
    "Unit Price": "unitPrice",
    "Total Amount": "totalAmount",
    "Amount Paid": "amountPaid",
  };

  // Apply mapping
  for (const [csvColumn, normalizedField] of Object.entries(columnMapping)) {
    if (row[csvColumn] !== undefined) {
      normalized[normalizedField] = row[csvColumn];
    }
  }

  // Determine primary contact method
  if (normalized.contactPhone) {
    normalized.contact = normalized.contactPhone;
  } else if (normalized.contactEmail) {
    normalized.contact = normalized.contactEmail;
  }

  return normalized;
};

/**
 * Validate CSV row data for required fields and formats
 *
 * @function validateCSVRow
 * @param {Object} row - CSV row data
 * @returns {Object} Validation result
 * @returns {Array<Object>} return.errors - Array of validation errors
 * @returns {Object} return.normalized - Normalized row data
 */
const validateCSVRow = (row) => {
  const errors = [];
  const normalized = normalizeCSVRow(row);

  // Required fields
  const requiredFields = [
    "customerName",
    "contact",
    "productName",
    "quantity",
    "timestamp",
  ];
  for (const field of requiredFields) {
    if (!normalized[field] || normalized[field].toString().trim() === "") {
      errors.push({ field, message: `${field} is required` });
    }
  }

  // Quantity validation
  if (normalized.quantity) {
    const quantity = parseInt(normalized.quantity);
    if (isNaN(quantity) || quantity < 1) {
      errors.push({
        field: "quantity",
        message: "Quantity must be a positive integer",
      });
    }
  }

  // Amount paid validation
  if (normalized.amountPaid !== undefined && normalized.amountPaid !== "") {
    const amountPaid = parseFloat(normalized.amountPaid);
    if (isNaN(amountPaid) || amountPaid < 0) {
      errors.push({
        field: "amountPaid",
        message: "Amount paid must be non-negative",
      });
    }
  }

  return { errors, normalized };
};

/**
 * Import sales from CSV file
 * Processes CSV file and creates sales with inventory updates and deduplication
 *
 * @async
 * @function importSalesFromCSV
 * @param {Object} req - Express request object
 * @param {Object} req.file - Uploaded file from multer
 * @param {Buffer} req.file.buffer - CSV file buffer
 * @param {Object} req.user - Authenticated user
 * @param {string} req.user._id - Seller ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} JSON response with import summary
 * @throws {400} If no file provided
 *
 * @description
 * Expected CSV columns: Date, Contact Name, Contact Phone/Email, Product, Quantity,
 * Unit Price, Total Amount, Amount Paid, Payment Method (optional), Receipt URL (optional)
 *
 * Features:
 * - Duplicate detection by customer and timestamp
 * - Customer lookup by email or phone
 * - Product lookup by name (case-insensitive)
 * - Batch processing for memory efficiency
 * - Detailed error reporting per row
 */
const importSalesFromCSV = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Bad Request",
        message: "No CSV file provided",
        statusCode: 400,
      });
    }

    const results = [];
    const successfulImports = [];
    const skippedRows = [];
    const warnings = [];
    let rowNumber = 0;

    // Generate batch ID for tracking
    const importBatch = `batch_${new Date().toISOString().replace(/[:.]/g, "")}`;
    const importedAt = new Date();

    // Create a readable stream from the buffer
    const stream = Readable.from(req.file.buffer.toString());

    // Process CSV with promise wrapper
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on("data", (data) => {
          results.push(data);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    // Process rows in chunks for memory optimization
    const CHUNK_SIZE = 100;
    for (let i = 0; i < results.length; i += CHUNK_SIZE) {
      const chunk = results.slice(i, i + CHUNK_SIZE);

      for (const row of chunk) {
        rowNumber++;

        try {
          // Basic validation and normalization
          const validationResult = validateCSVRow(row);
          const { errors: validationErrors, normalized } = validationResult;

          if (validationErrors.length > 0) {
            skippedRows.push({
              row: rowNumber,
              data: row,
              skip_reason: "required_field_missing",
              errors: validationErrors,
            });
            continue;
          }

          // Parse timestamp
          let parsedTimestamp;
          try {
            parsedTimestamp = parseCSVTimestamp(normalized.timestamp);
          } catch (error) {
            skippedRows.push({
              row: rowNumber,
              data: row,
              skip_reason: "invalid_date_format",
              errors: [{ field: "timestamp", message: error.message }],
            });
            continue;
          }

          // Customer resolution
          const customer = await findCustomerByContact(normalized.contact);
          if (!customer) {
            skippedRows.push({
              row: rowNumber,
              data: row,
              skip_reason: "customer_not_found",
              errors: [
                {
                  field: "contact",
                  message: `No customer found with contact: ${normalized.contact}`,
                },
              ],
            });
            continue;
          }

          // Duplicate detection
          const existingSale = await Sale.findOne({
            customerId: customer._id,
            originalCreatedAt: parsedTimestamp,
          });

          if (existingSale) {
            skippedRows.push({
              row: rowNumber,
              data: row,
              skip_reason: "already_registered",
              errors: [
                {
                  field: "timestamp",
                  message: `Sale already exists for this customer at ${parsedTimestamp.toISOString()}`,
                  existingSale: {
                    id: existingSale._id,
                    timestamp:
                      existingSale.originalCreatedAt || existingSale.createdAt,
                  },
                },
              ],
            });
            continue;
          }

          // Product lookup
          const product = await findProductByName(normalized.productName);
          if (!product) {
            skippedRows.push({
              row: rowNumber,
              data: row,
              skip_reason: "product_not_found",
              errors: [
                {
                  field: "productName",
                  message: `Product not found: ${normalized.productName}`,
                },
              ],
            });
            continue;
          }

          // Parse quantities and amounts
          const quantity = parseInt(normalized.quantity);
          const totalAmount = product.price * quantity;
          const amountPaid =
            normalized.amountPaid &&
            normalized.amountPaid.toString().trim() !== ""
              ? parseFloat(normalized.amountPaid)
              : 0;

          // Payment validation
          if (amountPaid < 0) {
            skippedRows.push({
              row: rowNumber,
              data: row,
              skip_reason: "negative_payment",
              errors: [
                {
                  field: "amountPaid",
                  message: "Payment amount cannot be negative",
                },
              ],
            });
            continue;
          }

          // Create sale data
          const saleData = {
            customerId: customer._id,
            sellerId: req.user._id,
            products: [
              {
                productId: product._id,
                quantity: quantity,
                priceAtSale: product.price,
              },
            ],
            totalAmount: totalAmount,
            amountPaid: amountPaid,
            settled: amountPaid >= totalAmount,

            // CSV Import specific fields
            originalCreatedAt: parsedTimestamp,
            importedAt: importedAt,
            externalSale: true,
            receiptUrl:
              row.receiptUrl && row.receiptUrl.toString().trim() !== ""
                ? row.receiptUrl.toString().trim()
                : null,
            importBatch: importBatch,
            paymentMethod:
              row.paymentMethod && row.paymentMethod.toString().trim() !== ""
                ? row.paymentMethod.toString().trim()
                : null,
          };

          // Create and save sale
          const sale = new Sale(saleData);
          await sale.save();

          // Update customer's last transaction (using original timestamp)
          if (
            !customer.lastTransaction ||
            parsedTimestamp > customer.lastTransaction
          ) {
            customer.lastTransaction = parsedTimestamp;
            await customer.save();
          }

          // Decrement inventory
          product.count -= quantity;
          await product.save();

          successfulImports.push({
            row: rowNumber,
            customer: {
              name: `${customer.firstName} ${customer.lastName}`,
              contact: normalized.contact,
            },
            sale: sale.toJSON(),
          });

          // Add warnings for edge cases
          if (amountPaid === 0) {
            warnings.push(
              `Row ${rowNumber}: Sale created with zero payment (marked as pending)`,
            );
          }
          if (amountPaid > totalAmount) {
            warnings.push(
              `Row ${rowNumber}: Payment amount (${amountPaid}) exceeds total (${totalAmount})`,
            );
          }
        } catch (error) {
          // Handle unexpected errors during processing
          console.error(`Error processing row ${rowNumber}:`, error);
          skippedRows.push({
            row: rowNumber,
            data: row,
            skip_reason: "processing_error",
            errors: [
              {
                field: "general",
                message: error.message || "Unexpected error occurred",
              },
            ],
          });
        }
      }
    }

    // Return comprehensive results
    res.status(200).json({
      success: true,
      message: `CSV import completed. ${successfulImports.length} sales imported successfully, ${skippedRows.length} failed.`,
      summary: {
        totalRows: results.length,
        imported: successfulImports.length,
        skipped: skippedRows.length,
        importBatchId: importBatch,
      },
      importedSales: successfulImports.slice(0, 10), // Limit to first 10 for response size
      skippedRows: skippedRows.slice(0, 20), // Limit to first 20 failures
      warnings: warnings,
      truncated: {
        importedSales: successfulImports.length > 10,
        skippedRows: skippedRows.length > 20,
      },
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return next(error);
  }
};

/**
 * Multer configuration for sales CSV file upload
 * Configures memory storage, 10MB file size limit, and CSV file validation
 *
 * @constant {Object} uploadCSV
 * @property {Object} storage - Memory storage configuration
 * @property {Object} limits - Upload limits (10MB max)
 * @property {Function} fileFilter - CSV file validation
 */
const uploadCSV = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for sales data
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

export {
  listSales,
  createSale,
  getSale,
  settleSale,
  importSalesFromCSV,
  uploadCSV,
};
