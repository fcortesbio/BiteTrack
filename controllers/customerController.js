const Customer = require('../models/Customer');
const Sale = require('../models/Sale');

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

    const customer = new Customer({
      firstName,
      lastName,
      phoneNumber,
      email: email || undefined // Convert empty string to undefined for sparse index
    });

    await customer.save();
    res.status(201).json(customer.toJSON());
  } catch (error) {
    throw error;
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Convert empty email to undefined for sparse index
    if (updates.email === '') {
      updates.email = undefined;
    }

    const customer = await Customer.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Customer not found',
        statusCode: 404
      });
    }

    res.json(customer.toJSON());
  } catch (error) {
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

module.exports = {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerTransactions
};
