import express from "express";
const router = express.Router();
import { authenticate } from "../middleware/auth.js";
import { validationRules, validate } from "../utils/validation.js";
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerTransactions,
  importCustomersFromCSV,
  upload,
} from "../controllers/customerController.js";

// All routes require authentication
router.use(authenticate);

// Customer routes
router.get("/", listCustomers);
router.get("/:id/transactions", getCustomerTransactions);
router.post("/", validationRules.createCustomer, validate, createCustomer);
router.patch("/:id", validationRules.updateCustomer, validate, updateCustomer);
router.delete("/:id", deleteCustomer);

// CSV import route
router.post("/import", upload.single("csvFile"), importCustomersFromCSV);

export default router;
