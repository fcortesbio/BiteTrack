import express from "express";
const router = express.Router();
import { authenticate } from "../middleware/auth.js";
import { validationRules, validate } from "../utils/validation.js";
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product and inventory management endpoints
 *
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - productName
 *         - price
 *         - count
 *       properties:
 *         _id:
 *           type: string
 *           description: Product ID
 *         productName:
 *           type: string
 *           description: Product name
 *           example: "Turkey Sandwich"
 *         description:
 *           type: string
 *           description: Product description
 *           example: "Fresh turkey with lettuce and tomato"
 *         price:
 *           type: number
 *           format: float
 *           description: Product price
 *           example: 8.99
 *         count:
 *           type: number
 *           format: integer
 *           description: Current inventory count
 *           example: 25
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List all products
 *     description: Retrieve all products in inventory
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get("/", listProducts);

/**
 * @swagger
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product
 *     description: Add a new product to inventory
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productName
 *               - price
 *               - count
 *             properties:
 *               productName:
 *                 type: string
 *                 example: "Turkey Sandwich"
 *               description:
 *                 type: string
 *                 example: "Fresh turkey with lettuce and tomato"
 *               price:
 *                 type: number
 *                 format: float
 *                 example: 8.99
 *               count:
 *                 type: number
 *                 format: integer
 *                 minimum: 0
 *                 example: 25
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/", validationRules.createProduct, validate, createProduct);

/**
 * @swagger
 * /products/{id}:
 *   patch:
 *     tags: [Products]
 *     summary: Update a product
 *     description: Update product details or inventory count
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productName:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *                 format: float
 *               count:
 *                 type: number
 *                 format: integer
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid product ID or validation error
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized
 */
router.patch("/:id", validationRules.updateProduct, validate, updateProduct);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product
 *     description: Remove a product from inventory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       204:
 *         description: Product deleted successfully
 *       400:
 *         description: Invalid product ID
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/:id", deleteProduct);

export default router;
