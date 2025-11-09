import TestDataPopulator from "../scripts/04-populate-test-data.js";
import Customer from "../models/Customer.js";
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import PendingSeller from "../models/PendingSeller.js";
import Seller from "../models/Seller.js";

/**
 * Test Data Management Controller
 *
 * Provides API endpoints for managing test data in development/testing environments.
 * These endpoints should be disabled in production for security reasons.
 *
 * All endpoints require admin or superadmin privileges.
 */

/**
 * Populate database with realistic test data
 * Supports multiple presets for different testing scenarios
 *
 * @async
 * @function populateTestData
 * @route   POST /api/test-data/populate
 * @access  Admin/SuperAdmin only
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} [req.body.preset="minimal"] - Data preset (minimal/dev/full/bulk)
 * @param {boolean} [req.body.cleanBefore=false] - Clean existing data before populating
 * @param {boolean} [req.body.verbose=false] - Enable verbose logging
 * @param {Object} req.user - Authenticated user
 * @param {string} req.user.id - User ID requesting population
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with population summary (201)
 * @throws {403} If in production environment
 * @throws {400} If invalid preset provided
 *
 * @description
 * Presets:
 * - minimal: Small dataset for basic testing
 * - dev: Moderate dataset for development
 * - full: Comprehensive dataset with varied scenarios
 * - bulk: Large dataset for performance testing
 */
const populateTestData = async (req, res) => {
  try {
    // Security check - only allow in non-production environments
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Test data endpoints are disabled in production",
        statusCode: 403,
      });
    }

    const {
      preset = "minimal",
      cleanBefore = false,
      verbose = false,
    } = req.body;

    // Validate preset
    const validPresets = ["minimal", "dev", "full", "bulk"];
    if (!validPresets.includes(preset)) {
      return res.status(400).json({
        error: "Validation Error",
        message: `Invalid preset. Must be one of: ${validPresets.join(", ")}`,
        statusCode: 400,
      });
    }

    // Create populator instance
    const populator = new TestDataPopulator({
      preset,
      clean: cleanBefore,
      verbose,
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
        pendingSellers: populator.createdData.pendingSellers.length,
      },
      sampleIds: {
        firstCustomer: populator.createdData.customers[0]?._id,
        firstProduct: populator.createdData.products[0]?._id,
        firstSale: populator.createdData.sales[0]?._id,
      },
      statistics: {
        totalSalesValue: populator.createdData.sales.reduce(
          (sum, sale) => sum + sale.totalAmount,
          0,
        ),
        averageOrderValue:
          populator.createdData.sales.length > 0
            ? populator.createdData.sales.reduce(
                (sum, sale) => sum + sale.totalAmount,
                0,
              ) / populator.createdData.sales.length
            : 0,
        settledSales: populator.createdData.sales.filter((sale) => sale.settled)
          .length,
        unsettledSales: populator.createdData.sales.filter(
          (sale) => !sale.settled,
        ).length,
      },
    };

    res.status(201).json({
      message: "Test data populated successfully",
      summary,
      statusCode: 201,
    });
  } catch (error) {
    console.error("Test data population error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to populate test data",
      statusCode: 500,
    });
  }
};

/**
 * Clean/remove test data from database
 * Selectively deletes test data with preservation options
 *
 * @async
 * @function cleanTestData
 * @route   DELETE /api/test-data/clean
 * @access  Admin/SuperAdmin only
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {boolean} [req.body.confirmClean=false] - Confirmation flag (required)
 * @param {Array<string>} [req.body.preserveData=[]] - Data types to preserve
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with deletion summary
 * @throws {403} If in production environment
 * @throws {400} If confirmClean not provided
 *
 * @description
 * Safely deletes test data with confirmation requirement
 * Can preserve specific data types: sales, customers, products, pendingSellers
 * Only deletes sellers marked with testingUser flag
 */
const cleanTestData = async (req, res) => {
  try {
    // Security check - only allow in non-production environments
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Test data endpoints are disabled in production",
        statusCode: 403,
      });
    }

    const { confirmClean = false, preserveData = [] } = req.body;

    // Require explicit confirmation for safety
    if (!confirmClean) {
      return res.status(400).json({
        error: "Confirmation Required",
        message: "Must set confirmClean: true to proceed with data deletion",
        hint: "This is a safety measure to prevent accidental data loss",
        statusCode: 400,
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
        pendingSellers: 0,
        testingSellers: 0,
      },
      preserved: preserveData,
    };

    // Delete sales first (due to foreign key relationships)
    if (!preserveData.includes("sales")) {
      const salesResult = await Sale.deleteMany({});
      deletionSummary.deletedCounts.sales = salesResult.deletedCount;
    }

    // Delete customers
    if (!preserveData.includes("customers")) {
      const customersResult = await Customer.deleteMany({});
      deletionSummary.deletedCounts.customers = customersResult.deletedCount;
    }

    // Delete products
    if (!preserveData.includes("products")) {
      const productsResult = await Product.deleteMany({});
      deletionSummary.deletedCounts.products = productsResult.deletedCount;
    }

    // Delete pending sellers (only those marked as testing users)
    if (!preserveData.includes("pendingSellers")) {
      const pendingSellersResult = await PendingSeller.deleteMany({
        testingUser: true,
      });
      deletionSummary.deletedCounts.pendingSellers =
        pendingSellersResult.deletedCount;
    }

    // Delete testing sellers (but never real admin accounts)
    const testingSellersResult = await Seller.deleteMany({ testingUser: true });
    deletionSummary.deletedCounts.testingSellers =
      testingSellersResult.deletedCount;

    const totalDeleted = Object.values(deletionSummary.deletedCounts).reduce(
      (sum, count) => sum + count,
      0,
    );

    res.status(200).json({
      message: `Successfully cleaned test data. Deleted ${totalDeleted} records.`,
      summary: deletionSummary,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Test data cleanup error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to clean test data",
      statusCode: 500,
    });
  }
};

/**
 * Get current test data statistics and database state
 * Returns comprehensive counts and recent activity
 *
 * @async
 * @function getTestDataStatus
 * @route   GET /api/test-data/status
 * @access  Admin/SuperAdmin only
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with database statistics
 * @throws {403} If in production environment
 *
 * @description
 * Returns:
 * - Document counts for all collections
 * - Testing user counts
 * - Sales statistics (total value, averages, settlement status)
 * - Recent sales with customer and seller info
 */
const getTestDataStatus = async (req, res) => {
  try {
    // Security check - only allow in non-production environments
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Test data endpoints are disabled in production",
        statusCode: 403,
      });
    }

    // Get counts from all collections
    const [
      customerCount,
      productCount,
      saleCount,
      pendingSellerCount,
      testingPendingSellerCount,
      testingSellerCount,
      totalSellerCount,
      recentSales,
    ] = await Promise.all([
      Customer.countDocuments(),
      Product.countDocuments(),
      Sale.countDocuments(),
      PendingSeller.countDocuments(),
      PendingSeller.countDocuments({ testingUser: true }),
      Seller.countDocuments({ testingUser: true }),
      Seller.countDocuments(),
      Sale.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("customerId sellerId", "firstName lastName"),
    ]);

    // Calculate sales statistics
    const salesStats = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalSalesValue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
          settledCount: {
            $sum: { $cond: [{ $eq: ["$settled", true] }, 1, 0] },
          },
          unsettledCount: {
            $sum: { $cond: [{ $eq: ["$settled", false] }, 1, 0] },
          },
        },
      },
    ]);

    const stats = salesStats[0] || {
      totalSalesValue: 0,
      averageOrderValue: 0,
      settledCount: 0,
      unsettledCount: 0,
    };

    res.status(200).json({
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      counts: {
        customers: customerCount,
        products: productCount,
        sales: saleCount,
        pendingSellers: pendingSellerCount,
        sellers: totalSellerCount,
      },
      testingUserCounts: {
        pendingSellers: testingPendingSellerCount,
        sellers: testingSellerCount,
      },
      salesStatistics: {
        totalSalesValue: stats.totalSalesValue,
        averageOrderValue: parseFloat(stats.averageOrderValue?.toFixed(2) || 0),
        settledSales: stats.settledCount,
        unsettledSales: stats.unsettledCount,
      },
      recentSales: recentSales.map((sale) => ({
        id: sale.id,
        customer: sale.customerId
          ? `${sale.customerId.firstName} ${sale.customerId.lastName}`
          : "Unknown",
        seller: sale.sellerId
          ? `${sale.sellerId.firstName} ${sale.sellerId.lastName}`
          : "Unknown",
        totalAmount: sale.totalAmount,
        settled: sale.settled,
        createdAt: sale.createdAt,
      })),
      statusCode: 200,
    });
  } catch (error) {
    console.error("Test data status error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to get test data status",
      statusCode: 500,
    });
  }
};

/**
 * Reset database to specific test scenario (SuperAdmin only)
 * Complete database wipe and repopulation to known state
 *
 * @async
 * @function resetToScenario
 * @route   POST /api/test-data/reset
 * @access  SuperAdmin only
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} [req.body.scenario="clean"] - Reset scenario (clean/minimal/dev/full)
 * @param {boolean} [req.body.confirmReset=false] - Confirmation flag (required)
 * @param {Object} req.user - Authenticated user
 * @param {string} req.user.role - User role (must be "superadmin")
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with reset summary
 * @throws {403} If in production environment or user not superadmin
 * @throws {400} If confirmReset not provided
 *
 * @description
 * Most destructive operation - requires superadmin privileges
 * Scenarios:
 * - clean: Removes all data except seller accounts
 * - minimal/dev/full: Removes all data then repopulates with preset
 */
const resetToScenario = async (req, res) => {
  try {
    // Security check - only allow in non-production environments
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Test data endpoints are disabled in production",
        statusCode: 403,
      });
    }

    // Only superadmins can reset (more destructive operation)
    if (req.user.role !== "superadmin") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only superadmins can perform database resets",
        statusCode: 403,
      });
    }

    const { scenario = "clean", confirmReset = false } = req.body;

    if (!confirmReset) {
      return res.status(400).json({
        error: "Confirmation Required",
        message: "Must set confirmReset: true to proceed with database reset",
        availableScenarios: ["clean", "minimal", "dev", "full"],
        statusCode: 400,
      });
    }

    let summary;

    if (scenario === "clean") {
      // Clean everything except sellers
      await Sale.deleteMany({});
      await Customer.deleteMany({});
      await Product.deleteMany({});
      await PendingSeller.deleteMany({});

      summary = {
        scenario: "clean",
        message: "Database cleaned - only seller accounts remain",
        counts: { customers: 0, products: 0, sales: 0, pendingSellers: 0 },
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
        verbose: false,
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
          pendingSellers: populator.createdData.pendingSellers.length,
        },
      };
    }

    res.status(200).json({
      message: "Database reset completed successfully",
      summary: {
        ...summary,
        timestamp: new Date().toISOString(),
        requestedBy: req.user.id,
        requestedByUser: `${req.user.firstName} ${req.user.lastName}`,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Database reset error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to reset database",
      statusCode: 500,
    });
  }
};

export { populateTestData, cleanTestData, getTestDataStatus, resetToScenario };
