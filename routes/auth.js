const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validationRules, validate } = require('../utils/validation');
const {
  login,
  activate,
  recover,
  reset
} = require('../controllers/authController');

// Public routes
router.post('/login', validationRules.login, validate, login);
router.post('/activate', validationRules.activate, validate, activate);
router.post('/reset', validationRules.resetPassword, validate, reset);

// Protected routes
router.post('/recover', 
  authenticate, 
  authorize('superadmin'), 
  recover
);

module.exports = router;