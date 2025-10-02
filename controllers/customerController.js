const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const csv = require('csv-parser');
const multer = require('multer');
const { Readable } = require('stream');

const listCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({});
    res.json(customers);
  } catch (error) {
    throw error;
  }
};

const createCustomer = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, email } = req.body;

    // Check for duplicate phone number
    const existingCustomerByPhone = await Customer.findOne({ phoneNumber });
    if (existingCustomerByPhone) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A customer with this phone number already exists',
        statusCode: 409,
        details: [{
          field: 'phoneNumber',
          message: 'Phone number must be unique',
          existingCustomer: {
            id: existingCustomerByPhone._id,
            name: `${existingCustomerByPhone.firstName} ${existingCustomerByPhone.lastName}`,
            phoneNumber: existingCustomerByPhone.phoneNumber
          }
        }]
      });
    }

    // Check for duplicate email if provided
    if (email && email.trim() !== '') {
      const existingCustomerByEmail = await Customer.findOne({ email: email.toLowerCase().trim() });
      if (existingCustomerByEmail) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A customer with this email already exists',
          statusCode: 409,
          details: [{
            field: 'email',
            message: 'Email must be unique',
            existingCustomer: {
              id: existingCustomerByEmail._id,
              name: `${existingCustomerByEmail.firstName} ${existingCustomerByEmail.lastName}`,
              email: existingCustomerByEmail.email
            }
          }]
        });
      }
    }

    // Create new customer
    const customer = new Customer({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email && email.trim() !== '' ? email.toLowerCase().trim() : undefined
    });

    await customer.save();
    res.status(201).json(customer.toJSON());
  } catch (error) {
    // Handle MongoDB duplicate key errors as backup
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      const fieldDisplayName = duplicateField === 'phoneNumber' ? 'phone number' : duplicateField;
      
      return res.status(409).json({
        error: 'Conflict',
        message: `A customer with this ${fieldDisplayName} already exists`,
        statusCode: 409,
        details: [{
          field: duplicateField,
          message: `${fieldDisplayName.charAt(0).toUpperCase() + fieldDisplayName.slice(1)} must be unique`
        }]
      });
    }
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const details = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Customer data validation failed',
        statusCode: 400,
        details
      });
    }
    
    throw error;
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verify customer exists
    const existingCustomer = await Customer.findById(id);
    if (!existingCustomer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Customer not found',
        statusCode: 404
      });
    }

    // Check for duplicate phone number if being updated
    if (updates.phoneNumber && updates.phoneNumber.trim() !== existingCustomer.phoneNumber) {
      const duplicatePhoneCustomer = await Customer.findOne({ 
        phoneNumber: updates.phoneNumber.trim(),
        _id: { $ne: id } // Exclude current customer
      });
      
      if (duplicatePhoneCustomer) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A customer with this phone number already exists',
          statusCode: 409,
          details: [{
            field: 'phoneNumber',
            message: 'Phone number must be unique',
            existingCustomer: {
              id: duplicatePhoneCustomer._id,
              name: `${duplicatePhoneCustomer.firstName} ${duplicatePhoneCustomer.lastName}`,
              phoneNumber: duplicatePhoneCustomer.phoneNumber
            }
          }]
        });
      }
    }

    // Check for duplicate email if being updated
    if (updates.email && updates.email.trim() !== '' && 
        updates.email.toLowerCase().trim() !== existingCustomer.email) {
      const duplicateEmailCustomer = await Customer.findOne({ 
        email: updates.email.toLowerCase().trim(),
        _id: { $ne: id } // Exclude current customer
      });
      
      if (duplicateEmailCustomer) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A customer with this email already exists',
          statusCode: 409,
          details: [{
            field: 'email',
            message: 'Email must be unique',
            existingCustomer: {
              id: duplicateEmailCustomer._id,
              name: `${duplicateEmailCustomer.firstName} ${duplicateEmailCustomer.lastName}`,
              email: duplicateEmailCustomer.email
            }
          }]
        });
      }
    }

    // Prepare clean updates
    const cleanUpdates = { ...updates };
    
    // Clean and normalize data
    if (cleanUpdates.firstName) cleanUpdates.firstName = cleanUpdates.firstName.trim();
    if (cleanUpdates.lastName) cleanUpdates.lastName = cleanUpdates.lastName.trim();
    if (cleanUpdates.phoneNumber) cleanUpdates.phoneNumber = cleanUpdates.phoneNumber.trim();
    
    // Handle email normalization
    if (cleanUpdates.email === '' || cleanUpdates.email === null) {
      cleanUpdates.email = undefined; // For sparse index
    } else if (cleanUpdates.email) {
      cleanUpdates.email = cleanUpdates.email.toLowerCase().trim();
    }

    const customer = await Customer.findByIdAndUpdate(
      id,
      cleanUpdates,
      { new: true, runValidators: true }
    );

    res.json(customer.toJSON());
  } catch (error) {
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      const fieldDisplayName = duplicateField === 'phoneNumber' ? 'phone number' : duplicateField;
      
      return res.status(409).json({
        error: 'Conflict',
        message: `A customer with this ${fieldDisplayName} already exists`,
        statusCode: 409,
        details: [{
          field: duplicateField,
          message: `${fieldDisplayName.charAt(0).toUpperCase() + fieldDisplayName.slice(1)} must be unique`
        }]
      });
    }
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const details = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Customer data validation failed',
        statusCode: 400,
        details
      });
    }
    
    throw error;
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Customer not found',
        statusCode: 404
      });
    }

    await Customer.deleteOne({ _id: id });
    res.status(204).send();
  } catch (error) {
    throw error;
  }
};

const getCustomerTransactions = async (req, res) => {
  try {
    // Parameter extraction & Setup
    const { id } = req.params;
    const { limit = 10, page = 1, settled } = req.query;

    // Convert string parameters to numbers
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);

    // Validate pagination parameters
    if (limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Limit must be between 1 and 100',
        statusCode: 400
      });
    }

    if (pageNum < 1) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Page must be greater than 0',
        statusCode: 400
      });
    }

    // Verify customer exists
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Customer not found',
        statusCode: 404
      });
    }

    // Build filter for sales
    const filter = { customerId: id };
    if (settled !== undefined) {
      filter.settled = settled === 'true';
    }

    // Get total count for pagination
    const totalTransactions = await Sale.countDocuments(filter);
    const totalPages = Math.ceil(totalTransactions / limitNum);

    // Get paginated transactions
    const transactions = await Sale.find(filter)
      .sort({ createdAt: -1 }) // Most recent first
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .populate('sellerId', 'firstName lastName')
      .populate('products.productId', 'productName');

    res.json({
      customer: customer.toJSON(),
      transactions: transactions.map(t => t.toJSON()),
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalTransactions,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    throw error;
  }
};

// Helper function to validate customer data
const validateCustomerData = (data) => {
  const errors = [];
  
  // Required field validations
  if (!data.firstName || !data.firstName.toString().trim()) {
    errors.push({ field: 'firstName', message: 'First name is required' });
  }
  
  if (!data.lastName || !data.lastName.toString().trim()) {
    errors.push({ field: 'lastName', message: 'Last name is required' });
  }
  
  if (!data.phoneNumber || !data.phoneNumber.toString().trim()) {
    errors.push({ field: 'phoneNumber', message: 'Phone number is required' });
  } else {
    // Phone number format validation
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(data.phoneNumber.toString().trim())) {
      errors.push({ field: 'phoneNumber', message: 'Phone number must be exactly 10 digits' });
    }
  }
  
  return errors;
};

// Helper function to check for existing customers
const checkForConflicts = async (customerData) => {
  const conflicts = [];
  const phoneNumber = customerData.phoneNumber.toString().trim();
  const email = customerData.email ? customerData.email.toString().toLowerCase().trim() : null;
  
  // Check for duplicate phone number
  const existingByPhone = await Customer.findOne({ phoneNumber });
  if (existingByPhone) {
    conflicts.push({
      field: 'phoneNumber',
      message: 'Phone number already exists',
      existingCustomer: {
        id: existingByPhone._id,
        name: `${existingByPhone.firstName} ${existingByPhone.lastName}`,
        phoneNumber: existingByPhone.phoneNumber
      }
    });
  }
  
  // Check for duplicate email if provided
  if (email) {
    const existingByEmail = await Customer.findOne({ email });
    if (existingByEmail) {
      conflicts.push({
        field: 'email',
        message: 'Email already exists',
        existingCustomer: {
          id: existingByEmail._id,
          name: `${existingByEmail.firstName} ${existingByEmail.lastName}`,
          email: existingByEmail.email
        }
      });
    }
  }
  
  return conflicts;
};

const importCustomersFromCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No CSV file provided',
        statusCode: 400
      });
    }

    const results = [];
    const successfulImports = [];
    const failures = [];
    let rowNumber = 0;

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

    // Process each row
    for (const row of results) {
      rowNumber++;
      
      try {
        // Basic validation
        const validationErrors = validateCustomerData(row);
        if (validationErrors.length > 0) {
          failures.push({
            row: rowNumber,
            data: row,
            errors: validationErrors
          });
          continue;
        }

        // Check for conflicts
        const conflicts = await checkForConflicts(row);
        if (conflicts.length > 0) {
          failures.push({
            row: rowNumber,
            data: row,
            errors: conflicts
          });
          continue;
        }

        // Create customer
        const customerData = {
          firstName: row.firstName.toString().trim(),
          lastName: row.lastName.toString().trim(),
          phoneNumber: row.phoneNumber.toString().trim(),
          email: row.email && row.email.toString().trim() !== '' ? 
                 row.email.toString().toLowerCase().trim() : undefined
        };

        const customer = new Customer(customerData);
        await customer.save();
        
        successfulImports.push({
          row: rowNumber,
          customer: customer.toJSON()
        });

      } catch (error) {
        // Handle unexpected errors during customer creation
        const errorMessage = error.name === 'ValidationError' ? 
          Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message
          })) : [{ field: 'general', message: error.message || 'Unexpected error occurred' }];
        
        failures.push({
          row: rowNumber,
          data: row,
          errors: errorMessage
        });
      }
    }

    // Return comprehensive results
    res.status(200).json({
      success: true,
      message: `CSV import completed. ${successfulImports.length} customers imported successfully, ${failures.length} failed.`,
      summary: {
        totalRows: results.length,
        successful: successfulImports.length,
        failed: failures.length
      },
      successfulImports: successfulImports.slice(0, 10), // Limit to first 10 for response size
      failures: failures.slice(0, 20), // Limit to first 20 failures
      truncated: {
        successfulImports: successfulImports.length > 10,
        failures: failures.length > 20
      }
    });

  } catch (error) {
    console.error('CSV import error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process CSV file',
      statusCode: 500,
      details: error.message
    });
  }
};

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

module.exports = {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerTransactions,
  importCustomersFromCSV,
  upload
};
