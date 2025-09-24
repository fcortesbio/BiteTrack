#!/usr/bin/env node

/**
 * BiteTrack Test Data Population Script
 * 
 * This script populates the database with comprehensive test data from JSON files.
 * It handles ID relationships, validates data against schemas, and provides 
 * options for different data sets (minimal, full, bulk testing).
 * 
 * Usage:
 *   node scripts/populate-test-data.js [--preset=<preset>] [--clean] [--verbose]
 * 
 * Presets:
 *   minimal  - Essential data for basic testing (default)
 *   full     - Complete realistic dataset 
 *   bulk     - Large dataset for performance testing
 *   dev      - Development-friendly smaller dataset
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

// Import models
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const PendingSeller = require('../models/PendingSeller');
const Seller = require('../models/Seller');

// Load test data files
const DATA_DIR = path.join(__dirname, '..', 'test-data');

class TestDataPopulator {
  constructor(options = {}) {
    this.preset = options.preset || 'minimal';
    this.verbose = options.verbose || false;
    this.clean = options.clean || false;
    
    this.createdData = {
      customers: [],
      products: [],
      sales: [],
      pendingSellers: [],
      sellers: []
    };
    
    this.testData = {};
  }

  async loadTestData() {
    try {
      const files = ['customers.json', 'products.json', 'sales.json', 'pending-sellers.json'];
      
      for (const file of files) {
        const filePath = path.join(DATA_DIR, file);
        const content = await fs.readFile(filePath, 'utf8');
        const key = file.replace('.json', '').replace('-', '');
        this.testData[key] = JSON.parse(content);
      }
      
      this.log('✅ Test data files loaded successfully');
    } catch (error) {
      throw new Error(`Failed to load test data: ${error.message}`);
    }
  }

  async connectToDatabase() {
    try {
      // Use environment variables or defaults
      const mongoUri = process.env.MONGO_URI || 
                      `mongodb://${process.env.MONGO_ROOT_USERNAME || 'admin'}:${process.env.MONGO_ROOT_PASSWORD || 'supersecret'}@localhost:27017/bitetrack`;
      
      await mongoose.connect(mongoUri);
      this.log('✅ Connected to MongoDB');
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async cleanDatabase() {
    if (!this.clean) return;
    
    try {
      await Sale.deleteMany({});
      await Customer.deleteMany({});
      await Product.deleteMany({});
      await PendingSeller.deleteMany({});
      // Don't clean sellers as they might include the superadmin
      
      this.log('✅ Database cleaned (preserved seller accounts)');
    } catch (error) {
      throw new Error(`Database cleanup failed: ${error.message}`);
    }
  }

  async populateCustomers() {
    const { customers, bulkTestCustomers } = this.testData.customers;
    
    let customerData = [];
    
    switch (this.preset) {
      case 'minimal':
        customerData = customers.slice(0, 5);
        break;
      case 'dev':
        customerData = customers.slice(0, 10);
        break;
      case 'full':
        customerData = customers;
        break;
      case 'bulk':
        customerData = [...customers, ...bulkTestCustomers];
        break;
    }

    try {
      this.createdData.customers = await Customer.insertMany(customerData);
      this.log(`✅ Created ${this.createdData.customers.length} customers`);
    } catch (error) {
      throw new Error(`Customer creation failed: ${error.message}`);
    }
  }

  async populateProducts() {
    const { categories, bulkProducts, lowStockItems } = this.testData.products;
    
    let productData = [];
    
    switch (this.preset) {
      case 'minimal':
        productData = [
          ...categories.sandwiches.slice(0, 3),
          ...categories.beverages.slice(0, 2),
          ...categories.sides.slice(0, 2)
        ];
        break;
      case 'dev':
        productData = [
          ...categories.sandwiches.slice(0, 5),
          ...categories.beverages.slice(0, 4),
          ...categories.sides.slice(0, 3),
          ...categories.desserts.slice(0, 2)
        ];
        break;
      case 'full':
        productData = [
          ...categories.sandwiches,
          ...categories.beverages,
          ...categories.sides,
          ...categories.desserts,
          ...categories.seasonal,
          ...lowStockItems
        ];
        break;
      case 'bulk':
        productData = [
          ...categories.sandwiches,
          ...categories.beverages,
          ...categories.sides,
          ...categories.desserts,
          ...categories.seasonal,
          ...bulkProducts,
          ...lowStockItems
        ];
        break;
    }

    try {
      this.createdData.products = await Product.insertMany(productData);
      this.log(`✅ Created ${this.createdData.products.length} products`);
    } catch (error) {
      throw new Error(`Product creation failed: ${error.message}`);
    }
  }

  async populatePendingSellers() {
    const { pendingSellers } = this.testData.pendingsellers;
    
    let pendingData = pendingSellers.map(seller => ({
      ...seller,
      dateOfBirth: new Date(seller.dateOfBirth),
      createdBy: "Self" // Indicates created by script, not a real seller
    }));
    
    switch (this.preset) {
      case 'minimal':
        pendingData = pendingData.slice(0, 2);
        break;
      case 'dev':
        pendingData = pendingData.slice(0, 4);
        break;
      case 'full':
      case 'bulk':
        // Use all pending sellers
        break;
    }

    try {
      this.createdData.pendingSellers = await PendingSeller.insertMany(pendingData);
      this.log(`✅ Created ${this.createdData.pendingSellers.length} pending sellers`);
    } catch (error) {
      throw new Error(`Pending seller creation failed: ${error.message}`);
    }
  }

  async populateSales() {
    const { salesTemplates, partialPaymentScenarios, bulkTestSales } = this.testData.sales;
    
    if (this.createdData.customers.length === 0 || this.createdData.products.length === 0) {
      throw new Error('Cannot create sales without customers and products');
    }

    // Get a seller ID (use first available seller, or create a test seller)
    let sellerId;
    const existingSeller = await Seller.findOne();
    if (existingSeller) {
      sellerId = existingSeller._id;
    } else {
      throw new Error('No seller found in database. Please ensure at least one seller exists.');
    }

    let salesData = [];
    
    switch (this.preset) {
      case 'minimal':
        salesData = salesTemplates.slice(0, 3);
        break;
      case 'dev':
        salesData = [...salesTemplates.slice(0, 6), ...partialPaymentScenarios.slice(0, 1)];
        break;
      case 'full':
        salesData = [...salesTemplates, ...partialPaymentScenarios];
        break;
      case 'bulk':
        salesData = [...salesTemplates, ...partialPaymentScenarios, ...bulkTestSales];
        break;
    }

    // Convert template sales to real sales with actual IDs
    const realSales = await this.convertSalesToRealData(salesData, sellerId);

    try {
      this.createdData.sales = await Sale.insertMany(realSales);
      this.log(`✅ Created ${this.createdData.sales.length} sales transactions`);
    } catch (error) {
      throw new Error(`Sales creation failed: ${error.message}`);
    }
  }

  async convertSalesToRealData(salesTemplates, sellerId) {
    const realSales = [];
    
    for (const template of salesTemplates) {
      // Get random customer
      const randomCustomer = this.createdData.customers[
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
          product = this.createdData.products[
            Math.floor(Math.random() * this.createdData.products.length)
          ];
        }
        
        const priceAtSale = product.price;
        const quantity = productTemplate.quantity;
        
        realProducts.push({
          productId: product._id,
          quantity: quantity,
          priceAtSale: priceAtSale
        });
        
        totalAmount += priceAtSale * quantity;
      }
      
      // Create real sale
      const realSale = {
        customerId: randomCustomer._id,
        sellerId: sellerId,
        products: realProducts,
        totalAmount: totalAmount,
        amountPaid: template.amountPaid,
        settled: template.amountPaid >= totalAmount
      };
      
      realSales.push(realSale);
    }
    
    return realSales;
  }

  findProductByTemplate(templateId) {
    // Map common template IDs to actual products
    const productMappings = {
      'TURKEY_CLUB_SANDWICH_ID': 'Turkey Club Sandwich',
      'PHILLY_CHEESESTEAK_ID': 'Philly Cheesesteak',
      'ITALIAN_SUB_ID': 'Italian Sub',
      'VEGGIE_DELUXE_SANDWICH_ID': 'Veggie Deluxe Sandwich',
      'FRESH_BREWED_COFFEE_ID': 'Fresh Brewed Coffee',
      'PREMIUM_LATTE_ID': 'Premium Latte',
      'KETTLE_CHIPS_ID': 'Kettle Chips',
      'CHOCOLATE_CHIP_COOKIE_ID': 'Chocolate Chip Cookie'
    };
    
    const productName = productMappings[templateId];
    if (productName) {
      return this.createdData.products.find(p => p.productName === productName);
    }
    
    return null;
  }

  async generateSummaryReport() {
    const summary = {
      preset: this.preset,
      timestamp: new Date().toISOString(),
      counts: {
        customers: this.createdData.customers.length,
        products: this.createdData.products.length,
        sales: this.createdData.sales.length,
        pendingSellers: this.createdData.pendingSellers.length
      },
      sampleIds: {
        firstCustomer: this.createdData.customers[0]?._id,
        firstProduct: this.createdData.products[0]?._id,
        firstSale: this.createdData.sales[0]?._id
      },
      statistics: {
        totalSalesValue: this.createdData.sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
        averageOrderValue: this.createdData.sales.length > 0 ? 
          (this.createdData.sales.reduce((sum, sale) => sum + sale.totalAmount, 0) / this.createdData.sales.length).toFixed(2) : 0,
        settledSales: this.createdData.sales.filter(sale => sale.settled).length,
        unsettledSales: this.createdData.sales.filter(sale => !sale.settled).length
      }
    };
    
    // Write summary to file
    const summaryPath = path.join(__dirname, '..', 'test-data', `population-summary-${this.preset}.json`);
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log('\n📊 POPULATION SUMMARY');
    console.log('=====================');
    console.log(`Preset: ${summary.preset}`);
    console.log(`Customers: ${summary.counts.customers}`);
    console.log(`Products: ${summary.counts.products}`);
    console.log(`Sales: ${summary.counts.sales}`);
    console.log(`Pending Sellers: ${summary.counts.pendingSellers}`);
    console.log(`Total Sales Value: $${summary.statistics.totalSalesValue.toFixed(2)}`);
    console.log(`Average Order Value: $${summary.statistics.averageOrderValue}`);
    console.log(`Settled/Unsettled Sales: ${summary.statistics.settledSales}/${summary.statistics.unsettledSales}`);
    console.log(`\n📁 Summary saved to: ${summaryPath}`);
    
    if (this.verbose) {
      console.log('\n🔍 SAMPLE IDS (for API testing):');
      console.log(`Customer ID: ${summary.sampleIds.firstCustomer}`);
      console.log(`Product ID: ${summary.sampleIds.firstProduct}`);
      console.log(`Sale ID: ${summary.sampleIds.firstSale}`);
    }
  }

  log(message) {
    if (this.verbose || message.includes('✅')) {
      console.log(message);
    }
  }

  async populate() {
    try {
      console.log(`\n🚀 Starting test data population (preset: ${this.preset})\n`);
      
      await this.loadTestData();
      await this.connectToDatabase();
      await this.cleanDatabase();
      
      await this.populateCustomers();
      await this.populateProducts();
      await this.populatePendingSellers();
      await this.populateSales();
      
      await this.generateSummaryReport();
      
      console.log('\n🎉 Test data population completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Population failed:', error.message);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    preset: 'minimal',
    clean: false,
    verbose: false
  };
  
  args.forEach(arg => {
    if (arg.startsWith('--preset=')) {
      options.preset = arg.split('=')[1];
    } else if (arg === '--clean') {
      options.clean = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--help') {
      console.log(`
BiteTrack Test Data Population Script

Usage: node scripts/populate-test-data.js [options]

Options:
  --preset=<preset>    Data preset (minimal|dev|full|bulk) [default: minimal]
  --clean             Clean existing data before populating
  --verbose           Show detailed logging
  --help              Show this help message

Presets:
  minimal    Essential data for basic testing (5 customers, 7 products, 3 sales)
  dev        Development-friendly dataset (10 customers, 14 products, 7 sales)
  full       Complete realistic dataset (all test data)
  bulk       Large dataset for performance testing (includes bulk test data)

Examples:
  node scripts/populate-test-data.js
  node scripts/populate-test-data.js --preset=full --clean --verbose
  node scripts/populate-test-data.js --preset=bulk --clean
      `);
      process.exit(0);
    }
  });
  
  if (!['minimal', 'dev', 'full', 'bulk'].includes(options.preset)) {
    console.error('❌ Invalid preset. Use: minimal, dev, full, or bulk');
    process.exit(1);
  }
  
  const populator = new TestDataPopulator(options);
  await populator.populate();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = TestDataPopulator;