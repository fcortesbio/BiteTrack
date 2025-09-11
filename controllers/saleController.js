const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const mongoose = require('mongoose');

const listSales = async (req, res) => {
  try {
    const { customerId, sellerId, settled } = req.query;
    const filter = {};

    if (customerId) filter.customerId = customerId;
    if (sellerId) filter.sellerId = sellerId;
    if (settled !== undefined) filter.settled = settled === 'true';

    const sales = await Sale.find(filter);
    res.json(sales);
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