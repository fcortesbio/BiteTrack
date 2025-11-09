import express from "express";
import { body, query } from "express-validator";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  getTestDataStatus,
  populateTestData,
  cleanTestData,
  resetToScenario,
} from "../controllers/testDataController.js";

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Test Data
 *   description: Professional testing infrastructure and data management (Admin+ only)
 */

/**
 * @swagger
 * /test-data/status:
 *   get:
 *     tags: [Test Data]
 *     summary: Get test data and database status (Admin+)
 *     description: Returns comprehensive database statistics and environment info
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database statistics and collection counts
 *       503:
 *         description: Service unavailable in production environment
 */
router.get("/status", authorize("admin", "superadmin"), getTestDataStatus);

/**
 * @swagger
 * /test-data/populate:
 *   post:
 *     tags: [Test Data]
 *     summary: Populate database with test data (Admin+)
 *     description: Generate realistic business scenarios with configurable presets
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preset:
 *                 type: string
 *                 enum: [minimal, dev, full, bulk]
 *                 default: dev
 *                 description: Data volume preset (minimal=10, dev=50, full=200, bulk=1000)
 *               verbose:
 *                 type: boolean
 *                 default: false
 *                 description: Include detailed logs
 *               skipExisting:
 *                 type: boolean
 *                 default: true
 *                 description: Skip population if data exists
 *     responses:
 *       201:
 *         description: Test data created successfully with details
 *       503:
 *         description: Service unavailable in production environment
 */
router.post(
  "/populate",
  authorize("admin", "superadmin"),
  [
    body("preset")
      .optional()
      .isIn(["minimal", "dev", "full", "bulk"])
      .withMessage(
        "Preset must be one of: minimal, dev, full, bulk (default: dev)",
      ),
    body("verbose")
      .optional()
      .isBoolean()
      .withMessage("Verbose must be a boolean"),
    body("skipExisting")
      .optional()
      .isBoolean()
      .withMessage("Skip existing must be a boolean"),
  ],
  populateTestData,
);

/**
 * @swagger
 * /test-data/clean:
 *   delete:
 *     tags: [Test Data]
 *     summary: Clean test data from database (Admin+)
 *     description: Selective data cleanup with preservation options
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: preserveSellers
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Keep seller accounts (preserve authentication)
 *       - in: query
 *         name: preserveProducts
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Keep product catalog
 *       - in: query
 *         name: preserveCustomers
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Keep customer records
 *     responses:
 *       200:
 *         description: Test data cleaned successfully
 *       503:
 *         description: Service unavailable in production environment
 */
router.delete(
  "/clean",
  authorize("admin", "superadmin"),
  [
    query("preserveSellers")
      .optional()
      .isBoolean()
      .withMessage("Preserve sellers must be a boolean"),
    query("preserveProducts")
      .optional()
      .isBoolean()
      .withMessage("Preserve products must be a boolean"),
    query("preserveCustomers")
      .optional()
      .isBoolean()
      .withMessage("Preserve customers must be a boolean"),
  ],
  cleanTestData,
);

/**
 * @swagger
 * /test-data/reset:
 *   post:
 *     tags: [Test Data]
 *     summary: Reset database to specific scenario (SuperAdmin only)
 *     description: Complete database reset with automatic repopulation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preset:
 *                 type: string
 *                 enum: [minimal, dev, full]
 *                 default: dev
 *                 description: Target scenario after reset
 *               keepSuperAdmin:
 *                 type: boolean
 *                 default: true
 *                 description: Preserve current superadmin account
 *     responses:
 *       200:
 *         description: Database reset and repopulated successfully
 *       403:
 *         description: Insufficient permissions (requires superadmin)
 *       503:
 *         description: Service unavailable in production environment
 */
router.post(
  "/reset",
  authorize("superadmin"),
  [
    body("preset")
      .optional()
      .isIn(["minimal", "dev", "full"])
      .withMessage("Reset preset must be one of: minimal, dev, full"),
    body("keepSuperAdmin")
      .optional()
      .isBoolean()
      .withMessage("Keep superadmin must be a boolean"),
  ],
  resetToScenario,
);

export default router;
