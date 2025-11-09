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

// All routes require authentication
router.use(authenticate);

// List sellers (admin/superadmin only)
router.get("/", authorize("admin", "superadmin"), listSellers);

// List pending sellers (superadmin only)
router.get("/pending", authorize("superadmin"), listPendingSellers);

// Create pending seller (admin/superadmin only)
router.post(
  "/pending",
  authorize("admin", "superadmin"),
  validationRules.createPendingSeller,
  validate,
  createPendingSeller,
);

// Update seller (self-update)
router.patch("/:id", validationRules.updateSeller, validate, updateSeller);

// Change role (superadmin only)
router.patch(
  "/:id/role",
  authorize("superadmin"),
  validationRules.changeRole,
  validate,
  changeRole,
);

// Deactivate seller (superadmin only)
router.delete("/:id", authorize("superadmin"), deactivateSeller);

export default router;
