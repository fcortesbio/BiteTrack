#!/usr/bin/env node

/**
 * BiteTrack Reporting Features Test Script
 *
 * This script tests the new sales reporting and CSV export capabilities.
 * It validates both the analytics endpoints and CSV export functionality.
 *
 * Usage:
 *   node scripts/07-test-reporting-features.js [--auth-token=<token>] [--base-url=<url>]
 *
 * Prerequisites:
 *   - BiteTrack API running
 *   - Test data populated (use scripts/04-populate-test-data.js first)
 *   - Valid authentication token
 */

const axios = require("axios");
const fs = require("fs").promises;

class ReportingTester {
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
        timeout: 30000, // Increased timeout for complex queries
      });
      return response.data;
    } catch (error) {
      throw new Error(
        `API call failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  async downloadCSV(endpoint, params = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params,
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
        responseType: "stream",
        timeout: 30000,
      });
      return response;
    } catch (error) {
      throw new Error(
        `CSV download failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  async testBasicAnalytics() {
    const response = await this.apiCall("/reporting/sales/analytics");

    // Validate response structure
    if (!response.period) {
      throw new Error("Response should contain period metadata");
    }

    if (!response.summary) {
      throw new Error("Response should contain summary statistics");
    }

    if (!Array.isArray(response.timeSeries)) {
      throw new Error("Response should contain timeSeries array");
    }

    if (!Array.isArray(response.topProducts)) {
      throw new Error("Response should contain topProducts array");
    }

    if (!response.customerAnalytics) {
      throw new Error("Response should contain customerAnalytics");
    }

    if (!response.paymentAnalytics) {
      throw new Error("Response should contain paymentAnalytics");
    }

    this.log(
      `  Found ${response.summary.totalSales} total sales, $${response.summary.totalRevenue} revenue`,
    );
  }

  async testDateRangeAnalytics() {
    // Test analytics with date range
    const startDate = "2024-01-01";
    const endDate = "2024-12-31";

    const response = await this.apiCall("/reporting/sales/analytics", {
      startDate,
      endDate,
      groupBy: "month",
    });

    if (response.period.startDate !== startDate + "T00:00:00.000Z") {
      throw new Error("Start date not properly applied in period metadata");
    }

    if (response.period.endDate !== endDate + "T23:59:59.999Z") {
      throw new Error("End date not properly applied in period metadata");
    }

    if (response.period.groupBy !== "month") {
      throw new Error("GroupBy parameter not properly applied");
    }

    this.log(
      `  Date range analytics: ${response.summary.totalSales} sales in period`,
    );
  }

  async testGroupingOptions() {
    const groupByOptions = ["day", "week", "month", "year"];

    for (const groupBy of groupByOptions) {
      const response = await this.apiCall("/reporting/sales/analytics", {
        groupBy,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });

      if (response.period.groupBy !== groupBy) {
        throw new Error(`GroupBy ${groupBy} not properly applied`);
      }

      // TimeSeries should have appropriate grouping structure
      if (response.timeSeries.length > 0) {
        const firstEntry = response.timeSeries[0];
        if (!firstEntry._id || typeof firstEntry._id !== "object") {
          throw new Error(
            `GroupBy ${groupBy} should produce structured _id objects`,
          );
        }
      }
    }

    this.log(`  Tested all grouping options: ${groupByOptions.join(", ")}`);
  }

  async testCSVExportDetailed() {
    const response = await this.downloadCSV("/reporting/sales/export", {
      format: "detailed",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    });

    // Check response headers
    const contentType = response.headers["content-type"];
    const contentDisposition = response.headers["content-disposition"];

    if (!contentType.includes("text/csv")) {
      throw new Error("CSV export should have text/csv content type");
    }

    if (
      !contentDisposition.includes("attachment") ||
      !contentDisposition.includes("detailed")
    ) {
      throw new Error(
        "CSV export should have proper attachment disposition with format in filename",
      );
    }

    // Save to temporary file to validate content
    const tempFile = "./test-data/temp-detailed-export.csv";
    const writer = require("fs").createWriteStream(tempFile);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // Read and validate CSV content
    const csvContent = await fs.readFile(tempFile, "utf8");
    const lines = csvContent.split("\n").filter((line) => line.trim());

    if (lines.length < 1) {
      throw new Error("CSV should contain at least header row");
    }

    const header = lines[0];
    const expectedColumns = [
      "Sale ID",
      "Date",
      "Time",
      "Customer Name",
      "Customer Email",
      "Seller Name",
      "Product Name",
      "Quantity",
      "Unit Price",
      "Line Total",
      "Sale Total",
      "Amount Paid",
      "Balance Due",
      "Settled",
    ];

    for (const column of expectedColumns) {
      if (!header.includes(column)) {
        throw new Error(`CSV header should contain "${column}" column`);
      }
    }

    // Clean up temp file
    await fs.unlink(tempFile);

    this.log(
      `  Detailed CSV export: ${lines.length - 1} data rows with proper structure`,
    );
  }

  async testCSVExportSummary() {
    const response = await this.downloadCSV("/reporting/sales/export", {
      format: "summary",
      settled: true,
    });

    // Validate headers
    const contentDisposition = response.headers["content-disposition"];
    if (!contentDisposition.includes("summary")) {
      throw new Error("Summary CSV should have format in filename");
    }

    this.log("  Summary CSV export completed successfully");
  }

  async testCSVExportProducts() {
    const response = await this.downloadCSV("/reporting/sales/export", {
      format: "products",
      startDate: "2024-01-01",
    });

    // Validate headers
    const contentDisposition = response.headers["content-disposition"];
    if (!contentDisposition.includes("products")) {
      throw new Error("Products CSV should have format in filename");
    }

    this.log("  Products CSV export completed successfully");
  }

  async testInvalidParameters() {
    // Test invalid date format
    try {
      await this.apiCall("/reporting/sales/analytics", {
        startDate: "invalid-date",
      });
      throw new Error("Should reject invalid date format");
    } catch (error) {
      if (!error.message.includes("API call failed")) {
        throw new Error("Should return validation error for invalid date");
      }
    }

    // Test invalid groupBy
    try {
      await this.apiCall("/reporting/sales/analytics", {
        groupBy: "invalid-group",
      });
      // This might not fail as the function has a default case, but let's test it
    } catch {
      // Expected behavior varies
    }

    // Test invalid CSV format
    try {
      await this.downloadCSV("/reporting/sales/export", {
        format: "invalid-format",
      });
      throw new Error("Should reject invalid CSV format");
    } catch (error) {
      if (!error.message.includes("CSV download failed")) {
        throw new Error("Should return validation error for invalid format");
      }
    }

    this.log("  Invalid parameter handling working correctly");
  }

  async testPerformanceWithLargeDataset() {
    const startTime = Date.now();

    // Test analytics on potentially large dataset
    const response = await this.apiCall("/reporting/sales/analytics", {
      startDate: "2020-01-01",
      endDate: "2030-12-31",
      groupBy: "month",
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    if (responseTime > 10000) {
      // 10 seconds
      this.log(
        `  ⚠️ Analytics query took ${responseTime}ms - consider optimization for large datasets`,
      );
    } else {
      this.log(
        `  Analytics performance: ${responseTime}ms for comprehensive query`,
      );
    }

    // Ensure response is still valid
    if (!response.summary || typeof response.summary.totalSales !== "number") {
      throw new Error("Performance test should still return valid analytics");
    }
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
    const reportPath = "./test-data/reporting-test-report.json";
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log("\n📊 REPORTING FUNCTIONALITY TEST REPORT");
    console.log("=====================================");
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
    console.log("\n📈 Starting Reporting Functionality Tests\n");

    await this.authenticate();

    await this.runTest("Basic Analytics Structure", () =>
      this.testBasicAnalytics(),
    );
    await this.runTest("Date Range Analytics", () =>
      this.testDateRangeAnalytics(),
    );
    await this.runTest("Time Grouping Options", () =>
      this.testGroupingOptions(),
    );
    await this.runTest("CSV Export - Detailed Format", () =>
      this.testCSVExportDetailed(),
    );
    await this.runTest("CSV Export - Summary Format", () =>
      this.testCSVExportSummary(),
    );
    await this.runTest("CSV Export - Products Format", () =>
      this.testCSVExportProducts(),
    );
    await this.runTest("Invalid Parameter Handling", () =>
      this.testInvalidParameters(),
    );
    await this.runTest("Performance with Large Dataset", () =>
      this.testPerformanceWithLargeDataset(),
    );

    await this.generateReport();

    const success = this.testResults.failed === 0;
    console.log(
      success
        ? "\n🎉 All reporting tests passed!"
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
BiteTrack Reporting Features Test Script

Usage: node scripts/07-test-reporting-features.js [options]

Options:
  --auth-token=<token>  JWT authentication token
  --base-url=<url>      API base URL [default: http://localhost:3000/bitetrack]
  --verbose             Show detailed logging
  --help                Show this help message

Environment Variables:
  TEST_EMAIL           Email for authentication [default: admin@bitetrack.com]
  TEST_PASSWORD        Password for authentication [default: SuperAdmin123!]

Prerequisites:
  - BiteTrack API running
  - Test data populated (run scripts/04-populate-test-data.js first)
  - Valid authentication credentials
      `);
      process.exit(0);
    }
  });

  try {
    const tester = new ReportingTester(options);
    await tester.runAllTests();
  } catch (error) {
    console.error("❌ Test execution failed:", error.message);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled promise rejection:", error.message);
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = ReportingTester;
