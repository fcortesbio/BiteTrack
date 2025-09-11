const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validationRules, validate } = require('../utils/validation');
const {
  listSellers,
  createPendingSeller,
  updateSeller,
  changeRole,
  deactivateSeller
} = require('../controllers/sellerController');

// All routes require authentication
router.use(authenticate);

// List sellers (admin/superadmin only)
router.get('/', authorize('admin', 'superadmin'), listSellers);

// Create pending seller (admin/superadmin only)
router.post('/pending', 
  authorize('admin', 'superadmin'),
  validationRules.createPendingSeller,
  validate,
  createPendingSeller
);

// Update seller (self-update)
router.patch('/:id',
  validationRules.updateSeller,
  validate,
  updateSeller
);

// Change role (superadmin only)
router.patch('/:id/role',
  authorize('superadmin'),
  validationRules.changeRole,
  validate,
  changeRole
);

// Deactivate seller (superadmin only)
router.delete('/:id',
  authorize('superadmin'),
  deactivateSeller
);

module.exports = router;