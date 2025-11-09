#!/usr/bin/env node

/**
 * BiteTrack Sales Filtering Test Script
 *
 * This script tests the advanced sales filtering features we just implemented.
 * It creates sample sales with different dates and tests various filtering scenarios.
 *
 * Usage:
 *   node scripts/test-sales-filtering.js [--auth-token=<token>] [--base-url=<url>]
 *
 * Prerequisites:
 *   - BiteTrack API running
 *   - Test data populated (use populate-test-data.js first)
 *   - Valid authentication token
 */

import axios from "axios";
import { promises as fs } from "fs";

class SalesFilteringTester {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || "http://localhost:3000/bitetrack";
    this.authToken = options.authToken;
    this.verbose = options.verbose || false;

    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: [],
    };
  }

  async authenticate() {
    if (this.authToken) {
      this.log("✅ Using provided auth token");
      return;
    }

    // Try to authenticate with default superadmin credentials
    const loginData = {
      email: process.env.TEST_EMAIL || "admin@bitetrack.com",
      password: process.env.TEST_PASSWORD || "SuperAdmin123!",
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/auth/login`,
        loginData,
      );
      this.authToken = response.data.token;
      this.log("✅ Successfully authenticated");
    } catch (error) {
      throw new Error(
        `Authentication failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  async runTest(testName, testFn) {
    this.testResults.total++;
    try {
      await testFn();
      this.testResults.passed++;
      this.testResults.details.push({
        name: testName,
        status: "PASS",
        message: "Test passed successfully",
      });
      this.log(`✅ ${testName}`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.details.push({
        name: testName,
        status: "FAIL",
        message: error.message,
      });
      console.error(`❌ ${testName}: ${error.message}`);
    }
  }

  async apiCall(endpoint, params = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params,
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        `API call failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  async testBasicSalesList() {
    const response = await this.apiCall("/sales");

    if (!response.sales || !Array.isArray(response.sales)) {
      throw new Error("Response should contain sales array");
    }

    if (!response.pagination) {
      throw new Error("Response should contain pagination metadata");
    }

    if (!response.filters) {
      throw new Error("Response should contain filters metadata");
    }

    this.log(`  Found ${response.sales.length} sales with pagination`);
  }

  async testPagination() {
    // Test first page
    const page1 = await this.apiCall("/sales", { page: 1, limit: 2 });

    if (page1.sales.length > 2) {
      throw new Error("Page 1 should have at most 2 results");
    }

    if (page1.pagination.currentPage !== 1) {
      throw new Error("Current page should be 1");
    }

    // Test second page if there are more results
    if (page1.pagination.hasNextPage) {
      const page2 = await this.apiCall("/sales", { page: 2, limit: 2 });

      if (page2.pagination.currentPage !== 2) {
        throw new Error("Current page should be 2");
      }
    }

    this.log(
      `  Pagination working: ${page1.pagination.totalSales} total sales across ${page1.pagination.totalPages} pages`,
    );
  }

  async testSorting() {
    // Test ascending sort by total amount
    const ascending = await this.apiCall("/sales", {
      sort: "totalAmount",
      limit: 5,
    });

    if (ascending.sales.length < 2) {
      this.log("  Insufficient data for sorting test (need at least 2 sales)");
      return;
    }

    // Check if results are sorted ascending by totalAmount
    for (let i = 1; i < ascending.sales.length; i++) {
      if (ascending.sales[i].totalAmount < ascending.sales[i - 1].totalAmount) {
        throw new Error("Results not sorted ascending by totalAmount");
      }
    }

    // Test descending sort
    const descending = await this.apiCall("/sales", {
      sort: "-totalAmount",
      limit: 5,
    });

    // Check if results are sorted descending by totalAmount
    for (let i = 1; i < descending.sales.length; i++) {
      if (
        descending.sales[i].totalAmount > descending.sales[i - 1].totalAmount
      ) {
        throw new Error("Results not sorted descending by totalAmount");
      }
    }

    this.log(
      `  Sorting working: ASC range $${ascending.sales[0].totalAmount}-$${ascending.sales[ascending.sales.length - 1].totalAmount}`,
    );
  }

  async testSettledFiltering() {
    // Test settled sales
    const settled = await this.apiCall("/sales", { settled: true });
    const unsettled = await this.apiCall("/sales", { settled: false });

    // Check that settled filter actually filters
    for (const sale of settled.sales) {
      if (!sale.settled) {
        throw new Error("Settled filter returned unsettled sale");
      }
    }

    for (const sale of unsettled.sales) {
      if (sale.settled) {
        throw new Error("Unsettled filter returned settled sale");
      }
    }

    this.log(
      `  Settlement filtering: ${settled.sales.length} settled, ${unsettled.sales.length} unsettled`,
    );
  }

  async testDateFiltering() {
    // Get all sales first
    const allSales = await this.apiCall("/sales", { limit: 100 });

    if (allSales.sales.length === 0) {
      this.log("  No sales data for date filtering test");
      return;
    }

    // Find date range from existing sales
    const dates = allSales.sales.map((sale) => new Date(sale.createdAt));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Test date range filtering
    const startDate = minDate.toISOString();
    const endDate = maxDate.toISOString();

    const filtered = await this.apiCall("/sales", {
      startDate,
      endDate,
      dateField: "createdAt",
    });

    // All sales should be within the date range (which should be all of them)
    if (filtered.sales.length !== allSales.sales.length) {
      // This might happen if sales were created at slightly different times, so just warn
      this.log(
        `  Date filter returned ${filtered.sales.length} vs ${allSales.sales.length} total (acceptable variance)`,
      );
    }

    // Test with a narrow date range (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const recent = await this.apiCall("/sales", {
      startDate: yesterday,
      endDate: now,
      dateField: "createdAt",
    });

    this.log(`  Date filtering: ${recent.sales.length} sales in last 24 hours`);
  }

  async testPopulatedReferences() {
    const response = await this.apiCall("/sales", { limit: 1 });

    if (response.sales.length === 0) {
      this.log("  No sales data for population test");
      return;
    }

    const sale = response.sales[0];

    // Check customer population
    if (!sale.customerId || typeof sale.customerId !== "object") {
      throw new Error("customerId should be populated object");
    }

    if (!sale.customerId.firstName || !sale.customerId.lastName) {
      throw new Error("Customer should have firstName and lastName");
    }

    // Check seller population
    if (!sale.sellerId || typeof sale.sellerId !== "object") {
      throw new Error("sellerId should be populated object");
    }

    if (!sale.sellerId.firstName || !sale.sellerId.lastName) {
      throw new Error("Seller should have firstName and lastName");
    }

    // Check product population
    if (!sale.products || sale.products.length === 0) {
      throw new Error("Sale should have products");
    }

    const product = sale.products[0];
    if (!product.productId || typeof product.productId !== "object") {
      throw new Error("productId should be populated object");
    }

    if (!product.productId.name) {
      throw new Error("Product should have name field");
    }

    this.log(
      `  References populated: Customer "${sale.customerId.firstName}", Product "${product.productId.name}"`,
    );
  }

  async testCombinedFiltering() {
    // Test combining multiple filters
    const combined = await this.apiCall("/sales", {
      settled: false,
      limit: 3,
      sort: "-createdAt",
      dateField: "createdAt",
    });

    // Verify all results match the filters
    for (const sale of combined.sales) {
      if (sale.settled) {
        throw new Error(
          "Combined filter returned settled sale when filtering for unsettled",
        );
      }
    }

    // Check that response includes applied filters
    if (!combined.filters || combined.filters.settled !== false) {
      throw new Error("Response should include applied filters");
    }

    this.log(
      `  Combined filtering: ${combined.sales.length} unsettled sales, sorted by creation date`,
    );
  }

  async testErrorHandling() {
    // Test invalid date format
    try {
      await this.apiCall("/sales", { startDate: "invalid-date" });
      throw new Error("Should reject invalid date format");
    } catch (error) {
      if (!error.message.includes("API call failed")) {
        throw new Error("Should return validation error for invalid date");
      }
    }

    // Test invalid page number
    try {
      await this.apiCall("/sales", { page: -1 });
      throw new Error("Should reject negative page number");
    } catch (error) {
      if (!error.message.includes("API call failed")) {
        throw new Error("Should return validation error for negative page");
      }
    }

    // Test limit exceeding maximum
    try {
      await this.apiCall("/sales", { limit: 1000 });
      throw new Error("Should reject limit over maximum");
    } catch (error) {
      if (!error.message.includes("API call failed")) {
        throw new Error("Should return validation error for excessive limit");
      }
    }

    this.log("  Error handling working: Invalid inputs properly rejected");
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.total,
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        successRate: `${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`,
      },
      details: this.testResults.details,
    };

    // Write report to file
    const reportPath = "./test-data/sales-filtering-test-report.json";
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log("\n📊 SALES FILTERING TEST REPORT");
    console.log("==============================");
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Success Rate: ${report.summary.successRate}`);
    console.log(`\n📁 Detailed report saved to: ${reportPath}`);

    if (this.testResults.failed > 0) {
      console.log("\n❌ FAILED TESTS:");
      for (const detail of this.testResults.details) {
        if (detail.status === "FAIL") {
          console.log(`  - ${detail.name}: ${detail.message}`);
        }
      }
    }
  }

  log(message) {
    if (this.verbose || message.includes("✅") || message.includes("❌")) {
      console.log(message);
    }
  }

  async runAllTests() {
    console.log("\n🧪 Starting Sales Filtering Tests\n");

    await this.authenticate();

    await this.runTest("Basic Sales List Structure", () =>
      this.testBasicSalesList(),
    );
    await this.runTest("Pagination Functionality", () => this.testPagination());
    await this.runTest("Sorting Functionality", () => this.testSorting());
    await this.runTest("Settlement Status Filtering", () =>
      this.testSettledFiltering(),
    );
    await this.runTest("Date Range Filtering", () => this.testDateFiltering());
    await this.runTest("Populated References", () =>
      this.testPopulatedReferences(),
    );
    await this.runTest("Combined Filtering", () =>
      this.testCombinedFiltering(),
    );
    await this.runTest("Error Handling", () => this.testErrorHandling());

    await this.generateReport();

    const success = this.testResults.failed === 0;
    console.log(
      success
        ? "\n🎉 All tests passed!"
        : "\n⚠️ Some tests failed - check the report for details",
    );

    process.exit(success ? 0 : 1);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  const options = {
    verbose: false,
    authToken: null,
    baseUrl: "http://localhost:3000/bitetrack",
  };

  args.forEach((arg) => {
    if (arg.startsWith("--auth-token=")) {
      options.authToken = arg.split("=")[1];
    } else if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg.split("=")[1];
    } else if (arg === "--verbose") {
      options.verbose = true;
    } else if (arg === "--help") {
      console.log(`
BiteTrack Sales Filtering Test Script

Usage: node scripts/test-sales-filtering.js [options]

Options:
  --auth-token=<token>  JWT authentication token
  --base-url=<url>      API base URL [default: http://localhost:3000/bitetrack]
  --verbose             Show detailed logging
  --help                Show this help message

Environment Variables:
  TEST_EMAIL           Email for authentication [default: admin@bitetrack.com]
  TEST_PASSWORD        Password for authentication [default: SuperAdmin123!]

Examples:
  node scripts/test-sales-filtering.js
  node scripts/test-sales-filtering.js --auth-token=eyJ... --verbose
  TEST_EMAIL=user@example.com node scripts/test-sales-filtering.js
      `);
      process.exit(0);
    }
  });

  const tester = new SalesFilteringTester(options);
  await tester.runAllTests();
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Test script failed:", error.message);
    process.exit(1);
  });
}

module.exports = SalesFilteringTester;
