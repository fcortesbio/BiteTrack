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

// All inventory drop routes require authentication
router.use(authenticate);

/**
 * POST /inventory-drops
 * Drop inventory for a product (admin/superadmin only)
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
 * POST /inventory-drops/:dropId/undo
 * Undo an inventory drop (admin/superadmin only)
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
 * GET /inventory-drops
 * List inventory drops with filtering and pagination
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
 * GET /inventory-drops/undoable
 * Get drops that can still be undone
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
 * GET /inventory-drops/analytics
 * Get inventory drop analytics and summaries
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
 * GET /inventory-drops/:dropId
 * Get inventory drop details by ID
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
