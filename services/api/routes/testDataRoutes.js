import express from "express";
const router = express.Router();

// Import middleware
import { authenticate, authorize } from "../middleware/auth.js";

// Import controller functions
import {
  populateTestData,
  cleanTestData,
  getTestDataStatus,
  resetToScenario,
} from "../controllers/testDataController.js";

/**
 * Test Data Management Routes
 *
 * These routes provide API endpoints for managing test data in development/testing environments.
 * All routes require authentication and admin privileges.
 * All routes are automatically disabled in production environments.
 */

// @route   GET /test-data/status
// @desc    Get current test data statistics and counts
// @access  Admin/SuperAdmin
router.get(
  "/status",
  authenticate,
  authorize("admin", "superadmin"),
  getTestDataStatus,
);

// @route   POST /test-data/populate
// @desc    Populate database with test data
// @access  Admin/SuperAdmin
// @body    { preset: 'minimal|dev|full|bulk', cleanBefore: boolean, verbose: boolean }
router.post(
  "/populate",
  authenticate,
  authorize("admin", "superadmin"),
  populateTestData,
);

// @route   DELETE /test-data/clean
// @desc    Clean/remove test data from database
// @access  Admin/SuperAdmin
// @body    { confirmClean: true, preserveData: ['customers', 'products', 'sales', 'pendingSellers'] }
router.delete(
  "/clean",
  authenticate,
  authorize("admin", "superadmin"),
  cleanTestData,
);

// @route   POST /test-data/reset
// @desc    Reset database to specific test scenario (SuperAdmin only)
// @access  SuperAdmin only
// @body    { scenario: 'clean|minimal|dev|full', confirmReset: true }
router.post("/reset", authenticate, authorize("superadmin"), resetToScenario);

export default router;
