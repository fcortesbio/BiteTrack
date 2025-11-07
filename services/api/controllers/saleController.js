import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import mongoose from 'mongoose';
import csv from 'csv-parser';
import multer from 'multer';
import { Readable } from 'stream';

const listSales = async(req, res, next) => {
  try {
    const { 
      customerId, 
      sellerId, 
      settled, 
      startDate, 
      endDate, 
      dateField = 'createdAt',
      page = 1, 
      limit = 50,
      sort = '-createdAt',
    } = req.query;
    
    const filter = {};
    
    // Existing filters
    if (customerId) {filter.customerId = customerId;}
    if (sellerId) {filter.sellerId = sellerId;}
    if (settled !== undefined) {filter.settled = settled === 'true';}
    
    // Date range filtering
    if (startDate || endDate) {
      const dateFilter = {};
      
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid startDate format. Use YYYY-MM-DD or ISO 8601 format',
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
            error: 'Bad Request',
            message: 'Invalid endDate format. Use YYYY-MM-DD or ISO 8601 format',
            statusCode: 400,
          });
        }
        // Set to end of day (23:59:59.999Z)
        end.setUTCHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      
      // Validate dateField parameter
      if (!['createdAt', 'updatedAt'].includes(dateField)) {
        return res.status(400).json({
          error: 'Bad Request',
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
        error: 'Bad Request',
        message: 'Page must be greater than 0',
        statusCode: 400,
      });
    }
    
    if (limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Limit must be between 1 and 100',
        statusCode: 400,
      });
    }
    
    // Parse sort parameter (format: "-createdAt" for desc, "createdAt" for asc)
    const sortObj = {};
    if (sort.startsWith('-')) {
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
      .populate('customerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName')
      .populate('products.productId', 'productName price');
    
    // Response with pagination metadata
    res.json({
      sales: sales.map(sale => {
        const saleObj = sale.toJSON();
        // Ensure product references have name field for API consistency
        if (saleObj.products) {
          saleObj.products = saleObj.products.map(product => {
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
        settled: settled !== undefined ? settled === 'true' : null,
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

const createSale = async(req, res, next) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async() => {
      const { customerId, products, amountPaid = 0 } = req.body;

      // Verify customer exists
      const customer = await Customer.findById(customerId).session(session);
      if (!customer) {
        const error = new Error('Customer not found');
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
          const error = new Error(`Insufficient inventory for ${product.productName}. Available: ${product.count}, Requested: ${item.quantity}`);
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
        error: 'Not Found',
        message: error.message,
        statusCode: 404,
      });
    }
    if (error.statusCode === 400 || error.message.includes('Insufficient inventory')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message,
        statusCode: 400,
      });
    }
    return next(error);
  } finally {
    await session.endSession();
  }
};

const getSale = async(req, res, next) => {
  try {
    const { id } = req.params;

    const sale = await Sale.findById(id);
    if (!sale) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Sale not found',
        statusCode: 404,
      });
    }

    res.json(sale.toJSON());
  } catch (error) {
    return next(error);
  }
};

const settleSale = async(req, res, next) => {
  try {
    const { id } = req.params;
    const { amountPaid } = req.body;

    const sale = await Sale.findById(id);
    if (!sale) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Sale not found',
        statusCode: 404,
      });
    }

    // Check if already settled
    if (sale.settled) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Sale is already settled',
        statusCode: 400,
      });
    }

    // If no amountPaid provided, settle for full amount
    const paymentAmount = amountPaid !== undefined ? amountPaid : sale.totalAmount;
    
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

// Helper function to parse timestamp from CSV
const parseCSVTimestamp = (timestampStr) => {
  // Expected format: MM/DD/YYYY HH:mm:ss
  const parsed = new Date(timestampStr);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid timestamp format: ${timestampStr}`);
  }
  return parsed;
};

// Helper function to determine if contact is email or phone
const parseContact = (contact) => {
  const trimmedContact = contact.toString().trim();
  
  // Check if it looks like email
  if (trimmedContact.includes('@')) {
    return { type: 'email', value: trimmedContact.toLowerCase() };
  }
  
  // Extract digits from phone number (handle formats like +1-555-0101, (555) 123-4567, etc.)
  const digitsOnly = trimmedContact.replace(/\D/g, '');
  
  // Check if it's 10 digits (US format) or 11 digits with country code (like +1)
  if (/^\d{10}$/.test(digitsOnly)) {
    return { type: 'phone', value: digitsOnly };
  }
  
  if (/^1\d{10}$/.test(digitsOnly)) {
    // Remove leading 1 for US numbers
    return { type: 'phone', value: digitsOnly.substring(1) };
  }
  
  throw new Error(`Invalid contact format: ${contact}`);
};

// Helper function to find customer by contact
const findCustomerByContact = async(contact) => {
  const parsedContact = parseContact(contact);
  
  if (parsedContact.type === 'email') {
    return await Customer.findOne({ email: parsedContact.value });
  } else {
    return await Customer.findOne({ phoneNumber: parsedContact.value });
  }
};

// Helper function to find product by name (case-insensitive)
const findProductByName = async(productName) => {
  return await Product.findOne({
    productName: { $regex: new RegExp(`^${productName.trim()}$`, 'i') },
  });
};

// Helper function to normalize CSV row data
const normalizeCSVRow = (row) => {
  const normalized = {};
  
  // Map CSV columns to expected field names
  const columnMapping = {
    'Date': 'timestamp',
    'Contact Name': 'customerName',
    'Contact Phone': 'contactPhone', 
    'Contact Email': 'contactEmail',
    'Product': 'productName',
    'Quantity': 'quantity',
    'Unit Price': 'unitPrice',
    'Total Amount': 'totalAmount',
    'Amount Paid': 'amountPaid',
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

// Helper function to validate CSV row data
const validateCSVRow = (row) => {
  const errors = [];
  const normalized = normalizeCSVRow(row);
  
  // Required fields
  const requiredFields = ['customerName', 'contact', 'productName', 'quantity', 'timestamp'];
  for (const field of requiredFields) {
    if (!normalized[field] || normalized[field].toString().trim() === '') {
      errors.push({ field, message: `${field} is required` });
    }
  }
  
  // Quantity validation
  if (normalized.quantity) {
    const quantity = parseInt(normalized.quantity);
    if (isNaN(quantity) || quantity < 1) {
      errors.push({ field: 'quantity', message: 'Quantity must be a positive integer' });
    }
  }
  
  // Amount paid validation
  if (normalized.amountPaid !== undefined && normalized.amountPaid !== '') {
    const amountPaid = parseFloat(normalized.amountPaid);
    if (isNaN(amountPaid) || amountPaid < 0) {
      errors.push({ field: 'amountPaid', message: 'Amount paid must be non-negative' });
    }
  }
  
  return { errors, normalized };
};

const importSalesFromCSV = async(req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No CSV file provided',
        statusCode: 400,
      });
    }

    const results = [];
    const successfulImports = [];
    const skippedRows = [];
    const warnings = [];
    let rowNumber = 0;

    // Generate batch ID for tracking
    const importBatch = `batch_${new Date().toISOString().replace(/[:.]/g, '')}`;
    const importedAt = new Date();
    
    // Create a readable stream from the buffer
    const stream = Readable.from(req.file.buffer.toString());
    
    // Process CSV with promise wrapper
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => {
          results.push(data);
        })
        .on('end', resolve)
        .on('error', reject);
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
              skip_reason: 'required_field_missing',
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
              skip_reason: 'invalid_date_format',
              errors: [{ field: 'timestamp', message: error.message }],
            });
            continue;
          }

          // Customer resolution
          const customer = await findCustomerByContact(normalized.contact);
          if (!customer) {
            skippedRows.push({
              row: rowNumber,
              data: row,
              skip_reason: 'customer_not_found',
              errors: [{ field: 'contact', message: `No customer found with contact: ${normalized.contact}` }],
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
              skip_reason: 'already_registered',
              errors: [{ 
                field: 'timestamp', 
                message: `Sale already exists for this customer at ${parsedTimestamp.toISOString()}`,
                existingSale: {
                  id: existingSale._id,
                  timestamp: existingSale.originalCreatedAt || existingSale.createdAt,
                },
              }],
            });
            continue;
          }

          // Product lookup
          const product = await findProductByName(normalized.productName);
          if (!product) {
            skippedRows.push({
              row: rowNumber,
              data: row,
              skip_reason: 'product_not_found',
              errors: [{ field: 'productName', message: `Product not found: ${normalized.productName}` }],
            });
            continue;
          }

          // Parse quantities and amounts
          const quantity = parseInt(normalized.quantity);
          const totalAmount = product.price * quantity;
          const amountPaid = normalized.amountPaid && normalized.amountPaid.toString().trim() !== '' 
            ? parseFloat(normalized.amountPaid) 
            : 0;

          // Payment validation
          if (amountPaid < 0) {
            skippedRows.push({
              row: rowNumber,
              data: row,
              skip_reason: 'negative_payment',
              errors: [{ field: 'amountPaid', message: 'Payment amount cannot be negative' }],
            });
            continue;
          }

          // Create sale data
          const saleData = {
            customerId: customer._id,
            sellerId: req.user._id,
            products: [{
              productId: product._id,
              quantity: quantity,
              priceAtSale: product.price,
            }],
            totalAmount: totalAmount,
            amountPaid: amountPaid,
            settled: amountPaid >= totalAmount,
            
            // CSV Import specific fields
            originalCreatedAt: parsedTimestamp,
            importedAt: importedAt,
            externalSale: true,
            receiptUrl: row.receiptUrl && row.receiptUrl.toString().trim() !== '' 
              ? row.receiptUrl.toString().trim() 
              : null,
            importBatch: importBatch,
            paymentMethod: row.paymentMethod && row.paymentMethod.toString().trim() !== '' 
              ? row.paymentMethod.toString().trim() 
              : null,
          };

          // Create and save sale
          const sale = new Sale(saleData);
          await sale.save();
          
          // Update customer's last transaction (using original timestamp)
          if (!customer.lastTransaction || parsedTimestamp > customer.lastTransaction) {
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
            warnings.push(`Row ${rowNumber}: Sale created with zero payment (marked as pending)`);
          }
          if (amountPaid > totalAmount) {
            warnings.push(`Row ${rowNumber}: Payment amount (${amountPaid}) exceeds total (${totalAmount})`);
          }

        } catch (error) {
          // Handle unexpected errors during processing
          console.error(`Error processing row ${rowNumber}:`, error);
          skippedRows.push({
            row: rowNumber,
            data: row,
            skip_reason: 'processing_error',
            errors: [{ field: 'general', message: error.message || 'Unexpected error occurred' }],
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
    console.error('CSV import error:', error);
    return next(error);
  }
};

// Configure multer for CSV file upload
const uploadCSV = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for sales data
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
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
