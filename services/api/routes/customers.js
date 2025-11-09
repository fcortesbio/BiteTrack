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

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Customer relationship management
 */

/**
 * @swagger
 * /customers:
 *   get:
 *     tags: [Customers]
 *     summary: List all customers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of customers
 */
router.get("/", listCustomers);

/**
 * @swagger
 * /customers/{id}/transactions:
 *   get:
 *     tags: [Customers]
 *     summary: Get customer transaction history
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Customer transactions with pagination
 */
router.get("/:id/transactions", getCustomerTransactions);

/**
 * @swagger
 * /customers:
 *   post:
 *     tags: [Customers]
 *     summary: Create a new customer
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, phoneNumber]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Customer created
 */
router.post("/", validationRules.createCustomer, validate, createCustomer);

/**
 * @swagger
 * /customers/{id}:
 *   patch:
 *     tags: [Customers]
 *     summary: Update a customer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Customer updated
 */
router.patch("/:id", validationRules.updateCustomer, validate, updateCustomer);

/**
 * @swagger
 * /customers/{id}:
 *   delete:
 *     tags: [Customers]
 *     summary: Delete a customer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Customer deleted
 */
router.delete("/:id", deleteCustomer);

/**
 * @swagger
 * /customers/import:
 *   post:
 *     tags: [Customers]
 *     summary: Import customers from CSV
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               csvFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import results
 */
router.post("/import", upload.single("csvFile"), importCustomersFromCSV);

export default router;
