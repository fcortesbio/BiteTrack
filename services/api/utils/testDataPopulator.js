/**
 * Test Data Populator Utility
 *
 * Provides test data population functionality for both API endpoints and test suites.
 * This utility loads JSON test data files and populates the database with realistic test data.
 *
 * Standard practice: Test data utilities should live in utils/ or tests/helpers/,
 * not in production scripts. This allows both controllers and tests to use the same
 * data generation logic without coupling to CLI scripts.
 *
 * @module utils/testDataPopulator
 */

import fs from "fs/promises";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

import Customer from "../models/Customer.js";
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import PendingSeller from "../models/PendingSeller.js";
import Seller from "../models/Seller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test data files from test-data directory
const DATA_DIR = path.join(__dirname, "..", "test-data");

/**
 * Test Data Populator Class
 * Handles loading and populating test data from JSON files
 */
class TestDataPopulator {
  constructor(options = {}) {
    this.preset = options.preset || "minimal";
    this.verbose = options.verbose || false;
    this.clean = options.clean || false;

    this.createdData = {
      customers: [],
      products: [],
      sales: [],
      pendingSellers: [],
      sellers: [],
    };

    this.testData = {};
  }

  /**
   * Load test data from JSON files
   * @returns {Promise<void>}
   */
  async loadTestData() {
    try {
      const files = [
        "customers.json",
        "products.json",
        "sales.json",
        "pending-sellers.json",
      ];

      for (const file of files) {
        const filePath = path.join(DATA_DIR, file);
        const content = await fs.readFile(filePath, "utf8");
        const key = file.replace(".json", "").replace("-", "");
        this.testData[key] = JSON.parse(content);
      }

      this.log("Test data files loaded successfully");
    } catch (error) {
      throw new Error(`Failed to load test data: ${error.message}`);
    }
  }

  /**
   * Clean database (if requested)
   * @returns {Promise<void>}
   */
  async cleanDatabase() {
    if (!this.clean) {
      return;
    }

    try {
      await Sale.deleteMany({});
      await Customer.deleteMany({});
      await Product.deleteMany({});
      await PendingSeller.deleteMany({});
      // Don't clean sellers as they might include the superadmin

      this.log("Database cleaned (preserved seller accounts)");
    } catch (error) {
      throw new Error(`Database cleanup failed: ${error.message}`);
    }
  }

  /**
   * Populate customers based on preset
   * @returns {Promise<void>}
   */
  async populateCustomers() {
    const { customers, bulkTestCustomers } = this.testData.customers;

    let customerData = [];

    switch (this.preset) {
      case "minimal":
        customerData = customers.slice(0, 5);
        break;
      case "dev":
        customerData = customers.slice(0, 10);
        break;
      case "full":
        customerData = customers;
        break;
      case "bulk":
        customerData = [...customers, ...bulkTestCustomers];
        break;
    }

    try {
      const createdOrUpdatedCustomers = [];
      for (const customer of customerData) {
        const result = await Customer.findOneAndUpdate(
          { phoneNumber: customer.phoneNumber },
          { ...customer, isTestData: true },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        createdOrUpdatedCustomers.push(result);
      }
      this.createdData.customers = createdOrUpdatedCustomers;
      this.log(
        `Created or updated ${this.createdData.customers.length} customers`,
      );
    } catch (error) {
      throw new Error(`Customer creation failed: ${error.message}`);
    }
  }

  /**
   * Populate products based on preset
   * @returns {Promise<void>}
   */
  async populateProducts() {
    const { categories, bulkProducts, lowStockItems } = this.testData.products;

    let productData = [];

    switch (this.preset) {
      case "minimal":
        productData = [
          ...categories.sandwiches.slice(0, 3),
          ...categories.beverages.slice(0, 2),
          ...categories.sides.slice(0, 2),
        ];
        break;
      case "dev":
        productData = [
          ...categories.sandwiches.slice(0, 5),
          ...categories.beverages.slice(0, 4),
          ...categories.sides.slice(0, 3),
          ...categories.desserts.slice(0, 2),
        ];
        break;
      case "full":
        productData = [
          ...categories.sandwiches,
          ...categories.beverages,
          ...categories.sides,
          ...categories.desserts,
          ...categories.seasonal,
          ...lowStockItems,
        ];
        break;
      case "bulk":
        productData = [
          ...categories.sandwiches,
          ...categories.beverages,
          ...categories.sides,
          ...categories.desserts,
          ...categories.seasonal,
          ...bulkProducts,
          ...lowStockItems,
        ];
        break;
    }

    try {
      // Mark all products as test data
      const productsWithTestFlag = productData.map((p) => ({
        ...p,
        isTestData: true,
      }));
      this.createdData.products =
        await Product.insertMany(productsWithTestFlag);
      this.log(`Created ${this.createdData.products.length} products`);
    } catch (error) {
      throw new Error(`Product creation failed: ${error.message}`);
    }
  }

  /**
   * Populate pending sellers based on preset
   * @returns {Promise<void>}
   */
  async populatePendingSellers() {
    const { pendingSellers } = this.testData.pendingsellers;

    // Get the superadmin to use as creator
    const superadmin = await Seller.findOne({ role: "superadmin" });
    if (!superadmin) {
      throw new Error(
        "No superadmin found. Please ensure superadmin is created before populating test data.",
      );
    }

    let pendingData = pendingSellers.map((seller) => ({
      ...seller,
      dateOfBirth: new Date(seller.dateOfBirth),
      createdBy: superadmin._id,
      testingUser: true, // Mark as test data for easy identification and cleanup
    }));

    switch (this.preset) {
      case "minimal":
        pendingData = pendingData.slice(0, 2);
        break;
      case "dev":
        pendingData = pendingData.slice(0, 4);
        break;
      case "full":
      case "bulk":
        // Use all pending sellers
        break;
    }

    try {
      const createdOrUpdatedPendingSellers = [];
      for (const pendingSeller of pendingData) {
        const result = await PendingSeller.findOneAndUpdate(
          { email: pendingSeller.email },
          pendingSeller,
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        createdOrUpdatedPendingSellers.push(result);
      }
      this.createdData.pendingSellers = createdOrUpdatedPendingSellers;
      this.log(
        `Created ${this.createdData.pendingSellers.length} pending sellers (created by superadmin)`,
      );
    } catch (error) {
      throw new Error(`Pending seller creation failed: ${error.message}`);
    }
  }

  /**
   * Populate sales based on preset
   * @returns {Promise<void>}
   */
  async populateSales() {
    const { salesTemplates, partialPaymentScenarios, bulkTestSales } =
      this.testData.sales;

    if (
      this.createdData.customers.length === 0 ||
      this.createdData.products.length === 0
    ) {
      throw new Error("Cannot create sales without customers and products");
    }

    // Get a seller ID (use first available seller, or create a test seller)
    let sellerId;
    const existingSeller = await Seller.findOne();
    if (existingSeller) {
      sellerId = existingSeller._id;
    } else {
      throw new Error(
        "No seller found in database. Please ensure at least one seller exists.",
      );
    }

    let salesData = [];

    switch (this.preset) {
      case "minimal":
        salesData = salesTemplates.slice(0, 3);
        break;
      case "dev":
        salesData = [
          ...salesTemplates.slice(0, 6),
          ...partialPaymentScenarios.slice(0, 1),
        ];
        break;
      case "full":
        salesData = [...salesTemplates, ...partialPaymentScenarios];
        break;
      case "bulk":
        salesData = [
          ...salesTemplates,
          ...partialPaymentScenarios,
          ...bulkTestSales,
        ];
        break;
    }

    // Convert template sales to real sales with actual IDs
    const realSales = await this.convertSalesToRealData(salesData, sellerId);

    try {
      this.createdData.sales = await Sale.insertMany(realSales);
      this.log(`Created ${this.createdData.sales.length} sales transactions`);
    } catch (error) {
      throw new Error(`Sales creation failed: ${error.message}`);
    }
  }

  /**
   * Convert sales templates to real sales data with actual IDs
   * @param {Array} salesTemplates - Template sales data
   * @param {string} sellerId - Seller ID to use
   * @returns {Promise<Array>} Real sales data
   */
  async convertSalesToRealData(salesTemplates, sellerId) {
    const realSales = [];

    for (const template of salesTemplates) {
      // Get random customer
      const randomCustomer =
        this.createdData.customers[
          Math.floor(Math.random() * this.createdData.customers.length)
        ];

      // Convert products to real product data
      const realProducts = [];
      let totalAmount = 0;

      for (const productTemplate of template.products) {
        // Try to find matching product by name patterns
        let product = this.findProductByTemplate(productTemplate.productId);

        if (!product) {
          // Fallback to random product
          product =
            this.createdData.products[
              Math.floor(Math.random() * this.createdData.products.length)
            ];
        }

        const priceAtSale = product.price;
        const quantity = productTemplate.quantity;

        realProducts.push({
          productId: product._id,
          quantity: quantity,
          priceAtSale: priceAtSale,
        });

        totalAmount += priceAtSale * quantity;
      }

      // Create real sale with test data flag
      const realSale = {
        customerId: randomCustomer._id,
        sellerId: sellerId,
        products: realProducts,
        totalAmount: totalAmount,
        amountPaid: template.amountPaid,
        settled: template.amountPaid >= totalAmount,
        isTestData: true, // Mark as test data for cleanup
      };

      realSales.push(realSale);
    }

    return realSales;
  }

  /**
   * Find product by template ID mapping
   * @param {string} templateId - Template product ID
   * @returns {Object|null} Product or null
   */
  findProductByTemplate(templateId) {
    // Map common template IDs to actual products
    const productMappings = {
      TURKEY_CLUB_SANDWICH_ID: "Turkey Club Sandwich",
      PHILLY_CHEESESTEAK_ID: "Philly Cheesesteak",
      ITALIAN_SUB_ID: "Italian Sub",
      VEGGIE_DELUXE_SANDWICH_ID: "Veggie Deluxe Sandwich",
      FRESH_BREWED_COFFEE_ID: "Fresh Brewed Coffee",
      PREMIUM_LATTE_ID: "Premium Latte",
      KETTLE_CHIPS_ID: "Kettle Chips",
      CHOCOLATE_CHIP_COOKIE_ID: "Chocolate Chip Cookie",
    };

    const productName = productMappings[templateId];
    if (productName) {
      return this.createdData.products.find(
        (p) => p.productName === productName,
      );
    }

    return null;
  }

  /**
   * Log message (if verbose mode enabled)
   * @param {string} message - Message to log
   */
  log(message) {
    if (this.verbose || message.includes("Created")) {
      console.log(message);
    }
  }
}

export default TestDataPopulator;
