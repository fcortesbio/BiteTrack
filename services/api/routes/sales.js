import express from "express";
const router = express.Router();
import { authenticate } from "../middleware/auth.js";
import { validationRules, validate } from "../utils/validation.js";
import {
  listSales,
  createSale,
  getSale,
  settleSale,
  importSalesFromCSV,
  uploadCSV,
} from "../controllers/saleController.js";

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Sales
 *   description: Sales and transaction processing
 */

/**
 * @swagger
 * /sales:
 *   get:
 *     tags: [Sales]
 *     summary: List all sales with filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: settled
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of sales with pagination
 */
router.get("/", listSales);

/**
 * @swagger
 * /sales:
 *   post:
 *     tags: [Sales]
 *     summary: Create a new sale
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, products]
 *             properties:
 *               customerId:
 *                 type: string
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *               amountPaid:
 *                 type: number
 *     responses:
 *       201:
 *         description: Sale created
 */
router.post("/", validationRules.createSale, validate, createSale);

/**
 * @swagger
 * /sales/{id}:
 *   get:
 *     tags: [Sales]
 *     summary: Get sale by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sale details
 */
router.get("/:id", getSale);

/**
 * @swagger
 * /sales/{id}/settle:
 *   patch:
 *     tags: [Sales]
 *     summary: Settle a sale payment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amountPaid:
 *                 type: number
 *     responses:
 *       200:
 *         description: Sale settled
 */
router.patch("/:id/settle", validationRules.settleSale, validate, settleSale);

/**
 * @swagger
 * /sales/import:
 *   post:
 *     tags: [Sales]
 *     summary: Import sales from CSV
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               csvFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import results
 */
router.post("/import", uploadCSV.single("csvFile"), importSalesFromCSV);

export default router;
