import express from 'express';
const router = express.Router();
import { authenticate } from '../middleware/auth.js';
import { validationRules, validate } from '../utils/validation.js';
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';

// All routes require authentication
router.use(authenticate);

// Product routes
router.get('/', listProducts);
router.post('/', validationRules.createProduct, validate, createProduct);
router.patch('/:id', validationRules.updateProduct, validate, updateProduct);
router.delete('/:id', deleteProduct);

export default router;
