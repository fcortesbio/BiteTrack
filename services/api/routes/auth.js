import express from "express";
const router = express.Router();
import { authenticate, authorize } from "../middleware/auth.js";
import { validationRules, validate } from "../utils/validation.js";
import {
  login,
  activate,
  recover,
  requestRecovery,
  reset,
  getSellerByEmail,
} from "../controllers/authController.js";

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and account management
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login and get JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", validationRules.login, validate, login);

/**
 * @swagger
 * /auth/activate:
 *   post:
 *     tags: [Authentication]
 *     summary: Activate pending seller account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, dateOfBirth, lastName, password]
 *             properties:
 *               email:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               lastName:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account activated
 *       404:
 *         description: Pending seller not found
 */
router.post("/activate", validationRules.activate, validate, activate);

/**
 * @swagger
 * /auth/request-recovery:
 *   post:
 *     tags: [Authentication]
 *     summary: Request password reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, dateOfBirth]
 *             properties:
 *               email:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Recovery email sent
 */
router.post(
  "/request-recovery",
  validationRules.requestRecovery,
  validate,
  requestRecovery,
);

/**
 * @swagger
 * /auth/reset:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password with token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, email, dateOfBirth, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *               email:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post("/reset", validationRules.resetPassword, validate, reset);

/**
 * @swagger
 * /auth/seller-status:
 *   get:
 *     tags: [Authentication]
 *     summary: Check account status by email
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account found
 *       404:
 *         description: Account not found
 */
router.get(
  "/seller-status",
  validationRules.getSellerByEmail,
  validate,
  getSellerByEmail,
);

/**
 * @swagger
 * /auth/recover:
 *   post:
 *     tags: [Authentication]
 *     summary: Initiate password recovery (SuperAdmin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sellerId]
 *             properties:
 *               sellerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Recovery email sent
 *       403:
 *         description: Insufficient permissions
 */
router.post("/recover", authenticate, authorize("superadmin"), recover);

export default router;
