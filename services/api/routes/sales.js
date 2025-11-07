import express from 'express';
const router = express.Router();
import { authenticate } from '../middleware/auth.js';
import { validationRules, validate } from '../utils/validation.js';
import {
  listSales,
  createSale,
  getSale,
  settleSale,
  importSalesFromCSV,
  uploadCSV,
} from '../controllers/saleController.js';

// All routes require authentication
router.use(authenticate);

// Sales routes
router.get('/', listSales);
router.post('/', validationRules.createSale, validate, createSale);
router.get('/:id', getSale);
router.patch('/:id/settle', validationRules.settleSale, validate, settleSale);

// CSV import route
router.post('/import', uploadCSV.single('csvFile'), importSalesFromCSV);

export default router;
