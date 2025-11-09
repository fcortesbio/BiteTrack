import express from "express";
const router = express.Router();
import { authenticate } from "../middleware/auth.js";
import {
  getSalesAnalytics,
  exportSalesCSV,
} from "../controllers/reportingController.js";

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Reporting
 *   description: Business intelligence and analytics
 */

/**
 * @swagger
 * /reporting/sales/analytics:
 *   get:
 *     tags: [Reporting]
 *     summary: Get comprehensive sales analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month, year]
 *           default: day
 *     responses:
 *       200:
 *         description: Sales analytics with time-series data
 */
router.get("/sales/analytics", getSalesAnalytics);

/**
 * @swagger
 * /reporting/sales/export:
 *   get:
 *     tags: [Reporting]
 *     summary: Export sales data as CSV
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [detailed, summary, products]
 *           default: detailed
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get("/sales/export", exportSalesCSV);

export default router;
