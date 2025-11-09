import express from "express";
const router = express.Router();
import { authenticate, authorize } from "../middleware/auth.js";
import { validationRules, validate } from "../utils/validation.js";
import {
  listSellers,
  listPendingSellers,
  createPendingSeller,
  updateSeller,
  changeRole,
  deactivateSeller,
} from "../controllers/sellerController.js";

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Sellers
 *   description: Staff and user management
 */

/**
 * @swagger
 * /sellers:
 *   get:
 *     tags: [Sellers]
 *     summary: List all sellers (Admin+)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sellers
 */
router.get("/", authorize("admin", "superadmin"), listSellers);

/**
 * @swagger
 * /sellers/pending:
 *   get:
 *     tags: [Sellers]
 *     summary: List pending sellers (SuperAdmin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending sellers
 */
router.get("/pending", authorize("superadmin"), listPendingSellers);

/**
 * @swagger
 * /sellers/pending:
 *   post:
 *     tags: [Sellers]
 *     summary: Create pending seller (Admin+)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, dateOfBirth]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Pending seller created
 */
router.post(
  "/pending",
  authorize("admin", "superadmin"),
  validationRules.createPendingSeller,
  validate,
  createPendingSeller,
);

/**
 * @swagger
 * /sellers/{id}:
 *   patch:
 *     tags: [Sellers]
 *     summary: Update seller profile (self-update)
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
 *     responses:
 *       200:
 *         description: Seller updated
 */
router.patch("/:id", validationRules.updateSeller, validate, updateSeller);

/**
 * @swagger
 * /sellers/{id}/role:
 *   patch:
 *     tags: [Sellers]
 *     summary: Change seller role (SuperAdmin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin, superadmin]
 *     responses:
 *       200:
 *         description: Role updated
 */
router.patch(
  "/:id/role",
  authorize("superadmin"),
  validationRules.changeRole,
  validate,
  changeRole,
);

/**
 * @swagger
 * /sellers/{id}:
 *   delete:
 *     tags: [Sellers]
 *     summary: Deactivate seller (SuperAdmin)
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
 *         description: Seller deactivated
 */
router.delete("/:id", authorize("superadmin"), deactivateSeller);

export default router;
