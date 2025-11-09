import express from "express";
import { body, param, query } from "express-validator";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  dropInventory,
  undoInventoryDrop,
  listInventoryDrops,
  getUndoableDrops,
  getDropAnalytics,
  getInventoryDropById,
} from "../controllers/inventoryDropController.js";

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Inventory Drops
 *   description: Food waste management and compliance tracking (Admin+ only)
 */

/**
 * @swagger
 * /inventory-drops:
 *   post:
 *     tags: [Inventory Drops]
 *     summary: Drop inventory for waste tracking (Admin+)
 *     description: Record food waste with regulatory compliance tracking and 8-hour undo window
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantityToDrop]
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID to drop
 *               quantityToDrop:
 *                 type: integer
 *                 minimum: 1
 *                 description: Quantity to drop
 *               reason:
 *                 type: string
 *                 enum: [expired, end_of_day, quality_issue, damaged, contaminated, overproduction, other]
 *                 default: end_of_day
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *               productionDate:
 *                 type: string
 *                 format: date
 *               expirationDate:
 *                 type: string
 *                 format: date
 *               batchId:
 *                 type: string
 *                 maxLength: 100
 *     responses:
 *       201:
 *         description: Inventory dropped successfully with undo info
 *       400:
 *         description: Invalid quantity or insufficient inventory
 *       403:
 *         description: Insufficient permissions (requires admin)
 */
router.post(
  "/",
  authorize("admin", "superadmin"),
  [
    body("productId")
      .isMongoId()
      .withMessage("Product ID must be a valid MongoDB ObjectId"),
    body("quantityToDrop")
      .isInt({ min: 1 })
      .withMessage("Quantity to drop must be a positive integer"),
    body("reason")
      .optional()
      .isIn([
        "expired",
        "end_of_day",
        "quality_issue",
        "damaged",
        "contaminated",
        "overproduction",
        "other",
      ])
      .withMessage("Invalid drop reason"),
    body("notes")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Notes cannot exceed 500 characters"),
    body("productionDate")
      .optional()
      .isISO8601()
      .withMessage("Production date must be a valid date"),
    body("expirationDate")
      .optional()
      .isISO8601()
      .withMessage("Expiration date must be a valid date"),
    body("batchId")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Batch ID cannot exceed 100 characters"),
  ],
  dropInventory,
);

/**
 * @swagger
 * /inventory-drops/{dropId}/undo:
 *   post:
 *     tags: [Inventory Drops]
 *     summary: Undo an inventory drop (Admin+)
 *     description: Restore inventory within 8-hour undo window
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dropId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               undoReason:
 *                 type: string
 *                 maxLength: 300
 *     responses:
 *       200:
 *         description: Drop undone successfully
 *       400:
 *         description: Undo window expired or already undone
 */
router.post(
  "/:dropId/undo",
  authorize("admin", "superadmin"),
  [
    param("dropId")
      .isMongoId()
      .withMessage("Drop ID must be a valid MongoDB ObjectId"),
    body("undoReason")
      .optional()
      .isLength({ max: 300 })
      .withMessage("Undo reason cannot exceed 300 characters"),
  ],
  undoInventoryDrop,
);

/**
 * @swagger
 * /inventory-drops:
 *   get:
 *     tags: [Inventory Drops]
 *     summary: List inventory drops with filtering (Admin+)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *           enum: [expired, end_of_day, quality_issue, damaged, contaminated, overproduction, other]
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
 *         name: includeUndone
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *     responses:
 *       200:
 *         description: List of drops with pagination
 */
router.get(
  "/",
  authorize("admin", "superadmin"),
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("productId")
      .optional()
      .isMongoId()
      .withMessage("Product ID must be a valid MongoDB ObjectId"),
    query("reason")
      .optional()
      .isIn([
        "expired",
        "end_of_day",
        "quality_issue",
        "damaged",
        "contaminated",
        "overproduction",
        "other",
      ])
      .withMessage("Invalid drop reason"),
    query("droppedBy")
      .optional()
      .isMongoId()
      .withMessage("Dropped by must be a valid MongoDB ObjectId"),
    query("startDate")
      .optional()
      .isISO8601()
      .withMessage("Start date must be a valid date"),
    query("endDate")
      .optional()
      .isISO8601()
      .withMessage("End date must be a valid date"),
    query("includeUndone")
      .optional()
      .isIn(["true", "false"])
      .withMessage("Include undone must be 'true' or 'false'"),
  ],
  listInventoryDrops,
);

/**
 * @swagger
 * /inventory-drops/undoable:
 *   get:
 *     tags: [Inventory Drops]
 *     summary: Get drops within undo window (Admin+)
 *     description: Returns drops that can still be undone (within 8 hours)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user who dropped
 *     responses:
 *       200:
 *         description: List of undoable drops
 */
router.get(
  "/undoable",
  authorize("admin", "superadmin"),
  [
    query("userId")
      .optional()
      .isMongoId()
      .withMessage("User ID must be a valid MongoDB ObjectId"),
  ],
  getUndoableDrops,
);

/**
 * @swagger
 * /inventory-drops/analytics:
 *   get:
 *     tags: [Inventory Drops]
 *     summary: Get waste analytics and cost analysis (Admin+)
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
 *         name: productId
 *         schema:
 *           type: string
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *           enum: [expired, end_of_day, quality_issue, damaged, contaminated, overproduction, other]
 *     responses:
 *       200:
 *         description: Comprehensive analytics with cost analysis
 */
router.get(
  "/analytics",
  authorize("admin", "superadmin"),
  [
    query("startDate")
      .optional()
      .isISO8601()
      .withMessage("Start date must be a valid date"),
    query("endDate")
      .optional()
      .isISO8601()
      .withMessage("End date must be a valid date"),
    query("productId")
      .optional()
      .isMongoId()
      .withMessage("Product ID must be a valid MongoDB ObjectId"),
    query("reason")
      .optional()
      .isIn([
        "expired",
        "end_of_day",
        "quality_issue",
        "damaged",
        "contaminated",
        "overproduction",
        "other",
      ])
      .withMessage("Invalid drop reason"),
    query("droppedBy")
      .optional()
      .isMongoId()
      .withMessage("Dropped by must be a valid MongoDB ObjectId"),
  ],
  getDropAnalytics,
);

/**
 * @swagger
 * /inventory-drops/{dropId}:
 *   get:
 *     tags: [Inventory Drops]
 *     summary: Get drop details by ID (Admin+)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dropId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Drop details with undo status
 */
router.get(
  "/:dropId",
  authorize("admin", "superadmin"),
  [
    param("dropId")
      .isMongoId()
      .withMessage("Drop ID must be a valid MongoDB ObjectId"),
  ],
  getInventoryDropById,
);

export default router;
