import express from "express";
const router = express.Router();
import { authenticate } from "../middleware/auth.js";
import {
  getSalesAnalytics,
  exportSalesCSV,
} from "../controllers/reportingController.js";

// All reporting routes require authentication
router.use(authenticate);

/**
 * GET /reporting/sales/analytics
 * Generate comprehensive sales analytics with time-based aggregations
 * Query parameters:
 * - startDate: Start date for filtering (ISO 8601)
 * - endDate: End date for filtering (ISO 8601)
 * - dateField: Field to filter by (createdAt, updatedAt)
 * - groupBy: Time grouping (hour, day, week, month, year)
 */
router.get("/sales/analytics", getSalesAnalytics);

/**
 * GET /reporting/sales/export
 * Export sales data as CSV file
 * Query parameters:
 * - startDate: Start date for filtering (ISO 8601)
 * - endDate: End date for filtering (ISO 8601)
 * - dateField: Field to filter by (createdAt, updatedAt)
 * - format: Export format (detailed, summary, products)
 * - customerId: Filter by customer ID
 * - sellerId: Filter by seller ID
 * - settled: Filter by settlement status (true/false)
 */
router.get("/sales/export", exportSalesCSV);

export default router;
