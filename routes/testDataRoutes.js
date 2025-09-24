const express = require('express');
const router = express.Router();

// Import middleware
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// Import controller functions
const {
  populateTestData,
  cleanTestData,
  getTestDataStatus,
  resetToScenario
} = require('../controllers/testDataController');

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
router.get('/status', auth, roleAuth(['admin', 'superadmin']), getTestDataStatus);

// @route   POST /test-data/populate
// @desc    Populate database with test data
// @access  Admin/SuperAdmin
// @body    { preset: 'minimal|dev|full|bulk', cleanBefore: boolean, verbose: boolean }
router.post('/populate', auth, roleAuth(['admin', 'superadmin']), populateTestData);

// @route   DELETE /test-data/clean
// @desc    Clean/remove test data from database
// @access  Admin/SuperAdmin
// @body    { confirmClean: true, preserveData: ['customers', 'products', 'sales', 'pendingSellers'] }
router.delete('/clean', auth, roleAuth(['admin', 'superadmin']), cleanTestData);

// @route   POST /test-data/reset
// @desc    Reset database to specific test scenario (SuperAdmin only)
// @access  SuperAdmin only
// @body    { scenario: 'clean|minimal|dev|full', confirmReset: true }
router.post('/reset', auth, roleAuth(['superadmin']), resetToScenario);

module.exports = router;