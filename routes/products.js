const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validationRules, validate } = require('../utils/validation');
const {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

// All routes require authentication
router.use(authenticate);

// Product routes
router.get('/', listProducts);
router.post('/', validationRules.createProduct, validate, createProduct);
router.patch('/:id', validationRules.updateProduct, validate, updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;