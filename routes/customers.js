const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validationRules, validate } = require('../utils/validation');
const {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerTransactions,
  importCustomersFromCSV,
  upload,
} = require('../controllers/customerController');

// All routes require authentication
router.use(authenticate);

// Customer routes
router.get('/', listCustomers);
router.get('/:id/transactions', getCustomerTransactions);
router.post('/', validationRules.createCustomer, validate, createCustomer);
router.patch('/:id', validationRules.updateCustomer, validate, updateCustomer);
router.delete('/:id', deleteCustomer);

// CSV import route
router.post('/import', upload.single('csvFile'), importCustomersFromCSV);

module.exports = router;