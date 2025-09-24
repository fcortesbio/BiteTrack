const TestDataPopulator = require('../scripts/04-populate-test-data');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const PendingSeller = require('../models/PendingSeller');

/**
 * Test Data Management Controller
 * 
 * Provides API endpoints for managing test data in development/testing environments.
 * These endpoints should be disabled in production for security reasons.
 * 
 * All endpoints require admin or superadmin privileges.
 */

/**
 * @desc    Populate database with test data
 * @route   POST /api/test-data/populate
 * @access  Admin/SuperAdmin only
 * @body    { preset?, cleanBefore?, verbose? }
 */
const populateTestData = async (req, res) => {
  try {
    // Security check - only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Test data endpoints are disabled in production',
        statusCode: 403
      });
    }

    const { preset = 'minimal', cleanBefore = false, verbose = false } = req.body;

    // Validate preset
    const validPresets = ['minimal', 'dev', 'full', 'bulk'];
    if (!validPresets.includes(preset)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Invalid preset. Must be one of: ${validPresets.join(', ')}`,
        statusCode: 400
      });
    }

    // Create populator instance
    const populator = new TestDataPopulator({
      preset,
      clean: cleanBefore,
      verbose
    });

    // Load test data
    await populator.loadTestData();

    // Clean if requested
    if (cleanBefore) {
      await populator.cleanDatabase();
    }

    // Populate data
    await populator.populateCustomers();
    await populator.populateProducts();
    await populator.populatePendingSellers();
    await populator.populateSales();

    // Generate summary
    const summary = {
      preset,
      timestamp: new Date().toISOString(),
      requestedBy: req.user.id,
      requestedByUser: `${req.user.firstName} ${req.user.lastName}`,
      counts: {
        customers: populator.createdData.customers.length,
        products: populator.createdData.products.length,
        sales: populator.createdData.sales.length,
        pendingSellers: populator.createdData.pendingSellers.length
      },
      sampleIds: {
        firstCustomer: populator.createdData.customers[0]?._id,
        firstProduct: populator.createdData.products[0]?._id,
        firstSale: populator.createdData.sales[0]?._id
      },
      statistics: {
        totalSalesValue: populator.createdData.sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
        averageOrderValue: populator.createdData.sales.length > 0 ? 
          (populator.createdData.sales.reduce((sum, sale) => sum + sale.totalAmount, 0) / populator.createdData.sales.length) : 0,
        settledSales: populator.createdData.sales.filter(sale => sale.settled).length,
        unsettledSales: populator.createdData.sales.filter(sale => !sale.settled).length
      }
    };

    res.status(201).json({
      message: 'Test data populated successfully',
      summary,
      statusCode: 201
    });

  } catch (error) {
    console.error('Test data population error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to populate test data',
      statusCode: 500
    });
  }
};

/**
 * @desc    Clean/remove test data from database
 * @route   DELETE /api/test-data/clean
 * @access  Admin/SuperAdmin only
 * @body    { confirmClean?, preserveData? }
 */
const cleanTestData = async (req, res) => {
  try {
    // Security check - only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Test data endpoints are disabled in production',
        statusCode: 403
      });
    }

    const { confirmClean = false, preserveData = [] } = req.body;

    // Require explicit confirmation for safety
    if (!confirmClean) {
      return res.status(400).json({
        error: 'Confirmation Required',
        message: 'Must set confirmClean: true to proceed with data deletion',
        hint: 'This is a safety measure to prevent accidental data loss',
        statusCode: 400
      });
    }

    const deletionSummary = {
      timestamp: new Date().toISOString(),
      requestedBy: req.user.id,
      requestedByUser: `${req.user.firstName} ${req.user.lastName}`,
      deletedCounts: {
        sales: 0,
        customers: 0,
        products: 0,
        pendingSellers: 0
      },
      preserved: preserveData
    };

    // Delete sales first (due to foreign key relationships)
    if (!preserveData.includes('sales')) {
      const salesResult = await Sale.deleteMany({});
      deletionSummary.deletedCounts.sales = salesResult.deletedCount;
    }

    // Delete customers
    if (!preserveData.includes('customers')) {
      const customersResult = await Customer.deleteMany({});
      deletionSummary.deletedCounts.customers = customersResult.deletedCount;
    }

    // Delete products
    if (!preserveData.includes('products')) {
      const productsResult = await Product.deleteMany({});
      deletionSummary.deletedCounts.products = productsResult.deletedCount;
    }

    // Delete pending sellers
    if (!preserveData.includes('pendingSellers')) {
      const pendingSellersResult = await PendingSeller.deleteMany({});
      deletionSummary.deletedCounts.pendingSellers = pendingSellersResult.deletedCount;
    }

    // Note: We never delete Seller records to preserve admin accounts

    const totalDeleted = Object.values(deletionSummary.deletedCounts).reduce((sum, count) => sum + count, 0);

    res.status(200).json({
      message: `Successfully cleaned test data. Deleted ${totalDeleted} records.`,
      summary: deletionSummary,
      statusCode: 200
    });

  } catch (error) {
    console.error('Test data cleanup error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to clean test data',
      statusCode: 500
    });
  }
};

/**
 * @desc    Get current test data statistics
 * @route   GET /api/test-data/status
 * @access  Admin/SuperAdmin only
 */
const getTestDataStatus = async (req, res) => {
  try {
    // Security check - only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Test data endpoints are disabled in production',
        statusCode: 403
      });
    }

    // Get counts from all collections
    const [
      customerCount,
      productCount,
      saleCount,
      pendingSellerCount,
      recentSales
    ] = await Promise.all([
      Customer.countDocuments(),
      Product.countDocuments(),
      Sale.countDocuments(),
      PendingSeller.countDocuments(),
      Sale.find({}).sort({ createdAt: -1 }).limit(5).populate('customerId sellerId', 'firstName lastName')
    ]);

    // Calculate sales statistics
    const salesStats = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalSalesValue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' },
          settledCount: {
            $sum: { $cond: [{ $eq: ['$settled', true] }, 1, 0] }
          },
          unsettledCount: {
            $sum: { $cond: [{ $eq: ['$settled', false] }, 1, 0] }
          }
        }
      }
    ]);

    const stats = salesStats[0] || {
      totalSalesValue: 0,
      averageOrderValue: 0,
      settledCount: 0,
      unsettledCount: 0
    };

    res.status(200).json({
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      counts: {
        customers: customerCount,
        products: productCount,
        sales: saleCount,
        pendingSellers: pendingSellerCount
      },
      salesStatistics: {
        totalSalesValue: stats.totalSalesValue,
        averageOrderValue: parseFloat(stats.averageOrderValue?.toFixed(2) || 0),
        settledSales: stats.settledCount,
        unsettledSales: stats.unsettledCount
      },
      recentSales: recentSales.map(sale => ({
        id: sale.id,
        customer: sale.customerId ? `${sale.customerId.firstName} ${sale.customerId.lastName}` : 'Unknown',
        seller: sale.sellerId ? `${sale.sellerId.firstName} ${sale.sellerId.lastName}` : 'Unknown',
        totalAmount: sale.totalAmount,
        settled: sale.settled,
        createdAt: sale.createdAt
      })),
      statusCode: 200
    });

  } catch (error) {
    console.error('Test data status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to get test data status',
      statusCode: 500
    });
  }
};

/**
 * @desc    Reset database to specific test scenario
 * @route   POST /api/test-data/reset
 * @access  SuperAdmin only
 * @body    { scenario, confirmReset }
 */
const resetToScenario = async (req, res) => {
  try {
    // Security check - only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Test data endpoints are disabled in production',
        statusCode: 403
      });
    }

    // Only superadmins can reset (more destructive operation)
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only superadmins can perform database resets',
        statusCode: 403
      });
    }

    const { scenario = 'clean', confirmReset = false } = req.body;

    if (!confirmReset) {
      return res.status(400).json({
        error: 'Confirmation Required',
        message: 'Must set confirmReset: true to proceed with database reset',
        availableScenarios: ['clean', 'minimal', 'dev', 'full'],
        statusCode: 400
      });
    }

    let summary;

    if (scenario === 'clean') {
      // Clean everything except sellers
      await Sale.deleteMany({});
      await Customer.deleteMany({});
      await Product.deleteMany({});
      await PendingSeller.deleteMany({});
      
      summary = {
        scenario: 'clean',
        message: 'Database cleaned - only seller accounts remain',
        counts: { customers: 0, products: 0, sales: 0, pendingSellers: 0 }
      };
    } else {
      // Clean then populate with scenario
      await Sale.deleteMany({});
      await Customer.deleteMany({});
      await Product.deleteMany({});
      await PendingSeller.deleteMany({});

      // Populate with requested scenario
      const populator = new TestDataPopulator({
        preset: scenario,
        clean: false, // Already cleaned above
        verbose: false
      });

      await populator.loadTestData();
      await populator.populateCustomers();
      await populator.populateProducts();
      await populator.populatePendingSellers();
      await populator.populateSales();

      summary = {
        scenario,
        message: `Database reset to ${scenario} test scenario`,
        counts: {
          customers: populator.createdData.customers.length,
          products: populator.createdData.products.length,
          sales: populator.createdData.sales.length,
          pendingSellers: populator.createdData.pendingSellers.length
        }
      };
    }

    res.status(200).json({
      message: 'Database reset completed successfully',
      summary: {
        ...summary,
        timestamp: new Date().toISOString(),
        requestedBy: req.user.id,
        requestedByUser: `${req.user.firstName} ${req.user.lastName}`
      },
      statusCode: 200
    });

  } catch (error) {
    console.error('Database reset error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to reset database',
      statusCode: 500
    });
  }
};

module.exports = {
  populateTestData,
  cleanTestData,
  getTestDataStatus,
  resetToScenario
};