const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const mongoose = require('mongoose');

const listSales = async (req, res) => {
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
      sort = '-createdAt'
    } = req.query;
    
    const filter = {};
    
    // Existing filters
    if (customerId) filter.customerId = customerId;
    if (sellerId) filter.sellerId = sellerId;
    if (settled !== undefined) filter.settled = settled === 'true';
    
    // Date range filtering
    if (startDate || endDate) {
      const dateFilter = {};
      
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid startDate format. Use YYYY-MM-DD or ISO 8601 format',
            statusCode: 400
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
            statusCode: 400
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
          statusCode: 400
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
        statusCode: 400
      });
    }
    
    if (limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Limit must be between 1 and 100',
        statusCode: 400
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
      .populate('products.productId', 'productName');
    
    // Response with pagination metadata
    res.json({
      sales: sales.map(sale => sale.toJSON()),
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalSales,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      filters: {
        customerId: customerId || null,
        sellerId: sellerId || null,
        settled: settled !== undefined ? settled === 'true' : null,
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null,
          dateField
        },
        sort
      }
    });
  } catch (error) {
    throw error;
  }
};

const createSale = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { customerId, products, amountPaid } = req.body;

      // Verify customer exists
      const customer = await Customer.findById(customerId).session(session);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Verify products and calculate total
      let totalAmount = 0;
      const saleProducts = [];

      for (const item of products) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        if (product.count < item.quantity) {
          throw new Error(`Insufficient inventory for ${product.productName}. Available: ${product.count}, Requested: ${item.quantity}`);
        }

        // Calculate price for this item
        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        saleProducts.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtSale: product.price
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
        settled: amountPaid >= totalAmount
      });

      await sale.save({ session });

      // Update customer's last transaction
      customer.lastTransaction = new Date();
      await customer.save({ session });

      res.status(201).json(sale.toJSON());
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('Insufficient inventory')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message,
        statusCode: 400
      });
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

const getSale = async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await Sale.findById(id);
    if (!sale) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Sale not found',
        statusCode: 404
      });
    }

    res.json(sale.toJSON());
  } catch (error) {
    throw error;
  }
};

const settleSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { amountPaid } = req.body;

    const sale = await Sale.findById(id);
    if (!sale) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Sale not found',
        statusCode: 404
      });
    }

    sale.amountPaid = amountPaid;
    sale.settled = amountPaid >= sale.totalAmount;

    await sale.save();
    res.json(sale.toJSON());
  } catch (error) {
    throw error;
  }
};

module.exports = {
  listSales,
  createSale,
  getSale,
  settleSale
};