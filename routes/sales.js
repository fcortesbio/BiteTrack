const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validationRules, validate } = require('../utils/validation');
const {
  listSales,
  createSale,
  getSale,
  settleSale
} = require('../controllers/saleController');

// All routes require authentication
router.use(authenticate);

// Sales routes
router.get('/', listSales);
router.post('/', validationRules.createSale, validate, createSale);
router.get('/:id', getSale);
router.patch('/:id/settle', validationRules.settleSale, validate, settleSale);

module.exports = router;