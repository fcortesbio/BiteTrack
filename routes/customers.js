const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validationRules, validate } = require('../utils/validation');
const {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerTransactions
} = require('../controllers/customerController');

// All routes require authentication
router.use(authenticate);

// Customer routes
router.get('/', listCustomers);
router.get('/:id/transactions', getCustomerTransactions);
router.post('/', validationRules.createCustomer, validate, createCustomer);
router.patch('/:id', validationRules.updateCustomer, validate, updateCustomer);
router.delete('/:id', deleteCustomer);

module.exports = router;